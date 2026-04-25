import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { type AuthSession } from '@/services/auth-api';

const AUTH_SESSION_STORAGE_KEY = 'friend-sync-auth-session';
let secureStoreModulePromise: Promise<typeof import('expo-secure-store') | null> | null = null;

async function getSecureStoreModule() {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!secureStoreModulePromise) {
    secureStoreModulePromise = import('expo-secure-store');
  }

  return secureStoreModulePromise;
}

type RegistrationContextValue = {
  isReady: boolean;
  isRegistered: boolean;
  authSession: AuthSession | null;
  completeRegistration: (session: AuthSession) => void;
  updateAuthSession: (session: AuthSession) => void;
};

const RegistrationContext = createContext<RegistrationContextValue | null>(null);

async function getStoredSession() {
  const secureStoreModule = await getSecureStoreModule();

  if (secureStoreModule && typeof secureStoreModule.getItemAsync === 'function') {
    return secureStoreModule.getItemAsync(AUTH_SESSION_STORAGE_KEY);
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  }

  return null;
}

async function setStoredSession(session: AuthSession) {
  const payload = JSON.stringify(session);
  const secureStoreModule = await getSecureStoreModule();

  if (secureStoreModule && typeof secureStoreModule.setItemAsync === 'function') {
    await secureStoreModule.setItemAsync(AUTH_SESSION_STORAGE_KEY, payload);
    return;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, payload);
  }
}

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const storedSession = await getStoredSession();
        if (!storedSession || !isMounted) {
          return;
        }

        const parsedSession = JSON.parse(storedSession) as AuthSession;
        setAuthSession(parsedSession);
      } catch {
        if (isMounted) {
          setAuthSession(null);
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = async (session: AuthSession) => {
    setAuthSession(session);
    await setStoredSession(session);
  };

  const value = useMemo(
    () => ({
      isReady,
      isRegistered: Boolean(authSession),
      authSession,
      completeRegistration: (session: AuthSession) => {
        void persistSession(session);
      },
      updateAuthSession: (session: AuthSession) => {
        void persistSession(session);
      },
    }),
    [authSession, isReady]
  );

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const context = useContext(RegistrationContext);

  if (!context) {
    throw new Error('useRegistration must be used inside RegistrationProvider');
  }

  return context;
}
