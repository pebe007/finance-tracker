"""Seed default + custom categories. Safe to re-run — skips existing names."""
from sqlalchemy.orm import Session

from models import Category

DEFAULT_CATEGORIES = [
    # ── Phoebe's personal categories ──
    {"name": "Work Stuff",      "type": "expense", "icon": "💼", "color": "#6366F1"},
    {"name": "Spotify",         "type": "expense", "icon": "🎵", "color": "#1DB954"},
    {"name": "Claude",          "type": "expense", "icon": "🤖", "color": "#CC785C"},
    {"name": "Jajan Maow",      "type": "expense", "icon": "🐱", "color": "#F97316"},
    {"name": "Jajan Keluarga",  "type": "expense", "icon": "👨‍👩‍👧", "color": "#EC4899"},
    {"name": "Tabungan",        "type": "expense", "icon": "🐷", "color": "#22C55E"},
    # ── General expenses ──
    {"name": "Makan",           "type": "expense", "icon": "🍜", "color": "#F59E0B"},
    {"name": "Transport",       "type": "expense", "icon": "🚗", "color": "#3B82F6"},
    {"name": "Tagihan",         "type": "expense", "icon": "⚡", "color": "#8B5CF6"},
    {"name": "Kesehatan",       "type": "expense", "icon": "💊", "color": "#EF4444"},
    {"name": "Belanja",         "type": "expense", "icon": "🛍️", "color": "#FB923C"},
    {"name": "Lainnya",         "type": "expense", "icon": "📦", "color": "#6B7280"},
    # ── Income ──
    {"name": "Gaji",            "type": "income",  "icon": "💰", "color": "#22C55E"},
    {"name": "Freelance",       "type": "income",  "icon": "💻", "color": "#06B6D4"},
    {"name": "Investasi",       "type": "income",  "icon": "📈", "color": "#84CC16"},
]


def seed_categories(db: Session) -> None:
    """Insert categories that don't already exist (idempotent)."""
    existing_names = {row.name for row in db.query(Category.name).all()}
    new_entries = [
        Category(**data)
        for data in DEFAULT_CATEGORIES
        if data["name"] not in existing_names
    ]
    if new_entries:
        db.add_all(new_entries)
        db.commit()
