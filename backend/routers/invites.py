from fastapi import APIRouter, Header, HTTPException, status

from error_utils import safe_supabase_http_exception
from schemas import Invite, InviteCreate
from supabase_auth import get_auth_user, resolve_app_user
from supabase_events import SupabaseConfigError, SupabaseRequestError
from supabase_invites import create_invite, delete_invite, list_invites, list_sent_invites

router = APIRouter(prefix="/invites", tags=["invites"])


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token is required")

    return authorization[7:].strip()


def _get_current_user_id(token: str, current_email: str | None) -> int:
    try:
        auth_user = get_auth_user(token)
        app_user = resolve_app_user(token, current_email or auth_user.get("email") or "")
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invite service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to resolve current user") from exc

    db_user_id = app_user.get("id")
    if db_user_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Current user id was not found")

    return int(db_user_id)


@router.get("", response_model=list[Invite])
def get_invites(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Invite]:
    token = _get_bearer_token(authorization)
    current_user_id = _get_current_user_id(token, x_current_email)

    try:
        return list_invites(token, current_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invite service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to load invites") from exc


@router.get("/sent", response_model=list[Invite])
def get_sent_invites(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Invite]:
    token = _get_bearer_token(authorization)
    current_user_id = _get_current_user_id(token, x_current_email)

    try:
        return list_sent_invites(token, current_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invite service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to load sent invites") from exc


@router.post("", response_model=Invite, status_code=status.HTTP_201_CREATED)
def post_invite(
    payload: InviteCreate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Invite:
    token = _get_bearer_token(authorization)
    current_user_id = _get_current_user_id(token, x_current_email)

    try:
        return create_invite(payload, token, current_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invite service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to create invite") from exc


@router.delete("/{invite_id}", response_model=Invite)
def remove_invite(
    invite_id: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> Invite:
    token = _get_bearer_token(authorization)
    current_user_id = _get_current_user_id(token, x_current_email)

    try:
        invite = delete_invite(invite_id, token, current_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invite service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to delete invite") from exc

    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    return invite
