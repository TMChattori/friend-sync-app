from fastapi import APIRouter, Header, HTTPException, status

from schemas import Friend, FriendCandidate, FriendCreate
from supabase_auth import ensure_app_user
from supabase_events import SupabaseConfigError, SupabaseRequestError
from supabase_friends import (
    create_friend,
    delete_friend,
    find_friend_candidate_by_public_user_id,
    list_friends,
    search_friend_candidates,
)

router = APIRouter(prefix="/friends", tags=["friends"])


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization token is required")

    return authorization[7:].strip()


def _get_owner_user_id(authorization: str | None, current_email: str | None, current_user_id: str | None) -> int:
    _get_bearer_token(authorization)

    if current_user_id:
        try:
            return int(current_user_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current user id is invalid") from exc

    if not current_email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current email is required")

    try:
        app_user = ensure_app_user(current_email)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    return int(app_user["id"])


@router.get("", response_model=list[Friend])
def get_friends(
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
) -> list[Friend]:
    owner_user_id = _get_owner_user_id(authorization, x_current_email, x_current_user_id)

    try:
        return list_friends(owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/search", response_model=list[FriendCandidate])
def search_friends(
    name: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
) -> list[FriendCandidate]:
    owner_user_id = _get_owner_user_id(authorization, x_current_email, x_current_user_id)

    try:
        return search_friend_candidates(name, owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/by-public-id/{public_user_id}", response_model=FriendCandidate)
def get_friend_by_public_id(
    public_user_id: str,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
) -> FriendCandidate:
    owner_user_id = _get_owner_user_id(authorization, x_current_email, x_current_user_id)

    try:
        candidate = find_friend_candidate_by_public_user_id(public_user_id, owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend candidate not found")
    return candidate


@router.post("", response_model=Friend, status_code=status.HTTP_201_CREATED)
def post_friend(
    payload: FriendCreate,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
) -> Friend:
    owner_user_id = _get_owner_user_id(authorization, x_current_email, x_current_user_id)

    try:
        return create_friend(payload, owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.delete("/{friend_id}", response_model=Friend)
def remove_friend(
    friend_id: int,
    authorization: str | None = Header(default=None),
    x_current_email: str | None = Header(default=None),
    x_current_user_id: str | None = Header(default=None),
) -> Friend:
    owner_user_id = _get_owner_user_id(authorization, x_current_email, x_current_user_id)

    try:
        friend = delete_friend(friend_id, owner_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend
