import type { Notification, User } from '../types';

export type AppRole = User['role'];

export type NavigationKey =
    | 'dashboard'
    | 'analytics'
    | 'projects'
    | 'tasks'
    | 'employees'
    | 'clients'
    | 'invites'
    | 'reports'
    | 'notifications'
    | 'settings'
    | 'files'
    | 'profile';

export type TaskPermission = 'create' | 'edit' | 'delete' | 'assign' | 'change-status' | 'comment' | 'upload-file' | 'view-activity';

export interface NavigationItem {
    key: NavigationKey;
    label: string;
    path: string;
}

const roleHomePath: Record<AppRole, string> = {
    admin: '/admin/dashboard',
    employee: '/employee/dashboard',
    client: '/client/dashboard',
};

const roleNotificationsPath: Record<AppRole, string> = {
    admin: '/admin/notifications',
    employee: '/employee/notifications',
    client: '/client/notifications',
};

const roleProjectsPath: Record<AppRole, string> = {
    admin: '/admin/projects',
    employee: '/employee/projects',
    client: '/client/projects',
};

const roleTasksPath: Record<AppRole, string> = {
    admin: '/admin/tasks',
    employee: '/employee/tasks',
    client: '/client/dashboard',
};

const roleReportsPath: Record<AppRole, string> = {
    admin: '/admin/reports',
    employee: '/employee/dashboard',
    client: '/client/reports',
};

const roleNavItems: Record<AppRole, NavigationItem[]> = {
    admin: [
        { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
        { key: 'analytics', label: 'Analytics', path: '/admin/analytics' },
        { key: 'projects', label: 'Projects', path: '/admin/projects' },
        { key: 'tasks', label: 'Tasks', path: '/admin/tasks' },
        { key: 'employees', label: 'Employees', path: '/admin/employees' },
        { key: 'clients', label: 'Clients', path: '/admin/clients' },
        { key: 'invites', label: 'Invites', path: '/admin/invites' },
        { key: 'reports', label: 'Reports', path: '/admin/reports' },
        { key: 'notifications', label: 'Notifications', path: '/admin/notifications' },
        { key: 'settings', label: 'Settings', path: '/admin/settings' },
    ],
    employee: [
        { key: 'dashboard', label: 'Dashboard', path: '/employee/dashboard' },
        { key: 'projects', label: 'Projects', path: '/employee/projects' },
        { key: 'tasks', label: 'Assigned Tasks', path: '/employee/tasks' },
        { key: 'notifications', label: 'Notifications', path: '/employee/notifications' },
        { key: 'profile', label: 'Profile', path: '/employee/profile' },
    ],
    client: [
        { key: 'dashboard', label: 'Dashboard', path: '/client/dashboard' },
        { key: 'projects', label: 'Projects', path: '/client/projects' },
        { key: 'reports', label: 'Reports', path: '/client/reports' },
        { key: 'notifications', label: 'Notifications', path: '/client/notifications' },
        { key: 'files', label: 'Files', path: '/client/files' },
        { key: 'profile', label: 'Profile', path: '/profile-settings' },
    ],
};

const taskPermissions: Record<AppRole, Set<TaskPermission>> = {
    admin: new Set(['create', 'edit', 'delete', 'assign', 'change-status', 'comment', 'upload-file', 'view-activity']),
    employee: new Set(['change-status', 'comment', 'upload-file', 'view-activity']),
    client: new Set(['view-activity']),
};

export const getNavigationItemsForRole = (role: AppRole | null | undefined): NavigationItem[] => {
    if (!role) {
        return [];
    }

    return roleNavItems[role] ?? [];
};

export const getDashboardPathForRole = (role: AppRole | null | undefined): string => {
    if (!role) {
        return '/unauthorized';
    }

    return roleHomePath[role] ?? '/unauthorized';
};

export const getNotificationsPathForRole = (role: AppRole | null | undefined): string => {
    if (!role) {
        return '/unauthorized';
    }

    return roleNotificationsPath[role] ?? '/unauthorized';
};

export const getProjectsPathForRole = (role: AppRole | null | undefined): string => {
    if (!role) {
        return '/unauthorized';
    }

    return roleProjectsPath[role] ?? '/unauthorized';
};

export const getTasksPathForRole = (role: AppRole | null | undefined): string => {
    if (!role) {
        return '/unauthorized';
    }

    return roleTasksPath[role] ?? '/unauthorized';
};

export const getReportsPathForRole = (role: AppRole | null | undefined): string => {
    if (!role) {
        return '/unauthorized';
    }

    return roleReportsPath[role] ?? '/unauthorized';
};

export const getProfilePathForRole = (role: AppRole | null | undefined): string => {
    if (!role) {
        return '/unauthorized';
    }

    if (role === 'employee') {
        return '/employee/profile';
    }

    return '/profile-settings';
};

export const canAccessNavigationItem = (role: AppRole | null | undefined, key: NavigationKey): boolean => {
    if (!role) {
        return false;
    }

    return getNavigationItemsForRole(role).some((item) => item.key === key);
};

export const canPerformTaskPermission = (role: AppRole | null | undefined, permission: TaskPermission): boolean => {
    if (!role) {
        return false;
    }

    return taskPermissions[role]?.has(permission) ?? false;
};

export const getNotificationDestination = (role: AppRole | null | undefined, notification: Notification): string => {
    const resolvedRole = role ?? 'admin';
    const entityType = (notification.entity_type ?? '').toLowerCase();

    if (entityType === 'task') {
        const taskPath = getTasksPathForRole(resolvedRole);
        return notification.entity_id ? `${taskPath}?taskId=${encodeURIComponent(notification.entity_id)}` : taskPath;
    }

    if (entityType === 'project') {
        if (resolvedRole === 'client' && notification.entity_id) {
            return `/client/projects/${encodeURIComponent(notification.entity_id)}`;
        }
        return getProjectsPathForRole(resolvedRole);
    }

    if (entityType === 'report') {
        if (resolvedRole === 'client' && notification.entity_id) {
            return `/client/reports/${encodeURIComponent(notification.entity_id)}`;
        }
        return getReportsPathForRole(resolvedRole);
    }

    if (entityType === 'file') {
        if (resolvedRole === 'client') {
            return '/client/files';
        }
    }

    if (entityType === 'invite') {
        return resolvedRole === 'admin' ? '/admin/invites' : getDashboardPathForRole(resolvedRole);
    }

    return getNotificationsPathForRole(resolvedRole);
};
