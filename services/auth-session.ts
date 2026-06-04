export type AuthSession = {
  email: string;
  accessToken: string | null;
  emailConfirmed?: boolean;
  authUserId?: string | null;
  dbUserId?: number | null;
  username?: string | null;
  publicUserId?: string | null;
  note?: string | null;
  iconUrl?: string | null;
  planStatus?: 'free' | 'premium' | string;
};

export function mergeAuthSession(current: AuthSession | null, next: AuthSession) {
  if (!current) {
    return next;
  }

  return {
    ...current,
    ...next,
    accessToken: current.accessToken ?? next.accessToken,
  };
}

export function hasAuthSessionChanged(current: AuthSession, next: AuthSession) {
  return (
    current.email !== next.email ||
    current.emailConfirmed !== next.emailConfirmed ||
    current.username !== next.username ||
    current.publicUserId !== next.publicUserId ||
    current.note !== next.note ||
    current.iconUrl !== next.iconUrl ||
    current.planStatus !== next.planStatus ||
    current.dbUserId !== next.dbUserId ||
    current.authUserId !== next.authUserId ||
    current.accessToken !== next.accessToken
  );
}
