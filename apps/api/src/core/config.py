import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# Dynamically locate the .env in the workspace root
current_dir = os.path.dirname(os.path.abspath(__file__))
env_file_path = os.path.join(current_dir, "../../../..", ".env")

class Settings(BaseSettings):
    NODE_ENV: str = "development"
    DATABASE_URL: str
    REDIS_URL: str
    API_PORT: int = 8000
    META_APP_ID: str
    META_CLIENT_SECRET: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    
    model_config = SettingsConfigDict(env_file=env_file_path, extra="ignore")

settings = Settings()
