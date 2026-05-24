from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    # Render provides DATABASE_URL automatically when a Postgres DB is attached.
    # Falls back to SQLite for local dev without a Postgres instance.
    database_url: str = "sqlite:///./finance.db"

    # ── Auth ──────────────────────────────────────────────────────────────────
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours
    admin_password: str = "changeme"

    # ── CORS ──────────────────────────────────────────────────────────────────
    frontend_url: str = "http://localhost:5173"

    # ── NLP (Groq — free tier) ────────────────────────────────────────────────
    # Get a free key at https://console.groq.com
    groq_api_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def db_url(self) -> str:
        """
        Normalise Render's 'postgres://' prefix to 'postgresql+psycopg2://'
        so SQLAlchemy 2.x accepts it without deprecation warnings.
        """
        url = self.database_url
        if url.startswith("postgres://"):
            url = "postgresql+psycopg2://" + url[len("postgres://"):]
        elif url.startswith("postgresql://") and "+psycopg2" not in url:
            url = "postgresql+psycopg2://" + url[len("postgresql://"):]
        return url


settings = Settings()
