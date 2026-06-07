import { create } from 'zustand';
import { authService } from '../services/authService';
import type { User } from '../types';
import { getDashboardPathForUser, normalizeAuthUser, resolveUserRole } from '../utils/auth';

let initializeAuthPromise: Promise<void> | null = null;

const ACCESS_TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_STORAGE_KEY = 'auth_storage';

type AuthStorageType = 'local' | 'session';

type LoginOptions = {
  rememberMe?: boolean;
  refreshToken?: string;
};

interface AuthState {
  user: User | null;
  token: string | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string, options?: LoginOptions) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

const normalizeStoredToken = (token: string | null): string | null => (
  token && token !== 'undefined' && token !== 'null' ? token : null
);

const getAuthStorageType = (): AuthStorageType => {
  const savedType = localStorage.getItem(AUTH_STORAGE_KEY);

  if (savedType === 'local' || savedType === 'session') {
    return savedType;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY) ? 'local' : 'session';
};

const getAuthStorage = (): Storage => (getAuthStorageType() === 'local' ? localStorage : sessionStorage);

const getStoredAuthValue = (key: string): string | null => (
  normalizeStoredToken(getAuthStorage().getItem(key)) ??
  normalizeStoredToken(localStorage.getItem(key)) ??
  normalizeStoredToken(sessionStorage.getItem(key))
);

const clearStoredAuth = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

const persistStoredAuth = (token: string, options?: LoginOptions): void => {
  const shouldRemember = options?.rememberMe ?? (getAuthStorageType() === 'local');
  const storageType: AuthStorageType = shouldRemember ? 'local' : 'session';
  const targetStorage = storageType === 'local' ? localStorage : sessionStorage;
  const otherStorage = storageType === 'local' ? sessionStorage : localStorage;

  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  otherStorage.removeItem(REFRESH_TOKEN_KEY);
  targetStorage.setItem(ACCESS_TOKEN_KEY, token);

  if (options?.refreshToken) {
    targetStorage.setItem(REFRESH_TOKEN_KEY, options.refreshToken);
  }

  localStorage.setItem(AUTH_STORAGE_KEY, storageType);
};

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredAuthValue(ACCESS_TOKEN_KEY),
  isInitializing: true,
  isAuthenticated: false,

  login: (user: User, token: string, options?: LoginOptions) => {
    const normalizedUser = normalizeAuthUser(user);
    const resolvedRole = resolveUserRole(normalizedUser);

    if (!normalizedUser || !resolvedRole) {
      if (import.meta.env.DEV) {
        console.log('[auth/store] login rejected', {
          user,
          resolvedRole,
        });
      }

      clearStoredAuth();
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    if (token && token !== 'undefined' && token !== 'null') {
      persistStoredAuth(token, options);
      if (import.meta.env.DEV) {
        console.log('[auth/store] login', {
          user: normalizedUser,
          resolvedRole,
          redirectPath: getDashboardPathForUser(normalizedUser),
        });
      }
      set({ user: normalizedUser, token, isAuthenticated: true });
    } else {
      // If token is falsy, keep auth cleared
      clearStoredAuth();
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  updateUser: (user: User) => {
    const normalizedUser = normalizeAuthUser(user);

    if (normalizedUser) {
      set({ user: normalizedUser });
    }
  },

  logout: () => {
    clearStoredAuth();
    set({ user: null, token: null, isAuthenticated: false });
  },

  initializeAuth: () => {
    if (initializeAuthPromise) {
      return initializeAuthPromise;
    }

    const token = getStoredAuthValue(ACCESS_TOKEN_KEY);
    const refreshToken = getStoredAuthValue(REFRESH_TOKEN_KEY);
    try {
      console.debug('[auth/store] initializeAuth - localStorage token:', token);
    } catch {
      // ignore
    }

    if (!token && !refreshToken) {
      set({ isInitializing: false, isAuthenticated: false, user: null, token: null });
      return Promise.resolve();
    }

    initializeAuthPromise = (async () => {
      try {
        let activeToken = token;

        if (!activeToken && refreshToken) {
          const refreshed = await authService.refreshToken(refreshToken);
          activeToken = refreshed.token;
          persistStoredAuth(activeToken, {
            rememberMe: getAuthStorageType() === 'local',
            refreshToken: refreshed.refreshToken,
          });
        }

        const user = await authService.getCurrentUser();
        const resolvedRole = resolveUserRole(user);

        if (import.meta.env.DEV) {
          console.log('[auth/store] initializeAuth', {
            user,
            resolvedRole,
            redirectPath: getDashboardPathForUser(user),
          });
        }

        set({
          user,
          token: getStoredAuthValue(ACCESS_TOKEN_KEY) ?? activeToken,
          isAuthenticated: true,
          isInitializing: false,
        });
      } catch (error) {
        const err = error as Error;
        console.error('Auth initialization failed:', err.message);
        clearStoredAuth();
        set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
      } finally {
        initializeAuthPromise = null;
      }
    })();

    return initializeAuthPromise;
  },
}));

export default useAuthStore;
