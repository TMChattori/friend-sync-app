import { getApiBaseUrl } from '@/services/events-api';

export type ApiInvite = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  date: string;
  message: string;
  status: 'sent' | 'request' | 'friend_request_sent';
};

type InviteCreatePayload = {
  fromUserId: string;
  toUserId: string;
  date: string;
  message: string;
  status?: ApiInvite['status'];
};

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

export function fetchInvites() {
  return request<ApiInvite[]>('/invites');
}

export function createInvite(payload: InviteCreatePayload) {
  return request<ApiInvite>('/invites', {
    method: 'POST',
    body: JSON.stringify({
      from_user_id: payload.fromUserId,
      to_user_id: payload.toUserId,
      date: payload.date,
      message: payload.message,
      status: payload.status ?? 'request',
    }),
  });
}
