import json
import logging
from typing import Any

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from dotenv import load_dotenv

from utils.dashboard.chat_history.chat_functions import load_settings
from utils.dashboard.llm_engine.tools_generation import (
    check_column,
    check_file,
    run_query1,
)
from utils.settings.models import create_model

# Module-level DB and env setup — shared across requests
db = SqliteDb(db_file="app.db")
load_dotenv()

logger = logging.getLogger(__name__)


def load_model() -> Any:
    """Load model configuration from settings and instantiate the model.

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


# Single-agent usage helpers


def get_agent() -> Agent:
    """Create and return a configured agno Agent for dashboard generation.

    Returns:
        An Agent instance with tools, chat history, and instructions.
    """
    model = load_model()

    return Agent(
        model=model,
        read_chat_history=True,
        db=db,
        description="you are a data analyst and a dashboard builder agent, use the tools to get the data to build a dashboard.",
        instructions="""
    Based on the user query you have to analyse the query and decide whether the user wants just a text response or a chart or a table or a dahsboard or a combination of the stated.
    check the session history if the user query has already been answered previously and if it is you can use the history to answer and not have to make any tool calls.
    Be very precise while using the history to answer the query.
    If you have any doubts always ask the user before proceeding.
    build a dashboard only when explicitally asked by the user.
    Your dashboard response should be a combination of kpis and important charts.
    You should respond with apache e chart options for all the charts as the user will use them to plot charts

    Give your response in the following JSON format:
    {"content": any text(with text formatting) you want to tell the user ,e.g : summary of the dashboard or the answer to a query or any doubts you want to ask the user ,
    "kpis":[list of all kpis] else None,
    Sample response to be sent:
     [
                        {
                            "label": "Total Sales",
                            "value": "$322,966.75"
                        },
                        {
                            "label": "Top Performing Branch",
                            "value": "Branch C"
                        }
    ]
    "charts":[list of apache e chart options for all the charts] else None
    NEVER SEND VALUES AS NULL, make it zero if a NULL response shows up.

    "table":[table data that you'd want to show if any as a list of dict ] else None}

     NOTE for building charts:
   Place the chart at the center.
     The x- and y-axis labels are a must and must be bold and the same font size.
     The y-axis should display **nameLocation** in the middle only, be slightly shifted to the left, and the x-axis slightly lowered.
Every chart must include a legend ; if it contains many items, enable a scrollable legend (`legend: { type: 'scroll' }`). Place the legend above the chart for all charts.
Let the legend REPRESENT each bar if it is a bar chart.
Every chart should have an appropriate title.
If a line chart has only one line, make it an area chart
Tooltips should display data points on hover.
Multiple line graphs may share one canvas, but if a line has more than 10 data points, set `showSymbol: false`.
All charts (bar, line, and related types) must have internal zoom on scroll (`dataZoom`), not a visible zoom slider.
Bar charts should ideally use different colors for each bar. A racing chart can be added creatively where suitable (e.g., product sales over time).

REMEMBER the user will not see anything outside the json structure.""",
        tools=[check_file, check_column, run_query1],
    )


def format_agent_response(agent_response: dict) -> dict:
    """Normalise an agent response and append a serialised charts_json field.

    Ensures the response is a well-structured dict regardless of the
    input type, then adds a JSON-serialised 'charts_json' field for
    convenient frontend consumption.

    Args:
        agent_response: The raw agent response from the LLM.

    Returns:
        A dict with the original fields plus a charts_json key.
    """
    if not isinstance(agent_response, dict):
        # If it's a list, assume it's charts and wrap in proper response format
        if isinstance(agent_response, list):
            agent_response = {
                "content": "",
                "kpis": None,
                "charts": agent_response,
                "table": None,
            }
        else:
            # Fallback for other unexpected types
            agent_response = {
                "content": str(agent_response) if agent_response else "",
                "kpis": None,
                "charts": None,
                "table": None,
            }

    result = agent_response.copy()

    # Add separate JSON serialization for charts only
    if agent_response.get("charts"):
        result["charts_json"] = json.dumps({"charts": agent_response["charts"]})
    else:
        result["charts_json"] = None

    return result
