from agno.models.openai import OpenAIChat
from agno.models.anthropic import Claude
from agno.models.google import Gemini
from agno.models.groq import Groq
from agno.models.openrouter import OpenRouter
from agno.models.ollama import Ollama
from agno.models.llama_cpp import LlamaCpp
from agno.models.lmstudio import LMStudio
from agno.models.vllm import VLLM

FILE_PATH = "settings.msgpack"


def create_model(provider, api_key=None, port=None, model=None, baseUrl=None):
    provider = provider.lower()

    if provider == "openai":
        return OpenAIChat(id=model, api_key=api_key)

    elif provider == "claude":
        return Claude(
            cache_system_prompt=True,
            extended_cache_time=True,
            id=model,
            api_key=api_key,
        )

    elif provider == "gemini":
        return Gemini(id=model, api_key=api_key)

    elif provider == "groq":
        return Groq(id=model, api_key=api_key)

    elif provider == "openrouter":
        return OpenRouter(id=model, api_key=api_key)

    elif provider == "ollama":
        return Ollama(id=model, host=f"http://localhost:{port}")

    elif provider == "llama.cpp":
        return LlamaCpp(
            id=model,
            base_url=f"http://localhost:{port}/v1",
            api_key="none",
        )

    elif provider == "lmstudio":
        return LMStudio(
            id=model,
            base_url=f"http://localhost:{port}/v1",
            api_key="none",
        )

    elif provider == "vllm":
        print("USING VLLM WITH:", baseUrl)

        if not baseUrl:
            raise ValueError("baseUrl is required for vllm")

        # normalize
        if not baseUrl.endswith("/v1"):
            baseUrl = f"{baseUrl}/v1"

        return VLLM(id=model, api_key="EMPTY", base_url=baseUrl)

    else:
        raise Exception("Unsupported model provider")
