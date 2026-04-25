from fastapi import APIRouter, HTTPException, status

from schemas import Friend, FriendCandidate, FriendCreate
from supabase_events import SupabaseConfigError, SupabaseRequestError
from supabase_friends import (
    create_friend,
    delete_friend,
    find_friend_candidate_by_public_user_id,
    list_friends,
    search_friend_candidates,
)

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("", response_model=list[Friend])
def get_friends() -> list[Friend]:
    try:
        return list_friends()
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/search", response_model=list[FriendCandidate])
def search_friends(name: str) -> list[FriendCandidate]:
    try:
        return search_friend_candidates(name)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/by-public-id/{public_user_id}", response_model=FriendCandidate)
def get_friend_by_public_id(public_user_id: str) -> FriendCandidate:
    try:
        candidate = find_friend_candidate_by_public_user_id(public_user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend candidate not found")
    return candidate


@router.post("", response_model=Friend, status_code=status.HTTP_201_CREATED)
def post_friend(payload: FriendCreate) -> Friend:
    try:
        return create_friend(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.delete("/{friend_id}", response_model=Friend)
def remove_friend(friend_id: int) -> Friend:
    try:
        friend = delete_friend(friend_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend
