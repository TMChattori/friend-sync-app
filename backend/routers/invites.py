from fastapi import APIRouter, Header, HTTPException, status

from schemas import Invite, InviteCreate
from supabase_auth import get_auth_user, resolve_app_user
from supabase_events import SupabaseConfigError, SupabaseRequestError
from supabase_invites import create_invite, delete_invite, list_invites, list_sent_invites

router = APIRouter(prefix="/invites", tags=["invites"])


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


@router.get("", response_model=list[Invite])
def get_invites(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Invite]:
    current_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        return list_invites(current_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/sent", response_model=list[Invite])
def get_sent_invites(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Invite]:
    current_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        return list_sent_invites(current_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("", response_model=Invite, status_code=status.HTTP_201_CREATED)
def post_invite(
    payload: InviteCreate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Invite:
    current_user_id = _get_current_user_id(authorization, x_current_email)

    try:
        return create_invite(payload, current_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.delete("/{invite_id}", response_model=Invite)
def remove_invite(invite_id: str) -> Invite:
    try:
        invite = delete_invite(invite_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return invite
