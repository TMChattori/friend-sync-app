import { requestJson, requireAuthHeaders } from '@/services/api-client';
import { type AuthSession } from '@/services/auth-session';

export type ApiInvite = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  date: string;
  message: string;
  status: 'sent' | 'request' | 'friend_request_sent';
  from_user_name?: string | null;
  to_user_name?: string | null;
};

type InviteCreatePayload = {
  fromUserId: string;
  toUserId: string;
  date: string;
  message: string;
  status?: ApiInvite['status'];
};

export function fetchInvites(session: AuthSession | null) {
  return requestJson<ApiInvite[]>('/invites', {
    headers: requireAuthHeaders(session),
  });
}

export function fetchSentInvites(session: AuthSession | null) {
  return requestJson<ApiInvite[]>('/invites/sent', {
    headers: requireAuthHeaders(session),
  });
}

export function createInvite(payload: InviteCreatePayload, session: AuthSession | null) {
  return requestJson<ApiInvite>('/invites', {
    method: 'POST',
    headers: requireAuthHeaders(session),
    body: JSON.stringify({
      from_user_id: payload.fromUserId,
      to_user_id: payload.toUserId,
      date: payload.date,
      message: payload.message,
      status: payload.status ?? 'request',
    }),
  });
}
