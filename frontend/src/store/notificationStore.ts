import { create } from 'zustand';
import type { Notification } from '../types';
import { notificationService, type NotificationFeed } from '../services/notificationService';

let loadPromise: Promise<NotificationFeed> | null = null;

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    hasLoaded: boolean;
    lastLoadedAt: string | null;
    loadNotifications: () => Promise<NotificationFeed>;
    markNotificationAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearNotifications: () => Promise<void>;
}

const markNotificationReadLocally = (notification: Notification): Notification => ({
    ...notification,
    read: true,
    is_read: true,
    read_at: notification.read_at ?? new Date().toISOString(),
});

const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    hasLoaded: false,
    lastLoadedAt: null,

    loadNotifications: async () => {
        if (loadPromise) {
            return loadPromise;
        }

        const shouldShowLoading = !get().hasLoaded;
        if (shouldShowLoading) {
            set({ isLoading: true });
        }

        loadPromise = notificationService
            .getNotificationFeed()
            .then((feed) => {
                set({
                    notifications: feed.notifications ?? [],
                    unreadCount: feed.unreadCount ?? 0,
                    isLoading: false,
                    hasLoaded: true,
                    lastLoadedAt: new Date().toISOString(),
                });

                return feed;
            })
            .catch((error) => {
                set({ isLoading: false });
                throw error;
            })
            .finally(() => {
                loadPromise = null;
            });

        return loadPromise;
    },

    markNotificationAsRead: async (notificationId: string) => {
        const currentNotification = get().notifications.find((notification) => notification.id === notificationId);

        if (!currentNotification || currentNotification.read) {
            return;
        }

        await notificationService.markAsRead(notificationId);

        set((state) => ({
            notifications: state.notifications.map((notification) => (
                notification.id === notificationId ? markNotificationReadLocally(notification) : notification
            )),
            unreadCount: Math.max(state.unreadCount - 1, 0),
        }));
    },

    markAllAsRead: async () => {
        await notificationService.markAllAsRead();

        set((state) => ({
            notifications: state.notifications.map(markNotificationReadLocally),
            unreadCount: 0,
        }));
    },

    clearNotifications: async () => {
        await notificationService.clearNotifications();

        set({
            notifications: [],
            unreadCount: 0,
            hasLoaded: true,
            lastLoadedAt: new Date().toISOString(),
        });
    },
}));

export default useNotificationStore;