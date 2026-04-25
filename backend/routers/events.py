from fastapi import APIRouter, HTTPException, status

from schemas import Event, EventCreate, EventUpdate
from supabase_events import (
    SupabaseConfigError,
    SupabaseRequestError,
    create_event,
    delete_event,
    list_events,
    update_event,
)

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[Event])
def get_events() -> list[Event]:
    try:
        return list_events()
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.post("", response_model=Event, status_code=status.HTTP_201_CREATED)
def post_event(payload: EventCreate) -> Event:
    try:
        return create_event(payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.put("/{event_id}", response_model=Event)
def put_event(event_id: str, payload: EventUpdate) -> Event:
    try:
        event = update_event(event_id, payload)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.delete("/{event_id}", response_model=Event)
def remove_event(event_id: str) -> Event:
    try:
        event = delete_event(event_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc
    except SupabaseRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event
