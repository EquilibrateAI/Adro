import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import utils.prediction.ml_models.xg_boost.xg_boost_full as xgb_full

router = APIRouter(tags=["ML Prediction"])

logger = logging.getLogger(__name__)


class MLPayload(BaseModel):
    datasource_name: str
    file_type: str
    targets: list
    predictors: dict
    ignore_columns: list


@router.post("/predict")
def ml_model_predictor(request: MLPayload) -> JSONResponse:
    """Train an XGBoost model and return predictions for the given dataset.

    Args:
        request: ML payload with datasource name, file type, target
                 columns, predictor columns, and columns to ignore.

    Returns:
        JSONResponse with status 200 and prediction results on success,
        or status 500 with an error message on failure.
    """
    try:
        result = xgb_full.train_and_predict(
            training_dataset=request.datasource_name,
            file_type=request.file_type,
            targets=request.targets,
            predictors=request.predictors,
            ignore_columns=request.ignore_columns,
        )

        return JSONResponse(content=result, status_code=200)

    except Exception as e:
        logger.error("Error while predicting: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
