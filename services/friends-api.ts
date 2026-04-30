import { requestJson, requireAuthHeaders } from '@/services/api-client';
import { type AuthSession } from '@/services/auth-session';

export type ApiFriend = {
  id: number;
  name: string;
  public_user_id?: string | null;
  user_db_id?: number | null;
  icon_url?: string | null;
  status: 'available' | 'busy';
};

export type ApiFriendCandidate = {
  id: number;
  name: string;
  user_id: string;
  note?: string | null;
};

function buildAuthHeaders(session: AuthSession | null) {
  return requireAuthHeaders(session, session?.authUserId ? { 'X-Current-Auth-User-Id': session.authUserId } : undefined);
}

export function fetchFriends(session: AuthSession | null) {
  return requestJson<ApiFriend[]>('/friends', { headers: buildAuthHeaders(session) });
}

export function createFriend(name: string, session: AuthSession | null) {
  return requestJson<ApiFriend>('/friends', {
    method: 'POST',
    headers: buildAuthHeaders(session),
    body: JSON.stringify({ name }),
  });
}

export function createFriendByDbId(userDbId: number, session: AuthSession | null) {
  return requestJson<ApiFriend>('/friends', {
    method: 'POST',
    headers: buildAuthHeaders(session),
    body: JSON.stringify({ user_db_id: userDbId }),
  });
}

export function createFriendByPublicUserId(publicUserId: string, session: AuthSession | null) {
  return requestJson<ApiFriend>('/friends', {
    method: 'POST',
    headers: buildAuthHeaders(session),
    body: JSON.stringify({ public_user_id: publicUserId }),
  });
}

export function searchFriendCandidatesByName(name: string, session: AuthSession | null) {
  const query = encodeURIComponent(name);
  return requestJson<ApiFriendCandidate[]>(`/friends/search?name=${query}`, { headers: buildAuthHeaders(session) });
}

export function fetchFriendCandidateByPublicUserId(publicUserId: string, session: AuthSession | null) {
  return requestJson<ApiFriendCandidate>(`/friends/by-public-id/${encodeURIComponent(publicUserId)}`, { headers: buildAuthHeaders(session) });
}

export function deleteFriend(friendId: number, session: AuthSession | null) {
  return requestJson<ApiFriend>(`/friends/${friendId}`, {
    method: 'DELETE',
    headers: buildAuthHeaders(session),
  });
}
