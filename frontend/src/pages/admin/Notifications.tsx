import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BellRing, FileBarChart, ShieldCheck, UserPlus, ClipboardCheck, CheckCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, DataFetchError, EmptyState, Modal, PageContainer, LoadingSpinner } from '../../components/ui';
import { formatRelativeTime, resolveNotificationCategory, resolveNotificationDestination } from '../../services/notificationService';
import type { Notification } from '../../types';
import useNotificationStore from '../../store/notificationStore';

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'reports', label: 'Reports' },
  { key: 'invites', label: 'Invites' },
  { key: 'system', label: 'System' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const getIcon = (notification: Notification) => {
  const category = resolveNotificationCategory(notification);

  switch (category) {
    case 'tasks':
      return <ClipboardCheck size={18} className="text-blue-600" />;
    case 'reports':
      return <FileBarChart size={18} className="text-violet-600" />;
    case 'invites':
      return <UserPlus size={18} className="text-emerald-600" />;
    case 'system':
      return <ShieldCheck size={18} className="text-slate-700" />;
    default:
      return <BellRing size={18} className="text-cyan-600" />;
  }
};

export const AdminNotifications = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearingNotifications, setClearingNotifications] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const loading = useNotificationStore((state) => state.isLoading && !state.hasLoaded);
  const hasLoaded = useNotificationStore((state) => state.hasLoaded);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const markNotificationAsRead = useNotificationStore((state) => state.markNotificationAsRead);
  const markAllAsReadStore = useNotificationStore((state) => state.markAllAsRead);
  const clearNotificationsStore = useNotificationStore((state) => state.clearNotifications);

  useEffect(() => {
    if (!hasLoaded) {
      void loadNotifications().catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load notifications');
      });
    }
  }, [hasLoaded, loadNotifications]);

  const sortedNotifications = useMemo(
    () => [...notifications].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()),
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    return sortedNotifications.filter((notification) => {
      if (activeTab === 'unread') {
        return !notification.read;
      }

      if (activeTab === 'all') {
        return true;
      }

      return resolveNotificationCategory(notification) === activeTab;
    });
  }, [activeTab, sortedNotifications]);

  const handleRetry = () => {
    setRefreshing(true);
    void loadNotifications()
      .then(() => setError(null))
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load notifications');
      })
      .finally(() => setRefreshing(false));
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true);

    try {
      await markAllAsReadStore();
      toast.success('All notifications marked as read');
    } catch (markError) {
      toast.error(markError instanceof Error ? markError.message : 'Failed to mark notifications as read');
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  const handleClearNotifications = async () => {
    setClearingNotifications(true);

    try {
      await clearNotificationsStore();
      toast.success('Notifications cleared');
      setClearConfirmOpen(false);
    } catch (clearError) {
      toast.error(clearError instanceof Error ? clearError.message : 'Failed to clear notifications');
    } finally {
      setClearingNotifications(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
      }
    } catch {
      // Navigation should still work even if the mark-as-read call fails.
    } finally {
      navigate(resolveNotificationDestination(notification));
    }
  };

  return (
    <PageContainer
      title="Notifications"
      description="View and manage your live notification stream"
      action={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {unreadCount > 0 ? (
            <Button variant="outline" size="md" onClick={() => void handleMarkAllAsRead()} isLoading={markingAllAsRead}>
              <CheckCheck size={16} />
              Mark all as read
            </Button>
          ) : null}
          <Button variant="danger" size="md" onClick={() => setClearConfirmOpen(true)} disabled={notifications.length === 0}>
            <BellRing size={16} />
            Clear Notifications
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'unread' ? unreadCount : undefined;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm flex justify-center">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <DataFetchError message={error} onRetry={handleRetry} isRetrying={refreshing} />
        ) : filteredNotifications.length === 0 ? (
          <EmptyState title="No notifications yet" message="New task, report, invite, and system alerts will appear here." />
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification, index) => {
              const isUnread = !notification.read;
              const category = resolveNotificationCategory(notification);

              return (
                <motion.button
                  key={notification.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.18) }}
                  whileHover={{ y: -2 }}
                  onClick={() => void handleNotificationClick(notification)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left shadow-sm transition-all sm:px-5 ${
                    isUnread
                      ? 'border-cyan-200 bg-cyan-50/60 ring-1 ring-cyan-100'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                      {getIcon(notification)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isUnread && <span className="h-2 w-2 rounded-full bg-cyan-500" />}
                            <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs text-slate-400">{formatRelativeTime(notification.timestamp)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            category === 'tasks'
                              ? 'bg-blue-100 text-blue-700'
                              : category === 'reports'
                                ? 'bg-violet-100 text-violet-700'
                                : category === 'invites'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                          }`}>
                            {category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={clearConfirmOpen}
        onClose={() => !clearingNotifications && setClearConfirmOpen(false)}
        title="Clear all notifications?"
        panelClassName="max-w-lg"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            This will remove all notifications immediately and they will not come back after refresh.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setClearConfirmOpen(false)} disabled={clearingNotifications}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleClearNotifications()} isLoading={clearingNotifications} disabled={clearingNotifications}>
              Clear notifications
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default AdminNotifications;
