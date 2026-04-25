from uuid import uuid4

from schemas import Event, EventCreate, EventUpdate, Friend, FriendCreate


events_store: list[Event] = [
    Event(id="event-1", user_id="mina", date="2026-04-15", title="在宅ワーク集中日", start_time="09:00", end_time="12:00", category="work"),
    Event(id="event-2", user_id="mina", date="2026-04-15", title="ジム", start_time="18:00", end_time="19:00", category="exercise"),
    Event(id="event-3", user_id="mio", date="2026-04-16", title="映画", start_time="19:00", end_time="21:00", category="fun"),
]

friends_store: list[Friend] = [
    Friend(id=1, name="みお", status="available"),
    Friend(id=2, name="れん", status="busy"),
    Friend(id=3, name="ゆな", status="available"),
    Friend(id=4, name="山田 健太", status="available"),
    Friend(id=5, name="佐藤 颯", status="available"),
    Friend(id=6, name="田中 美咲", status="available"),
    Friend(id=7, name="高橋 葵", status="available"),
    Friend(id=8, name="伊藤 蓮", status="busy"),
    Friend(id=9, name="中村 陽菜", status="available"),
    Friend(id=10, name="小林 悠真", status="available"),
    Friend(id=11, name="加藤 結衣", status="available"),
    Friend(id=12, name="吉田 蒼", status="busy"),
    Friend(id=13, name="山本 凛", status="available"),
    Friend(id=14, name="松本 大翔", status="available"),
    Friend(id=15, name="井上 紗奈", status="available"),
    Friend(id=16, name="木村 湊", status="available"),
    Friend(id=17, name="林 さくら", status="busy"),
    Friend(id=18, name="清水 陽翔", status="available"),
    Friend(id=19, name="斎藤 心春", status="available"),
    Friend(id=20, name="森 結斗", status="available"),
]

next_friend_id = 21


def list_events() -> list[Event]:
    return events_store


def create_event(payload: EventCreate) -> Event:
    event = Event(id=str(uuid4()), **payload.model_dump())
    events_store.append(event)
    return event


def update_event(event_id: str, payload: EventUpdate) -> Event | None:
    for index, event in enumerate(events_store):
        if event.id == event_id:
            updated = Event(id=event_id, **payload.model_dump())
            events_store[index] = updated
            return updated
    return None


def delete_event(event_id: str) -> Event | None:
    for index, event in enumerate(events_store):
        if event.id == event_id:
            return events_store.pop(index)
    return None


def list_friends() -> list[Friend]:
    return friends_store


def create_friend(payload: FriendCreate) -> Friend:
    global next_friend_id

    friend = Friend(id=next_friend_id, name=payload.name, status="available")
    next_friend_id += 1
    friends_store.append(friend)
    return friend


def delete_friend(friend_id: int) -> Friend | None:
    for index, friend in enumerate(friends_store):
        if friend.id == friend_id:
            return friends_store.pop(index)
    return None
