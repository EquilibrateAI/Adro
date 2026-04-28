import logging
from typing import Optional

import requests
from fastapi import APIRouter, HTTPException

from agno.agent import Agent
from utils.settings.models import create_model

router = APIRouter()
logger = logging.getLogger(__name__)


def validate(
    model_provider: str,
    api_key: Optional[str],
    port: Optional[int],
    model: Optional[str],
    baseUrl: Optional[str],
) -> bool:

    try:
        # ollama provider
        if model_provider == "ollama":

            if not port:
                logger.warning("port required for ollama")
                raise HTTPException(status_code=500, detail="port required")

            r = requests.get(
                f"http://localhost:{port}/api/tags", timeout=3
            )  # health check

            if r.status_code != 200:
                logger.warning("ollama not responding on port %s", port)
                raise HTTPException(
                    status_code=401, detail=f"Ollama not responding on port {port}"
                )

            models = [
                m["name"] for m in r.json()["models"]
            ]  # check for available models

            if model not in models:
                raise HTTPException(
                    status_code=401,
                    detail=f"Ollama model '{model}' not installed locally",
                )

            return True

        # llama.cpp model provider
        elif model_provider == "llama.cpp":
            logger.debug("llama cpp validation called")

            if not port:
                raise HTTPException(status_code=500, detail="port required")

            r = requests.get(f"http://localhost:{port}/health", timeout=3)

            if r.status_code != 200:
                raise HTTPException(
                    status_code=401, detail=f"llama.cpp not responding on port {port}"
                )

            return True

        # lm studio provider
        elif model_provider == "lmstudio":

            if not port:
                raise HTTPException(status_code=500, detail="port required")

            r = requests.get(f"http://localhost:{port}/v1/models", timeout=3)

            if r.status_code != 200:
                raise HTTPException(
                    status_code=401, detail=f"LM Studio not responding on port {port}"
                )

            models = [m["id"] for m in r.json()["data"]]  # check for required model

            if model not in models:
                raise HTTPException(
                    status_code=401, detail=f"Model '{model}' not loaded in LM Studio"
                )

            return True

        elif model_provider == "vllm":
            # input is full url example: "http://localhost:8000"
            if not baseUrl:
                raise HTTPException(status_code=500, detail="base url required")

            if baseUrl.endswith("/v1"):
                url = f"{baseUrl}/models"
            else:
                url = f"{baseUrl}/v1/models"
            try:
                r = requests.get(url, timeout=3)
                logger.debug("VLLM baseurl: %s", baseUrl)
            except requests.exceptions.RequestException:
                raise HTTPException(
                    status_code=401, detail=f"VLLM not reachable at {baseUrl}"
                )

            if r.status_code != 200:
                logger.warning("VLLM status code: %s", r.status_code)
                raise HTTPException(
                    status_code=401, detail=f"VLLM not responding at {url}"
                )
            return True

        model_instance = create_model(
            model_provider, api_key=api_key, port=port, model=model, baseUrl=baseUrl
        )

        agent = Agent(model=model_instance)

        response = agent.run("ping")

        if response.status.name == "completed":
            return True

        raise HTTPException(
            status_code=401, detail="Invalid API key or model connection failed"
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.error("connection failed:%s", str(e))
        raise HTTPException(
            status_code=401, detail=f"{model_provider} connection failed"
        )
