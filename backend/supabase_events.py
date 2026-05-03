from urllib.parse import quote

import certifi
import httpx

from config import SUPABASE_URL, get_admin_key
from schemas import Event, EventCreate, EventUpdate


class SupabaseConfigError(RuntimeError):
    pass


class SupabaseRequestError(RuntimeError):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


def _ensure_config() -> None:
    if not SUPABASE_URL or not get_admin_key():
        raise SupabaseConfigError("SUPABASE_URL and a backend Supabase key are required")


def _headers() -> dict[str, str]:
    admin_key = get_admin_key()
    return {
        "apikey": admin_key,
        "Authorization": f"Bearer {admin_key}",
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
        end_date=row.get("end_date"),
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


def list_events(user_db_id: int) -> list[Event]:
    encoded_user_id = quote(str(user_db_id), safe="")
    rows = _request("GET", f"events?select=*&user_id=eq.{encoded_user_id}&order=date.asc,start_time.asc")
    return [_event_from_row(row) for row in rows]


def list_friend_events(owner_user_id: int) -> list[Event]:
    relation_rows = _request(
        "GET",
        f"Friend?select=friend_user_id&owner_user_id=eq.{owner_user_id}",
    )
    friend_user_ids = sorted({str(row["friend_user_id"]) for row in relation_rows if row.get("friend_user_id") is not None})
    if not friend_user_ids:
        return []

    encoded_ids = ",".join(friend_user_ids)
    rows = _request("GET", f"events?select=*&user_id=in.({encoded_ids})&order=date.asc,start_time.asc")
    return [_event_from_row(row) for row in rows]


def create_event(payload: EventCreate, user_db_id: int) -> Event:
    db_payload = _payload_for_db(payload)
    db_payload["user_id"] = str(user_db_id)
    rows = _request("POST", "events", db_payload)
    return _event_from_row(rows[0])


def update_event(event_id: str, payload: EventUpdate, user_db_id: int) -> Event | None:
    encoded_user_id = quote(str(user_db_id), safe="")
    db_payload = _payload_for_db(payload)
    db_payload["user_id"] = str(user_db_id)
    rows = _request("PATCH", f"events?id=eq.{event_id}&user_id=eq.{encoded_user_id}", db_payload)
    if not rows:
        return None
    return _event_from_row(rows[0])


def delete_event(event_id: str, user_db_id: int) -> Event | None:
    encoded_user_id = quote(str(user_db_id), safe="")
    rows = _request("DELETE", f"events?id=eq.{event_id}&user_id=eq.{encoded_user_id}")
    if not rows:
        return None
    return _event_from_row(rows[0])
