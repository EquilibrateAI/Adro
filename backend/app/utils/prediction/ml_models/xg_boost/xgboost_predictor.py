import os
import pickle
from typing import Dict, List

import polars as pl
import xgboost as xgb

# ---------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------

ROOT_PATH = os.path.dirname(__file__)
API_FOLDER = os.path.dirname(ROOT_PATH)
APP_PATH = os.path.dirname(API_FOLDER)
MODEL_PATH = os.path.join(APP_PATH, "data")


def predict_data(
    targets: List[str],
    predictors: Dict,
    model_pkl_path: str,
) -> pl.DataFrame:
    """
    Generate predictions using a trained XGBoost model.

    - Loads model from disk
    - Aligns predictors to training feature order
    - Applies categorical casting
    - Returns DataFrame with prediction column appended
    """
    with open(model_pkl_path, "rb") as f:
        complete_model = pickle.load(f)

    model = complete_model["model"]
    feature_names = model.feature_names

    # Align input with training feature order
    test_data = pl.DataFrame(predictors).select(feature_names)

    # Cast string columns to categorical
    test_data = test_data.select(
        [
            (
                pl.col(col).cast(pl.Categorical)
                if test_data.schema[col] == pl.Utf8
                else pl.col(col)
            )
            for col in test_data.columns
        ]
    )

    dmatrix = xgb.DMatrix(test_data, enable_categorical=True)
    preds = model.predict(dmatrix)

    # Append predictions to a copy of input
    result_df = test_data.clone().with_columns(
        pl.Series(f"Predicted_{targets[0]}", preds)
    )

    return result_df
