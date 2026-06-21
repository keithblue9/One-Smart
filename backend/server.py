"""One Smart PWA — FastAPI backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
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

from emergentintegrations.llm.chat import LlmChat, UserMessage

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
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
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
    """Seed singleton default user if missing."""
    existing = await db.users.find_one({"id": "default"})
    if not existing:
        await db.users.insert_one({
            "id": "default",
            "name": "One Smart",
            "dob": None,
            "passcode_hash": hash_passcode(DEFAULT_PASSCODE),
            "language": "id",
            "created_at": now_iso(),
        })
        logger.info("Seeded default user with passcode %s", DEFAULT_PASSCODE)


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
@api.get("/investment/stocks-id")
async def stocks_id():
    return {"items": STOCKS_ID}


@api.get("/investment/stocks-global")
async def stocks_global():
    return {"items": STOCKS_GLOBAL}


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
        "ihsg": {"value": 7382.5, "change_pct": 0.42, "source": "Curated"},
        "gold_usd_oz": None,
        "gold_idr_gram": {"value": 1612000, "change_pct": 0.31, "source": "Antam estimate"},
        "btc_usd": None,
        "eth_usd": None,
        "updated_at": now_iso(),
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as hx:
            # USD/IDR (no-key sources: frankfurter primary, open.er-api fallback)
            try:
                r = await hx.get("https://api.frankfurter.dev/v1/latest", params={"base": "USD", "symbols": "IDR"})
                d = r.json()
                if d.get("rates", {}).get("IDR"):
                    result["usd_idr"] = {"value": d["rates"]["IDR"], "source": "frankfurter.dev"}
            except Exception as e:
                logger.warning("Frankfurter failed: %s", e)
            if not result["usd_idr"]:
                try:
                    r = await hx.get("https://open.er-api.com/v6/latest/USD")
                    d = r.json()
                    if d.get("rates", {}).get("IDR"):
                        result["usd_idr"] = {"value": d["rates"]["IDR"], "source": "open.er-api"}
                except Exception as e:
                    logger.warning("open.er-api failed: %s", e)
            # Crypto via CoinGecko
            try:
                r = await hx.get(
                    "https://api.coingecko.com/api/v3/simple/price",
                    params={"ids": "bitcoin,ethereum,pax-gold", "vs_currencies": "usd", "include_24hr_change": "true"},
                )
                d = r.json()
                if d.get("bitcoin"):
                    result["btc_usd"] = {"value": d["bitcoin"]["usd"], "change_pct": d["bitcoin"].get("usd_24h_change", 0)}
                if d.get("ethereum"):
                    result["eth_usd"] = {"value": d["ethereum"]["usd"], "change_pct": d["ethereum"].get("usd_24h_change", 0)}
                if d.get("pax-gold"):
                    result["gold_usd_oz"] = {"value": d["pax-gold"]["usd"], "change_pct": d["pax-gold"].get("usd_24h_change", 0), "source": "PAX Gold (CoinGecko)"}
            except Exception as e:
                logger.warning("CoinGecko failed: %s", e)
    except Exception as e:
        logger.warning("market overview general failure: %s", e)
    if not result["usd_idr"]:
        result["usd_idr"] = {"value": 15850, "source": "Cached estimate"}
    if not result["gold_usd_oz"]:
        result["gold_usd_oz"] = {"value": 2680, "change_pct": 0.0, "source": "Curated"}
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
    return {"items": JAKARTA_AGENDA, "updated_at": now_iso()}


@api.get("/world/news")
async def world_news():
    """Curated headline starters — AI insight endpoint can summarize per topic."""
    headlines = [
        {"category": "Geopolitics", "title": "Ketegangan Indo-Pasifik & dampaknya ke ASEAN", "summary": "Aliansi militer baru di Indo-Pasifik & posisi netral Indonesia jadi sorotan."},
        {"category": "Economy", "title": "Suku bunga The Fed dan reaksi pasar emerging", "summary": "Sinyal Fed pivot mempengaruhi rupiah, IHSG, dan obligasi global."},
        {"category": "Economy", "title": "APBN 2026 Indonesia & program prioritas", "summary": "Fokus belanja: makan bergizi, infrastruktur, transisi energi."},
        {"category": "Politics", "title": "Pilkada serentak dan dinamika koalisi", "summary": "Peta koalisi pasca Pemilu mempengaruhi kebijakan ekonomi 2026."},
        {"category": "Tech", "title": "Regulasi AI di EU & implikasi global", "summary": "EU AI Act fase implementasi penuh; perusahaan tech adaptasi compliance."},
        {"category": "Tech", "title": "Era robot humanoid mulai konsumer", "summary": "Optimus Gen 3, Figure 02, dan kompetitor China masuk pasar."},
    ]
    return {"items": headlines, "updated_at": now_iso()}


# ============== AI INSIGHT (Claude Sonnet 4.5) ==============
INSIGHT_PROMPTS = {
    "scholarship": "Anda mentor beasiswa S2 berpengalaman 15+ tahun. Berikan tips & trick KONKRET untuk lolos beasiswa ini berdasarkan data: {context}. Fokus: essay, interview, portfolio, timeline. Output dalam markdown bullet. Maksimal 6 poin actionable, masing-masing 1-2 kalimat. Bahasa: {language}.",
    "salary": "Anda career coach global tech. Berdasarkan data perusahaan: {context}, berikan: (1) Estimasi salary range untuk role utama (entry/mid/senior) dalam USD; (2) 4 tips konkret membangun portofolio yang menarik untuk perusahaan ini. Markdown ringkas. Bahasa: {language}.",
    "stock": "Anda analis investasi profesional bersertifikat. Untuk saham/aset {context}, berikan analisa: (1) Fundamental key (1 paragraf); (2) Teknikal singkat (support/resistance, momentum); (3) Strategi entry/exit; (4) Risk-reward. Output markdown rapi. Disclaimer di akhir. Bahasa: {language}.",
    "investment_strategy": "Anda financial advisor. Berdasarkan kondisi pasar global & Indonesia saat ini, dan context: {context}, berikan strategi alokasi aset untuk horizon yang dipilih. Sertakan: persentase alokasi rekomendasi, alasan, risiko utama, action items minggu ini. Markdown. Bahasa: {language}.",
    "freelance_profile": "Anda freelance growth coach. Untuk platform: {context}, bantu user membuat profile yang menarik. Berikan: (1) Headline draft (3 opsi); (2) Bio template; (3) Skill yang harus dihighlight; (4) Strategi 30 hari pertama. Bahasa: {language}.",
    "cv_recommendation": "Anda CV writer profesional ATS-optimized. Berdasarkan target {context}, berikan: (1) Struktur CV ideal; (2) 6 kata kunci yang harus muncul; (3) Format & template recommendation; (4) 3 common mistakes yang harus dihindari. Markdown. Bahasa: {language}.",
    "trend_advice": "Anda career strategist. Berdasarkan tren pekerjaan {context}, berikan advice konkret: skill yang harus dipelajari sekarang untuk monetisasi cepat 6-12 bulan, dan untuk long term 3-5 tahun. Bahasa: {language}.",
    "city_insight": "Anda relocation consultant. Berdasarkan data kota {context}, berikan: (1) Visa & residence pathway; (2) Estimasi biaya hidup bulanan; (3) Industri kuat & peluang kerja; (4) Tips kultural integrasi. Bahasa: {language}.",
    "general": "Berikan insight mendalam dan actionable tentang topik berikut: {context}. Maksimal 250 kata, markdown. Bahasa: {language}.",
}


@api.post("/ai/insight")
async def ai_insight(req: AIInsightReq, user: dict = Depends(get_user)):
    """Generate AI insight via Claude Sonnet 4.5. Cached in MongoDB per (topic, context_hash)."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI not configured")

    context_str = json.dumps(req.context, ensure_ascii=False, sort_keys=True)
    cache_key = hashlib.sha256(f"{req.topic}|{context_str}|{req.language}".encode()).hexdigest()
    cached = await db.ai_cache.find_one({"key": cache_key}, {"_id": 0})
    if cached:
        return {"insight": cached["insight"], "cached": True}

    prompt_tmpl = INSIGHT_PROMPTS.get(req.topic, INSIGHT_PROMPTS["general"])
    prompt = prompt_tmpl.format(context=context_str, language="Indonesia" if req.language == "id" else "English")
    lang_label = "Bahasa Indonesia" if req.language == "id" else "English"
    system_msg = f"Anda asisten ahli yang memberi insight tajam, akurat, terstruktur. Selalu jawab dalam {lang_label}."

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    try:
        # Use non-streaming send_message — we need the full response cached
        # (streaming would complicate caching; for UX we accept short wait)
        response = await chat.send_message(UserMessage(text=prompt))
        insight_text = response if isinstance(response, str) else str(response)
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
    })
    return {"insight": insight_text, "cached": False}


# ============== NOTES & REMINDERS ==============
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
    """Generate an ATS-optimized CV PDF. Uses Claude to enrich summary, action-verb experience bullets and optimization tips."""
    from fastapi.responses import Response

    ai_bullets = {"experiences": {}, "tips": [], "summary": None}
    if EMERGENT_LLM_KEY:
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
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=str(uuid.uuid4()),
                system_message="You output strict JSON only.",
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            raw = await chat.send_message(UserMessage(text=prompt))
            text = raw if isinstance(raw, str) else str(raw)
            # strip code fences if any
            if "```" in text:
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            parsed = json.loads(text.strip())
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


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
