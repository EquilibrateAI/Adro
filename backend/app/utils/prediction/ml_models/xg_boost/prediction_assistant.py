import json
import logging
from typing import List, Dict, Any, Optional

import duckdb
import polars as pl
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agno.agent import Agent
from utils.dashboard.chat_history.chat_functions import load_settings
from utils.settings.models import create_model

import utils.prediction.ml_models.xg_boost.xg_boost_full as xgb_full

from utils.model_assistants.model_helpers import (
    get_ignore_columns,
    read_cols,
    get_categorical_values,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prediction Assistant"])


class QueryRequest(BaseModel):
    query: str
    file_name: str


def extract_tool_result_from_response(response) -> Optional[Dict[str, Any]]:
    """Extract tool output from agent response history."""
    try:
        messages = getattr(response, "messages", [])

        for msg in reversed(messages):
            if getattr(msg, "role", None) == "tool":
                content = getattr(msg, "content", None)

                if not content:
                    continue

                parsed = json.loads(content) if isinstance(content, str) else content

                if isinstance(parsed, dict) and "error" not in parsed:
                    return parsed

                logger.error(
                    "[extract_tool_result] Tool returned error: %s",
                    parsed.get("error"),
                )

    except Exception:
        logger.exception("Error extracting tool result")

    return None


def build_agent(
    columns: List[str],
    categorical_values: Dict[str, List[str]],
    run_prediction_tool,
    select_and_predict,
) -> Agent:
    """Build prediction agent using settings.msgpack configuration."""

    settings = load_settings()

    model = create_model(
        settings["model_provider"],
        settings.get("api_key"),
        settings.get("port"),
        settings.get("model"),
        settings.get("baseUrl"),
    )

    return Agent(
        model=model,
        tools=[run_prediction_tool, select_and_predict],
        tool_call_limit=1,
        instructions=f"""
            You are a machine learning prediction assistant.

            Available dataset columns (use these names EXACTLY, INCLUDING special characters.):
            {columns}

            Known categorical values for each string column:
            {json.dumps(categorical_values, indent=2)}

            STEP 1 — VALIDATE CATEGORICAL VALUES BEFORE DOING ANYTHING

            For every string value the user provides, check it against
            the known categorical values above.

            Apply the following logic PER VALUE:

            A) CLOSE MATCH (minor typo / abbreviation / same meaning):
               → Silently correct it and use the closest known value.
               → Example: "mandly" → "Mandalay", "femle" → "Female"

            B) NO PLAUSIBLE MATCH (completely different, unrelated, or
               not present in the dataset in any form):
               → DO NOT call any tool.
               → Stop immediately and respond with a message like:
                 "The value '<user_value>' is not recognised for the
                  column '<column>'. Valid options are: <list of known
                  values>. Please rephrase your query using one of
                  these values."
               → Example: user says "City: Bangalore" but valid cities
                 are only ["Naypyitaw", "Mandalay", "Yangon"] —
                 Bangalore has no resemblance to any of them, so STOP.

            Use good judgment: a typo or shorthand is a CLOSE MATCH;
            a completely foreign or unrelated value is NO MATCH.


            STEP 2 — CHOOSE AND CALL THE RIGHT TOOL

            You have two tools:

            - run_prediction_tool: For general predictions where the user
              specifies conditions (e.g. "predict sales for branch A with
              unit price 50 and quantity 3"). The model will ONLY train on
              the predictor columns the user explicitly provides — do NOT
              invent or fill in unspecified columns.

            - select_and_predict: For training and predicting on a filtered
              subset of existing rows (e.g. "analyse Total where Branch = 'C'").

            Choose run_prediction_tool when the user describes hypothetical
            or specific-condition predictions, even if those exact rows may
            not exist in the dataset.
            Choose select_and_predict when the user explicitly wants to
            filter and analyse existing data rows.

            For run_prediction_tool, call with ONLY the columns the user
            explicitly mentioned:
            {{
                "targets": ["Total"],
                "predictors_specified": {{"Unit price": 99, "Quantity": 9, "City": "Mandalay"}},
                "ignore_additional": []
            }}

            For select_and_predict, call with:
            {{
                "filter_sql": "Branch = 'C' AND City = 'Mandalay'",
                "selected_columns": ["Total", "Branch", "City"],
                "target_column": "Total",
                "predictor_columns": ["Branch", "City"],
                "file_name": "supermarket_sales"
            }}

            IMPORTANT: Never add columns to predictors_specified that the
            user did not mention. Only use what was explicitly stated.

            If a column the user wants to use as a predictor appears in the
            ignored columns list, you MUST tell the user it cannot be used
            due to HIGH CARDINALITY — do not call the tool with it.

            Call ONE tool ONLY ONCE.

            STEP 3 — PRESENT THE RESULTS

            After receiving the tool result, write a short conversational
            summary in plain English. Include:
            - The predicted value and what it means
            - Any categorical values you corrected from the user's input
              (e.g. "I interpreted 'mandly' as Mandalay")
            - Which predictor columns were used for the model

            Do NOT list raw metrics (MAE, RMSE, R², etc.) in your response —
            those are returned separately. Do NOT return raw JSON.
            Keep the tone conversational and concise.
        """,
    )


@router.post("/pred-assistant")
async def predict(request: QueryRequest):
    """Prediction endpoint with thread-safe tool context."""

    try:
        logger.info("[predict] Request received: %s", request.query)

        # LOCAL CONTEXT
        tool_context: Dict[str, Any] = {
            "training_dataset": request.file_name,
            "file_type": "csv",
            "ignore_columns": get_ignore_columns(request.file_name),
            "columns": read_cols(request.file_name),
            "last_result": None,
        }

        with open("data/metadata.json", "r") as f:
            metadata = json.load(f)

        cols_meta = metadata["sources"][request.file_name]["columns"]

        categorical_values = get_categorical_values(
            request.file_name,
            cols_meta,
        )

        # TOOL 1 (closure)

        def run_prediction_tool(input_json: str) -> str:
            """Run prediction using specified predictors only."""
            try:
                data = json.loads(input_json)

                targets = data["targets"]
                predictors = data.get("predictors_specified", {})
                ignore_additional = data.get("ignore_additional", [])

                ignore_cols = tool_context["ignore_columns"] + ignore_additional

                conflicts = [c for c in predictors if c in ignore_cols]
                if conflicts:
                    return json.dumps(
                        {
                            "error": (
                                f"Columns {conflicts} cannot be used "
                                "due to high cardinality."
                            )
                        }
                    )

                if not predictors:
                    return json.dumps({"error": "No predictors specified."})

                result = xgb_full.train_and_predict(
                    training_dataset=tool_context["training_dataset"],
                    file_type=tool_context["file_type"],
                    targets=targets,
                    predictors=predictors,
                    ignore_columns=ignore_cols,
                )

                tool_context["last_result"] = result
                return json.dumps(result)

            except Exception as exc:
                logger.exception("run_prediction_tool failed")
                tool_context["last_result"] = {"error": str(exc)}
                return json.dumps({"error": str(exc)})

        # TOOL 2 (closure)

        def select_and_predict(input_json: str) -> str:
            """Filter dataset and run prediction on subset."""
            try:
                data = json.loads(input_json)

                duckdb_path = f"data/{data['file_name']}.duckdb"
                con = duckdb.connect(duckdb_path)

                try:
                    table = con.execute("SHOW TABLES").fetchone()[0]

                    cols_str = ", ".join(data["selected_columns"])

                    query = (
                        f"SELECT {cols_str} FROM {table} " f"WHERE {data['filter_sql']}"
                    )

                    df = pl.from_pandas(con.execute(query).fetchdf())

                finally:
                    con.close()

                result = xgb_full.train_and_predict_from_df(
                    df=df,
                    training_dataset=data["file_name"],
                    targets=[data["target_column"]],
                    predictors={col: 0 for col in data["predictor_columns"]},
                )

                tool_context["last_result"] = result
                return json.dumps(result)

            except Exception as exc:
                logger.exception("select_and_predict failed")
                tool_context["last_result"] = {"error": str(exc)}
                return json.dumps({"error": str(exc)})

        # AGENT

        agent = build_agent(
            columns=tool_context["columns"],
            categorical_values=categorical_values,
            run_prediction_tool=run_prediction_tool,
            select_and_predict=select_and_predict,
        )

        response = agent.run(request.query)

        metrics = extract_tool_result_from_response(response)

        return {
            "response": response.content,
            "metrics": metrics,
        }

    except Exception as exc:
        logger.exception("[predict] Endpoint failure")
        raise HTTPException(status_code=500, detail=str(exc))
