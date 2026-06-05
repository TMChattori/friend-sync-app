from schemas import Friend, FriendCandidate, FriendCreate
from supabase_events import SupabaseConfigError, SupabaseRequestError, _request


def _public_user_id_from_user(row: dict) -> str | None:
    return row.get("user_id")


def _friend_from_relation(relation: dict, users_by_id: dict[int, dict]) -> Friend:
    friend_user_id = int(relation["friend_user_id"])
    user = users_by_id.get(friend_user_id, {})
    return Friend(
        id=int(relation["id"]),
        name=user.get("name") or f"ユーザー{friend_user_id}",
        public_user_id=_public_user_id_from_user(user),
        user_db_id=friend_user_id,
        icon_url=user.get("icon_url"),
        status="available",
    )


def _get_users_by_ids(user_ids: list[int], access_token: str) -> dict[int, dict]:
    if not user_ids:
        return {}

    ids = ",".join(str(user_id) for user_id in sorted(set(user_ids)))
    rows = _request("GET", f"User?select=id,name,user_id,note,icon_url&id=in.({ids})", access_token=access_token)
    return {int(row["id"]): row for row in rows}


def _candidate_from_user(row: dict) -> FriendCandidate:
    return FriendCandidate(
        id=int(row["id"]),
        name=row.get("name") or f"ユーザー{row['id']}",
        user_id=_public_user_id_from_user(row) or "",
        note=row.get("note"),
    )


def _relation_exists(owner_user_id: int, friend_user_id: int, access_token: str) -> bool:
    rows = _request(
        "GET",
        f"Friend?select=id&owner_user_id=eq.{owner_user_id}&friend_user_id=eq.{friend_user_id}&limit=1",
        access_token=access_token,
    )
    return bool(rows)


def _get_relation(owner_user_id: int, friend_user_id: int, access_token: str) -> dict | None:
    rows = _request(
        "GET",
        "Friend"
        "?select=id,owner_user_id,friend_user_id,created_at,updated_at"
        f"&owner_user_id=eq.{owner_user_id}"
        f"&friend_user_id=eq.{friend_user_id}"
        "&limit=1",
        access_token=access_token,
    )
    return rows[0] if rows else None


def list_friends(access_token: str, owner_user_id: int) -> list[Friend]:
    relations = _request(
        "GET",
        f"Friend?select=id,owner_user_id,friend_user_id,created_at,updated_at&owner_user_id=eq.{owner_user_id}&order=id.asc",
        access_token=access_token,
    )
    users_by_id = _get_users_by_ids([int(row["friend_user_id"]) for row in relations], access_token)
    return [_friend_from_relation(row, users_by_id) for row in relations]


def list_available_friends(access_token: str, owner_user_id: int, target_date: str) -> list[Friend]:
    relations = _request(
        "GET",
        f"Friend?select=id,owner_user_id,friend_user_id,created_at,updated_at&owner_user_id=eq.{owner_user_id}&order=id.asc",
        access_token=access_token,
    )
    if not relations:
        return []

    friend_user_ids = [int(row["friend_user_id"]) for row in relations]
    users_by_id = _get_users_by_ids(friend_user_ids, access_token)
    busy_user_ids: set[int] = set()

    # 友達予定の詳細は返さず、空き状況だけ判定します。
    # RLS や単日イベントの形により判定取得が失敗しても、ホーム画面全体は落とさないようにします。
    try:
        encoded_ids = ",".join(str(user_id) for user_id in sorted(set(friend_user_ids)))
        busy_rows = _request(
            "GET",
            "events"
            f"?select=user_id"
            f"&user_id=in.({encoded_ids})"
            f"&or=(and(start_date.lte.{target_date},end_date.gte.{target_date}),and(start_date.eq.{target_date},end_date.is.null))",
            access_token=access_token,
        )
        busy_user_ids = {int(row["user_id"]) for row in busy_rows if row.get("user_id") is not None}
    except SupabaseRequestError:
        busy_user_ids = set()

    friends: list[Friend] = []
    for relation in relations:
        friend = _friend_from_relation(relation, users_by_id)
        friend.status = "busy" if (friend.user_db_id or 0) in busy_user_ids else "available"
        friends.append(friend)

    return friends


def search_friend_candidates(name: str, access_token: str) -> list[FriendCandidate]:
    rows = _request(
        "POST",
        "rpc/search_friend_candidates",
        {"search_name": name.strip()},
        access_token=access_token,
    )
    return [_candidate_from_user(row) for row in rows]


def find_friend_candidate_by_public_user_id(public_user_id: str, access_token: str) -> FriendCandidate | None:
    rows = _request(
        "POST",
        "rpc/find_friend_candidate_by_public_user_id",
        {"search_public_user_id": public_user_id.strip()},
        access_token=access_token,
    )
    if not rows:
        return None

    return _candidate_from_user(rows[0])


def create_friend(payload: FriendCreate, access_token: str, owner_user_id: int) -> Friend:
    friend_user = None

    if payload.user_db_id is not None:
        user_rows = _request(
            "POST",
            "rpc/find_friend_candidate_by_db_id",
            {"search_user_db_id": payload.user_db_id},
            access_token=access_token,
        )
        friend_user = user_rows[0] if user_rows else None
    elif payload.public_user_id:
        candidate = find_friend_candidate_by_public_user_id(payload.public_user_id, access_token)
        friend_user = {
            "id": candidate.id,
            "name": candidate.name,
            "user_id": candidate.user_id,
            "note": candidate.note,
        } if candidate else None
    elif payload.name:
        candidates = search_friend_candidates(payload.name, access_token)
        if candidates:
            friend_user = {
                "id": candidates[0].id,
                "name": candidates[0].name,
                "user_id": candidates[0].user_id,
                "note": candidates[0].note,
                "icon_url": None,
            }

    if not friend_user:
        raise SupabaseRequestError(404, "Friend candidate not found")

    if int(friend_user["id"]) == owner_user_id:
        raise SupabaseRequestError(400, "You cannot add yourself")

    if _relation_exists(owner_user_id, int(friend_user["id"]), access_token):
        raise SupabaseRequestError(409, "Friend already added")

    relation_rows = _request(
        "POST",
        "rpc/create_friend_pair",
        {"target_friend_user_id": int(friend_user["id"])},
        access_token=access_token,
    )

    relation = relation_rows[0] if relation_rows else _get_relation(owner_user_id, int(friend_user["id"]), access_token)
    if not relation:
        raise SupabaseRequestError(500, "Failed to load created friend relation")

    return _friend_from_relation(relation, {int(friend_user["id"]): friend_user})


def delete_friend(friend_id: int, access_token: str, owner_user_id: int) -> Friend | None:
    relations = _request(
        "GET",
        f"Friend?select=id,owner_user_id,friend_user_id,created_at,updated_at&id=eq.{friend_id}&owner_user_id=eq.{owner_user_id}&limit=1",
        access_token=access_token,
    )

    if not relations:
        return None

    relation = relations[0]
    users_by_id = _get_users_by_ids([int(relation["friend_user_id"])], access_token)
    friend = _friend_from_relation(relation, users_by_id)
    _request("DELETE", f"Friend?id=eq.{friend_id}&owner_user_id=eq.{owner_user_id}", access_token=access_token)
    return friend
