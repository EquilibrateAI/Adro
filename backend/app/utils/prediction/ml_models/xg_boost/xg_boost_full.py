import json
import os
import pickle
from typing import Dict, List, Tuple

import numpy as np
import optuna
import polars as pl
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

import utils.prediction.ml_models.xg_boost.xgboost_predictor as xgb_pred
from utils.model_assistants.model_helpers import sanitise_col_name


ROOT_PATH = os.path.dirname(__file__)
MODELS_PATH = os.path.dirname(ROOT_PATH)
ML_PATH = os.path.dirname(MODELS_PATH)
UTILS_PATH = os.path.dirname(ML_PATH)
APP_PATH = os.path.dirname(UTILS_PATH)
MODEL_PATH = os.path.join(APP_PATH, "data")

optuna.logging.set_verbosity(optuna.logging.WARNING)


# Helpers


def cast_categoricals(df: pl.DataFrame) -> pl.DataFrame:
    """Cast all Utf8 columns to categorical for XGBoost compatibility."""
    return df.select(
        [
            (
                pl.col(col).cast(pl.Categorical)
                if df.schema[col] == pl.Utf8
                else pl.col(col)
            )
            for col in df.columns
        ]
    )


def _load_df(
    training_dataset: str,
    file_type: str,
    ignore_columns: List[str],
) -> pl.DataFrame:
    """Load dataset and apply preprocessing."""
    if file_type != "csv":
        raise ValueError(f"Unsupported file_type: {file_type}")

    df = pl.read_csv(f"{MODEL_PATH}/{training_dataset}.csv")

    rename_map = {
        col: sanitise_col_name(col)
        for col in df.columns
        if sanitise_col_name(col) != col
    }

    if rename_map:
        df = df.rename(rename_map)

    return df.drop(ignore_columns)


# Hyperparameter Tuning


def tune_hyperparameters(
    X_train,
    y_train,
    n_trials: int = 50,
) -> Tuple[Dict, int]:
    """Run Optuna hyperparameter search using 3-fold CV."""

    dtrain = xgb.DMatrix(X_train, label=y_train, enable_categorical=True)

    def objective(trial: optuna.Trial) -> float:
        params = {
            "objective": "reg:squarederror",
            "base_score": float(np.mean(y_train)),
            "verbosity": 0,
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-3, 5.0, log=True),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-3, 5.0, log=True),
            "min_child_weight": trial.suggest_int("min_child_weight", 5, 50),
            "gamma": trial.suggest_float("gamma", 1e-8, 1.0, log=True),
        }

        cv_result = xgb.cv(
            params=params,
            dtrain=dtrain,
            num_boost_round=500,
            nfold=3,
            early_stopping_rounds=20,
            metrics="rmse",
            seed=42,
            verbose_eval=False,
        )

        best_round = int(cv_result.shape[0])
        best_rmse = float(cv_result["test-rmse-mean"].iloc[-1])

        trial.set_user_attr("best_num_rounds", best_round)
        trial.report(best_rmse, step=best_round)

        if trial.should_prune():
            raise optuna.exceptions.TrialPruned()

        return best_rmse

    study = optuna.create_study(
        direction="minimize",
        sampler=optuna.samplers.TPESampler(seed=42),
        pruner=optuna.pruners.MedianPruner(n_warmup_steps=10),
    )

    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best_params = study.best_params
    best_num_rounds = study.best_trial.user_attrs["best_num_rounds"]

    return best_params, best_num_rounds


# Training


def train_model(
    df: pl.DataFrame,
    training_dataset: str,
    targets: List[str],
    predictors: Dict,
    use_tuning: bool = True,
    n_trials: int = 50,
) -> Dict:
    """Train one XGBoost model per target."""

    predictors = {sanitise_col_name(k): v for k, v in predictors.items()}
    predictor_cols = list(predictors.keys())
    predictor_name = "_".join(sorted(predictor_cols))

    all_models_metrics = {}

    for target in targets:
        model_pkl_path = (
            f"{MODEL_PATH}/xgboost_{training_dataset}"
            f"_target_{target}_predictors_{predictor_name}.pkl"
        )

        if not os.path.exists(model_pkl_path):
            required_cols = predictor_cols + [target]

            missing = [c for c in required_cols if c not in df.columns]
            if missing:
                raise ValueError(f"Columns not found: {missing}")

            working_df = df.select(required_cols)

            y = working_df[target].to_numpy()
            X = cast_categoricals(working_df.select(predictor_cols))

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.3, random_state=42
            )

            if use_tuning:
                best_params, num_boost_round = tune_hyperparameters(
                    X_train, y_train, n_trials=n_trials
                )
            else:
                best_params = {
                    "max_depth": 2,
                    "learning_rate": 0.1,
                    "subsample": 1.0,
                    "colsample_bytree": 1.0,
                    "reg_lambda": 1.0,
                    "reg_alpha": 1e-3,
                    "min_child_weight": 1,
                }
                num_boost_round = 50

            final_params = {
                "objective": "reg:squarederror",
                "base_score": float(np.mean(y_train)),
                "verbosity": 0,
                **best_params,
            }

            xgb_train = xgb.DMatrix(X_train, y_train, enable_categorical=True)
            xgb_test = xgb.DMatrix(X_test, y_test, enable_categorical=True)

            model = xgb.train(
                params=final_params,
                dtrain=xgb_train,
                num_boost_round=num_boost_round,
                evals=[(xgb_train, "train"), (xgb_test, "test")],
                early_stopping_rounds=20,
                verbose_eval=False,
            )

            preds = np.round(model.predict(xgb_test), 2)

            mse = mean_squared_error(y_test, preds)
            mae = mean_absolute_error(y_test, preds)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test, preds)

            complete_model = {
                "model": model,
                "feature_names": X.columns,
                "rmse": rmse,
                "mse": mse,
                "mae": mae,
                "r2_score": r2,
                "num_boost_round": num_boost_round,
                "best_params": final_params,
            }

            with open(model_pkl_path, "wb") as f:
                pickle.dump(complete_model, f)

        else:
            with open(model_pkl_path, "rb") as f:
                complete_model = pickle.load(f)

        all_models_metrics[target] = {
            "rmse": complete_model["rmse"],
            "mse": complete_model["mse"],
            "mae": complete_model["mae"],
            "r2_score": complete_model["r2_score"],
            "num_boost_round": complete_model.get("num_boost_round", 50),
            "best_params": complete_model.get("best_params", {}),
        }

    return all_models_metrics


# Prediction


def predict_data(
    df: pl.DataFrame,
    training_dataset: str,
    targets: List[str],
    predictors: Dict,
) -> Dict:
    """Load trained models and produce predictions."""

    sampling_size = 500
    predictors = {sanitise_col_name(k): v for k, v in predictors.items()}
    predictor_cols = list(predictors.keys())
    predictor_name = "_".join(sorted(predictor_cols))

    all_predictions = {}
    all_original_vs_predicted = {}

    for target in targets:
        model_pkl_path = (
            f"{MODEL_PATH}/xgboost_{training_dataset}"
            f"_target_{target}_predictors_{predictor_name}.pkl"
        )

        with open(model_pkl_path, "rb") as f:
            complete_model = pickle.load(f)

        required_cols = predictor_cols + [target]
        working_df = df.select([c for c in required_cols if c in df.columns])

        sample_df = (
            working_df.sample(n=sampling_size, seed=0)
            if working_df.height > sampling_size
            else working_df.clone()
        )

        selected_test = cast_categoricals(sample_df.select(predictor_cols))
        testing_data = xgb.DMatrix(selected_test, enable_categorical=True)

        predicted = np.round(complete_model["model"].predict(testing_data), 2)

        all_original_vs_predicted[target] = list(
            zip(
                sample_df.get_column(target).to_numpy().tolist(),
                predicted.tolist(),
            )
        )

        predicted_data = xgb_pred.predict_data(
            targets=[target],
            predictors=predictors,
            model_pkl_path=model_pkl_path,
        )

        all_predictions[target] = json.loads(predicted_data.write_json())[0]

    return {
        "predicted_data": all_predictions,
        "original_vs_predicted": all_original_vs_predicted,
    }


# Wrapper APIs


def train_and_predict(
    training_dataset: str,
    file_type: str,
    targets: List[str],
    predictors: Dict,
    ignore_columns: List[str],
    use_tuning: bool = True,
    n_trials: int = 50,
) -> Dict:
    """Train models and produce predictions."""

    df = _load_df(training_dataset, file_type, ignore_columns)

    training_metrics = train_model(
        df,
        training_dataset,
        targets,
        predictors,
        use_tuning=use_tuning,
        n_trials=n_trials,
    )

    prediction_data = predict_data(
        df,
        training_dataset,
        targets,
        predictors,
    )

    return training_metrics | prediction_data


def train_and_predict_from_df(
    df: pl.DataFrame,
    training_dataset: str,
    targets: List[str],
    predictors: Dict,
    ignore_columns: List[str] | None = None,
) -> Dict:
    """Train and predict using pre-filtered dataframe."""

    ignore_columns = ignore_columns or []

    training_metrics = train_model(
        df,
        training_dataset,
        targets,
        predictors,
        use_tuning=False,
    )

    prediction_data = predict_data(
        df,
        training_dataset,
        targets,
        predictors,
    )

    return training_metrics | prediction_data
