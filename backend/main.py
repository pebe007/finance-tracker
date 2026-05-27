from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, SessionLocal, engine
from models import Budget, Category, Transaction  # noqa: F401 — ensures models are registered
from routers import app_settings, auth, budgets, categories, summary, telegram, transactions
from services.seed import seed_categories

# Create all tables on startup (Alembic handles migrations in prod)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance Tracker API", version="1.0.0")

# CORS — allow the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(budgets.router)
app.include_router(summary.router)
app.include_router(app_settings.router)
app.include_router(telegram.router)   # /telegram/webhook — no auth, called by Telegram


@app.on_event("startup")
def on_startup() -> None:
    """Seed default categories on first run."""
    db = SessionLocal()
    try:
        seed_categories(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
