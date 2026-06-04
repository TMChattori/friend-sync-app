import { Platform } from 'react-native';

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

function normalizeCacheScope(scope: string) {
  return (scope || 'guest').replace(/[^0-9A-Za-z._-]/g, '_') || 'guest';
}

function buildCacheKey(namespace: string, scope: string) {
  return `friend-sync-cache-${namespace}-${normalizeCacheScope(scope)}`;
}

export async function readCachedJson<T>(namespace: string, scope: string): Promise<T | null> {
  const storageKey = buildCacheKey(namespace, scope);
  const secureStoreModule = await getSecureStoreModule();

  try {
    let payload: string | null = null;

    if (secureStoreModule && typeof secureStoreModule.getItemAsync === 'function') {
      payload = await secureStoreModule.getItemAsync(storageKey);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
      payload = window.localStorage.getItem(storageKey);
    }

    return payload ? (JSON.parse(payload) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCachedJson(namespace: string, scope: string, value: unknown) {
  const storageKey = buildCacheKey(namespace, scope);
  const payload = JSON.stringify(value);
  const secureStoreModule = await getSecureStoreModule();

  if (secureStoreModule && typeof secureStoreModule.setItemAsync === 'function') {
    await secureStoreModule.setItemAsync(storageKey, payload);
    return;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(storageKey, payload);
  }
}
