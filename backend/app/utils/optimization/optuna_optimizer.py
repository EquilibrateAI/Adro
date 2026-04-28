import logging
import os
import pickle
from typing import Dict, Tuple, Optional, List

import optuna
import polars as pl
import xgboost as xgb

from ..prediction.ml_models.xg_boost.xg_boost_full import (
    train_model,
    _load_df,
)

logger = logging.getLogger(__name__)

optimization_folder = os.path.dirname(__file__)
utils_folder = os.path.dirname(optimization_folder)
prediction_folder = os.path.join(utils_folder, "prediction")


def optimize_inputs_for_target(
    model_pkl_path: str,
    feature_bounds: Dict[str, Tuple[float, float]],
    categorical_choices: Optional[Dict[str, List[str]]] = None,
    datasource_name: Optional[str] = None,
    file_type: str = "csv",
    targets: Optional[List[str]] = None,
    predictors: Optional[Dict[str, str]] = None,
    ignore_columns: Optional[List[str]] = None,
    target_value: Optional[float] = None,
    target_range: Optional[Tuple[float, float]] = None,
    n_trials: int = 200,
    top_k: int = 5,
) -> Dict:
    """Run Optuna optimization to find best predictor values for a target."""

    if not os.path.exists(model_pkl_path):
        logger.info("Model not found at %s, training new model", model_pkl_path)

        if datasource_name and targets and predictors:
            df = _load_df(
                training_dataset=datasource_name,
                file_type=file_type,
                ignore_columns=ignore_columns or [],
            )

            train_model(
                df=df,
                training_dataset=datasource_name,
                targets=targets,
                predictors=predictors,
            )
        else:
            raise FileNotFoundError(
                "Model not found and insufficient training parameters provided"
            )
    else:
        logger.info("Loading model from: %s", model_pkl_path)

    with open(model_pkl_path, "rb") as f:
        complete_model = pickle.load(f)

    model = complete_model["model"]
    feature_names = complete_model.get("feature_names") or model.feature_names

    if (target_value is None) == (target_range is None):
        raise ValueError("Provide exactly ONE of target_value or target_range")

    categorical_choices = categorical_choices or {}

    def objective(trial: optuna.Trial) -> float:
        row_dict: Dict[str, object] = {}

        # Numeric features
        for name, (low, high) in feature_bounds.items():
            row_dict[name] = trial.suggest_float(name, low, high)

        # Categorical features
        for name, choices in categorical_choices.items():
            if choices:
                row_dict[name] = trial.suggest_categorical(name, choices)

        missing = [f for f in feature_names if f not in row_dict]
        if missing:
            raise ValueError(f"Missing required features: {missing}")

        df = pl.DataFrame([row_dict]).select(feature_names)

        df = df.select(
            [
                (
                    pl.col(col).cast(pl.Categorical)
                    if col in categorical_choices
                    else pl.col(col)
                )
                for col in df.columns
            ]
        )

        dmat = xgb.DMatrix(df, enable_categorical=True)
        pred = float(model.predict(dmat)[0])

        if target_value is not None:
            return (pred - target_value) ** 2

        lo, hi = target_range
        if pred < lo:
            return (lo - pred) ** 2
        if pred > hi:
            return (pred - hi) ** 2
        return 0.0

    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(),
    )

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    top_trials = sorted(study.trials, key=lambda t: t.value)[:top_k]

    def evaluate_trial(params: Dict[str, object]) -> float:
        df = pl.DataFrame([params]).select(feature_names)
        df = df.select(
            [
                (
                    pl.col(col).cast(pl.Categorical)
                    if col in categorical_choices
                    else pl.col(col)
                )
                for col in df.columns
            ]
        )
        dmat = xgb.DMatrix(df, enable_categorical=True)
        return float(model.predict(dmat)[0])

    top_solutions = []
    for i, trial in enumerate(top_trials):
        pred = evaluate_trial(trial.params)

        top_solutions.append(
            {
                "rank": i + 1,
                "predictors": {
                    k: round(v, 4) if isinstance(v, (int, float)) else v
                    for k, v in trial.params.items()
                },
                "prediction": round(pred, 4),
                "error": round(trial.value, 6),
            }
        )

    best_pred = evaluate_trial(study.best_params)

    return {
        "best_predictors": {
            k: round(v, 4) if isinstance(v, (int, float)) else v
            for k, v in study.best_params.items()
        },
        "best_prediction": round(best_pred, 4),
        "best_loss": round(study.best_value, 6),
        "n_trials": n_trials,
        "top_k": top_k,
        "target_value": target_value,
        "target_range": target_range,
        "top_solutions": top_solutions,
    }
