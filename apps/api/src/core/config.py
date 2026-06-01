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
    APP_URL: str = "http://localhost:3000"
    META_APP_ID: str
    META_CLIENT_SECRET: str
    META_DEV_TOKEN: str = ""
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    NEXT_PUBLIC_SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    model_config = SettingsConfigDict(env_file=env_file_path, extra="ignore")

settings = Settings()
