import Constants from 'expo-constants';
import { type AuthSession } from '@/services/auth-session';

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

export function requireAuthHeaders(session: AuthSession | null, extras?: Record<string, string>) {
  if (!session?.accessToken || !session.email) {
    throw new Error('ログイン情報が不足しています。再ログインしてください。');
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
    'X-Current-Email': session.email,
    ...(extras ?? {}),
  };
}

function parseApiErrorMessage(errorBody: unknown, status: number) {
  let message = `API request failed: ${status}`;

  if (!errorBody || typeof errorBody !== 'object') {
    return message;
  }

  const detail = 'detail' in errorBody ? errorBody.detail : undefined;
  const fallbackMessage = 'message' in errorBody ? errorBody.message : undefined;

  if (typeof detail === 'string') {
    try {
      const parsedDetail = JSON.parse(detail) as Record<string, unknown>;
      if (typeof parsedDetail.msg === 'string') {
        return parsedDetail.msg;
      }
      if (typeof parsedDetail.message === 'string') {
        return parsedDetail.message;
      }
      if (typeof parsedDetail.error_description === 'string') {
        return parsedDetail.error_description;
      }
    } catch {
      return detail;
    }

    return detail;
  }

  if (typeof fallbackMessage === 'string') {
    return fallbackMessage;
  }

  return message;
}

async function parseError(response: Response) {
  try {
    const errorBody = await response.json();
    return parseApiErrorMessage(errorBody, response.status);
  } catch {
    return `API request failed: ${response.status}`;
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(init?.headers ?? {}),
  };

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function requestForm<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, init);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}
