import { getApiBaseUrl } from '@/services/events-api';

export type AuthSession = {
  email: string;
  accessToken: string | null;
};

type ApiAuthSession = {
  email: string;
  access_token?: string | null;
};

function mapSession(session: ApiAuthSession): AuthSession {
  return {
    email: session.email,
    accessToken: session.access_token ?? null,
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
    let message = `API request failed: ${response.status}`;

    try {
      const errorBody = await response.json();
      const detail = errorBody?.detail;

      if (typeof detail === 'string') {
        try {
          const parsedDetail = JSON.parse(detail);
          message = parsedDetail.msg || parsedDetail.message || parsedDetail.error_description || detail;
        } catch {
          message = detail;
        }
      } else if (typeof errorBody?.message === 'string') {
        message = errorBody.message;
      }
    } catch {
      // レスポンス本文がない場合はステータスだけを使います。
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function registerWithEmail(username: string, email: string, password: string) {
  const session = await request<ApiAuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });

  return mapSession(session);
}

export async function loginWithEmail(email: string, password: string) {
  const session = await request<ApiAuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return mapSession(session);
}

export async function updateAuthProfile({
  accessToken,
  currentEmail,
  email,
  password,
}: {
  accessToken: string;
  currentEmail: string;
  email?: string;
  password?: string;
}) {
  const session = await request<ApiAuthSession>('/auth/me', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Current-Email': currentEmail,
    },
    body: JSON.stringify({
      email: email || null,
      password: password || null,
    }),
  });

  return mapSession(session);
}

export async function requestPasswordReset(email: string) {
  await request<void>('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}
