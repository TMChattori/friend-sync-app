from schemas import Invite, InviteCreate
from supabase_events import _request


def _invite_from_row(row: dict) -> Invite:
    return Invite(
        id=str(row["id"]),
        from_user_id=str(row["from_user_id"]),
        to_user_id=str(row["to_user_id"]),
        date=row["date"],
        message=row["message"],
        status=row.get("status") or "request",
    )


def _payload_for_db(payload: InviteCreate) -> dict:
    return payload.model_dump()


def list_invites() -> list[Invite]:
    rows = _request("GET", "invites?select=*&order=created_at.desc")
    return [_invite_from_row(row) for row in rows]


def create_invite(payload: InviteCreate) -> Invite:
    rows = _request("POST", "invites", _payload_for_db(payload))
    return _invite_from_row(rows[0])


def delete_invite(invite_id: str) -> Invite | None:
    rows = _request("DELETE", f"invites?id=eq.{invite_id}")
    if not rows:
        return None
    return _invite_from_row(rows[0])
