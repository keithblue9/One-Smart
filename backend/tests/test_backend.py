"""One Smart backend API tests — auth, content endpoints, notes CRUD, AI insight, push."""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://one-smart-pro.preview.emergentagent.com").rstrip("/")


# ========== AUTH ==========
class TestAuth:
    def test_login_success(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/auth/login", json={"passcode": "991285"})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and isinstance(d["token"], str) and len(d["token"]) > 20
        assert d["user"]["id"] == "default"
        assert d["user"]["language"] in ("id", "en")

    def test_login_wrong_passcode(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/auth/login", json={"passcode": "000000"})
        assert r.status_code == 401

    def test_me_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "default"
        assert "language" in d

    def test_change_passcode_wrong_old(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/change-passcode",
                            json={"old_passcode": "000000", "new_passcode": "123456"})
        assert r.status_code == 401

    def test_change_passcode_invalid_new(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/change-passcode",
                            json={"old_passcode": "991285", "new_passcode": "abc"})
        assert r.status_code == 400

    def test_profile_update_name_dob(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/profile",
                            json={"name": "Test User", "dob": "1986-01-01", "language": "id"})
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "Test User"
        assert d["dob"] == "1986-01-01"
        # restore baseline name (keep dob for eligibility test)
        api_client.post(f"{BASE_URL}/api/auth/profile", json={"name": "One Smart"})


# ========== EDUCATION ==========
class TestEducation:
    def test_scholarships_list(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/education/scholarships")
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and len(d["items"]) > 0
        first = d["items"][0]
        for key in ("id", "name", "age_min", "age_max", "eligible"):
            assert key in first

    def test_scholarships_age_filter_explicit(self, api_client):
        # Override age via query param
        r = api_client.get(f"{BASE_URL}/api/education/scholarships?age=40")
        assert r.status_code == 200
        d = r.json()
        assert d["age"] == 40
        # At age 40 there should be at least one ineligible (e.g. MEXT max 34)
        ineligible = [i for i in d["items"] if i["eligible"] is False]
        assert len(ineligible) >= 1, "Expected at least one ineligible scholarship at age 40"

    def test_portfolio_tips(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/education/portfolio-tips")
        assert r.status_code == 200
        assert "tips" in r.json()


# ========== JOB ==========
class TestJob:
    def test_companies(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/job/companies")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) > 0
        assert "name" in items[0] and "location" in items[0]

    def test_companies_location_filter(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/job/companies?location=USA")
        assert r.status_code == 200
        items = r.json()["items"]
        for c in items:
            assert "usa" in c["location"].lower()

    def test_freelance_sites(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/job/freelance-sites")
        assert r.status_code == 200
        assert len(r.json()["items"]) > 0

    def test_trends(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/job/trends")
        assert r.status_code == 200


# ========== INVESTMENT ==========
class TestInvestment:
    def test_market_overview(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/investment/market-overview")
        assert r.status_code == 200
        d = r.json()
        for k in ("usd_idr", "ihsg", "gold_idr_gram", "btc_usd", "eth_usd"):
            assert k in d, f"missing {k}"

    def test_stocks_id(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/investment/stocks-id")
        assert r.status_code == 200
        assert len(r.json()["items"]) > 0

    def test_stocks_global(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/investment/stocks-global")
        assert r.status_code == 200
        assert len(r.json()["items"]) > 0

    def test_alternatives(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/investment/alternatives")
        assert r.status_code == 200
        assert len(r.json()["items"]) > 0


# ========== WORLD ==========
class TestWorld:
    @pytest.mark.parametrize("path", [
        "/api/world/news", "/api/world/owid", "/api/world/cities",
        "/api/world/tech", "/api/world/travel-id", "/api/world/jakarta",
    ])
    def test_world_endpoints(self, anon_client, path):
        r = anon_client.get(f"{BASE_URL}{path}")
        assert r.status_code == 200, f"{path} failed: {r.status_code}"
        d = r.json()
        assert "items" in d and len(d["items"]) > 0


# ========== NOTES CRUD ==========
class TestNotes:
    def test_notes_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/notes")
        assert r.status_code == 401

    def test_notes_crud_flow(self, api_client):
        # CREATE
        payload = {
            "title": "TEST_NOTE",
            "content": "test content",
            "list_type": "bullet",
            "items": [{"text": "item 1", "done": False}, {"text": "item 2", "done": False}],
            "reminder_at": "2026-12-31T10:00:00Z",
            "recurrence": "weekly",
        }
        r = api_client.post(f"{BASE_URL}/api/notes", json=payload)
        assert r.status_code == 200
        note = r.json()
        assert note["title"] == "TEST_NOTE"
        assert note["list_type"] == "bullet"
        assert len(note["items"]) == 2
        assert "id" in note
        note_id = note["id"]

        # READ
        r = api_client.get(f"{BASE_URL}/api/notes")
        assert r.status_code == 200
        ids = [n["id"] for n in r.json()["items"]]
        assert note_id in ids

        # UPDATE (patch)
        r = api_client.patch(f"{BASE_URL}/api/notes/{note_id}",
                             json={"title": "TEST_NOTE_UPDATED", "list_type": "numbered"})
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_NOTE_UPDATED"
        assert r.json()["list_type"] == "numbered"

        # Verify persistence
        r = api_client.get(f"{BASE_URL}/api/notes")
        match = next(n for n in r.json()["items"] if n["id"] == note_id)
        assert match["title"] == "TEST_NOTE_UPDATED"

        # DELETE
        r = api_client.delete(f"{BASE_URL}/api/notes/{note_id}")
        assert r.status_code == 200
        assert r.json()["deleted"] == 1

        # Verify gone
        r = api_client.get(f"{BASE_URL}/api/notes")
        ids = [n["id"] for n in r.json()["items"]]
        assert note_id not in ids

    def test_update_nonexistent_note(self, api_client):
        r = api_client.patch(f"{BASE_URL}/api/notes/nonexistent-uuid", json={"title": "x"})
        assert r.status_code == 404


# ========== PUSH ==========
class TestPush:
    def test_public_key(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/push/public-key")
        assert r.status_code == 200
        d = r.json()
        assert "key" in d and len(d["key"]) > 20

    def test_subscribe_requires_auth(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/push/subscribe",
                             json={"endpoint": "https://example.com/push/x", "keys": {"p256dh": "k", "auth": "a"}})
        assert r.status_code == 401

    def test_subscribe_with_auth(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/push/subscribe",
                            json={"endpoint": "https://test.example.com/push/TEST_endpoint",
                                  "keys": {"p256dh": "test_key", "auth": "test_auth"}})
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ========== AI INSIGHT ==========
class TestAIInsight:
    def test_ai_requires_auth(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/ai/insight",
                             json={"topic": "general", "context": {"q": "test"}, "language": "id"})
        assert r.status_code == 401

    def test_ai_insight_scholarship(self, api_client):
        # Use a small context to trigger genuine LLM call (or cache hit)
        payload = {"topic": "scholarship",
                   "context": {"name": "LPDP", "country": "Indonesia", "age_max": 35},
                   "language": "id"}
        r = api_client.post(f"{BASE_URL}/api/ai/insight", json=payload, timeout=60)
        assert r.status_code == 200, f"AI failed: {r.text[:300]}"
        d = r.json()
        assert "insight" in d
        assert isinstance(d["insight"], str)
        assert len(d["insight"]) > 30
        assert "cached" in d

    def test_ai_insight_cache(self, api_client):
        payload = {"topic": "scholarship",
                   "context": {"name": "LPDP", "country": "Indonesia", "age_max": 35},
                   "language": "id"}
        r = api_client.post(f"{BASE_URL}/api/ai/insight", json=payload, timeout=60)
        assert r.status_code == 200
        # On second call expect cached=True
        assert r.json()["cached"] is True
