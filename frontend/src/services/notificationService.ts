import api from '../api/axios';
import type { Notification } from '../types';
import { makeError } from '../utils/error';

type UnknownRecord = Record<string, unknown>;

interface NotificationEnvelope {
    success?: boolean;
    message?: string;
    data?: unknown;
    unread_count?: number;
    pagination?: unknown;
}

export interface NotificationFeed {
    notifications: Notification[];
    unreadCount: number;
    pagination?: unknown;
}

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return fallback;
};

const readBoolean = (value: unknown): boolean => value === true;

const extractNotificationArray = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!isRecord(payload)) {
        return [];
    }

    if (Array.isArray(payload.data)) {
        return payload.data;
    }

    if (isRecord(payload.data) && Array.isArray(payload.data.data)) {
        return payload.data.data;
    }

    return [];
};

const toNotification = (value: unknown): Notification | null => {
    if (!isRecord(value)) {
        return null;
    }

    const createdAt = readString(value.created_at ?? value.timestamp ?? null, '');
    const readAt = readString(value.read_at ?? null, '');
    const isRead = typeof value.is_read === 'boolean' ? value.is_read : Boolean(readAt) || readBoolean(value.read);

    return {
        id: readString(value.id, ''),
        title: readString(value.title, 'Notification'),
        message: readString(value.message, ''),
        type: readString(value.type, 'system'),
        read: isRead,
        timestamp: createdAt || readAt || new Date().toISOString(),
        created_at: createdAt || null,
        read_at: readAt || null,
        is_read: isRead,
        entity_type: typeof value.entity_type === 'string' ? value.entity_type : null,
        entity_id: value.entity_id != null ? String(value.entity_id) : null,
        metadata: isRecord(value.metadata) ? value.metadata : isRecord(value.data) ? value.data : null,
        data: isRecord(value.data) ? value.data : null,
    };
};

const parseNotificationFeed = (payload: unknown): NotificationFeed => {
    const notifications = extractNotificationArray(payload)
        .map(toNotification)
        .filter((item): item is Notification => item !== null);

    const unreadCount = isRecord(payload) && typeof payload.unread_count === 'number'
        ? payload.unread_count
        : notifications.filter((notification) => !notification.read).length;

    const pagination = isRecord(payload) ? payload.pagination : undefined;

    return { notifications, unreadCount, pagination };
};

const getFullRequestUrl = (path: string): string => {
    const baseUrl = import.meta.env.VITE_API_URL;

    if (typeof baseUrl !== 'string' || !baseUrl) {
        return path;
    }

    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const normalizedPath = path.replace(/^\//, '');

    return new URL(normalizedPath, normalizedBaseUrl).toString();
};

const getCategoryFromValue = (value: string): 'tasks' | 'reports' | 'invites' | 'system' | 'other' => {
    const lowered = value.toLowerCase();

    if (
        lowered.includes('task_assigned') ||
        lowered.includes('task_completed') ||
        lowered.includes('task_comment') ||
        lowered.includes('task_file') ||
        lowered.includes('task_status_changed') ||
        lowered.includes('task')
    ) {
        return 'tasks';
    }

    if (lowered.includes('report_generated') || lowered.includes('report') || lowered.includes('report_')) {
        return 'reports';
    }

    if (lowered.includes('invite_accepted') || lowered.includes('invite')) {
        return 'invites';
    }

    if (lowered.includes('system') || lowered.includes('project')) {
        return 'system';
    }

    return 'other';
};

export const resolveNotificationCategory = (notification: Notification): 'tasks' | 'reports' | 'invites' | 'system' | 'other' => {
    const candidates = [
        notification.type,
        notification.entity_type ?? '',
        typeof notification.metadata?.type === 'string' ? notification.metadata.type : '',
        typeof notification.data?.type === 'string' ? notification.data.type : '',
        typeof notification.metadata?.notification_type === 'string' ? notification.metadata.notification_type : '',
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
        const category = getCategoryFromValue(candidate);
        if (category !== 'other') {
            return category;
        }
    }

    return 'other';
};

export const resolveNotificationDestination = (notification: Notification): string => {
    const entityType = (notification.entity_type ?? '').toLowerCase();

    if (entityType === 'task') {
        return notification.entity_id ? `/admin/tasks?taskId=${encodeURIComponent(notification.entity_id)}` : '/admin/tasks';
    }

    if (entityType === 'project') {
        return '/admin/projects';
    }

    if (entityType === 'report') {
        return '/admin/reports';
    }

    if (entityType === 'invite') {
        return '/admin/invites';
    }

    return '/admin/notifications';
};

export const formatRelativeTime = (value: string): string => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    if (diffMinutes < 1) {
        return 'Just now';
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) {
        return 'Yesterday';
    }

    return `${diffDays} days ago`;
};

export const notificationService = {
    getNotificationFeed: async (): Promise<NotificationFeed> => {
        try {
            const requestPath = '/notifications';

            if (import.meta.env.DEV) {
                console.log('[notifications/api] request', {
                    method: 'GET',
                    url: getFullRequestUrl(requestPath),
                });
            }

            const response = await api.get<NotificationEnvelope | Notification[]>(requestPath);
            const feed = parseNotificationFeed(response.data);

            if (import.meta.env.DEV) {
                console.log('[notifications/api] feed', {
                    status: response.status,
                    notificationCount: feed.notifications.length,
                    unreadCount: feed.unreadCount,
                });
            }

            return feed;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
            throw makeError(message);
        }
    },

    getNotifications: async (): Promise<Notification[]> => {
        const feed = await notificationService.getNotificationFeed();
        return feed.notifications;
    },

    markAsRead: async (id: string): Promise<void> => {
        try {
            const requestPath = `/notifications/${id}/read`;

            if (import.meta.env.DEV) {
                console.log('[notifications/api] request', {
                    method: 'PATCH',
                    url: getFullRequestUrl(requestPath),
                });
            }

            await api.patch(requestPath);
        } catch (err) {
            throw makeError((err as Error).message || 'Failed to mark notification as read');
        }
    },

    markAllAsRead: async (): Promise<void> => {
        try {
            const requestPath = '/notifications/read-all';

            if (import.meta.env.DEV) {
                console.log('[notifications/api] request', {
                    method: 'PATCH',
                    url: getFullRequestUrl(requestPath),
                });
            }

            await api.patch(requestPath);
        } catch (err) {
            throw makeError((err as Error).message || 'Failed to mark all notifications as read');
        }
    },

    clearNotifications: async (): Promise<void> => {
        try {
            const requestPath = '/notifications/clear';

            if (import.meta.env.DEV) {
                console.log('[notifications/api] request', {
                    method: 'PATCH',
                    url: getFullRequestUrl(requestPath),
                });
            }

            await api.patch(requestPath);
        } catch (err) {
            throw makeError((err as Error).message || 'Failed to clear notifications');
        }
    },
};

export default notificationService;
