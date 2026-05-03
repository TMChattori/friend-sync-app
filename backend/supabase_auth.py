from time import time
from urllib.parse import quote
from uuid import uuid4

import certifi
import httpx

from config import SUPABASE_STORAGE_BUCKET, SUPABASE_URL, get_admin_key, get_auth_key
from schemas import AuthCredentials, AuthProfileUpdate, AuthSession, AuthUpdate, PasswordResetRequest
from supabase_events import SupabaseConfigError, SupabaseRequestError


def _ensure_config() -> None:
    if not SUPABASE_URL or not get_auth_key() or not get_admin_key():
        raise SupabaseConfigError("SUPABASE_URL and backend Supabase keys are required")


def _headers(access_token: str | None = None) -> dict[str, str]:
    auth_key = get_auth_key()
    return {
        "apikey": auth_key,
        "Authorization": f"Bearer {access_token or auth_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _request(method: str, path: str, json: dict | None = None, access_token: str | None = None) -> dict:
    _ensure_config()

    with httpx.Client(verify=certifi.where(), timeout=10) as client:
        response = client.request(
            method,
            f"{SUPABASE_URL}/auth/v1/{path}",
            headers=_headers(access_token),
            json=json,
        )

    if response.status_code >= 400:
        raise SupabaseRequestError(response.status_code, response.text)

    if not response.content:
        return {}

    data = response.json()
    return data if isinstance(data, dict) else {}


def _db_headers() -> dict[str, str]:
    admin_key = get_admin_key()
    return {
        "apikey": admin_key,
        "Authorization": f"Bearer {admin_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Prefer": "return=representation",
    }


def _db_request(method: str, path: str, json: dict | None = None) -> list[dict]:
    _ensure_config()

    with httpx.Client(verify=certifi.where(), timeout=10) as client:
        response = client.request(
            method,
            f"{SUPABASE_URL}/rest/v1/{path}",
            headers=_db_headers(),
            json=json,
        )

    if response.status_code >= 400:
        raise SupabaseRequestError(response.status_code, response.text)

    if not response.content:
        return []

    data = response.json()
    return data if isinstance(data, list) else [data]


def _storage_headers(content_type: str) -> dict[str, str]:
    admin_key = get_admin_key()
    return {
        "apikey": admin_key,
        "Authorization": f"Bearer {admin_key}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }


def _extension_from_content_type(content_type: str) -> str:
    if content_type == "image/png":
        return "png"
    if content_type == "image/webp":
        return "webp"
    return "jpg"


def _public_user_id_from_user(app_user: dict | None) -> str | None:
    if not app_user:
        return None
    return app_user.get("user_id")


def resolve_app_user(access_token: str, current_email: str) -> dict:
    auth_user = get_auth_user(access_token)
    return ensure_app_user(str(auth_user["id"]), current_email, auth_user.get("user_metadata", {}).get("username"))


def upload_profile_icon_file(access_token: str, current_email: str, content: bytes, content_type: str | None) -> str:
    if not current_email:
        raise SupabaseRequestError(400, "current email is required")

    app_user = resolve_app_user(access_token, current_email)
    normalized_content_type = content_type if content_type in {"image/jpeg", "image/png", "image/webp"} else "image/jpeg"
    extension = _extension_from_content_type(normalized_content_type)
    object_path = f"user-{app_user['id']}/{uuid4().hex}.{extension}"

    with httpx.Client(verify=certifi.where(), timeout=20) as client:
        response = client.post(
            f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{object_path}",
            headers=_storage_headers(normalized_content_type),
            content=content,
        )

    if response.status_code >= 400:
        raise SupabaseRequestError(response.status_code, response.text)

    encoded_path = quote(object_path, safe="/")
    return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_STORAGE_BUCKET}/{encoded_path}"


def _session_from_response(
    data: dict,
    fallback_email: str,
    fallback_token: str | None = None,
    app_user: dict | None = None,
) -> AuthSession:
    user = data.get("user") if isinstance(data.get("user"), dict) else data
    email = user.get("email") if isinstance(user, dict) else None
    auth_user_id = user.get("id") if isinstance(user, dict) else None

    return AuthSession(
        email=email or fallback_email,
        access_token=data.get("access_token") or fallback_token,
        auth_user_id=auth_user_id or (app_user.get("auth_user_id") if app_user else None),
        db_user_id=int(app_user["id"]) if app_user and app_user.get("id") is not None else None,
        username=app_user.get("name") if app_user else None,
        public_user_id=_public_user_id_from_user(app_user),
        note=app_user.get("note") if app_user else None,
        icon_url=app_user.get("icon_url") if app_user else None,
        plan_status=app_user.get("plan_status") if app_user and app_user.get("plan_status") else "free",
    )


def _build_public_user_id(email: str) -> str:
    local_part = email.split("@")[0].strip().lower()
    normalized = "".join(character for character in local_part if character.isascii() and character.isalnum())
    suffix = int(time() * 1000)
    return f"{normalized or 'user'}_{suffix}"


def _build_default_name(email: str, username: str | None = None) -> str:
    if username and username.strip():
        return username.strip()[:30]
    local_part = email.split("@")[0].strip()
    return local_part[:30] or "新規ユーザー"


def get_auth_user(access_token: str) -> dict:
    data = _request("GET", "user", access_token=access_token)
    user = data.get("user") if isinstance(data.get("user"), dict) else data
    if not isinstance(user, dict) or not user.get("id"):
        raise SupabaseRequestError(401, "Supabase auth user could not be resolved")
    return user


def ensure_app_user(auth_user_id: str, email: str, username: str | None = None) -> dict:
    encoded_auth_user_id = quote(auth_user_id, safe="")
    existing_rows = _db_request(
        "GET",
        f"User?select=id,auth_user_id,name,user_id,note,icon_url,mailadress,plan_status&auth_user_id=eq.{encoded_auth_user_id}&limit=1",
    )
    if existing_rows:
        existing_user = existing_rows[0]
        display_name = _build_default_name(email, username) if username else None
        if display_name and existing_user.get("name") != display_name:
            rows = _db_request("PATCH", f"User?id=eq.{existing_user['id']}", {"name": display_name})
            return rows[0] if rows else existing_user
        return existing_user

    # Migration fallback for older rows created before auth_user_id existed.
    encoded_email = quote(email, safe="")
    email_rows = _db_request(
        "GET",
        f"User?select=id,auth_user_id,name,user_id,note,icon_url,mailadress,plan_status&mailadress=eq.{encoded_email}&limit=1",
    )
    if email_rows:
        rows = _db_request("PATCH", f"User?id=eq.{email_rows[0]['id']}", {"auth_user_id": auth_user_id})
        existing_user = rows[0] if rows else email_rows[0]
        display_name = _build_default_name(email, username) if username else None
        if display_name and existing_user.get("name") != display_name:
            rows = _db_request("PATCH", f"User?id=eq.{existing_user['id']}", {"name": display_name})
            return rows[0] if rows else existing_user
        return existing_user

    rows = _db_request(
        "POST",
        "User",
        {
            "auth_user_id": auth_user_id,
            "name": _build_default_name(email, username),
            "user_id": _build_public_user_id(email),
            "mailadress": email,
            "plan_status": "free",
        },
    )
    return rows[0]


def get_app_user_profile(access_token: str, current_email: str) -> AuthSession:
    if not current_email:
        raise SupabaseRequestError(400, "current email is required")

    auth_user = get_auth_user(access_token)
    app_user = ensure_app_user(str(auth_user["id"]), current_email, auth_user.get("user_metadata", {}).get("username"))
    return _session_from_response({"user": auth_user}, current_email, access_token, app_user)


def sync_app_user_email(auth_user_id: str, current_email: str, new_email: str) -> None:
    if not current_email or current_email == new_email:
        return

    encoded_auth_user_id = quote(auth_user_id, safe="")
    rows = _db_request("GET", f"User?select=id,mailadress&auth_user_id=eq.{encoded_auth_user_id}&limit=1")
    if not rows:
        ensure_app_user(auth_user_id, new_email)
        return

    user_id = rows[0]["id"]
    _db_request("PATCH", f"User?id=eq.{user_id}", {"mailadress": new_email})


def update_app_user_profile(access_token: str, current_email: str, payload: AuthProfileUpdate) -> AuthSession:
    if not current_email:
        raise SupabaseRequestError(400, "current email is required")

    auth_user = get_auth_user(access_token)
    app_user = ensure_app_user(str(auth_user["id"]), current_email)
    update_payload: dict[str, str] = {}

    if payload.username is not None:
        username = payload.username.strip()
        if not username:
            raise SupabaseRequestError(400, "name cannot be empty")
        update_payload["name"] = username[:30]

    if payload.public_user_id is not None:
        public_user_id = payload.public_user_id.strip()
        if not public_user_id:
            raise SupabaseRequestError(400, "user_id cannot be empty")

        encoded_public_user_id = quote(public_user_id, safe="")
        existing_rows = _db_request(
            "GET",
            f"User?select=id&user_id=eq.{encoded_public_user_id}&id=neq.{app_user['id']}&limit=1",
        )
        if existing_rows:
            raise SupabaseRequestError(409, "user_id already exists")

        update_payload["user_id"] = public_user_id

    if payload.note is not None:
        note = payload.note.strip()
        if note:
            update_payload["note"] = note[:120]

    if payload.icon_url is not None:
        icon_url = payload.icon_url.strip()
        if icon_url:
            update_payload["icon_url"] = icon_url

    if not update_payload:
        return _session_from_response({"user": auth_user}, current_email, access_token, app_user)

    rows = _db_request("PATCH", f"User?id=eq.{app_user['id']}", update_payload)
    updated_app_user = rows[0] if rows else ensure_app_user(str(auth_user["id"]), current_email)
    return _session_from_response({"user": auth_user}, current_email, access_token, updated_app_user)


def register_user(payload: AuthCredentials) -> AuthSession:
    data = _request(
        "POST",
        "signup",
        {
            "email": payload.email,
            "password": payload.password,
        },
    )
    auth_user = data.get("user") if isinstance(data.get("user"), dict) else None
    auth_user_id = str(auth_user["id"]) if isinstance(auth_user, dict) and auth_user.get("id") else None
    if not auth_user_id:
        raise SupabaseRequestError(500, "Supabase auth user id is missing from signup response")

    app_user = ensure_app_user(auth_user_id, payload.email, payload.username)
    session = _session_from_response(data, payload.email, app_user=app_user)

    if session.access_token:
        return session

    try:
        return login_user(payload)
    except SupabaseRequestError:
        return session


def login_user(payload: AuthCredentials) -> AuthSession:
    data = _request(
        "POST",
        "token?grant_type=password",
        {
            "email": payload.email,
            "password": payload.password,
        },
    )
    auth_user = data.get("user") if isinstance(data.get("user"), dict) else None
    auth_user_id = str(auth_user["id"]) if isinstance(auth_user, dict) and auth_user.get("id") else None
    if not auth_user_id:
        raise SupabaseRequestError(500, "Supabase auth user id is missing from login response")

    app_user = ensure_app_user(auth_user_id, payload.email, payload.username)
    return _session_from_response(data, payload.email, app_user=app_user)


def update_user(access_token: str, payload: AuthUpdate, current_email: str) -> AuthSession:
    update_payload = {
        key: value
        for key, value in {
            "email": payload.email,
            "password": payload.password,
        }.items()
        if value
    }

    data = _request("PUT", "user", update_payload, access_token)
    updated_email = payload.email or current_email
    auth_user = get_auth_user(access_token)
    auth_user_id = str(auth_user["id"])
    if payload.email:
        sync_app_user_email(auth_user_id, current_email, payload.email)
    app_user = ensure_app_user(auth_user_id, updated_email)
    return _session_from_response(data, updated_email, access_token, app_user)


def send_password_reset_email(payload: PasswordResetRequest) -> None:
    _request(
        "POST",
        "recover",
        {
            "email": payload.email,
        },
    )
