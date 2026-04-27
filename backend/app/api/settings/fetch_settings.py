import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.settings.api_ping import validate
from utils.dashboard.chat_history.chat_functions import load_settings, save_model

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Settings Fetch"])


FILE_PATH = "settings.msgpack"


class Ping(BaseModel):
    api_key: str | None = None
    model_provider: str
    port: str | None = None
    model: str | None = None
    baseUrl: str | None = None


@router.get("/fetch-settings")
def fetch_settings():
    """Fetch saved model configuration from the settings store.

    Returns:
        dict: Status and the loaded settings data.
    """

    data = load_settings()

    return {"status": "success", "settings": data}


@router.post("/ping")
def ping(data: Ping):
    logger.info("data: %s", data)

    valid = validate(
        data.model_provider.lower(),
        data.api_key,
        data.port,
        data.model,
        data.baseUrl,
    )

    payload = {
        "model_provider": data.model_provider.lower(),
        "api_key": data.api_key,
        "port": data.port,
        "model": data.model,
        "baseUrl": data.baseUrl,
    }

    print("SAVING SETTINGS:", payload)

    try:
        save_model(payload)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save into msgpack file")

    return {
        "modelprovider": data.model_provider,
        "model": data.model,
        "valid": valid,
        "baseUrl": data.baseUrl,
    }
