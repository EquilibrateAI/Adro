import json
import logging
import os
from typing import Any

from agno.agent import Agent
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.dashboard.chat_history.chat_functions import load_settings
from utils.model_assistants.model_helpers import (
    get_column_metadata_from_duckdb,
    get_ignore_columns,
    read_cols,
)
from utils.optimization.optuna_optimizer import optimize_inputs_for_target
from utils.settings.models import create_model

router = APIRouter(tags=["Optimizer Assistant LLM"])

logger = logging.getLogger(__name__)


class OptimizerQueryRequest(BaseModel):
    query: str
    file_name: str


def _load_model() -> Any:
    """Load model configuration from settings.msgpack and instantiate the model.

    Returns:
        A model instance configured from the saved settings.
    """
    settings = load_settings()
    return create_model(
        settings["model_provider"],
        settings.get("api_key"),
        settings.get("port"),
        settings.get("model"),
        settings.get("baseUrl"),
    )


def build_agent(
    columns: list[str],
    column_metadata: dict[str, Any],
    tool_fn: callable,
    model: Any,
) -> Agent:
    """Build LLM agent with injected optimization tool and settings-driven model.

    Args:
        columns: List of available column names for the dataset.
        column_metadata: Dict mapping column names to their type and bounds.
        tool_fn: The bound per-request optimization tool closure.
        model: The LLM model instance loaded from settings.msgpack.

    Returns:
        A configured agno Agent ready to run optimization queries.
    """
    col_reference_lines: list[str] = []
    categorical_values: dict[str, list[str]] = {}

    for col in columns:
        meta = column_metadata.get(col)

        if not meta:
            col_reference_lines.append(f"- {col} [unknown]")
            continue

        if meta["type"] == "String":
            choices = meta.get("choices", [])
            col_reference_lines.append(f"- {col} [categorical]: choices={choices}")
            categorical_values[col] = choices

        elif meta["type"] == "Number":
            col_reference_lines.append(
                f"- {col} [numeric]: " f"min={meta.get('min')}, max={meta.get('max')}"
            )

    col_reference = "\n".join(col_reference_lines)

    return Agent(
        model=model,
        tools=[tool_fn],
        tool_call_limit=1,
        instructions=f"""
You are a machine learning optimization assistant.

Available dataset columns:
{col_reference}

Categorical values:
{json.dumps(categorical_values, indent=2)}


FUZZY MATCHING
- Correct minor typos automatically
- Example: "electronics" → "Electronic_accessories"
- Do NOT ask user for confirmation


YOUR TASK
Find optimal predictor values to achieve target outcome.


RULES
- ALWAYS call the tool
- "target" is a SINGLE column (string)
- Use ONLY valid column names
- Use ONLY listed categorical values
- Each column appears ONCE in predictor_bounds
- Do NOT include target column in predictors
- Provide EXACTLY ONE of target_value OR target_range


TOOL INPUT FORMAT
{{
    "targets": ["gross_income"],
    "target_value": 30,
    "target_range": null,
    "predictor_bounds": {{
        "Unit_price": {{"type": "numeric", "min": 10, "max": 100}},
        "Quantity": {{"type": "numeric", "min": 1, "max": 20}},
        "Product_line": {{
            "type": "categorical",
            "choices": ["Health_and_beauty", "Electronic_accessories"]
        }}
    }},
    "ignore_additional": []
}}


AFTER TOOL RETURNS
- DO NOT return JSON
- Summarize best predictors and predicted value
- Mention any corrected categorical values
- Keep response SHORT
- Include summary of metrics
""",
    )


@router.post("/optimizer-assistant")
async def optimize(request: OptimizerQueryRequest) -> dict:
    """Run the LLM-guided optimization assistant for a given query and dataset.

    Loads column metadata, builds a per-request optimization tool closure,
    creates the agent with the model from settings.msgpack, and returns the
    agent's natural-language response along with raw optimization metrics.

    Args:
        request: Request body containing the user query and file name.

    Returns:
        dict with 'response' (natural language) and 'metrics' (raw results).

    Raises:
        HTTPException: With status 500 on any processing failure.
    """
    try:
        logger.info(
            "Optimizer assistant request: query=%s file=%s",
            request.query,
            request.file_name,
        )

        # Per-request context — avoids shared mutable state across requests
        tool_context: dict[str, Any] = {
            "training_dataset": request.file_name,
            "file_type": "csv",
            "ignore_columns": get_ignore_columns(request.file_name),
            "columns": read_cols(request.file_name),
            "last_result": None,
        }

        column_metadata = get_column_metadata_from_duckdb(request.file_name)
        logger.info("Columns loaded: %s", tool_context["columns"])

        # Load model from settings.msgpack on every request
        model = _load_model()
        logger.info("Model loaded: %s", model)

        def run_optimization_tool(
            targets: list[str],
            target_value: dict[str, Any] | None = None,
            target_range: dict[str, Any] | None = None,
            predictor_bounds: dict[str, dict[str, Any]] | None = None,
            ignore_additional: list[str] | None = None,
        ) -> str:
            """Run Optuna optimization for the given targets and predictor bounds.

            Builds the correct pkl path (matching the naming convention in
            optuna_optimizer.py) so the model is found or trained consistently.

            Args:
                targets: List of target column names to optimise.
                target_value: Dict mapping target name to a desired scalar value.
                target_range: Dict mapping target name to a [min, max] list.
                predictor_bounds: Dict of feature name → bound config.
                ignore_additional: Extra columns to exclude from predictors.

            Returns:
                JSON string with per-target optimization results or error details.
            """
            try:
                ignore_additional = ignore_additional or []
                predictor_bounds = predictor_bounds or {}
                ignore_columns = tool_context["ignore_columns"] + ignore_additional

                results: dict[str, Any] = {}

                for target in targets:
                    feature_bounds: dict[str, Any] = {}
                    categorical_choices: dict[str, list[str]] = {}
                    predictors: dict[str, str] = {}

                    for name, bounds in predictor_bounds.items():
                        if name in ignore_columns or name == target:
                            continue

                        if bounds["type"] == "numeric":
                            feature_bounds[name] = (
                                bounds["min"],
                                bounds["max"],
                            )
                            predictors[name] = "float"

                        elif bounds["type"] == "categorical":
                            categorical_choices[name] = bounds.get("choices", [])
                            predictors[name] = "category"

                    # Build path with predictor names to match optuna_optimizer.py
                    # convention: xgboost_{name}_target_{t}_predictors_{preds}.pkl
                    data_path = os.path.join(os.getcwd(), "data")
                    predictor_names = "_".join(sorted(predictors.keys()))
                    model_pkl_path = (
                        f"{data_path}/xgboost_"
                        f"{tool_context['training_dataset']}"
                        f"_target_{target}"
                        f"_predictors_{predictor_names}.pkl"
                    )

                    logger.info(
                        "[run_optimization_tool] target=%s pkl=%s",
                        target,
                        model_pkl_path,
                    )

                    result = optimize_inputs_for_target(
                        model_pkl_path=model_pkl_path,
                        feature_bounds=feature_bounds,
                        categorical_choices=categorical_choices,
                        datasource_name=tool_context["training_dataset"],
                        file_type=tool_context["file_type"],
                        targets=[target],
                        predictors=predictors,
                        ignore_columns=ignore_columns,
                        target_value=(
                            target_value.get(target) if target_value else None
                        ),
                        target_range=(
                            tuple(target_range[target])
                            if target_range and target in target_range
                            else None
                        ),
                        n_trials=200,
                        top_k=5,
                    )

                    results[target] = result

                tool_context["last_result"] = results
                return json.dumps(results)

            except Exception as exc:
                logger.error("run_optimization_tool failed: %s", str(exc))
                tool_context["last_result"] = {"error": str(exc)}
                return json.dumps({"error": str(exc)})

        agent = build_agent(
            tool_context["columns"],
            column_metadata,
            run_optimization_tool,
            model,
        )

        response = agent.run(request.query)
        logger.info("Agent run complete")

        content = response.content.strip() if response and response.content else None

        if not content and tool_context["last_result"]:
            logger.warning("Agent returned empty content — using raw metrics")
            content = json.dumps(tool_context["last_result"], indent=2)

        return {
            "response": content or "No response generated",
            "metrics": tool_context["last_result"],
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
