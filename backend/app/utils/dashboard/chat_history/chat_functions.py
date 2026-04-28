import os
import msgpack
import logging

logger = logging.getLogger(__name__)

FILE_PATH = "chats.msgpack"
SETTINGS_PATH = "settings.msgpack"


def load_chats() -> dict:
    if not os.path.exists(FILE_PATH):
        with open(FILE_PATH, "wb") as f:
            f.write(msgpack.packb({}, use_bin_type=True))
        return {}

    if os.path.getsize(FILE_PATH) == 0:
        return {}

    with open(FILE_PATH, "rb") as f:
        data = msgpack.unpackb(f.read(), raw=False)
        logger.info("loaded chats: %s", data)
        return data


def save_chats(data: dict) -> None:
    with open(FILE_PATH, "wb") as f:
        f.write(msgpack.packb(data, use_bin_type=True))


def load_settings():
    if not os.path.exists(SETTINGS_PATH):
        raise Exception("No model configured")

    if os.path.getsize(SETTINGS_PATH) == 0:
        raise Exception("No model chosen")

    with open(SETTINGS_PATH, "rb") as f:
        data = msgpack.unpackb(f.read(), raw=False)

    return data


def is_local_model(provider: str):
    return provider.lower() in ["ollama", "llama.cpp", "lmstudio", "vllm"]


def save_model(data):
    """
    Save model config into settings.msgpack
    """

    with open(SETTINGS_PATH, "wb") as f:
        f.write(msgpack.packb(data, use_bin_type=True))
