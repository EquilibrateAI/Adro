import json
import logging
from typing import Any

from agno.agent import Agent
from agno.db.sqlite import SqliteDb
from agno.workflow import Step, Workflow
from agno.workflow.router import Router
from agno.workflow.types import StepInput, StepOutput
from dotenv import load_dotenv
from pydantic import BaseModel

from utils.dashboard.chat_history.chat_functions import load_settings
from utils.dashboard.llm_engine.tools_generation import (
    check_column,
    check_file,
    run_query1,
)
from utils.settings.models import create_model
from utils.dashboard.llm_engine.json_utils import extract_json

# Module-level DB and env setup — shared across requests
db = SqliteDb(db_file="app.db")
load_dotenv()

logger = logging.getLogger(__name__)


class DashboardResponse(BaseModel):
    content: str
    kpis: list[dict[str, Any]] | None = None
    charts: list[dict[str, Any]] | None = None
    table: list[dict[str, Any]] | None = None


def load_model() -> Any:
    """Load model configuration from settings and instantiate the model.

    Returns:
        A model instance configured from the saved settings.
    """
    settings = load_settings()
    model = create_model(
        settings["model_provider"],
        settings.get("api_key"),
        settings.get("port"),
        settings.get("model"),
        settings.get("baseUrl"),
    )
    print("team model used:::", model)
    print("team model settings used:::", settings)
    logger.info("Loaded model: %s", model)
    logger.debug("Model type: %s", type(model))
    return model


def create_text_agent(model: Any) -> Agent:
    """Create an agent that handles general conversation and non-dashboard queries.

    Args:
        model: The LLM model instance to use.

    Returns:
        A configured agno Agent.
    """
    return Agent(
        debug_mode=True,
        model=model,
        db=db,
        read_chat_history=True,
        name="Text Agent",
        role="Answer general questions, greetings, and non-dashboard queries.",
        instructions=[
            "You handle general conversation, greetings, and questions that don't need dashboard components.",
            'Return a JSON object: {"content": "<your response>"}',
            "No markdown. No code fences. ONLY raw JSON.",
        ],
        tools=[check_file, check_column, run_query1],
    )


def create_kpi_agent(model: Any) -> Agent:
    """Create an agent that generates KPI metrics only.

    Args:
        model: The LLM model instance to use.

    Returns:
        A configured agno Agent.
    """
    return Agent(
        debug_mode=True,
        model=model,
        db=db,
        read_chat_history=True,
        name="KPI Agent",
        role="Generate KPI metrics only.",
        instructions=[
            "You generate ONLY KPI metrics.",
            "Let max number of kpis be 5.",
            'Output format: {"kpis": [{"title": "...", "value": 123}]}',
            "Do not return anything outside JSON.",
        ],
        tools=[check_file, check_column, run_query1],
    )


def create_charts_agent(model: Any) -> Agent:
    """Create an agent that generates Apache ECharts chart definitions.

    Args:
        model: The LLM model instance to use.

    Returns:
        A configured agno Agent.
    """
    return Agent(
        debug_mode=True,
        model=model,
        db=db,
        read_chat_history=True,
        name="Charts Agent",
        role="Generate chart definitions only.",
        expected_output="""
    {
        title: {
            text: "Sales Dashboard"
        },
        xAxis: {
            type: 'category',
            name: 'Days of Week',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            type: 'value',
            name: 'Sales Amount'
        },
        series: [
            {
            data: [120, 200, 150, 80, 70, 110, 130],
            type: 'bar'
            }
        ]
        };

""",
        instructions="""
        You generate chart definitions.
        Generate ONE chart at a time.
        OR return {"done": true} if no more charts needed.
        Use tools: check_file, check_column, run_query1.
        Return Apache ECharts option objects.
        NEVER return DATA as an empty array.
        Follow chart styling rules:
        - Centered charts, bold axis labels, legend on top (scrollable).
        - Meaningful titles, tooltips for hover.
        - For lines with >10 points, set showSymbol: false.
        - Internal zoom (dataZoom), no visible slider.
        - Clear spacing between axis names and values.
        Output format: {"charts": [{ ...ECharts options... }]}
    """,
        tools=[check_file, check_column, run_query1],
    )


def create_table_agent(model: Any) -> Agent:
    """Create an agent that generates table data only.

    Args:
        model: The LLM model instance to use.

    Returns:
        A configured agno Agent.
    """
    return Agent(
        debug_mode=True,
        model=model,
        db=db,
        read_chat_history=True,
        name="Table Agent",
        role="Generate table output only.",
        instructions="""
        You generate ONLY table data as a list of row dictionaries.
        - [table data that you'd want to show if any as a list of dict]
        Output format: {"table": ["Rank": 1, "Product Category": "...", "Total Gross Income ($)": 0.0, ...]}
        The KPI data and the table data STRICTLY SHOULD NOT be the same.
    """,
        tools=[check_file, check_column, run_query1],
    )


def create_formatter_agent(model: Any) -> Agent:
    """Create an agent that merges and summarises all dashboard components.

    Args:
        model: The LLM model instance to use.

    Returns:
        A configured agno Agent.
    """
    return Agent(
        model=model,
        name="Formatter Agent",
        role="Summarize dashboard components and provide insights.",
        expected_output="""
    {"content": "Summary of the components generated with brief insights or findings.",
                    "kpis": [
                    { "label": "KPI", "value": "value" }
                    ],
                    "charts": [
                    {
                        "title": { "text": "Chart Title" },
                        "tooltip": { "trigger": "axis" },
                        "legend": {},
                        "xAxis": { "type": "category", "data": [...] },
                        "yAxis": { "type": "value" },
                        "series": [{ "type": "bar", "data": [...] }]
                    }
                    ],
                    "table": [
                    { "key": "value" }
                    ]
                }
            }
    }
""",
        instructions=[
            "You receive raw JSON outputs from KPI, Charts, and Table agents.",
            "Merge them into a single JSON object with keys: content, kpis, charts, table.",
            "Example for content: key insights: ..., brief summary: ... along with brief explanations.",
            "Mention important trends, insights from charts. Include clean formatting with bullet points."
            "Mention notable values, trends, or patterns you see in the data in the content.",
            "Preserve the original kpis, charts, and table arrays exactly as received.",
            "No markdown. No code fences. ONLY raw JSON.",
        ],
    )


def create_planner_agent(model: Any) -> Agent:
    """Create an agent that decides which dashboard components are needed.

    Args:
        model: The LLM model instance to use.

    Returns:
        A configured agno Agent.
    """
    return Agent(
        debug_mode=True,
        model=model,
        db=db,
        read_chat_history=True,
        name="Planner Agent",
        role="Decide which dashboard components are needed based on query intent.",
        instructions=[
            "based on the user query, decide whether the intent is for kpi metrics, analysis with charts or with tables,",
            "choose components accordingly",
            "if in doubt, use all 3 components",
            "if the query is for a dashboard, you MUST use all 3 components",
            "you are encouraged to choose multiple components",
            "IMPORTANT: When the query is about understanding, analyzing, or exploring data, ALWAYS return all 3 components.",
            'Format: {"components": ["kpis", "charts", "table"]}',
            "Output ONLY a raw JSON object.",
        ],
        tools=[check_file, check_column, run_query1],
    )


def run_dashboard_pipeline(query: str, chat_id: str) -> dict:
    """Run the full multi-agent dashboard generation workflow.

    Loads the latest model, builds all agents and workflow steps,
    routes the query through the planner, collects KPI/chart/table
    outputs, and returns a merged dashboard response.

    Args:
        query: The user's natural language query.
        chat_id: Session ID used for chat history persistence.

    Returns:
        A dict with content, kpis, charts, and table keys,
        or a default error response if parsing fails.
    """
    # Ensure latest model is loaded on each pipeline run
    model = load_model()

    text_agent = create_text_agent(model)
    kpi_agent = create_kpi_agent(model)
    charts_agent = create_charts_agent(model)
    table_agent = create_table_agent(model)
    formatter_agent = create_formatter_agent(model)
    planner_agent = create_planner_agent(model)

    kpi_step = Step(name="KPI Step", agent=kpi_agent)
    table_step = Step(name="Table Step", agent=table_agent)
    text_step = Step(name="Text Step", agent=text_agent)

    def plan_and_route(
        step_input: StepInput,
    ) -> str | Step | list[Step]:
        """Select workflow steps based on the planner agent's decision.

        Args:
            step_input: The current workflow step input.

        Returns:
            A step name string or list of Step objects to execute.
        """
        response = planner_agent.run(step_input.input)
        plan = extract_json(response.content) or {}
        components = plan.get("components", [])

        if not components:
            return "Text Step"

        steps_to_run = []
        if "kpis" in components:
            steps_to_run.append(kpi_step)
        if "table" in components:
            steps_to_run.append(table_step)

        return steps_to_run if steps_to_run else "Text Step"

    def format_output(step_input: StepInput) -> StepOutput:
        """Merge all agent outputs into a single DashboardResponse JSON."""
        result = {
            "content": "",
            "kpis": None,
            "charts": None,
            "table": None,
        }

        kpi_raw = step_input.get_step_content("KPI Step")
        if kpi_raw:
            obj = extract_json(kpi_raw)
            if obj:
                result["kpis"] = obj.get("kpis")

        table_raw = step_input.get_step_content("Table Step")
        if table_raw:
            obj = extract_json(table_raw)
            if obj:
                result["table"] = obj.get("table")

        all_charts = []

        for _ in range(4):
            temp = charts_agent.run(step_input.input)
            res = extract_json(temp.content) or {}

            if res.get("done"):
                break

            chart_data = res.get("charts")

            if isinstance(chart_data, list):
                all_charts.extend(chart_data)
            elif chart_data:
                all_charts.append(chart_data)

        result["charts"] = all_charts if all_charts else None

        formatted = formatter_agent.run(json.dumps(result))
        formatted_obj = extract_json(formatted.content)

        return StepOutput(content=json.dumps(formatted_obj or result))

    workflow = Workflow(
        name="Dashboard Pipeline",
        steps=[
            Router(
                name="Planner Router",
                selector=plan_and_route,
                choices=[kpi_step, table_step, text_step],
            ),
            Step(name="Format Output", executor=format_output),
        ],
    )

    response = workflow.run(query, session_id=chat_id)
    result = extract_json(response.content)

    if not result:
        return {
            "content": "Unable to process query",
            "kpis": None,
            "charts": None,
            "table": None,
        }

    return result
