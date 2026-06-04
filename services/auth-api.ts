import { requestForm, requestJson, requireAuthHeaders } from '@/services/api-client';
import { type AuthSession } from '@/services/auth-session';

type ApiAuthSession = {
  email: string;
  access_token?: string | null;
  auth_user_id?: string | null;
  db_user_id?: number | null;
  username?: string | null;
  public_user_id?: string | null;
  note?: string | null;
  icon_url?: string | null;
  plan_status?: string | null;
};

function mapSession(session: ApiAuthSession): AuthSession {
  return {
    email: session.email,
    accessToken: session.access_token ?? null,
    authUserId: session.auth_user_id ?? null,
    dbUserId: session.db_user_id ?? null,
    username: session.username ?? null,
    publicUserId: session.public_user_id ?? null,
    note: session.note ?? null,
    iconUrl: session.icon_url ?? null,
    planStatus: session.plan_status ?? 'free',
  };
}

export async function registerWithEmail(username: string, email: string, password: string) {
  const session = await requestJson<ApiAuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });

  return mapSession(session);
}

export async function loginWithEmail(email: string, password: string) {
  const session = await requestJson<ApiAuthSession>('/auth/login', {
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
  const session = await requestJson<ApiAuthSession>('/auth/me', {
    method: 'PUT',
    headers: requireAuthHeaders({ email: currentEmail, accessToken }, {}),
    body: JSON.stringify({
      email: email || null,
      password: password || null,
    }),
  });

  return mapSession(session);
}

export async function fetchAppUserProfile({
  accessToken,
  currentEmail,
}: {
  accessToken: string;
  currentEmail: string;
}) {
  const session = await requestJson<ApiAuthSession>('/auth/profile', {
    method: 'GET',
    headers: requireAuthHeaders({ email: currentEmail, accessToken }, {}),
  });

  return mapSession(session);
}

export async function updateAppUserProfile({
  accessToken,
  currentEmail,
  username,
  publicUserId,
  note,
  iconUrl,
}: {
  accessToken: string;
  currentEmail: string;
  username?: string;
  publicUserId?: string;
  note?: string;
  iconUrl?: string;
}) {
  const session = await requestJson<ApiAuthSession>('/auth/profile', {
    method: 'PUT',
    headers: requireAuthHeaders({ email: currentEmail, accessToken }, {}),
    body: JSON.stringify({
      username: username ?? null,
      public_user_id: publicUserId ?? null,
      note: note ?? null,
      icon_url: iconUrl ?? null,
    }),
  });

  return mapSession(session);
}

export async function uploadProfileIcon({
  accessToken,
  currentEmail,
  imageUri,
}: {
  accessToken: string;
  currentEmail: string;
  imageUri: string;
}) {
  const extension = imageUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
  const formData = new FormData();

  formData.append('file', {
    uri: imageUri,
    name: `profile.${extension || 'jpg'}`,
    type: mimeType,
  } as unknown as Blob);

  return requestForm<{ icon_url: string }>('/auth/profile/icon', {
    method: 'POST',
    headers: requireAuthHeaders({ email: currentEmail, accessToken }, {}),
    body: formData,
  });
}

export async function requestPasswordReset(email: string) {
  await requestJson<void>('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function deleteAccount({
  accessToken,
  currentEmail,
  reason,
}: {
  accessToken: string;
  currentEmail: string;
  reason: string;
}) {
  const headers = requireAuthHeaders({ email: currentEmail, accessToken }, {});
  const body = JSON.stringify({ reason });

  try {
    await requestJson<void>('/auth/account', {
      method: 'DELETE',
      headers,
      body,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Not Found' || error.message === 'API request failed: 404')) {
      await requestJson<void>('/auth/account/delete', {
        method: 'POST',
        headers,
        body,
      });
      return;
    }

    throw error;
  }
}
