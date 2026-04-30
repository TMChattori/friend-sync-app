from fastapi import APIRouter, Header, HTTPException, status

from schemas import Event, EventCreate, EventUpdate
from supabase_auth import get_auth_user, resolve_app_user
from supabase_events import (
    SupabaseConfigError,
    SupabaseRequestError,
    create_event,
    delete_event,
    list_friend_events,
    list_events,
    update_event,
)

router = APIRouter(prefix="/events", tags=["events"])


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token is required")

    return authorization[7:].strip()


def _get_current_user_id(authorization: str | None, current_email: str | None) -> int:
    token = _get_bearer_token(authorization)

    try:
        auth_user = get_auth_user(token)
        resolved_email = current_email or auth_user.get("email")
        if not resolved_email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current email is required")

        app_user = resolve_app_user(token, resolved_email)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    db_user_id = app_user.get("id")
    if db_user_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current user id was not found")

    return int(db_user_id)


@router.get("", response_model=list[Event])
def get_events(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Event]:
    current_db_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        return list_events(current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/friends", response_model=list[Event])
def get_friend_events(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Event]:
    current_db_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        return list_friend_events(current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def post_event(
    payload: EventCreate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Event:
    current_db_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        return create_event(payload, current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.put("/{event_id}", response_model=Event)
def put_event(
    event_id: str,
    payload: EventUpdate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Event:
    current_db_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        event = update_event(event_id, payload, current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.delete("/{event_id}", response_model=Event)
def remove_event(
    event_id: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Event:
    current_db_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        event = delete_event(event_id, current_db_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event
