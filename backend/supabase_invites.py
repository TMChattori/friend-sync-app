from schemas import Invite, InviteCreate
from supabase_events import _request


def _get_users_by_ids(user_ids: list[str]) -> dict[str, dict]:
    normalized_ids = sorted({user_id for user_id in user_ids if user_id})
    if not normalized_ids:
        return {}

    joined_ids = ",".join(normalized_ids)
    rows = _request("GET", f"User?select=id,name&id=in.({joined_ids})")
    return {str(row["id"]): row for row in rows}


def _invite_from_row(row: dict, users_by_id: dict[str, dict] | None = None) -> Invite:
    users_by_id = users_by_id or {}
    from_user_id = str(row["from_user_id"])
    to_user_id = str(row["to_user_id"])
    return Invite(
        id=str(row["id"]),
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        date=row["date"],
        message=row["message"],
        status=row.get("status") or "request",
        from_user_name=users_by_id.get(from_user_id, {}).get("name"),
        to_user_name=users_by_id.get(to_user_id, {}).get("name"),
    )


def _payload_for_db(payload: InviteCreate) -> dict:
    return payload.model_dump()


def list_invites(to_user_id: int) -> list[Invite]:
    rows = _request("GET", f"invites?select=*&to_user_id=eq.{to_user_id}&order=created_at.desc")
    users_by_id = _get_users_by_ids([str(row["from_user_id"]) for row in rows] + [str(row["to_user_id"]) for row in rows])
    return [_invite_from_row(row, users_by_id) for row in rows]


def list_sent_invites(from_user_id: int) -> list[Invite]:
    rows = _request("GET", f"invites?select=*&from_user_id=eq.{from_user_id}&order=created_at.desc")
    users_by_id = _get_users_by_ids([str(row["from_user_id"]) for row in rows] + [str(row["to_user_id"]) for row in rows])
    return [_invite_from_row(row, users_by_id) for row in rows]


def create_invite(payload: InviteCreate, from_user_id: int) -> Invite:
    db_payload = _payload_for_db(payload)
    db_payload["from_user_id"] = str(from_user_id)
    rows = _request("POST", "invites", db_payload)
    users_by_id = _get_users_by_ids([str(rows[0]["from_user_id"]), str(rows[0]["to_user_id"])])
    return _invite_from_row(rows[0], users_by_id)


def delete_invite(invite_id: str) -> Invite | None:
    rows = _request("DELETE", f"invites?id=eq.{invite_id}")
    if not rows:
        return None
    users_by_id = _get_users_by_ids([str(rows[0]["from_user_id"]), str(rows[0]["to_user_id"])])
    return _invite_from_row(rows[0], users_by_id)
