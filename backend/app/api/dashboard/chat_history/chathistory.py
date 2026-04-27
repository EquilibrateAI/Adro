# API to fetch all the chat ids + messages
# (user query + LLM responses)
# get titles functionality also here
# update titles

import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from utils.dashboard.chat_history.chat_functions import load_chats, save_chats

router = APIRouter(tags=["Chat history"])

FILE_PATH = "chats.msgpack"

logger = logging.getLogger(__name__)


class UpdateTitleRequest(BaseModel):
    chat_id: str
    title: str


@router.put("/update-title")
async def update_chat_title(data: UpdateTitleRequest) -> dict:
    """Update the title of a chat by chat_id.

    Args:
        data: Request body containing chat_id and new title.

    Returns:
        dict: Updated title and confirmation message.
    """
    try:
        chats = load_chats()

        if data.chat_id not in chats or not isinstance(chats[data.chat_id], dict):
            logger.warning("Chat ID not found or invalid: %s", data.chat_id)
            raise HTTPException(status_code=404, detail="Chat not found")

        chats[data.chat_id]["title"] = data.title
        save_chats(chats)

        return {
            "title": data.title,
            "message": f"title updated to {data.title}",
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(status_code=500, detail="server error")


@router.get("/chat-history")
def get_history(request: Request) -> dict:
    """Fetch chat history for a given chat_id.

    Args:
        request: FastAPI Request object with chat_id as a query parameter.

    Returns:
        dict: chat_id, title, and messages for the specified chat.
    """
    chat_id = request.query_params.get("chat_id")
    logger.info("Fetching history for chat_id: %s", chat_id)

    try:
        chats = load_chats()

        if chat_id not in chats or not isinstance(chats[chat_id], dict):
            logger.warning("Chat ID not found or invalid: %s", chat_id)
            raise HTTPException(status_code=404, detail="Chat not found")

        return {
            "chat_id": chat_id,
            "title": chats[chat_id]["title"],
            "messages": chats[chat_id]["messages"],
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error("Failed to fetch chat history: %s", str(e))
        raise HTTPException(status_code=500, detail="server error")


@router.get("/get-titles")
async def get_titles() -> dict:
    """Fetch all existing chat titles and their corresponding chat_ids.

    Returns:
        dict: List of chats with chat_id and title, or a message if none exist.
    """
    try:
        chats = load_chats()
        logger.info("Fetched %d chats", len(chats))

        result = [
            {"chat_id": chat_id, "title": chat_data.get("title")}
            for chat_id, chat_data in chats.items()
            if isinstance(chat_data, dict)
        ]

        if not result:
            return {"message": "no chats available"}

        return {"chats": result}

    except Exception as e:
        logger.error("Failed to fetch titles: %s", str(e))
        raise HTTPException(status_code=500, detail="server error")


@router.delete("/delete-chat")
async def delete_chat(chat_id: str) -> dict:
    """Hard delete a chat based on chat_id.

    Args:
        chat_id: The ID of the chat to delete.

    Returns:
        dict: Confirmation message on successful deletion.
    """
    try:
        chats = load_chats()

        if chat_id not in chats or not isinstance(chats[chat_id], dict):
            raise HTTPException(status_code=404, detail="Chat not found")

        del chats[chat_id]
        save_chats(chats)

        return {"message": f"chat {chat_id} deleted successfully"}

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(status_code=500, detail="server error")
