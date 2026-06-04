from fastapi import APIRouter, Header, HTTPException, status

from error_utils import safe_supabase_http_exception
from schemas import Event, EventCreate, EventUpdate
from supabase_auth import get_auth_user, resolve_app_user
from supabase_events import (
    SupabaseConfigError,
    SupabaseRequestError,
    create_event,
    delete_event,
    list_events,
    update_event,
)

router = APIRouter(prefix="/events", tags=["events"])


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token is required")

    return authorization[7:].strip()


def _get_current_user_id(token: str, current_email: str | None) -> int:
    try:
        auth_user = get_auth_user(token)
        app_user = resolve_app_user(token, current_email or auth_user.get("email") or "")
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Event service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to resolve current user") from exc

    db_user_id = app_user.get("id")
    if db_user_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current user id was not found")

    return int(db_user_id)


@router.get("", response_model=list[Event])
def get_events(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Event]:
    token = _get_bearer_token(authorization)
    current_db_user_id = _get_current_user_id(token, x_current_email)

    try:
        return list_events(token, current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Event service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to load events") from exc


@router.get("/friends", response_model=list[Event])
def get_friend_events(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Event]:
    _get_bearer_token(authorization)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Friend event details are not exposed",
    )


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def post_event(
    payload: EventCreate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Event:
    token = _get_bearer_token(authorization)
    current_db_user_id = _get_current_user_id(token, x_current_email)

    try:
        return create_event(payload, token, current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Event service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to create event") from exc


@router.put("/{event_id}", response_model=Event)
def put_event(
    event_id: str,
    payload: EventUpdate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Event:
    token = _get_bearer_token(authorization)
    current_db_user_id = _get_current_user_id(token, x_current_email)

    try:
        event = update_event(event_id, payload, token, current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Event service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to update event") from exc

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.delete("/{event_id}", response_model=Event)
def remove_event(
    event_id: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Event:
    token = _get_bearer_token(authorization)
    current_db_user_id = _get_current_user_id(token, x_current_email)

    try:
        event = delete_event(event_id, token, current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Event service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to delete event") from exc

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event
