from fastapi import APIRouter, HTTPException, status

from schemas import Invite, InviteCreate
from supabase_events import SupabaseConfigError, SupabaseRequestError
from supabase_invites import create_invite, delete_invite, list_invites

router = APIRouter(prefix="/invites", tags=["invites"])


@router.get("", response_model=list[Invite])
def get_invites() -> list[Invite]:
    try:
        return list_invites()
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("", response_model=Invite, status_code=status.HTTP_201_CREATED)
def post_invite(payload: InviteCreate) -> Invite:
    try:
        return create_invite(payload)
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
