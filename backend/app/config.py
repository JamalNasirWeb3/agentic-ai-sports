from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    allowed_origins: str = "http://localhost:3000,http://localhost:3001"

    model_config = {"env_file": ".env"}


settings = Settings()
