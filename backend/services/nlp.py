"""Groq-powered NLP transaction parser.

Converts natural language like "grabbed lunch with the team, cost about 85k"
into structured transaction fields.

Falls back to the regex parser if:
  - GROQ_API_KEY is not set
  - Groq returns an unparseable response
  - Any network/API error occurs

Free tier limits: 30 req/min, 6 000 req/day (Llama 3.3 70B).
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, timedelta
from typing import Any

from config import settings

logger = logging.getLogger(__name__)

# ─── Regex fallback (original parser, kept here) ──────────────────────────────

_MULTIPLIERS: dict[str, int] = {
    "rb": 1_000, "k": 1_000,
    "jt": 1_000_000, "m": 1_000_000,
    "b": 1_000_000_000,
}


def _parse_amount_token(token: str) -> float | None:
    token = token.lower().strip()
    for suffix, mult in _MULTIPLIERS.items():
        if token.endswith(suffix):
            numeric = token[: -len(suffix)].replace(",", ".")
            try:
                return float(numeric) * mult
            except ValueError:
                return None
    clean = token.replace(",", "").replace(".", "")
    return float(clean) if re.match(r"^\d+$", clean) else None


def parse_regex(text: str) -> dict[str, Any] | None:
    """Simple regex parser — used as fallback when Groq is unavailable."""
    parts = text.strip().split()
    if len(parts) < 2:
        return None

    tx_type = "expense"
    last = parts[-1].lower()
    if last in ("income", "masuk", "in", "pemasukan"):
        tx_type = "income"
        parts = parts[:-1]
    elif last in ("expense", "keluar", "out", "ex", "pengeluaran"):
        parts = parts[:-1]

    if len(parts) < 2:
        return None

    amount = _parse_amount_token(parts[-1])
    if amount is None or amount <= 0:
        return None

    description = " ".join(parts[:-1]).strip() or None
    return {
        "amount": amount,
        "type": tx_type,
        "description": description,
        "category_id": None,
        "date": date.today().isoformat(),
    }


# ─── Groq NLP parser ─────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a financial transaction parser for a personal finance app.
Extract transaction details from natural language input and return ONLY valid JSON.

The user's available categories are provided in each request.
Pick the best matching category_id or null if none fits.

Date rules:
- "today" / no date mention → date_offset: 0
- "yesterday" → date_offset: -1
- "last [weekday]" → estimate offset (e.g. last Monday from Thursday ≈ -3)
- Specific date like "May 5" → compute offset from today

Amount rules:
- Always return a positive number in IDR (Indonesian Rupiah)
- Shorthand: 85k=85000, 1.5jt=1500000, 2m=2000000, 50rb=50000

Response schema (JSON only, no prose):
{
  "amount": <number>,
  "type": "expense" | "income",
  "description": "<concise description>",
  "category_id": <integer | null>,
  "date_offset": <integer days from today, 0=today>
}
"""


async def parse_with_groq(
    text: str,
    categories: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """
    Call Groq API (async) to parse a natural language transaction.
    Returns structured dict or None on failure.
    """
    if not settings.groq_api_key:
        return None

    try:
        from groq import AsyncGroq  # imported lazily so missing package doesn't crash startup
    except ImportError:
        logger.warning("groq package not installed — NLP unavailable")
        return None

    # Build a compact category list for the prompt
    cat_lines = "\n".join(
        f"  id={c['id']} name={c['name']} type={c['type']}"
        for c in categories
    )
    user_message = f"Categories:\n{cat_lines}\n\nTransaction: \"{text}\""

    try:
        client = AsyncGroq(api_key=settings.groq_api_key)
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=256,
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)

        # Validate required fields
        amount = float(data.get("amount", 0))
        tx_type = data.get("type", "expense")
        if amount <= 0 or tx_type not in ("income", "expense"):
            raise ValueError(f"Invalid parsed data: {data}")

        offset = int(data.get("date_offset", 0))
        tx_date = (date.today() + timedelta(days=offset)).isoformat()

        return {
            "amount": amount,
            "type": tx_type,
            "description": data.get("description") or None,
            "category_id": data.get("category_id"),  # may be null
            "date": tx_date,
        }

    except Exception as exc:  # noqa: BLE001
        logger.warning("Groq parse failed (%s) — falling back to regex", exc)
        return None


async def parse_transaction(
    text: str,
    categories: list[dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    """
    Primary entry point. Tries Groq first, falls back to regex.
    Returns None if neither parser can extract a valid transaction.
    """
    cats = categories or []

    # Try Groq
    result = await parse_with_groq(text, cats)
    if result:
        logger.debug("NLP parsed via Groq: %s", result)
        return result

    # Regex fallback
    result = parse_regex(text)
    if result:
        logger.debug("NLP parsed via regex fallback: %s", result)
    return result
