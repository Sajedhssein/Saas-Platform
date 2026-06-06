import { useEffect } from 'react';
import useAuthStore from '../store/authStore';

let authInitializationStarted = false;

/**
 * useAuthInitializer Hook
 * Initializes auth state on app load by:
 * 1. Checking for token in localStorage
 * 2. Validating token via /auth/me endpoint
 * 3. Restoring user data to Zustand store
 *
 * Should be called once in the root component (App.tsx)
 */
export const useAuthInitializer = (): void => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    if (authInitializationStarted) {
      return;
    }

    authInitializationStarted = true;
    void initializeAuth();
  }, [initializeAuth]);
};
