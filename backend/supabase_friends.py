import os
from urllib.parse import quote

import certifi
import httpx
from dotenv import load_dotenv

from schemas import Friend, FriendCandidate, FriendCreate
from supabase_events import SupabaseConfigError, SupabaseRequestError


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
SELF_DB_USER_ID = int(os.getenv("SELF_DB_USER_ID", "1"))


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


def _ensure_self_user() -> None:
    rows = _request("GET", f"User?select=id&id=eq.{SELF_DB_USER_ID}")
    if rows:
        return

    _request(
        "POST",
        "User",
        {
            "id": SELF_DB_USER_ID,
            "name": "みな",
            "user_id": "mina_0415",
        },
    )


def _friend_from_relation(relation: dict, users_by_id: dict[int, dict]) -> Friend:
    friend_user_id = int(relation["friend_user_id"])
    user = users_by_id.get(friend_user_id, {})
    return Friend(
        id=int(relation["id"]),
        name=user.get("name") or f"ユーザー{friend_user_id}",
        public_user_id=user.get("user_id"),
        status="available",
    )


def _get_users_by_ids(user_ids: list[int]) -> dict[int, dict]:
    if not user_ids:
        return {}

    ids = ",".join(str(user_id) for user_id in sorted(set(user_ids)))
    rows = _request("GET", f"User?select=id,name,user_id,note&id=in.({ids})")
    return {int(row["id"]): row for row in rows}


def _candidate_from_user(row: dict) -> FriendCandidate:
    return FriendCandidate(
        id=int(row["id"]),
        name=row.get("name") or f"ユーザー{row['id']}",
        user_id=row.get("user_id") or "",
        note=row.get("note"),
    )


def list_friends() -> list[Friend]:
    relations = _request(
        "GET",
        f"Friend?select=id,owner_user_id,friend_user_id,created_at,updated_at&owner_user_id=eq.{SELF_DB_USER_ID}&order=id.asc",
    )
    users_by_id = _get_users_by_ids([int(row["friend_user_id"]) for row in relations])
    return [_friend_from_relation(row, users_by_id) for row in relations]


def search_friend_candidates(name: str) -> list[FriendCandidate]:
    keyword = quote(name.strip(), safe="")
    rows = _request(
        "GET",
        f"User?select=id,name,user_id,note&name=eq.{keyword}&order=id.asc&limit=20",
    )
    return [_candidate_from_user(row) for row in rows if int(row["id"]) != SELF_DB_USER_ID]


def find_friend_candidate_by_public_user_id(public_user_id: str) -> FriendCandidate | None:
    keyword = quote(public_user_id.strip(), safe="")
    rows = _request(
        "GET",
        f"User?select=id,name,user_id,note&user_id=eq.{keyword}&limit=1",
    )
    if not rows:
        return None

    row = rows[0]
    if int(row["id"]) == SELF_DB_USER_ID:
        return None

    return _candidate_from_user(row)


def create_friend(payload: FriendCreate) -> Friend:
    _ensure_self_user()
    friend_user = None

    if payload.user_db_id is not None:
      user_rows = _request("GET", f"User?select=id,name,user_id,note&id=eq.{payload.user_db_id}&limit=1")
      friend_user = user_rows[0] if user_rows else None
    elif payload.public_user_id:
      candidate = find_friend_candidate_by_public_user_id(payload.public_user_id)
      friend_user = {
          "id": candidate.id,
          "name": candidate.name,
          "user_id": candidate.user_id,
          "note": candidate.note,
      } if candidate else None
    elif payload.name:
      candidates = search_friend_candidates(payload.name)
      if candidates:
          friend_user = {
              "id": candidates[0].id,
              "name": candidates[0].name,
              "user_id": candidates[0].user_id,
              "note": candidates[0].note,
          }

    if not friend_user:
        raise SupabaseRequestError(404, "Friend candidate not found")

    if int(friend_user["id"]) == SELF_DB_USER_ID:
        raise SupabaseRequestError(400, "You cannot add yourself")

    existing_relations = _request(
        "GET",
        f"Friend?select=id&owner_user_id=eq.{SELF_DB_USER_ID}&friend_user_id=eq.{friend_user['id']}&limit=1",
    )
    if existing_relations:
        raise SupabaseRequestError(409, "Friend already added")

    relation_rows = _request(
        "POST",
        "Friend",
        {
            "owner_user_id": SELF_DB_USER_ID,
            "friend_user_id": friend_user["id"],
        },
    )

    return _friend_from_relation(relation_rows[0], {int(friend_user["id"]): friend_user})


def delete_friend(friend_id: int) -> Friend | None:
    relations = _request(
        "GET",
        f"Friend?select=id,owner_user_id,friend_user_id,created_at,updated_at&id=eq.{friend_id}&limit=1",
    )

    if not relations:
        return None

    relation = relations[0]
    users_by_id = _get_users_by_ids([int(relation["friend_user_id"])])
    friend = _friend_from_relation(relation, users_by_id)
    _request("DELETE", f"Friend?id=eq.{friend_id}")
    return friend
