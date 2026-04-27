import logging
from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from utils.dashboard.chat_history.chat_functions import (
    is_local_model,
    load_chats,
    load_settings,
    save_chats,
)

from utils.dashboard.llm_engine.json_utils import extract_json
from utils.dashboard.llm_engine.llm_agent_single import (
    format_agent_response,
    get_agent,
)
from utils.dashboard.llm_engine.llm_agent_team import run_dashboard_pipeline

router = APIRouter(tags=["Dashboard"])

# Message ID prefixes: "U" = user message, "B" = bot message
USER_PREFIX = "U"
BOT_PREFIX = "B"

logger = logging.getLogger(__name__)


class Message(BaseModel):
    chat_id: str
    message_id: str
    file_name: str
    message: str
    title: str


def _run_agent(query: str, chat_id: str, settings: dict) -> dict:
    """Run the appropriate LLM agent based on model provider settings.

    Args:
        query: The formatted query string with file name and user message.
        chat_id: The current chat session ID.
        settings: Loaded settings dict containing model_provider.

    Returns:
        dict: Agent result with content, kpis, charts, and table fields.
    """
    try:
        if is_local_model(settings["model_provider"]):
            logger.info(
                "Using local model provider: %s", settings.get("model_provider")
            )
            return run_dashboard_pipeline(query=query, chat_id=chat_id)

        agent = get_agent()
        response = agent.run(input=query, session_id=chat_id)
        result = extract_json(response.content)
        return format_agent_response(result)

    except Exception as e:
        logger.error("Agent failed: %s", str(e))
        return {
            "content": f"Error occurred: {str(e)}",
            "kpis": [],
            "charts": [],
            "table": [],
        }


@router.post("/dashboard-generation")
def dashboard(data: Message) -> dict:
    """Run the full agentic workflow for dashboard generation.

    Args:
        data: Request body containing chat_id, message_id,
              file_name, message, and title.

    Returns:
        dict: chat_id, message_id, and the generated result.
    """
    try:
        chats = load_chats()
        settings = load_settings()

        if data.chat_id not in chats:
            chats[data.chat_id] = {
                "chat_id": data.chat_id,
                "title": data.title,
                "created_at": str(date.today()),
                "messages": [],
            }

        chats[data.chat_id]["messages"].append(
            {
                "message_id": data.message_id,
                "role": "user",
                "content": {"query": data.message},
                "created_at": str(date.today()),
            }
        )

        query = f"file_name={data.file_name}, query={data.message}"
        logger.info("Running dashboard agent for query: %s", query)

        result = _run_agent(
            query=query,
            chat_id=data.chat_id,
            settings=settings,
        )
        logger.info("Agent result: %s", result)

        if data.message_id.startswith(USER_PREFIX):
            bot_message_id = BOT_PREFIX + data.message_id[1:]
        else:
            bot_message_id = f"{BOT_PREFIX}_{data.chat_id}_0001"

        chats[data.chat_id]["messages"].append(
            {
                "message_id": bot_message_id,
                "role": "bot",
                "content": {"result": result},
                "created_at": str(date.today()),
            }
        )

        save_chats(chats)

        return {
            "chat_id": data.chat_id,
            "message_id": bot_message_id,
            "result": result,
        }

    except Exception as e:
        logger.error("Dashboard generation failed: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))
