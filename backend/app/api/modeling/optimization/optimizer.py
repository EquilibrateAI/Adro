import logging
import os
from typing import Any

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import utils.optimization.optuna_optimizer as optuna_opt
from utils.model_assistants.model_helpers import sanitise_col_name

router = APIRouter(tags=["Optimization"])

OPTIMIZATION_PATH = os.path.dirname(__file__)
MODELING_PATH = os.path.dirname(OPTIMIZATION_PATH)
API_PATH = os.path.dirname(MODELING_PATH)
APP_PATH = os.path.dirname(API_PATH)
DATA_PATH = os.path.join(APP_PATH, "data")

logger = logging.getLogger(__name__)


class PredictorBound(BaseModel):
    type: str
    choices: list[str] | None = None
    min: float | int | None = None
    max: float | int | None = None


class OptimizationPayload(BaseModel):
    mode: str
    datasource_name: str
    targets: list[str]
    target_value: dict[str, float | int] | None = None
    target_range: dict[str, list[float | int]] | None = None
    predictor_bounds: dict[str, dict[str, Any]]
    ignore_columns: list[str]


def get_target_constraints(request: OptimizationPayload, target: str):
    """Extract per-target value or range."""
    target_value = None
    target_range = None

    if request.target_range and target in request.target_range:
        values = request.target_range[target]

        if not isinstance(values, list) or len(values) != 2:
            raise ValueError(
                f"target_range for '{target}' must be a list of two values [min, max]"
            )

        target_range = tuple(values)

    elif request.target_value and target in request.target_value:
        target_value = request.target_value[target]

    return target_value, target_range


@router.post("/optimize_predictor")
def optimizer(request: OptimizationPayload) -> JSONResponse:
    """Run Optuna-based input optimization for one or more target columns."""
    try:

        if not request.targets:
            return JSONResponse(
                content={"error": "At least one target must be provided."},
                status_code=400,
            )

        if request.target_value and request.target_range:
            return JSONResponse(
                content={
                    "error": "Provide either target_value or target_range, not both."
                },
                status_code=400,
            )

        # col name sanitisation
        ignore_columns = [sanitise_col_name(c) for c in request.ignore_columns]
        targets = [sanitise_col_name(t) for t in request.targets]

        sanitised_predictor_bounds = {
            sanitise_col_name(k): v
            for k, v in request.predictor_bounds.items()
            if sanitise_col_name(k) not in ignore_columns
        }

        if not sanitised_predictor_bounds:
            return JSONResponse(
                content={
                    "error": "No valid predictor columns after filtering ignore_columns."
                },
                status_code=400,
            )

        all_results = {}

        for target in targets:
            logger.info("[optimize_predictor] Processing target: %s", target)

            # Remove target from predictors
            target_predictor_bounds = {
                k: v for k, v in sanitised_predictor_bounds.items() if k != target
            }

            if not target_predictor_bounds:
                all_results[target] = {
                    "error": f"No predictors left after excluding target '{target}'."
                }
                continue

            # extract target constraint
            try:
                target_value, target_range = get_target_constraints(request, target)
            except ValueError as e:
                all_results[target] = {"error": str(e)}
                continue

            if target_value is None and target_range is None:
                all_results[target] = {
                    "error": f"No constraint provided for target '{target}'."
                }
                continue

            # ---------- Model path ----------
            predictor_names = "_".join(sorted(target_predictor_bounds.keys()))
            model_pkl_path = (
                f"{DATA_PATH}/xgboost_{request.datasource_name}"
                f"_target_{target}_predictors_{predictor_names}.pkl"
            )

            logger.info("[optimize_predictor] model path: %s", model_pkl_path)

            # ---------- Build feature configs ----------
            feature_bounds = {}
            categorical_choices = {}
            predictors = {}

            for feature_name, bounds in target_predictor_bounds.items():
                if bounds.get("type") == "numeric":
                    feature_bounds[feature_name] = (
                        bounds["min"],
                        bounds["max"],
                    )
                    predictors[feature_name] = "float"

                elif bounds.get("type") == "categorical":
                    categorical_choices[feature_name] = bounds.get("choices", [])
                    predictors[feature_name] = "category"

            # ---------- Run optimization ----------
            result = optuna_opt.optimize_inputs_for_target(
                model_pkl_path=model_pkl_path,
                feature_bounds=feature_bounds,
                categorical_choices=categorical_choices,
                datasource_name=request.datasource_name,
                file_type="csv",
                targets=[target],
                predictors=predictors,
                ignore_columns=ignore_columns,
                target_value=target_value,
                target_range=target_range,
                n_trials=200,
                top_k=5,
            )

            all_results[target] = result

        logger.info("[optimization] final result: %s", all_results)

        return JSONResponse(
            content={
                "status": "success",
                "message": "Optimization completed",
                "data": all_results,
            },
            status_code=200,
        )

    except Exception as e:
        logger.error("[optimization] error: %s", str(e))
        return JSONResponse(
            content={"error": str(e)},
            status_code=500,
        )
