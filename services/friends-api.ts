import { getApiBaseUrl } from '@/services/events-api';
import { type AuthSession } from '@/services/auth-api';

export type ApiFriend = {
  id: number;
  name: string;
  public_user_id?: string | null;
  status: 'available' | 'busy';
};

export type ApiFriendCandidate = {
  id: number;
  name: string;
  user_id: string;
  note?: string | null;
};

function authHeaders(session: AuthSession | null) {
  if (!session?.accessToken || !session.email) {
    throw new Error('ログイン情報が不足しています。再ログインしてください。');
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
    'X-Current-Email': session.email,
    ...(session.dbUserId ? { 'X-Current-User-Id': String(session.dbUserId) } : {}),
  };
}

async function request<T>(path: string, session: AuthSession | null, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(session),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchFriends(session: AuthSession | null) {
  return request<ApiFriend[]>('/friends', session);
}

export function createFriend(name: string, session: AuthSession | null) {
  return request<ApiFriend>('/friends', session, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function createFriendByDbId(userDbId: number, session: AuthSession | null) {
  return request<ApiFriend>('/friends', session, {
    method: 'POST',
    body: JSON.stringify({ user_db_id: userDbId }),
  });
}

export function createFriendByPublicUserId(publicUserId: string, session: AuthSession | null) {
  return request<ApiFriend>('/friends', session, {
    method: 'POST',
    body: JSON.stringify({ public_user_id: publicUserId }),
  });
}

export function searchFriendCandidatesByName(name: string, session: AuthSession | null) {
  const query = encodeURIComponent(name);
  return request<ApiFriendCandidate[]>(`/friends/search?name=${query}`, session);
}

export function fetchFriendCandidateByPublicUserId(publicUserId: string, session: AuthSession | null) {
  return request<ApiFriendCandidate>(`/friends/by-public-id/${encodeURIComponent(publicUserId)}`, session);
}

export function deleteFriend(friendId: number, session: AuthSession | null) {
  return request<ApiFriend>(`/friends/${friendId}`, session, {
    method: 'DELETE',
  });
}
