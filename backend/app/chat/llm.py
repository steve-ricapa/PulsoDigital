from langchain_openai import ChatOpenAI
from app.chat.config import FOUNDRY_BASE_URL, FOUNDRY_API_KEY, FOUNDRY_MODEL

_llm_instance = None


def get_llm() -> ChatOpenAI:
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = ChatOpenAI(
            model=FOUNDRY_MODEL,
            api_key=FOUNDRY_API_KEY,
            base_url=FOUNDRY_BASE_URL,
            temperature=0.3,
            max_tokens=1024,
        )
    return _llm_instance
