from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Moda Flow"
    database_url: str = "postgresql+psycopg://modaflow:modaflow@db:5432/modaflow"
    secret_key: str = "modaflow-dev-secret-change-me-0123456789abcdef"
    access_token_expire_minutes: int = 60 * 12
    # Palavra-passe inicial dos utilizadores criados pelo seed (env SEED_USER_PASSWORD).
    seed_user_password: str = "ModaFlow2026!"
    # Origens permitidas no CORS, separadas por vírgula (env CORS_ORIGINS).
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
