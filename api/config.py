import os
from functools import lru_cache
from pydantic import BaseModel


class Config(BaseModel):
    supabase_url: str = ""
    supabase_key: str = ""
    hosted_api_key: str = ""
    hosted_provider: str = "groq"
    show_api_input: bool = True
    enable_logging: bool = True
    debug: bool = False


@lru_cache(maxsize=1)
def get_config() -> Config:
    return Config(
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_key=os.getenv("SUPABASE_KEY", ""),
        hosted_api_key=os.getenv("HOSTED_API_KEY", ""),
        hosted_provider=os.getenv("HOSTED_PROVIDER", "groq"),
        show_api_input=os.getenv("SHOW_API_INPUT", "true").lower() != "false",
        enable_logging=os.getenv("ENABLE_LOGGING", "true").lower() != "false",
        debug=os.getenv("DEBUG", "false").lower() == "true",
    )
