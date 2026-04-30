import { Event } from '@/data/mock-data';
import { requestJson, requireAuthHeaders } from '@/services/api-client';
import { type AuthSession } from '@/services/auth-session';

type ApiEvent = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  start_time?: string | null;
  end_time?: string | null;
  category?: string | null;
};

type EventCreatePayload = {
  userId: string;
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  category?: string;
};

function mapApiEvent(event: ApiEvent): Event {
  const startTime = event.start_time ?? undefined;
  const endTime = event.end_time ?? undefined;
  const time = startTime && endTime ? `${startTime} - ${endTime}` : startTime ?? '--:--';

  return {
    id: event.id,
    userId: event.user_id,
    date: event.date,
    title: event.title,
    time,
    startTime,
    endTime,
    category: event.category ?? undefined,
    memo: 'APIから取得した予定です',
  };
}

export async function fetchEvents(session: AuthSession | null) {
  const events = await requestJson<ApiEvent[]>('/events', {
    headers: requireAuthHeaders(session),
  });
  return events.map(mapApiEvent);
}

export async function fetchFriendEvents(session: AuthSession | null) {
  const events = await requestJson<ApiEvent[]>('/events/friends', {
    headers: requireAuthHeaders(session),
  });
  return events.map(mapApiEvent);
}

export async function createEvent(payload: EventCreatePayload, session: AuthSession | null) {
  const event = await requestJson<ApiEvent>('/events', {
    method: 'POST',
    headers: requireAuthHeaders(session),
    body: JSON.stringify({
      user_id: payload.userId,
      date: payload.date,
      title: payload.title,
      start_time: payload.startTime ?? null,
      end_time: payload.endTime ?? null,
      category: payload.category ?? null,
    }),
  });

  return mapApiEvent(event);
}

export async function updateEvent(eventId: string, payload: EventCreatePayload, session: AuthSession | null) {
  const event = await requestJson<ApiEvent>(`/events/${eventId}`, {
    method: 'PUT',
    headers: requireAuthHeaders(session),
    body: JSON.stringify({
      user_id: payload.userId,
      date: payload.date,
      title: payload.title,
      start_time: payload.startTime ?? null,
      end_time: payload.endTime ?? null,
      category: payload.category ?? null,
    }),
  });

  return mapApiEvent(event);
}

export async function deleteEvent(eventId: string, session: AuthSession | null) {
  const event = await requestJson<ApiEvent>(`/events/${eventId}`, {
    method: 'DELETE',
    headers: requireAuthHeaders(session),
  });

  return mapApiEvent(event);
}
