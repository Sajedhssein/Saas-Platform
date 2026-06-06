import { create } from 'zustand';
import { authService } from '../services/authService';
import type { User } from '../types';
import { getDashboardPathForUser, normalizeAuthUser, resolveUserRole } from '../utils/auth';

let initializeAuthPromise: Promise<void> | null = null;

interface AuthState {
  user: User | null;
  token: string | null;
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: (() => {
    const t = localStorage.getItem('token');
    return t && t !== 'undefined' && t !== 'null' ? t : null;
  })(),
  isInitializing: true,
  isAuthenticated: false,

  login: (user: User, token: string) => {
    const normalizedUser = normalizeAuthUser(user);
    const resolvedRole = resolveUserRole(normalizedUser);

    if (!normalizedUser || !resolvedRole) {
      if (import.meta.env.DEV) {
        console.log('[auth/store] login rejected', {
          user,
          resolvedRole,
        });
      }

      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
      return;
    }

    if (token && token !== 'undefined' && token !== 'null') {
      localStorage.setItem('token', token);
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
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  initializeAuth: () => {
    if (initializeAuthPromise) {
      return initializeAuthPromise;
    }

    const token = localStorage.getItem('token');
    try {
      console.debug('[auth/store] initializeAuth - localStorage token:', token);
    } catch {
      // ignore
    }

    if (!token || token === 'undefined' || token === 'null') {
      set({ isInitializing: false, isAuthenticated: false, user: null, token: null });
      return Promise.resolve();
    }

    initializeAuthPromise = (async () => {
      try {
        const user = await authService.getCurrentUser();
        const resolvedRole = resolveUserRole(user);

        if (import.meta.env.DEV) {
          console.log('[auth/store] initializeAuth', {
            user,
            resolvedRole,
            redirectPath: getDashboardPathForUser(user),
          });
        }

        set({ user, token, isAuthenticated: true, isInitializing: false });
      } catch (error) {
        const err = error as Error;
        console.error('Auth initialization failed:', err.message);
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isInitializing: false });
      } finally {
        initializeAuthPromise = null;
      }
    })();

    return initializeAuthPromise;
  },
}));

export default useAuthStore;