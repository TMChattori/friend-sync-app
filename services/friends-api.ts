import { getApiBaseUrl } from '@/services/events-api';

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

export function fetchFriends() {
  return request<ApiFriend[]>('/friends');
}

export function createFriend(name: string) {
  return request<ApiFriend>('/friends', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function createFriendByDbId(userDbId: number) {
  return request<ApiFriend>('/friends', {
    method: 'POST',
    body: JSON.stringify({ user_db_id: userDbId }),
  });
}

export function createFriendByPublicUserId(publicUserId: string) {
  return request<ApiFriend>('/friends', {
    method: 'POST',
    body: JSON.stringify({ public_user_id: publicUserId }),
  });
}

export function searchFriendCandidatesByName(name: string) {
  const query = encodeURIComponent(name);
  return request<ApiFriendCandidate[]>(`/friends/search?name=${query}`);
}

export function fetchFriendCandidateByPublicUserId(publicUserId: string) {
  return request<ApiFriendCandidate>(`/friends/by-public-id/${encodeURIComponent(publicUserId)}`);
}

export function deleteFriend(friendId: number) {
  return request<ApiFriend>(`/friends/${friendId}`, {
    method: 'DELETE',
  });
}
