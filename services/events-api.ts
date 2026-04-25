import Constants from 'expo-constants';
import { Event } from '@/data/mock-data';

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

export function extractHost(value?: string | null) {
  if (!value) {
    return null;
  }

  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, '');
  const host = withoutProtocol.split('/')[0]?.split(':')[0];
  return host || null;
}

export function getApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl;
  }

  const host =
    extractHost(Constants.expoConfig?.hostUri) ??
    extractHost(Constants.linkingUri) ??
    extractHost(Constants.expoGoConfig?.debuggerHost);

  return host ? `http://${host}:8000` : 'http://127.0.0.1:8000';
}

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchEvents() {
  const events = await request<ApiEvent[]>('/events');
  return events.map(mapApiEvent);
}

export async function createEvent(payload: EventCreatePayload) {
  const event = await request<ApiEvent>('/events', {
    method: 'POST',
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

export async function updateEvent(eventId: string, payload: EventCreatePayload) {
  const event = await request<ApiEvent>(`/events/${eventId}`, {
    method: 'PUT',
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

export async function deleteEvent(eventId: string) {
  const event = await request<ApiEvent>(`/events/${eventId}`, {
    method: 'DELETE',
  });

  return mapApiEvent(event);
}
