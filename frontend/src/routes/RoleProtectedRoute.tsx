import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import type { User } from '../types';
import { getDashboardPathForRole, resolveUserRole } from '../utils/auth';

interface RoleProtectedRouteProps {
  children: ReactNode;
  requiredRoles: User['role'][];
}

/**
 * RoleProtectedRoute Component
 * Wraps routes that require specific user roles
 * Redirects to /login if not authenticated
 * Redirects to /unauthorized if authenticated but wrong role
 */
export const RoleProtectedRoute = ({
  children,
  requiredRoles,
}: RoleProtectedRouteProps): ReactNode => {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const location = useLocation();

  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const resolvedRole = resolveUserRole(user);
  const redirectPath = resolvedRole ? getDashboardPathForRole(resolvedRole) : '/unauthorized';

  if (import.meta.env.DEV) {
    console.log('[auth/role-route]', {
      path: location.pathname,
      user,
      role: user?.role,
      resolvedRole,
      requiredRoles,
      redirectPath,
    });
  }

  if (!user || !resolvedRole) {
    if (import.meta.env.DEV) {
      console.log('[auth/role-route] denied', { path: location.pathname, reason: 'missing user or unresolved role', redirectPath: '/unauthorized' });
    }

    return <Navigate to="/unauthorized" replace />;
  }

  if (!requiredRoles.includes(resolvedRole)) {
    if (import.meta.env.DEV) {
      console.log('[auth/role-route] denied', { path: location.pathname, reason: 'role mismatch', resolvedRole, requiredRoles, redirectPath });
    }

    return <Navigate to={redirectPath} replace />;
  }

  return children;
};
