"""One Smart PWA — FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, BackgroundTasks
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date
from pathlib import Path
import os
import uuid
import logging
import hashlib
import jwt
import json
import asyncio
import httpx

from data_store import (
    SCHOLARSHIPS,
    TOP_COMPANIES,
    FREELANCE_SITES,
    STOCKS_ID,
    STOCKS_GLOBAL,
    ALT_INVESTMENTS,
    JOB_TRENDS,
    BEST_CITIES,
    TECH_GADGETS,
    TRAVEL_ID,
    JAKARTA_AGENDA,
    OWID_INSIGHTS,
    PORTFOLIO_TIPS,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
DEFAULT_PASSCODE = os.environ.get("DEFAULT_PASSCODE", "991285")
# ── Perplexity (Sonar) AI configuration ──────────────────────────────────────
# All AI features were migrated from Anthropic (Claude) to Perplexity (Sonar).
# Sonar models are web-grounded by default -- no separate "web_search" tool
# needs to be attached, unlike the old Anthropic integration.
# We accept PERPLEXITY_API_KEY as the primary env var, but fall back to
# ANTHROPIC_API_KEY too in case the same Render env var slot was reused with a
# new Perplexity key value instead of being renamed.
PERPLEXITY_API_KEY = os.environ.get("PERPLEXITY_API_KEY") or os.environ.get("ANTHROPIC_API_KEY", "")
PERPLEXITY_BASE_URL = "https://api.perplexity.ai"
AI_MODEL = "sonar-pro"        # Production-quality, multi-source, web-grounded — used for ~everything
AI_WEB_MODEL = "sonar-pro"    # Alias for code paths that used to force web search explicitly
AI_FAST_MODEL = "sonar"       # Cheaper/faster web-grounded model (quick generation: cities/travel rotation)
# NOTE: we deliberately do NOT use "sonar-reasoning-pro" anywhere in this app.
# Reasoning models spend part of max_tokens on hidden chain-of-thought before
# writing the final answer; in production this repeatedly produced EMPTY
# `message.content` (once the token budget ran out mid-thought) and was much
# slower end-to-end. sonar-pro gives comprehensive, web-grounded, well-cited
# answers directly, with no hidden-reasoning failure mode.
AI_DEEP_MODEL = "sonar-pro"   # Kept as an alias (used for long-form: news, jakarta, stock analysis)


def _auto_fallback(model: str) -> str:
    """Pick a sensible fallback model different from the primary one."""
    return AI_FAST_MODEL if model != AI_FAST_MODEL else AI_MODEL


async def call_perplexity(messages, model=AI_MODEL, max_tokens=3000, temperature=0.4,
                           return_images=False, search_recency=None, timeout=60,
                           fallback_model="auto"):
    """Call the Perplexity Sonar chat-completions API directly over HTTP.

    We use raw httpx (not the OpenAI SDK) so we have full access to
    Perplexity-specific response fields like `images` and `citations`,
    which aren't part of the standard OpenAI ChatCompletion schema.

    Resilience built in (so the user should never see a raw AI error):
    - If `return_images` is rejected by the account/plan (HTTP 4xx), we
      automatically retry the same request without it.
    - If the model returns empty/None content (the failure mode we hit with
      reasoning models), we automatically retry once with `fallback_model`
      (defaults to a different, known-reliable Sonar model).

    Returns dict: {text, images, citations, raw}.
    """
    if not PERPLEXITY_API_KEY:
        raise RuntimeError("PERPLEXITY_API_KEY not configured")
    if fallback_model == "auto":
        fallback_model = _auto_fallback(model)

    async def _once(m: str, with_images: bool):
        payload = {
            "model": m,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if with_images:
            payload["return_images"] = True
        if search_recency:
            payload["search_recency_filter"] = search_recency  # "day" | "week" | "month"
        async with httpx.AsyncClient(timeout=timeout) as http_client:
            resp = await http_client.post(
                f"{PERPLEXITY_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
        text = data["choices"][0]["message"]["content"]
        images = data.get("images") or []
        citations = data.get("citations") or []
        return text, images, citations, data

    # Attempt 1: as requested.
    try:
        text, images, citations, raw = await _once(model, return_images)
    except httpx.HTTPStatusError as e:
        if return_images:
            # Some account tiers reject return_images with a 4xx — retry without it
            # instead of failing the whole request.
            logger.warning("Perplexity return_images rejected (%s), retrying without it", e)
            text, images, citations, raw = await _once(model, False)
        else:
            raise

    # Attempt 2: primary model returned nothing usable -> try fallback model.
    if (not text or not str(text).strip()) and fallback_model and fallback_model != model:
        logger.warning("Perplexity model %s returned empty content, retrying with %s", model, fallback_model)
        try:
            text, images, citations, raw = await _once(fallback_model, return_images)
        except httpx.HTTPStatusError as e:
            if return_images:
                text, images, citations, raw = await _once(fallback_model, False)
            else:
                raise

    if not text or not str(text).strip():
        raise RuntimeError(
            f"Perplexity returned empty content from both '{model}' and fallback '{fallback_model}'"
        )

    return {"text": text, "images": images, "citations": citations, "raw": raw}


def extract_json_block(text: str):
    """Strip markdown code fences and return the substring between the first
    [ or { and its matching closing bracket, then json.loads it."""
    text = text.strip()
    if "```" in text:
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    arr_start, obj_start = text.find("["), text.find("{")
    if arr_start == -1 and obj_start == -1:
        raise ValueError("No JSON found in AI response")
    if arr_start != -1 and (obj_start == -1 or arr_start < obj_start):
        start, end = arr_start, text.rfind("]")
    else:
        start, end = obj_start, text.rfind("}")
    return json.loads(text[start:end + 1])
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY_PEM = os.environ.get("VAPID_PRIVATE_KEY_PEM", "").replace("\\n", "\n")
VAPID_CLAIM_EMAIL = os.environ.get("VAPID_CLAIM_EMAIL", "admin@onesmart.app")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="One Smart API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("one-smart")
logging.basicConfig(level=logging.INFO)


# ============== UTIL ==============
def hash_passcode(passcode: str) -> str:
    return hashlib.sha256((passcode + JWT_SECRET).encode()).hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_token(uid: str) -> str:
    payload = {
        "uid": uid,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["uid"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user


async def ensure_default_user():
    """Seed singleton default user if missing, and sync passcode hash with current env."""
    existing = await db.users.find_one({"id": "default"})
    current_hash = hash_passcode(DEFAULT_PASSCODE)
    if not existing:
        await db.users.insert_one({
            "id": "default",
            "name": "One Smart",
            "dob": None,
            "passcode_hash": current_hash,
            "language": "id",
            "created_at": now_iso(),
        })
        logger.info("Seeded default user with passcode %s", DEFAULT_PASSCODE)
    elif existing.get("passcode_hash") != current_hash:
        await db.users.update_one({"id": "default"}, {"$set": {"passcode_hash": current_hash}})
        logger.info("Updated default user passcode hash (env changed)")


# ============== MODELS ==============
class LoginReq(BaseModel):
    passcode: str


class ChangePasscodeReq(BaseModel):
    old_passcode: str
    new_passcode: str


class ProfileUpdate(BaseModel):
    dob: Optional[str] = None  # ISO YYYY-MM-DD
    language: Optional[str] = None
    name: Optional[str] = None
    theme: Optional[str] = None  # "light" | "dark"


class AIInsightReq(BaseModel):
    topic: str  # e.g. "scholarship", "salary", "stock", "portfolio_job"
    context: dict
    language: str = "id"


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AIChatReq(BaseModel):
    messages: List[ChatMessage]
    context: dict = {}
    language: str = "id"


class SimulatorReq(BaseModel):
    capital_idr: float           # e.g. 50_000_000
    risk_profile: str = "moderate"  # conservative | moderate | aggressive
    horizon_years: int = 5
    goals: str = ""              # optional user goal text
    language: str = "id"


class NoteCreate(BaseModel):
    title: str
    content: str = ""
    list_type: str = "bullet"  # bullet | numbered | plain
    items: List[dict] = []
    reminder_at: Optional[str] = None  # ISO datetime
    recurrence: Optional[str] = None  # none | daily | weekly | monthly


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    list_type: Optional[str] = None
    items: Optional[List[dict]] = None
    reminder_at: Optional[str] = None
    recurrence: Optional[str] = None
    done: Optional[bool] = None


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict


# ============== AUTH ==============
@api.post("/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"id": "default"}, {"_id": 0})
    if not user:
        await ensure_default_user()
        user = await db.users.find_one({"id": "default"}, {"_id": 0})
    if user["passcode_hash"] != hash_passcode(req.passcode):
        raise HTTPException(401, "Passcode salah")
    token = make_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user.get("name"), "dob": user.get("dob"), "language": user.get("language", "id"), "theme": user.get("theme", "light")}}


@api.get("/auth/me")
async def me(user: dict = Depends(get_user)):
    return {"id": user["id"], "name": user.get("name"), "dob": user.get("dob"), "language": user.get("language", "id"), "theme": user.get("theme", "light")}


@api.post("/auth/change-passcode")
async def change_passcode(req: ChangePasscodeReq, user: dict = Depends(get_user)):
    if user["passcode_hash"] != hash_passcode(req.old_passcode):
        raise HTTPException(401, "Passcode lama salah")
    if not (req.new_passcode.isdigit() and len(req.new_passcode) == 6):
        raise HTTPException(400, "Passcode baru harus 6 digit angka")
    await db.users.update_one({"id": user["id"]}, {"$set": {"passcode_hash": hash_passcode(req.new_passcode)}})
    return {"ok": True}


@api.post("/auth/profile")
async def update_profile(req: ProfileUpdate, user: dict = Depends(get_user)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    refreshed = await db.users.find_one({"id": user["id"]}, {"_id": 0, "passcode_hash": 0})
    return refreshed


# ============== EDUCATION ==============
def calc_age(dob_str: Optional[str]) -> Optional[int]:
    if not dob_str:
        return None
    try:
        dob = date.fromisoformat(dob_str)
        today = date.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        return None


@api.get("/education/scholarships")
async def list_scholarships(user: dict = Depends(get_user), age: Optional[int] = None):
    user_age = age if age is not None else calc_age(user.get("dob"))
    items = SCHOLARSHIPS
    if user_age is not None:
        eligible = []
        for s in items:
            min_ok = s["age_min"] is None or user_age >= s["age_min"]
            max_ok = s["age_max"] is None or user_age <= s["age_max"]
            if min_ok and max_ok:
                eligible.append({**s, "eligible": True})
            else:
                eligible.append({**s, "eligible": False, "reason": f"Usia maks {s['age_max']}" if s["age_max"] and user_age > s["age_max"] else "Usia tidak memenuhi"})
        return {"age": user_age, "items": eligible}
    return {"age": None, "items": [{**s, "eligible": True} for s in items]}


@api.get("/education/portfolio-tips")
async def edu_portfolio_tips():
    return {"tips": PORTFOLIO_TIPS["scholarship"]}


# ============== JOB ==============
@api.get("/job/companies")
async def list_companies(location: Optional[str] = None):
    items = TOP_COMPANIES
    if location:
        items = [c for c in items if location.lower() in c["location"].lower()]
    return {"items": items}


@api.get("/job/freelance-sites")
async def freelance_sites():
    return {"items": FREELANCE_SITES}


@api.get("/job/trends")
async def job_trends():
    return JOB_TRENDS


@api.get("/job/portfolio-tips")
async def job_portfolio_tips():
    return {"job": PORTFOLIO_TIPS["job"], "freelance": PORTFOLIO_TIPS["freelance"]}


# ============== INVESTMENT ==============
async def _enrich_with_live_prices(stocks, suffix, price_key):
    """Fetch live prices from Yahoo Finance for a list of stocks. suffix='.JK' for IDX, '' for global."""
    async def fetch_one(s, hx):
        try:
            sym = s["ticker"].replace(".", "-") + suffix
            r = await hx.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}",
                params={"interval": "1d", "range": "2d"},
                headers={"User-Agent": "Mozilla/5.0"},
            )
            d = r.json()
            meta = d["chart"]["result"][0]["meta"]
            price = meta.get("regularMarketPrice")
            prev = meta.get("previousClose") or meta.get("chartPreviousClose")
            if price:
                s = {**s, price_key: round(price, 2)}
                if prev:
                    s["change_pct"] = round((price - prev) / prev * 100, 2)
                s["live"] = True
        except Exception:
            s = {**s, "live": False}
        return s

    import asyncio as _a
    async with httpx.AsyncClient(timeout=10.0) as hx:
        results = await _a.gather(*[fetch_one(s, hx) for s in stocks])
    return list(results)


@api.get("/investment/stocks-id")
async def stocks_id():
    cache = getattr(stocks_id, "_cache", None)
    now = datetime.now(timezone.utc)
    if cache and (now - cache["t"]).total_seconds() < 120:
        return cache["data"]
    items = await _enrich_with_live_prices(STOCKS_ID, ".JK", "price_idr")
    data = {"items": items, "updated_at": now_iso()}
    stocks_id._cache = {"t": now, "data": data}
    return data


@api.get("/investment/stocks-global")
async def stocks_global():
    cache = getattr(stocks_global, "_cache", None)
    now = datetime.now(timezone.utc)
    if cache and (now - cache["t"]).total_seconds() < 120:
        return cache["data"]
    items = await _enrich_with_live_prices(STOCKS_GLOBAL, "", "price_usd")
    data = {"items": items, "updated_at": now_iso()}
    stocks_global._cache = {"t": now, "data": data}
    return data


@api.get("/investment/alternatives")
async def alternatives():
    return {"items": ALT_INVESTMENTS}


@api.get("/investment/market-overview")
async def market_overview():
    """Live data: USD/IDR via frankfurter, BTC/ETH via CoinGecko (60s cache), plus curated IHSG, Emas."""
    # 60s in-memory cache
    cache = getattr(market_overview, "_cache", None)
    now = datetime.now(timezone.utc)
    if cache and (now - cache["t"]).total_seconds() < 60:
        return cache["data"]

    result = {
        "usd_idr": None,
        "ihsg": None,
        "gold_usd_oz": None,
        "gold_idr_gram": None,
        "btc_usd": None,
        "eth_usd": None,
        "updated_at": now_iso(),
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as hx:
            # IHSG via Yahoo Finance unofficial endpoint (no API key)
            try:
                r = await hx.get(
                    "https://query1.finance.yahoo.com/v8/finance/chart/%5EJKSE",
                    params={"interval": "1d", "range": "5d"},
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                d = r.json()
                meta = d["chart"]["result"][0]["meta"]
                price = meta.get("regularMarketPrice") or meta.get("previousClose")
                prev = meta.get("previousClose") or meta.get("chartPreviousClose")
                change_pct = ((price - prev) / prev * 100) if prev and price else 0
                result["ihsg"] = {"value": round(price, 2), "prev_value": round(prev, 2) if prev else None, "change_pct": round(change_pct, 2), "source": "Yahoo Finance"}
            except Exception as e:
                logger.warning("IHSG fetch failed: %s", e)
                result["ihsg"] = {"value": 7382.5, "change_pct": 0.0, "source": "Cached estimate"}
            # USD/IDR (no-key sources: frankfurter primary, open.er-api fallback)
            try:
                r = await hx.get("https://api.frankfurter.dev/v1/latest", params={"base": "USD", "symbols": "IDR"})
                d = r.json()
                if d.get("rates", {}).get("IDR"):
                    usd_val = d["rates"]["IDR"]
                    result["usd_idr"] = {"value": usd_val, "source": "frankfurter.dev"}
            except Exception as e:
                logger.warning("Frankfurter failed: %s", e)
            # Get USD/IDR prev_value from Yahoo Finance (always has previousClose, works on weekends)
            try:
                r = await hx.get(
                    "https://query1.finance.yahoo.com/v8/finance/chart/IDR%3DX",
                    params={"interval": "1d", "range": "5d"},
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                d = r.json()
                meta = d["chart"]["result"][0]["meta"]
                yf_cur = meta.get("regularMarketPrice")
                yf_prev = meta.get("previousClose")
                if yf_cur and not result["usd_idr"]:
                    result["usd_idr"] = {"value": round(yf_cur, 0), "source": "Yahoo Finance"}
                if yf_prev and result["usd_idr"]:
                    result["usd_idr"]["prev_value"] = round(yf_prev, 0)
            except Exception as e:
                logger.warning("Yahoo USD/IDR prev failed: %s", e)
            if not result["usd_idr"]:
                try:
                    r = await hx.get("https://open.er-api.com/v6/latest/USD")
                    d = r.json()
                    if d.get("rates", {}).get("IDR"):
                        result["usd_idr"] = {"value": d["rates"]["IDR"], "source": "open.er-api"}
                except Exception as e:
                    logger.warning("open.er-api failed: %s", e)
            # BTC/ETH via Binance public API (no key, reliable)
            try:
                btc_r, eth_r = await asyncio.gather(
                    hx.get("https://api.binance.com/api/v3/ticker/24hr", params={"symbol": "BTCUSDT"}),
                    hx.get("https://api.binance.com/api/v3/ticker/24hr", params={"symbol": "ETHUSDT"}),
                    return_exceptions=True,
                )
                if not isinstance(btc_r, Exception):
                    b = btc_r.json()
                    result["btc_usd"] = {"value": float(b["lastPrice"]), "prev_value": round(float(b["lastPrice"]) - float(b.get("priceChange",0)), 2), "change_pct": float(b["priceChangePercent"]), "source": "Binance"}
                if not isinstance(eth_r, Exception):
                    e2 = eth_r.json()
                    result["eth_usd"] = {"value": float(e2["lastPrice"]), "prev_value": round(float(e2["lastPrice"]) - float(e2.get("priceChange",0)), 2), "change_pct": float(e2["priceChangePercent"]), "source": "Binance"}
            except Exception as e:
                logger.warning("Binance crypto failed: %s", e)
            # Gold spot via Yahoo Finance GC=F (no key)
            try:
                r = await hx.get(
                    "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF",
                    params={"interval": "1d", "range": "5d"},
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                d = r.json()
                meta = d["chart"]["result"][0]["meta"]
                gold_price = meta.get("regularMarketPrice") or meta.get("previousClose")
                gold_prev = meta.get("previousClose") or gold_price
                gold_chg = ((gold_price - gold_prev) / gold_prev * 100) if gold_prev else 0
                result["gold_usd_oz"] = {"value": gold_price, "prev_value": round(gold_prev, 2) if gold_prev else None, "change_pct": round(gold_chg, 2), "source": "Yahoo Finance GC=F"}
            except Exception as e:
                logger.warning("Gold fetch failed: %s", e)
    except Exception as e:
        logger.warning("market overview general failure: %s", e)
    if not result["usd_idr"]:
        result["usd_idr"] = {"value": 15850, "source": "Cached estimate"}
    if not result["gold_usd_oz"]:
        result["gold_usd_oz"] = {"value": 3300, "change_pct": 0.0, "source": "Curated"}
    # Derive IDR/gram from gold USD/oz + USD/IDR rate (1 troy oz = 31.1035 gram)
    if result["gold_usd_oz"] and result["usd_idr"]:
        idr_per_gram = result["gold_usd_oz"]["value"] * result["usd_idr"]["value"] / 31.1035
        prev_gold = result["gold_usd_oz"].get("prev_value")
        prev_usd = result["usd_idr"].get("prev_value") or result["usd_idr"]["value"]
        prev_idr_gram = (prev_gold * prev_usd / 31.1035) if prev_gold else None
        result["gold_idr_gram"] = {
            "value": round(idr_per_gram / 1000) * 1000,
            "prev_value": round(prev_idr_gram / 1000) * 1000 if prev_idr_gram else None,
            "change_pct": result["gold_usd_oz"].get("change_pct", 0),
            "source": "Derived (PAX Gold x USD/IDR)",
        }
    if not result["ihsg"]:
        result["ihsg"] = {"value": 7382.5, "change_pct": 0.0, "source": "Cached estimate"}
    if not result["gold_idr_gram"]:
        result["gold_idr_gram"] = {"value": 2668000, "change_pct": 0.0, "source": "Cached estimate"}
    if not result["btc_usd"]:
        # Fallback if CoinGecko rate-limits (last known good)
        prev = getattr(market_overview, "_last_crypto", None)
        if prev:
            result["btc_usd"] = prev.get("btc_usd")
            result["eth_usd"] = prev.get("eth_usd")
        else:
            result["btc_usd"] = {"value": 64000, "change_pct": 0.0, "source": "Cached estimate"}
            result["eth_usd"] = {"value": 1720, "change_pct": 0.0, "source": "Cached estimate"}
    else:
        market_overview._last_crypto = {"btc_usd": result["btc_usd"], "eth_usd": result["eth_usd"]}

    market_overview._cache = {"t": now, "data": result}
    return result


# ============== OUR WORLD ==============
@api.get("/world/owid")
async def owid_insights():
    return {"items": OWID_INSIGHTS}


@api.get("/world/cities")
async def best_cities():
    return {"items": BEST_CITIES}


@api.get("/world/tech")
async def tech_list():
    return {"items": TECH_GADGETS}


@api.get("/world/travel-id")
async def travel_id():
    return {"items": TRAVEL_ID}


@api.get("/world/jakarta")
async def jakarta_today():
    return {"items": _filter_upcoming(JAKARTA_AGENDA, date_field="date", grace_days=1), "updated_at": now_iso()}



@api.get("/world/cities-dynamic")
async def cities_dynamic(refresh: int = 0, background_tasks: BackgroundTasks = None):
    """AI-generated liveable cities guide, rotates via refresh param. Stale-while-revalidate."""
    now = datetime.now(timezone.utc)
    key = f"cities-{now.strftime('%Y-%m-%d')}-{refresh % 4}"
    cached = await db.world_cache.find_one({"key": key}, {"_id": 0})
    if cached:
        return cached["data"]
    if not PERPLEXITY_API_KEY:
        return {"items": []}

    pools = [
        "Vienna, Tokyo, Singapore, Zurich",
        "Melbourne, Amsterdam, Copenhagen, Berlin",
        "Lisbon, Barcelona, Dubai, Seoul",
        "Vancouver, Auckland, Munich, Helsinki",
    ]
    chosen = pools[refresh % 4]
    try:
        result = await call_perplexity(
            model=AI_FAST_MODEL, max_tokens=3000,
            messages=[{"role": "user", "content": (
                f"Buat panduan relokasi untuk 4 kota ini (khusus profesional Indonesia): {chosen}. "
                f"Untuk tiap kota, output JSON dengan field: city, country (dengan emoji bendera), score (angka 85-99), "
                f"why (2 kalimat kenapa kota ini menarik), visa (info visa/residency untuk WNI), "
                f"cost (biaya hidup bulanan konkret dengan angka), work (industri & peluang kerja), "
                f"flight (estimasi harga tiket dari Jakarta dalam USD), avg_salary_usd (angka gaji rata-rata tahunan USD). "
                f"Output HANYA JSON array murni: "
                f'[{{"city":"...","country":"...","score":..,"why":"...","visa":"...","cost":"...","work":"...","flight":"...","avg_salary_usd":..}}]. '
                f"Bahasa Indonesia. JSON saja."
            )}],
        )
        items = extract_json_block(result["text"])
        if not items:
            raise ValueError("empty")
    except Exception as e:
        logger.warning("Cities dynamic failed: %s", e)
        return {"items": []}

    data = {"items": items, "updated_at": now_iso()}
    await db.world_cache.update_one({"key": key}, {"$set": {"key": key, "data": data, "cached_at": now.isoformat()}}, upsert=True)
    return data


@api.get("/world/travel-dynamic")
async def travel_dynamic(refresh: int = 0):
    """AI-generated Indonesia travel guide, rotates via refresh param. Cached in MongoDB."""
    now = datetime.now(timezone.utc)
    key = f"travel-{now.strftime('%Y-%m-%d')}-{refresh % 4}"
    cached = await db.world_cache.find_one({"key": key}, {"_id": 0})
    if cached:
        return cached["data"]
    if not PERPLEXITY_API_KEY:
        return {"items": []}

    pools = [
        "Labuan Bajo & Komodo, Raja Ampat, Bromo-Ijen Jawa Timur, Yogyakarta",
        "Sumba, Belitung, Danau Toba, Wakatobi",
        "Bali Utara (Amed/Lovina), Lombok & Gili, Dieng, Bunaken Manado",
        "Kepulauan Derawan, Banda Neira, Tana Toraja, Pulau Weh Sabang",
    ]
    chosen = pools[refresh % 4]
    try:
        result = await call_perplexity(
            model=AI_FAST_MODEL, max_tokens=3000,
            messages=[{"role": "user", "content": (
                f"Buat panduan travel lengkap untuk 4 destinasi Indonesia ini: {chosen}. "
                f"Untuk tiap destinasi, output JSON dengan field: name, region (provinsi), type (Nature/Diving/Culture/Adventure/dll), "
                f"desc (3 kalimat menarik & informatif), best_time (waktu terbaik berkunjung), "
                f"budget (estimasi budget konkret dalam Rupiah), tips (tips praktis), getting_there (cara ke sana dari Jakarta). "
                f"Output HANYA JSON array murni: "
                f'[{{"name":"...","region":"...","type":"...","desc":"...","best_time":"...","budget":"...","tips":"...","getting_there":"..."}}]. '
                f"Bahasa Indonesia. JSON saja."
            )}],
        )
        items = extract_json_block(result["text"])
        if not items:
            raise ValueError("empty")
    except Exception as e:
        logger.warning("Travel dynamic failed: %s", e)
        return {"items": []}

    data = {"items": items, "updated_at": now_iso()}
    await db.world_cache.update_one({"key": key}, {"$set": {"key": key, "data": data, "cached_at": now.isoformat()}}, upsert=True)
    return data


JAKARTA_IMAGE_POOL = {
    "Transportasi": "https://images.unsplash.com/photo-1610723384358-b8ee5892fb0f?w=900&q=80",
    "Cuaca": "https://images.unsplash.com/photo-1601134467661-3d775b999c8b?w=900&q=80",
    "Event": "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&q=80",
    "Hiburan": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=900&q=80",
    "Kuliner": "https://images.unsplash.com/photo-1555126634-323283e090fa?w=900&q=80",
    "Agenda Kota": "https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=900&q=80",
    "Kualitas Udara": "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=900&q=80",
    "default": "https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=900&q=80",
}


def _filter_upcoming(items: list, date_field: str = "date", grace_days: int = 1) -> list:
    """Drop items whose date is clearly in the past (defensive — protects
    against the AI hallucinating stale dates, or old cached/seed data lingering).
    Items with no parseable date, or a date range where the end date hasn't
    passed, are kept. `grace_days` allows same-day/just-ended events to still show.
    """
    import re
    today = datetime.now(timezone.utc).date()
    cutoff = today - timedelta(days=grace_days)
    kept = []
    for item in items:
        raw = str(item.get(date_field) or "")
        dates_found = re.findall(r"\d{4}-\d{2}-\d{2}", raw)
        if not dates_found:
            kept.append(item)  # unparseable / no date -> keep, don't risk dropping valid content
            continue
        try:
            # If it's a range ("2026-06-12 to 2026-07-14"), use the LAST date found.
            last_date = datetime.strptime(dates_found[-1], "%Y-%m-%d").date()
            if last_date >= cutoff:
                kept.append(item)
        except ValueError:
            kept.append(item)
    return kept



async def _refresh_jakarta_bg(daily_key: str):
    """Background task to refresh Jakarta data without blocking the response."""
    now = datetime.now(timezone.utc)
    try:
        today = now.strftime("%d %B %Y")
        result = await call_perplexity(
            model=AI_DEEP_MODEL,
            max_tokens=6000,
            return_images=True,
            search_recency="week",
            messages=[{
                "role": "user",
                "content": (
                    f"Cari SEMUA info penting Jakarta hari ini ({today}): event & hiburan 7 hari ke depan "
                    f"DARI TANGGAL {today} DAN SETELAHNYA SAJA (jangan sertakan event yang sudah lewat), "
                    f"update MRT/LRT/TransJakarta/tol, cuaca & kualitas udara, agenda kota/pemprov, kuliner baru, "
                    f"dan tips praktis warga. JANGAN batasi jumlah item — cakup selengkap dan sebanyak mungkin isu "
                    f"aktual yang kamu temukan hari ini (idealnya 10-15 item, boleh lebih jika memang ada banyak berita relevan). "
                    f"Untuk tiap item, tulis narasi 'summary' yang LENGKAP dan mendalam (minimal 4-6 kalimat, jangan disingkat), "
                    f"jelaskan konteks, dampak ke warga, dan detail konkret (jam, lokasi, harga jika relevan). "
                    f"Field 'date' WAJIB dalam format ISO YYYY-MM-DD (atau 'YYYY-MM-DD to YYYY-MM-DD' untuk rentang), "
                    f"dan tanggalnya harus {today} atau setelahnya. "
                    f"Output HANYA JSON array murni (tanpa markdown), format: "
                    f'[{{"emoji":"...","category":"...","title":"...","date":"...","location":"...","summary":"...","tip":"..."}}]. '
                    f"Kategori salah satu dari: Transportasi, Cuaca, Event, Hiburan, Kuliner, Agenda Kota, Kualitas Udara. "
                    f"Emoji relevan per item. Bahasa Indonesia. JSON saja, tanpa penjelasan di luar JSON."
                ),
            }],
        )
        items = extract_json_block(result["text"])
        items = _filter_upcoming(items, date_field="date", grace_days=1)
        images = result.get("images") or []
        for i, item in enumerate(items):
            if images:
                img = images[i % len(images)]
                item["img"] = img.get("image_url") or img.get("url") if isinstance(img, dict) else img
            if not item.get("img"):
                item["img"] = JAKARTA_IMAGE_POOL.get(item.get("category"), JAKARTA_IMAGE_POOL["default"])
        if items:
            data = {"items": items, "updated_at": now_iso()}
            await db.world_cache.update_one(
                {"key": daily_key},
                {"$set": {"key": daily_key, "data": data, "cached_at": now.isoformat()}},
                upsert=True,
            )
    except Exception as e:
        logger.warning("Jakarta bg refresh failed: %s", e)


@api.get("/world/jakarta-live")
async def jakarta_live(background_tasks: BackgroundTasks):
    """Live Jakarta info. Returns cached/static instantly, refreshes in background (stale-while-revalidate)."""
    now = datetime.now(timezone.utc)
    daily_key = "jakarta-" + now.strftime("%Y-%m-%d")

    cached = await db.world_cache.find_one({"key": daily_key}, {"_id": 0})
    if cached:
        age = (now - datetime.fromisoformat(cached["cached_at"])).total_seconds()
        # Fresh enough — return immediately
        if age < 21600:  # 6h
            return cached["data"]
        # Stale — return stale data NOW, refresh in background
        if PERPLEXITY_API_KEY:
            background_tasks.add_task(_refresh_jakarta_bg, daily_key)
        return cached["data"]

    # No cache at all — return static instantly, kick off background fetch
    if PERPLEXITY_API_KEY:
        background_tasks.add_task(_refresh_jakarta_bg, daily_key)
    return {"items": _filter_upcoming(JAKARTA_AGENDA, date_field="date", grace_days=1), "updated_at": now_iso(), "loading": True}


NEWS_STATIC_FALLBACK = [
    {"category":"Ekonomi","title":"Pasar Global Bergerak Mixed","summary":"Indeks saham global bergerak mixed jelang rilis data inflasi AS. Investor wait-and-see terkait arah kebijakan Fed dan sinyal pemangkasan suku bunga. Pergerakan ini turut memengaruhi sentimen pasar Asia, termasuk Indonesia, karena investor global biasanya menyesuaikan portofolio menjelang keputusan penting bank sentral AS.","img":"https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=900&q=80"},
    {"category":"Indonesia","title":"Ekonomi Indonesia Tumbuh Stabil","summary":"Pemerintah optimis target pertumbuhan ekonomi 5.2% tercapai tahun ini. Ekspor nonmigas naik didorong komoditas nikel dan produk hilirisasi. Sektor manufaktur dan konsumsi rumah tangga juga menunjukkan penguatan, meski tekanan dari suku bunga tinggi dan pelemahan permintaan global masih perlu diwaspadai pemerintah dan pelaku usaha.","img":"https://images.unsplash.com/photo-1555529771-7888783a18d3?w=900&q=80"},
    {"category":"Pasar","title":"IHSG & Rupiah Dalam Sorotan","summary":"IHSG bergerak fluktuatif mengikuti sentimen global. Rupiah relatif stabil di kisaran Rp 16.000-an per dolar AS dengan intervensi BI yang terukur. Investor asing maupun domestik mencermati arah kebijakan suku bunga acuan serta perkembangan harga komoditas ekspor unggulan sebagai penentu arah pasar dalam beberapa pekan ke depan.","img":"https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80"},
    {"category":"Teknologi","title":"AI Terus Berkembang Pesat","summary":"Rilis model AI terbaru dari perusahaan teknologi global mendominasi berita. Adopsi AI di sektor bisnis Indonesia terus meningkat, terutama fintech & e-commerce. Perusahaan rintisan lokal mulai mengintegrasikan AI generatif untuk layanan pelanggan, analitik risiko kredit, dan otomatisasi operasional guna bersaing di pasar digital yang makin ketat.","img":"https://images.unsplash.com/photo-1677442136019-21780ecad995?w=900&q=80"},
    {"category":"Sepak Bola","title":"Update Kompetisi Sepak Bola","summary":"Liga Champions, Premier League, dan Liga 1 Indonesia terus berlangsung seru. Timnas Indonesia melanjutkan persiapan untuk laga kualifikasi mendatang. Pelatih menekankan pentingnya konsistensi performa pemain di klub masing-masing sebagai modal utama menghadapi jadwal internasional yang padat dalam waktu dekat.","img":"https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80"},
    {"category":"Geopolitik","title":"Dinamika Geopolitik Global","summary":"Ketegangan geopolitik di beberapa kawasan mempengaruhi harga energi dan rantai pasok global. Indonesia menjaga posisi netral dan fokus diplomasi ekonomi. Pemerintah terus memperkuat hubungan dagang dengan mitra strategis untuk menjaga ketahanan pangan dan energi nasional di tengah ketidakpastian geopolitik yang berkepanjangan.","img":"https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=900&q=80"},
]

NEWS_IMAGE_POOL = {
    "Ekonomi": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=900&q=80",
    "Indonesia": "https://images.unsplash.com/photo-1555529771-7888783a18d3?w=900&q=80",
    "Pasar": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=900&q=80",
    "Teknologi": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=900&q=80",
    "Gadget": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=80",
    "Sepak Bola": "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&q=80",
    "Olahraga": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=900&q=80",
    "Geopolitik": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=900&q=80",
    "default": "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900&q=80",
}


async def _refresh_news_bg(daily_key: str):
    """Background task to refresh world news without blocking."""
    now = datetime.now(timezone.utc)
    try:
        today = now.strftime("%d %B %Y")
        result = await call_perplexity(
            model=AI_DEEP_MODEL,
            max_tokens=8000,
            return_images=True,
            search_recency="day",
            messages=[{
                "role": "user",
                "content": (
                    f"Cari berita PALING BARU hari ini ({today}) untuk pembaca Indonesia muda — bukan berita lama, "
                    f"harus benar-benar berita hari ini atau maksimal 1-2 hari terakhir. "
                    f"JANGAN batasi jumlah berita ke angka kecil. Kumpulkan minimal 15-20 berita total, WAJIB mencakup "
                    f"minimal masing-masing 2-3 berita dari SETIAP kategori berikut (jangan lewatkan satupun kategori): "
                    f"1) Geopolitik Dunia (konflik, diplomasi, kebijakan luar negeri negara besar), "
                    f"2) Geopolitik/Politik Indonesia (kebijakan pemerintah, isu nasional terkini), "
                    f"3) Teknologi & AI (perkembangan AI, startup, big tech), "
                    f"4) Gadget (rilis HP/laptop/perangkat baru, review, harga), "
                    f"5) Sepak Bola & Olahraga (Liga Champions, Premier League, Liga 1 Indonesia, Timnas, cabang olahraga lain), "
                    f"6) Ekonomi & Pasar Finansial (global & Indonesia, IHSG, rupiah, saham, kripto). "
                    f"Boleh tambah kategori lain (Kesehatan, Hiburan, Lingkungan) jika ada berita besar yang layak masuk. "
                    f"Untuk tiap berita, tulis 'summary' sebagai narasi LENGKAP dan mendalam (minimal 5-7 kalimat, "
                    f"JANGAN disingkat atau dipendekkan) yang menjelaskan duduk perkara, latar belakang, dampak "
                    f"bagi Indonesia/investor/pembaca, dan data konkret (angka, tanggal, nama pihak terkait) bila tersedia. "
                    f"Output HANYA JSON array murni (tanpa markdown fences): "
                    f'[{{"category":"...","title":"...","summary":"..."}}]. '
                    f"Kategori HARUS salah satu dari: Ekonomi, Geopolitik, Indonesia, Teknologi, Gadget, Pasar, Sepak Bola, Olahraga. "
                    f"Bahasa Indonesia. JSON saja, tanpa penjelasan di luar JSON."
                ),
            }],
        )
        items = extract_json_block(result["text"])
        images = result.get("images") or []
        for i, item in enumerate(items):
            if images:
                img = images[i % len(images)]
                item["img"] = (img.get("image_url") or img.get("url")) if isinstance(img, dict) else img
            if not item.get("img"):
                item["img"] = NEWS_IMAGE_POOL.get(item.get("category"), NEWS_IMAGE_POOL["default"])
        if items:
            data = {"items": items, "updated_at": now_iso()}
            await db.world_cache.update_one(
                {"key": daily_key},
                {"$set": {"key": daily_key, "data": data, "cached_at": now.isoformat()}},
                upsert=True,
            )
    except Exception as e:
        logger.warning("News bg refresh failed: %s", e)


@api.get("/world/news")
async def world_news(background_tasks: BackgroundTasks):
    """World news, stale-while-revalidate. Returns cached/static instantly, refreshes in background."""
    now = datetime.now(timezone.utc)
    daily_key = "news-" + now.strftime("%Y-%m-%d-%H")[:13]  # hourly bucket

    cached = await db.world_cache.find_one({"key": daily_key}, {"_id": 0})
    if cached:
        age = (now - datetime.fromisoformat(cached["cached_at"])).total_seconds()
        if age < 3600:  # fresh within 1h
            return cached["data"]
        if PERPLEXITY_API_KEY:
            background_tasks.add_task(_refresh_news_bg, daily_key)
        return cached["data"]  # stale but instant

    # No cache — try most recent cache from earlier today as fallback
    recent = await db.world_cache.find_one(
        {"key": {"$regex": "^news-" + now.strftime("%Y-%m-%d")}},
        {"_id": 0}, sort=[("cached_at", -1)],
    )
    if PERPLEXITY_API_KEY:
        background_tasks.add_task(_refresh_news_bg, daily_key)
    if recent:
        return recent["data"]
    # First-ever load — static instant, background will populate
    return {"items": NEWS_STATIC_FALLBACK, "updated_at": now_iso(), "loading": True}


# ============== AI INSIGHT (Perplexity Sonar) ==============
INSIGHT_PROMPTS = {
    "scholarship": "Anda mentor beasiswa S2 berpengalaman 15+ tahun. Berikan tips & trick KONKRET untuk lolos beasiswa ini berdasarkan data: {context}. Fokus: essay, interview, portfolio, timeline. Output dalam markdown bullet. Maksimal 6 poin actionable, masing-masing 1-2 kalimat. Bahasa: {language}.",
    "salary": "Anda career coach global tech. Berdasarkan data perusahaan: {context}, berikan: (1) Estimasi salary range untuk role utama (entry/mid/senior) dalam USD; (2) 4 tips konkret membangun portofolio yang menarik untuk perusahaan ini. Markdown ringkas. Bahasa: {language}.",
    "stock": """Anda analis ekuitas senior CFA-level. Tanggal hari ini: {today}. Gunakan web search untuk mendapatkan data TERKINI sebelum menjawab — cari harga terbaru, berita terkini, kondisi makro saat ini (suku bunga Fed terkini, BI Rate terkini, kurs IDR/USD terkini, harga komoditas relevan).

Untuk saham {context}, buat analisa investasi KOMPREHENSIF berdasarkan data aktual Juni 2026:

## 📊 Fundamental (Data Terkini)
Model bisnis, moat, kondisi keuangan terbaru (revenue/laba Q1 2026 atau terbaru), valuasi P/E & P/B vs sektor saat ini.

## 📈 Analisa Teknikal (Harga Terkini)
Harga saat ini, support & resistance kunci, tren terkini (uptrend/downtrend/sideways), momentum. Gunakan harga aktual dari web search.

## 🌍 Konteks Makro TERKINI (Juni 2026)
- Kondisi global aktual: suku bunga Fed, geopolitik, harga komoditas relevan SEKARANG
- Kondisi domestik aktual: BI Rate saat ini, kurs IDR/USD terkini, inflasi terbaru, kebijakan pemerintah terbaru
- Berita/event terbaru yang mempengaruhi saham ini

## 🎯 Strategi
Entry/exit konkret berdasarkan kondisi pasar SAAT INI, position sizing, skenario bull/bear.

## ⚖️ Risk-Reward
Risiko utama saat ini + target price. Disclaimer singkat.

Bahasa: {language}. Semua data HARUS dari kondisi aktual 2026, bukan asumsi historis.""",
    "investment_strategy": "Anda financial advisor. Tanggal hari ini: {today}. Berdasarkan kondisi pasar aktual saat ini dan context: {context}, berikan strategi alokasi aset. Sertakan: persentase alokasi, alasan berdasar kondisi makro terkini, risiko utama, action items minggu ini. Markdown. Bahasa: {language}.",
    "freelance_profile": "Anda freelance growth coach. Untuk platform: {context}, bantu user membuat profile yang menarik. Berikan: (1) Headline draft (3 opsi); (2) Bio template; (3) Skill yang harus dihighlight; (4) Strategi 30 hari pertama. Bahasa: {language}.",
    "cv_recommendation": "Anda CV writer profesional ATS-optimized. Berdasarkan target {context}, berikan: (1) Struktur CV ideal; (2) 6 kata kunci yang harus muncul; (3) Format & template recommendation; (4) 3 common mistakes yang harus dihindari. Markdown. Bahasa: {language}.",
    "trend_advice": "Anda career strategist. Berdasarkan tren pekerjaan {context}, berikan advice konkret: skill yang harus dipelajari sekarang untuk monetisasi cepat 6-12 bulan, dan untuk long term 3-5 tahun. Bahasa: {language}.",
    "city_insight": "Anda relocation consultant. Berdasarkan data kota {context}, berikan: (1) Visa & residence pathway; (2) Estimasi biaya hidup bulanan; (3) Industri kuat & peluang kerja; (4) Tips kultural integrasi. Bahasa: {language}.",
    "general": "Berikan insight mendalam dan actionable tentang topik berikut: {context}. Tanggal hari ini: {today}. Maksimal 300 kata, markdown. Bahasa: {language}.",
}

# Topics that need web search for up-to-date data
WEB_SEARCH_TOPICS = {"stock", "investment_strategy", "general"}


@api.post("/ai/insight")
async def ai_insight(req: AIInsightReq, user: dict = Depends(get_user)):
    """Generate AI insight. Stock/investment topics use web search for real-time data.
    Cache is date-keyed for stock topics (expires daily)."""
    if not PERPLEXITY_API_KEY:
        raise HTTPException(500, "AI not configured")

    today = datetime.now(timezone.utc).strftime("%d %B %Y")  # e.g. "26 June 2026"
    context_str = json.dumps(req.context, ensure_ascii=False, sort_keys=True)

    # Stock/investment insights are cached per day (not forever)
    date_suffix = datetime.now(timezone.utc).strftime("%Y-%m-%d") if req.topic in WEB_SEARCH_TOPICS else ""
    cache_key = hashlib.sha256(f"{req.topic}|{context_str}|{req.language}|{date_suffix}".encode()).hexdigest()
    cached = await db.ai_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached:
        return {"insight": cached["insight"], "cached": True}

    prompt_tmpl = INSIGHT_PROMPTS.get(req.topic, INSIGHT_PROMPTS["general"])
    prompt = prompt_tmpl.format(
        context=context_str,
        language="Bahasa Indonesia" if req.language == "id" else "English",
        today=today,
    )
    lang_label = "Bahasa Indonesia" if req.language == "id" else "English"
    system_msg = (
        f"Anda asisten ahli yang memberi insight tajam, akurat, dan SELALU AKTUAL. "
        f"Tanggal hari ini adalah {today}. "
        f"Untuk topik keuangan/investasi, WAJIB gunakan data terkini via web search — "
        f"jangan gunakan data historis dari memory training jika tersedia data lebih baru. "
        f"Selalu jawab dalam {lang_label}."
    )

    try:
        # Sonar models are web-grounded by default; sonar-pro handles both
        # everyday and current-data-synthesis topics (stock/investment/general)
        # reliably and quickly — no reasoning model needed.
        model = AI_DEEP_MODEL if req.topic in WEB_SEARCH_TOPICS else AI_MODEL
        result = await call_perplexity(
            model=model,
            max_tokens=4000,
            search_recency="week" if req.topic in WEB_SEARCH_TOPICS else None,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": prompt},
            ],
        )
        insight_text = result["text"]
        if not insight_text:
            raise ValueError("Empty response from AI")
    except Exception as e:
        logger.exception("AI insight failed")
        raise HTTPException(500, f"AI error: {e}")

    await db.ai_cache.insert_one({
        "key": cache_key,
        "topic": req.topic,
        "context": req.context,
        "language": req.language,
        "insight": insight_text,
        "created_at": now_iso(),
        "date": date_suffix or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    })
    return {"insight": insight_text, "cached": False}


@api.post("/ai/chat")
async def ai_chat(req: AIChatReq, user: dict = Depends(get_user)):
    """Interactive financial/career advisor chat. Maintains conversation context."""
    if not PERPLEXITY_API_KEY:
        raise HTTPException(500, "AI not configured")

    lang_label = "Bahasa Indonesia" if req.language == "id" else "English"
    ctx_str = json.dumps(req.context, ensure_ascii=False) if req.context else ""
    system_msg = (
        f"Anda adalah penasihat finansial & karier pribadi di aplikasi 'One Smart' untuk pengguna millennial Indonesia. "
        f"Anda membantu topik: membangun portofolio investasi, strategi saham (IDX & global), perencanaan keuangan, "
        f"karier, beasiswa, dan keputusan hidup finansial. "
        f"Gaya: hangat, to-the-point, actionable, pakai contoh angka konkret bila relevan. "
        f"Selalu sertakan disclaimer singkat untuk saran investasi (bukan ajakan jual/beli). "
        + (f"Konteks pasar saat ini: {ctx_str}. " if ctx_str else "")
        + f"Jawab dalam {lang_label}. Gunakan markdown untuk struktur."
    )
    msgs = [{"role": "system", "content": system_msg}] + [{"role": m.role, "content": m.content} for m in req.messages]
    try:
        result = await call_perplexity(model=AI_MODEL, max_tokens=1500, messages=msgs)
        reply = result["text"]
    except Exception as e:
        logger.exception("AI chat failed")
        raise HTTPException(500, f"AI error: {e}")
    return {"reply": reply}


@api.post("/ai/life-goal-chat")
async def life_goal_chat(req: AIChatReq, user: dict = Depends(get_user)):
    """Life Goal Assistant — holistic life coach for Indonesian millennials."""
    if not PERPLEXITY_API_KEY:
        raise HTTPException(500, "AI not configured")

    lang_label = "Bahasa Indonesia" if req.language == "id" else "English"
    system_msg = (
        f"Kamu adalah 'Life Goal Assistant' — asisten kehidupan pribadi untuk millennial Indonesia di aplikasi One Smart. "
        f"Kamu adalah perpaduan life coach, mentor karier, penasihat finansial, dan teman diskusi yang cerdas. "
        f"Kamu membantu pengguna memikirkan dan merencanakan berbagai aspek kehidupan:\n"
        f"- 🎯 Goal setting & life planning (5-10 tahun ke depan)\n"
        f"- 💼 Karier: pilihan karier, skill yang perlu dibangun, transisi karier, freelance vs full-time\n"
        f"- 💰 Finansial: menabung, investasi, hutang, perencanaan pensiun, FIRE (Financial Independence)\n"
        f"- 🎓 Pendidikan: S2 vs langsung kerja, beasiswa, upskilling, online courses\n"
        f"- 🌍 Relokasi: pertimbangan pindah kota/negara, work abroad, digital nomad\n"
        f"- 🧠 Mindset & produktivitas: kebiasaan sukses, work-life balance, mengelola stres\n"
        f"- 💡 Ide bisnis & side hustle: validasi ide, langkah pertama, modal awal\n\n"
        f"Gaya komunikasi:\n"
        f"- Hangat, jujur, dan tidak menghakimi\n"
        f"- Berikan perspektif yang beragam, bukan hanya satu jawaban\n"
        f"- Pakai angka & contoh konkret (misal: 'dengan gaji Rp 10 juta, idealnya sisihkan Rp 2 juta/bulan')\n"
        f"- Ajukan pertanyaan clarifying jika konteks kurang — seperti teman yang benar-benar peduli\n"
        f"- Disclaimer finansial singkat hanya saat relevan (bukan di setiap pesan)\n"
        f"- Jawab dalam {lang_label}. Gunakan markdown (bullet, bold) untuk struktur yang mudah dibaca.\n\n"
        f"Ingat: kamu bukan robot yang memberikan template jawaban. Kamu adalah teman cerdas yang benar-benar "
        f"mendengarkan dan membantu pengguna menemukan jawaban terbaik untuk situasi MEREKA."
    )
    msgs = [{"role": "system", "content": system_msg}] + [{"role": m.role, "content": m.content} for m in req.messages]
    try:
        result = await call_perplexity(model=AI_MODEL, max_tokens=2000, messages=msgs)
        reply = result["text"]
    except Exception as e:
        logger.exception("Life goal chat failed")
        raise HTTPException(500, f"AI error: {e}")
    return {"reply": reply}


@api.post("/ai/investment-simulator")
async def investment_simulator(req: SimulatorReq, user: dict = Depends(get_user)):
    """AI-powered investment simulator: given capital, risk profile & horizon → optimal allocation + projections."""
    if not PERPLEXITY_API_KEY:
        raise HTTPException(500, "AI not configured")

    lang_label = "Bahasa Indonesia" if req.language == "id" else "English"
    cap_fmt = f"Rp {req.capital_idr:,.0f}"
    goals_txt = f"Tujuan investasi user: {req.goals}" if req.goals else ""

    prompt = (
        f"Anda adalah perencana keuangan bersertifikat (CFP) untuk pasar Indonesia.\n\n"
        f"**Data Input:**\n"
        f"- Modal investasi: {cap_fmt}\n"
        f"- Profil risiko: {req.risk_profile}\n"
        f"- Horizon investasi: {req.horizon_years} tahun\n"
        f"{goals_txt}\n\n"
        f"Berikan analisa investasi KOMPREHENSIF dalam format JSON murni (no markdown fences), struktur:\n"
        f'{{\n'
        f'  "summary": "1 paragraf ringkasan strategi utama",\n'
        f'  "allocation": [{{"name":"...","pct":..,"amount_idr":..,"instrument":"...","rationale":"..."}}],\n'
        f'  "projections": [{{"year":1,"conservative":..,"moderate":..,"optimistic":..}},...(hingga {req.horizon_years} tahun)],\n'
        f'  "monthly_dca": {{"amount":..,"schedule":"..","note":".."}},\n'
        f'  "key_actions": ["langkah 1","langkah 2","langkah 3"],\n'
        f'  "risks": ["risiko 1","risiko 2"],\n'
        f'  "disclaimer": "disclaimer singkat"\n'
        f'}}\n\n'
        f"Proyeksi dalam Rupiah absolut. Allocation amount_idr harus berjumlah tepat {req.capital_idr:.0f}.\n"
        f"Gunakan instrumen pasar Indonesia yang realistis (Reksa Dana, Saham IDX, SBN, Emas, Deposito).\n"
        f"Output ONLY valid JSON. Bahasa: {lang_label}."
    )
    try:
        ai_result = await call_perplexity(
            model=AI_DEEP_MODEL, max_tokens=3500,
            search_recency="week",
            messages=[{"role": "user", "content": prompt}],
        )
        result = extract_json_block(ai_result["text"])
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"AI returned invalid JSON: {e}")
    except Exception as e:
        logger.exception("Simulator failed")
        raise HTTPException(500, f"AI error: {e}")
    return result


@api.get("/notes")
async def list_notes(user: dict = Depends(get_user)):
    cursor = db.notes.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return {"items": await cursor.to_list(500)}


@api.post("/notes")
async def create_note(req: NoteCreate, user: dict = Depends(get_user)):
    note = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        **req.model_dump(),
        "done": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.notes.insert_one(note)
    note.pop("_id", None)
    return note


@api.patch("/notes/{note_id}")
async def update_note(note_id: str, req: NoteUpdate, user: dict = Depends(get_user)):
    update = {k: v for k, v in req.model_dump().items() if v is not None}
    update["updated_at"] = now_iso()
    res = await db.notes.update_one({"id": note_id, "user_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return note


@api.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(get_user)):
    res = await db.notes.delete_one({"id": note_id, "user_id": user["id"]})
    return {"deleted": res.deleted_count}


# ============== PUSH ==============
@api.get("/push/public-key")
async def push_public_key():
    return {"key": VAPID_PUBLIC_KEY}


@api.post("/push/subscribe")
async def push_subscribe(sub: PushSubscription, user: dict = Depends(get_user)):
    await db.push_subs.update_one(
        {"user_id": user["id"], "endpoint": sub.endpoint},
        {"$set": {
            "user_id": user["id"],
            "endpoint": sub.endpoint,
            "keys": sub.keys,
            "updated_at": now_iso(),
        }},
        upsert=True,
    )
    return {"ok": True}


@api.post("/push/test")
async def push_test(user: dict = Depends(get_user)):
    """Send a test push to all subscriptions of current user."""
    from pywebpush import webpush, WebPushException
    subs = await db.push_subs.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    sent = 0
    errors = []
    for s in subs:
        try:
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                data=json.dumps({"title": "One Smart", "body": "Test notification berhasil!", "icon": "/icon-192.png"}),
                vapid_private_key=VAPID_PRIVATE_KEY_PEM,
                vapid_claims={"sub": f"mailto:{VAPID_CLAIM_EMAIL}"},
            )
            sent += 1
        except WebPushException as e:
            errors.append(str(e))
    return {"sent": sent, "total": len(subs), "errors": errors}


# ============== BOOKMARKS ==============
class BookmarkToggle(BaseModel):
    kind: str  # "scholarship" | "company"
    item_id: str
    payload: dict = {}  # snapshot of the item (name, country/location, etc.) for display


@api.get("/bookmarks")
async def list_bookmarks(user: dict = Depends(get_user), kind: Optional[str] = None):
    q = {"user_id": user["id"]}
    if kind:
        q["kind"] = kind
    cursor = db.bookmarks.find(q, {"_id": 0}).sort("created_at", -1)
    return {"items": await cursor.to_list(500)}


@api.post("/bookmarks/toggle")
async def toggle_bookmark(req: BookmarkToggle, user: dict = Depends(get_user)):
    existing = await db.bookmarks.find_one({"user_id": user["id"], "kind": req.kind, "item_id": req.item_id})
    if existing:
        await db.bookmarks.delete_one({"_id": existing["_id"]})
        return {"bookmarked": False}
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "kind": req.kind,
        "item_id": req.item_id,
        "payload": req.payload,
        "created_at": now_iso(),
    }
    await db.bookmarks.insert_one(doc)
    return {"bookmarked": True}


# ============== CV PDF GENERATOR ==============
class CVRequest(BaseModel):
    name: str
    role_target: str
    summary: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    experiences: List[dict] = []  # [{title, company, period, bullets:[]}]
    education: List[dict] = []  # [{degree, school, period, note}]
    skills: List[str] = []
    language: str = "id"


def _build_cv_pdf(data: dict, ai_bullets: dict) -> bytes:
    """Build a clean ATS-friendly PDF using reportlab."""
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_LEFT
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
    from reportlab.platypus import HRFlowable

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=1.8*cm, bottomMargin=1.8*cm, title=f"CV - {data['name']}")
    styles = getSampleStyleSheet()
    forest = HexColor("#2C4A3B")
    ink = HexColor("#1A1918")
    muted = HexColor("#767470")

    name_style = ParagraphStyle("name", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, textColor=ink, leading=26, spaceAfter=2)
    role_style = ParagraphStyle("role", parent=styles["Normal"], fontName="Helvetica", fontSize=11, textColor=muted, leading=14, spaceAfter=6)
    contact_style = ParagraphStyle("contact", parent=styles["Normal"], fontName="Helvetica", fontSize=9, textColor=muted, leading=12, spaceAfter=10)
    section_style = ParagraphStyle("section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, textColor=forest, leading=14, spaceBefore=10, spaceAfter=4, textTransform="uppercase")
    item_title = ParagraphStyle("itemTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10.5, textColor=ink, leading=13, spaceAfter=0)
    item_sub = ParagraphStyle("itemSub", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=9.5, textColor=muted, leading=12, spaceAfter=4)
    body_style = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica", fontSize=10, textColor=ink, leading=13)
    bullet_style = ParagraphStyle("bullet", parent=body_style, leftIndent=12, bulletIndent=2, spaceAfter=2)

    story = []
    story.append(Paragraph(data["name"], name_style))
    story.append(Paragraph(data["role_target"], role_style))
    contact_parts = [p for p in [data.get("email"), data.get("phone"), data.get("location")] if p]
    if contact_parts:
        story.append(Paragraph("  •  ".join(contact_parts), contact_style))
    story.append(HRFlowable(width="100%", thickness=0.6, color=HexColor("#E8E6E1"), spaceBefore=0, spaceAfter=8))

    # Summary
    summary = data.get("summary") or ai_bullets.get("summary")
    if summary:
        story.append(Paragraph("PROFILE SUMMARY", section_style))
        story.append(Paragraph(summary, body_style))

    # Experience
    if data.get("experiences"):
        story.append(Paragraph("PROFESSIONAL EXPERIENCE", section_style))
        for exp in data["experiences"]:
            story.append(Paragraph(f"{exp.get('title','')} — {exp.get('company','')}", item_title))
            if exp.get("period"):
                story.append(Paragraph(exp["period"], item_sub))
            bullets = exp.get("bullets") or []
            # If AI enriched bullets exist, prefer them for this experience
            ai_b = ai_bullets.get("experiences", {}).get(exp.get("title", "") + "|" + exp.get("company", ""))
            if ai_b:
                bullets = ai_b
            if bullets:
                items = [ListItem(Paragraph(b, body_style), leftIndent=10) for b in bullets]
                story.append(ListFlowable(items, bulletType="bullet", start="•", leftIndent=12))
            story.append(Spacer(1, 4))

    # Education
    if data.get("education"):
        story.append(Paragraph("EDUCATION", section_style))
        for ed in data["education"]:
            story.append(Paragraph(f"{ed.get('degree','')} — {ed.get('school','')}", item_title))
            sub = " · ".join([s for s in [ed.get("period"), ed.get("note")] if s])
            if sub:
                story.append(Paragraph(sub, item_sub))

    # Skills
    if data.get("skills"):
        story.append(Paragraph("SKILLS", section_style))
        story.append(Paragraph("  ·  ".join(data["skills"]), body_style))

    # Optimization Tips (AI)
    tips = ai_bullets.get("tips") or []
    if tips:
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=0.4, color=HexColor("#E8E6E1"), spaceBefore=0, spaceAfter=4))
        story.append(Paragraph("AI OPTIMIZATION NOTES (remove before submitting)", section_style))
        items = [ListItem(Paragraph(t, body_style), leftIndent=10) for t in tips]
        story.append(ListFlowable(items, bulletType="bullet", start="•", leftIndent=12))

    doc.build(story)
    pdf = buf.getvalue()
    buf.close()
    return pdf


@api.post("/cv/generate")
async def cv_generate(req: CVRequest, user: dict = Depends(get_user)):
    """Generate an ATS-optimized CV PDF. Uses Perplexity to enrich summary, action-verb experience bullets and optimization tips."""
    from fastapi.responses import Response

    ai_bullets = {"experiences": {}, "tips": [], "summary": None}
    if PERPLEXITY_API_KEY:
        lang_label = "Bahasa Indonesia" if req.language == "id" else "English"
        prompt = (
            "Anda adalah CV writer profesional ATS-optimized. Berdasarkan data berikut:\n"
            f"Nama: {req.name}\nTarget Role: {req.role_target}\n"
            f"Existing summary: {req.summary or '(none)'}\n"
            f"Experiences: {json.dumps(req.experiences, ensure_ascii=False)}\n"
            f"Skills: {req.skills}\n\n"
            f"Tugas (output JSON murni, no markdown fences):\n"
            "{\n"
            '  "summary": "1 paragraf 2-3 kalimat profile summary kuat ATS-friendly",\n'
            '  "experiences": {\n'
            '    "<title>|<company>": ["bullet 1 (action verb + KPI)", "bullet 2", "bullet 3"]\n'
            "  },\n"
            '  "tips": ["3-5 tips singkat memperkuat CV untuk target role"]\n'
            "}\n"
            f"Bahasa: {lang_label}. Output STRICT JSON only."
        )
        try:
            ai_result = await call_perplexity(
                model=AI_MODEL,
                max_tokens=1500,
                messages=[
                    {"role": "system", "content": "You output strict JSON only."},
                    {"role": "user", "content": prompt},
                ],
            )
            parsed = extract_json_block(ai_result["text"])
            ai_bullets["summary"] = parsed.get("summary")
            ai_bullets["experiences"] = parsed.get("experiences", {}) or {}
            ai_bullets["tips"] = parsed.get("tips", []) or []
        except Exception as e:
            logger.warning("CV AI enrichment failed: %s", e)

    pdf_bytes = _build_cv_pdf(req.model_dump(), ai_bullets)
    safe_name = req.name.replace(" ", "_") or "cv"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="OneSmart_CV_{safe_name}.pdf"'},
    )


# ============== REMINDER DISPATCHER ==============
def _next_recurrence(dt: datetime, recurrence: str) -> Optional[datetime]:
    if recurrence == "daily":
        return dt + timedelta(days=1)
    if recurrence == "weekly":
        return dt + timedelta(weeks=1)
    if recurrence == "monthly":
        # naive +30d (good enough for reminders)
        return dt + timedelta(days=30)
    return None


async def _send_push_to_user(user_id: str, payload: dict) -> int:
    from pywebpush import webpush, WebPushException
    subs = await db.push_subs.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    sent = 0
    for s in subs:
        try:
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                data=json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY_PEM,
                vapid_claims={"sub": f"mailto:{VAPID_CLAIM_EMAIL}"},
            )
            sent += 1
        except WebPushException as e:
            # Cleanup gone subscriptions
            if "410" in str(e) or "404" in str(e):
                await db.push_subs.delete_one({"endpoint": s["endpoint"]})
            logger.warning("push failed: %s", e)
    return sent


async def reminder_loop():
    """Background task: every 30s, scan due reminders and send push notifications."""
    await asyncio.sleep(5)
    while True:
        try:
            now = datetime.now(timezone.utc)
            cursor = db.notes.find({
                "reminder_at": {"$ne": None, "$lte": now.isoformat()},
                "$or": [{"reminder_sent_at": {"$exists": False}}, {"reminder_sent_at": None}],
            }, {"_id": 0})
            due = await cursor.to_list(200)
            for note in due:
                payload = {
                    "title": f"⏰ {note.get('title','Reminder')}",
                    "body": note.get("content") or (note.get("items", [{}])[0].get("text") if note.get("items") else "Reminder dari One Smart"),
                    "icon": "/icon-192.png",
                    "url": "/app/quick",
                }
                try:
                    await _send_push_to_user(note["user_id"], payload)
                except Exception as e:
                    logger.warning("dispatch err: %s", e)

                recurrence = note.get("recurrence")
                update = {"reminder_sent_at": now.isoformat()}
                if recurrence and recurrence != "none":
                    try:
                        cur_dt = datetime.fromisoformat(note["reminder_at"].replace("Z", "+00:00"))
                        nxt = _next_recurrence(cur_dt, recurrence)
                        if nxt:
                            # ensure future
                            while nxt <= now:
                                nxt = _next_recurrence(nxt, recurrence)
                            update["reminder_at"] = nxt.isoformat()
                            update["reminder_sent_at"] = None  # rearm
                    except Exception as e:
                        logger.warning("recurrence calc fail: %s", e)
                await db.notes.update_one({"id": note["id"]}, {"$set": update})
        except Exception as e:
            logger.exception("reminder_loop error: %s", e)
        await asyncio.sleep(30)


# ============== BOOT ==============
@app.on_event("startup")
async def startup():
    await ensure_default_user()
    asyncio.create_task(reminder_loop())
    logger.info("Reminder dispatcher started")


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api.get("/")
async def root():
    return {"app": "One Smart", "status": "ok"}


@api.get("/debug/ai")
async def debug_ai():
    info = {
        "provider": "perplexity",
        "key_set": bool(PERPLEXITY_API_KEY),
        "key_prefix": PERPLEXITY_API_KEY[:8] + "..." if PERPLEXITY_API_KEY else None,
        "model": AI_MODEL,
    }
    if PERPLEXITY_API_KEY:
        try:
            r = await call_perplexity(model=AI_MODEL, max_tokens=50, messages=[{"role": "user", "content": "Say OK"}])
            info["test_call"] = "success"
            info["response"] = r["text"]
        except Exception as e:
            info["test_call"] = "failed"
            info["error"] = str(e)
    return info


@api.delete("/debug/clear-stock-cache")
async def clear_stock_cache():
    """Clear all stock/investment insight caches so they regenerate with fresh web search data."""
    result = await db.ai_cache.delete_many({"topic": {"$in": list(WEB_SEARCH_TOPICS)}})
    return {"deleted": result.deleted_count, "message": "Stock/investment cache cleared. Next insights will use web search."}


@api.get("/debug/passcode")
async def debug_passcode():
    user = await db.users.find_one({"id": "default"}, {"_id": 0, "passcode_hash": 1})
    expected = hash_passcode(DEFAULT_PASSCODE)
    return {
        "stored_hash": user.get("passcode_hash") if user else None,
        "expected_hash": expected,
        "match": user.get("passcode_hash") == expected if user else False,
        "user_exists": user is not None,
        "default_passcode": DEFAULT_PASSCODE,
        "jwt_secret_prefix": JWT_SECRET[:8] + "...",
    }


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
