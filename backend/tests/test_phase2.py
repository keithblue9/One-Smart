"""Phase 2 backend tests: theme profile, bookmarks toggle/list, CV PDF generate, reminder dispatcher."""
import os
import time
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://one-smart-pro.preview.emergentagent.com").rstrip("/")


# ========== THEME (profile) ==========
class TestThemeProfile:
    def test_set_theme_dark(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/profile", json={"theme": "dark"})
        assert r.status_code == 200
        assert r.json().get("theme") == "dark"
        # verify persisted via me
        me = api_client.get(f"{BASE_URL}/api/auth/me").json()
        assert me.get("theme") == "dark"

    def test_set_theme_light(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/profile", json={"theme": "light"})
        assert r.status_code == 200
        assert r.json().get("theme") == "light"
        me = api_client.get(f"{BASE_URL}/api/auth/me").json()
        assert me.get("theme") == "light"


# ========== BOOKMARKS ==========
class TestBookmarks:
    def test_bookmarks_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/bookmarks")
        assert r.status_code == 401

    def test_toggle_scholarship_bookmark(self, api_client):
        item_id = "TEST_sch_001"
        payload = {"kind": "scholarship", "item_id": item_id,
                   "payload": {"name": "TEST Scholarship", "country": "Indonesia"}}
        # cleanup any previous state — first toggle returns either bookmarked or not
        r1 = api_client.post(f"{BASE_URL}/api/bookmarks/toggle", json=payload)
        assert r1.status_code == 200
        state1 = r1.json()["bookmarked"]
        # If already saved (state1=False after toggle), toggle again to make sure we are saved.
        if state1 is False:
            r1 = api_client.post(f"{BASE_URL}/api/bookmarks/toggle", json=payload)
            assert r1.json()["bookmarked"] is True

        # GET — saved now
        r = api_client.get(f"{BASE_URL}/api/bookmarks?kind=scholarship")
        assert r.status_code == 200
        ids = [b["item_id"] for b in r.json()["items"]]
        assert item_id in ids

        # Toggle again -> unsave
        r2 = api_client.post(f"{BASE_URL}/api/bookmarks/toggle", json=payload)
        assert r2.status_code == 200
        assert r2.json()["bookmarked"] is False

        # GET — gone
        r = api_client.get(f"{BASE_URL}/api/bookmarks?kind=scholarship")
        ids = [b["item_id"] for b in r.json()["items"]]
        assert item_id not in ids

    def test_toggle_company_bookmark_and_filter(self, api_client):
        item_id = "TEST_co_001"
        payload = {"kind": "company", "item_id": item_id,
                   "payload": {"name": "TEST Co", "location": "USA"}}
        # Ensure saved
        r1 = api_client.post(f"{BASE_URL}/api/bookmarks/toggle", json=payload)
        if r1.json()["bookmarked"] is False:
            api_client.post(f"{BASE_URL}/api/bookmarks/toggle", json=payload)

        # kind=company filter
        r = api_client.get(f"{BASE_URL}/api/bookmarks?kind=company")
        items = r.json()["items"]
        assert any(b["item_id"] == item_id and b["kind"] == "company" for b in items)
        # all returned must be company kind
        assert all(b["kind"] == "company" for b in items)

        # cleanup
        api_client.post(f"{BASE_URL}/api/bookmarks/toggle", json=payload)


# ========== CV PDF GENERATOR ==========
class TestCVGenerate:
    def test_cv_requires_auth(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/cv/generate",
                             json={"name": "Test", "role_target": "Engineer"})
        assert r.status_code == 401

    def test_cv_pdf_minimal(self, api_client):
        payload = {
            "name": "Test User",
            "role_target": "Senior Backend Engineer",
            "summary": "Backend engineer 5y Python/Go.",
            "email": "test@example.com",
            "phone": "+62 812 3456 7890",
            "location": "Jakarta, ID",
            "experiences": [{
                "title": "Backend Engineer", "company": "ACME",
                "period": "2022 - present",
                "bullets": ["Built APIs", "Improved p99 latency 40%"],
            }],
            "education": [{"degree": "B.Sc. CS", "school": "ITB", "period": "2014-2018"}],
            "skills": ["Python", "FastAPI", "MongoDB"],
            "language": "id",
        }
        # Claude enrichment can take a while
        r = api_client.post(f"{BASE_URL}/api/cv/generate", json=payload, timeout=60)
        assert r.status_code == 200, f"CV failed: {r.text[:300]}"
        ct = r.headers.get("content-type", "")
        assert "application/pdf" in ct, f"unexpected content-type: {ct}"
        assert r.headers.get("content-disposition", "").lower().startswith("attachment"), \
            "missing attachment disposition"
        body = r.content
        assert len(body) > 1500, f"PDF too small: {len(body)} bytes"
        assert body[:4] == b"%PDF", f"PDF magic header missing, got {body[:8]!r}"

    def test_cv_validation_missing_required(self, api_client):
        # role_target missing -> 422
        r = api_client.post(f"{BASE_URL}/api/cv/generate", json={"name": "Only Name"})
        assert r.status_code == 422


# ========== REMINDER DISPATCHER ==========
class TestReminderDispatcher:
    def test_past_reminder_gets_dispatched(self, api_client):
        """Insert note with past reminder_at — dispatcher must set reminder_sent_at within ~35s."""
        past = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
        payload = {
            "title": "TEST_REMINDER",
            "content": "due now",
            "list_type": "plain",
            "items": [],
            "reminder_at": past,
            "recurrence": "none",
        }
        r = api_client.post(f"{BASE_URL}/api/notes", json=payload)
        assert r.status_code == 200
        note_id = r.json()["id"]
        try:
            sent_at = None
            # Loop dispatcher runs every 30s + initial 5s; poll up to 45s
            deadline = time.time() + 45
            while time.time() < deadline:
                time.sleep(5)
                r = api_client.get(f"{BASE_URL}/api/notes")
                match = next((n for n in r.json()["items"] if n["id"] == note_id), None)
                assert match is not None
                sent_at = match.get("reminder_sent_at")
                if sent_at:
                    break
            assert sent_at, "reminder_sent_at not set within 45s — dispatcher may be dead"
        finally:
            api_client.delete(f"{BASE_URL}/api/notes/{note_id}")

    def test_daily_recurrence_rearms(self, api_client):
        past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
        payload = {
            "title": "TEST_REMINDER_DAILY",
            "content": "daily",
            "list_type": "plain",
            "items": [],
            "reminder_at": past,
            "recurrence": "daily",
        }
        r = api_client.post(f"{BASE_URL}/api/notes", json=payload)
        assert r.status_code == 200
        note_id = r.json()["id"]
        original_dt = datetime.fromisoformat(past.replace("Z", "+00:00"))
        try:
            new_reminder_at = None
            sent_at = None
            deadline = time.time() + 45
            while time.time() < deadline:
                time.sleep(5)
                r = api_client.get(f"{BASE_URL}/api/notes")
                match = next((n for n in r.json()["items"] if n["id"] == note_id), None)
                assert match is not None
                new_reminder_at = match.get("reminder_at")
                sent_at = match.get("reminder_sent_at")
                # Recurrence path: code sets reminder_sent_at=None and bumps reminder_at to future
                if new_reminder_at:
                    nxt = datetime.fromisoformat(new_reminder_at.replace("Z", "+00:00"))
                    if nxt > datetime.now(timezone.utc):
                        break
            assert new_reminder_at, "reminder_at missing"
            nxt = datetime.fromisoformat(new_reminder_at.replace("Z", "+00:00"))
            assert nxt > original_dt, "reminder_at not advanced"
            assert nxt > datetime.now(timezone.utc), "reminder_at not in future after rearm"
        finally:
            api_client.delete(f"{BASE_URL}/api/notes/{note_id}")
