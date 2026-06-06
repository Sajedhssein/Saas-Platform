import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getDashboardPathForUser, resolveUserRole } from '../utils/auth';

interface PublicRouteProps {
  children: ReactNode;
}

/**
 * PublicRoute Component
 * Wraps routes that should only be accessible to unauthenticated users (login, register)
 * Redirects to appropriate dashboard if user is already authenticated
 */
export const PublicRoute = ({ children }: PublicRouteProps): ReactNode => {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (isAuthenticated && user) {
    const resolvedRole = resolveUserRole(user);
    const redirectPath = getDashboardPathForUser(user);

    if (import.meta.env.DEV) {
      console.log('[auth/public-route]', {
        path: location.pathname,
        user,
        role: user.role,
        resolvedRole,
        redirectPath,
      });
    }

    if (import.meta.env.DEV) {
      console.log('[auth/public-route] redirecting authenticated user', {
        path: location.pathname,
        resolvedRole,
        redirectPath,
      });
    }

    return <Navigate to={redirectPath} replace />;
  }

  return children;
};
