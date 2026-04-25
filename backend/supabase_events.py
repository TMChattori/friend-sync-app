import os

import certifi
import httpx
from dotenv import load_dotenv

from schemas import Event, EventCreate, EventUpdate


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


class SupabaseConfigError(RuntimeError):
    pass


class SupabaseRequestError(RuntimeError):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def _ensure_config() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise SupabaseConfigError("SUPABASE_URL and SUPABASE_KEY are required in backend/.env")


def _headers() -> dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation",
    }


def _request(method: str, path: str, json: dict | None = None) -> list[dict]:
    _ensure_config()

    with httpx.Client(verify=certifi.where(), timeout=10) as client:
        response = client.request(
            method,
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers=_headers(),
            json=json,
        )

    if response.status_code >= 400:
        raise SupabaseRequestError(response.status_code, response.text)

    if not response.content:
        return []

    data = response.json()
    return data if isinstance(data, list) else [data]


def _event_from_row(row: dict) -> Event:
    return Event(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        date=row["date"],
        title=row["title"],
        start_time=_normalize_time(row.get("start_time")),
        end_time=_normalize_time(row.get("end_time")),
        category=row.get("category"),
    )


def _normalize_time(value: str | None) -> str | None:
    if value is None:
        return None
    return value[:5]


def _payload_for_db(payload: EventCreate | EventUpdate) -> dict:
    return payload.model_dump()


def list_events() -> list[Event]:
    rows = _request("GET", "events?select=*&order=date.asc,start_time.asc")
    return [_event_from_row(row) for row in rows]


def create_event(payload: EventCreate) -> Event:
    rows = _request("POST", "events", _payload_for_db(payload))
    return _event_from_row(rows[0])


def update_event(event_id: str, payload: EventUpdate) -> Event | None:
    rows = _request("PATCH", f"events?id=eq.{event_id}", _payload_for_db(payload))
    if not rows:
        return None
    return _event_from_row(rows[0])


def delete_event(event_id: str) -> Event | None:
    rows = _request("DELETE", f"events?id=eq.{event_id}")
    if not rows:
        return None
    return _event_from_row(rows[0])
