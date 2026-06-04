from fastapi import APIRouter, Header, HTTPException, status

from error_utils import safe_supabase_http_exception
from schemas import Friend, FriendCandidate, FriendCreate
from supabase_auth import get_auth_user, resolve_app_user
from supabase_events import SupabaseConfigError, SupabaseRequestError
from supabase_friends import (
    create_friend,
    delete_friend,
    find_friend_candidate_by_public_user_id,
    list_available_friends,
    list_friends,
    search_friend_candidates,
)

router = APIRouter(prefix="/friends", tags=["friends"])
available_router = APIRouter(tags=["friends"])


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token is required")

    return authorization[7:].strip()


def _get_owner_user_id(
    token: str,
    current_email: str | None,
    current_user_id: str | None,
    current_auth_user_id: str | None,
) -> int:
    try:
        auth_user = get_auth_user(token)
        resolved_email = current_email or auth_user.get("email")
        if not resolved_email:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current email is required")

        app_user = resolve_app_user(token, resolved_email)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Friend service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to resolve current user") from exc

    return int(app_user["id"])


@router.get("", response_model=list[Friend])
def get_friends(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
    x_current_auth_user_id: str | None = Header(default=None),
) -> list[Friend]:
    token = _get_bearer_token(authorization)
    owner_user_id = _get_owner_user_id(token, x_current_email, x_current_user_id, x_current_auth_user_id)

    try:
        return list_friends(token, owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Friend service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to load friends") from exc


@available_router.get("/available-friends", response_model=list[Friend])
def get_available_friends(
    date: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
) -> list[Friend]:
    token = _get_bearer_token(authorization)
    owner_user_id = _get_owner_user_id(token, x_current_email, None, None)

    try:
        return list_available_friends(token, owner_user_id, date)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Friend service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to load available friends") from exc


@router.get("/search", response_model=list[FriendCandidate])
def search_friends(
    name: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
    x_current_auth_user_id: str | None = Header(default=None),
) -> list[FriendCandidate]:
    token = _get_bearer_token(authorization)
    _get_owner_user_id(token, x_current_email, x_current_user_id, x_current_auth_user_id)

    try:
        return search_friend_candidates(name, token)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Friend service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to search friend candidates") from exc


@router.get("/by-public-id/{public_user_id}", response_model=FriendCandidate)
def get_friend_by_public_id(
    public_user_id: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
    x_current_auth_user_id: str | None = Header(default=None),
) -> FriendCandidate:
    token = _get_bearer_token(authorization)
    _get_owner_user_id(token, x_current_email, x_current_user_id, x_current_auth_user_id)

    try:
        candidate = find_friend_candidate_by_public_user_id(public_user_id, token)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Friend service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to find friend candidate") from exc

    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend candidate not found")
    return candidate


@router.post("", response_model=Friend, status_code=status.HTTP_201_CREATED)
def post_friend(
    payload: FriendCreate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
    x_current_auth_user_id: str | None = Header(default=None),
) -> Friend:
    token = _get_bearer_token(authorization)
    owner_user_id = _get_owner_user_id(token, x_current_email, x_current_user_id, x_current_auth_user_id)

    try:
        return create_friend(payload, token, owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Friend service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to create friend") from exc


@router.delete("/{friend_id}", response_model=Friend)
def remove_friend(
    friend_id: int,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
    x_current_auth_user_id: str | None = Header(default=None),
) -> Friend:
    token = _get_bearer_token(authorization)
    owner_user_id = _get_owner_user_id(token, x_current_email, x_current_user_id, x_current_auth_user_id)

    try:
        friend = delete_friend(friend_id, token, owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Friend service is not configured") from exc
    except SupabaseRequestError as exc:
        raise safe_supabase_http_exception(exc, "Failed to delete friend") from exc

    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend
