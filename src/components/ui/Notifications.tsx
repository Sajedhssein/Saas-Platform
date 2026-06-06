import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, LogOut, Settings, ChevronDown, BellRing, FileBarChart, UserPlus, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { formatRelativeTime, resolveNotificationCategory } from '../../services/notificationService';
import type { Notification } from '../../types';

interface NotificationButtonProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  unreadCount?: number;
  onViewAll?: () => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationButton = ({
  notifications = [],
  onNotificationClick,
  unreadCount,
  onViewAll,
}: NotificationButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const visibleNotifications = useMemo(() => notifications.slice(0, 5), [notifications]);
  const badgeCount = unreadCount ?? notifications.filter((n) => !n.read).length;
  const badgeLabel = badgeCount > 9 ? '9+' : String(badgeCount);

  const getIcon = (notification: Notification) => {
    const category = resolveNotificationCategory(notification);
    switch (category) {
      case 'tasks':
        return <ClipboardCheck size={16} className="text-blue-600" />;
      case 'reports':
        return <FileBarChart size={16} className="text-violet-600" />;
      case 'invites':
        return <UserPlus size={16} className="text-emerald-600" />;
      case 'system':
        return <ShieldCheck size={16} className="text-slate-700" />;
      default:
        return <BellRing size={16} className="text-cyan-600" />;
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      const target = event.target as Node | null;
      if (target && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-11 min-w-11 flex items-center justify-center"
        aria-label={badgeCount > 0 ? `Notifications, ${badgeCount} unread` : 'Notifications'}
      >
        <Bell size={24} className="shrink-0" />
        {badgeCount > 0 && (
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={badgeLabel}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className={`absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white shadow-sm ring-2 ring-white ${
                badgeCount > 9 ? 'min-w-5 px-1.5 py-0.5 text-[10px] font-semibold leading-none' : 'h-2.5 w-2.5'
              }`}
            >
              {badgeCount > 9 ? badgeLabel : null}
            </motion.span>
          </AnimatePresence>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-screen sm:w-96 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-[32rem] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-200 shrink-0 bg-white/90 backdrop-blur-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-500">Latest updates from tasks, reports, invites, and system events.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{badgeCount} unread</div>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-50/50">
              {visibleNotifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No notifications yet</div>
              ) : (
                visibleNotifications.map((notification) => (
                  <motion.button
                    key={notification.id}
                    type="button"
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      void onNotificationClick?.(notification);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-4 border-b border-slate-100 last:border-b-0 transition-colors ${
                      !notification.read ? 'bg-blue-50/70' : 'bg-white'
                    } hover:bg-slate-50`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                        {getIcon(notification)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900 wrap-break-word">{notification.title}</p>
                          {!notification.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-600 wrap-break-word">{notification.message}</p>
                        <p className="mt-2 text-xs text-slate-400">{formatRelativeTime(notification.timestamp)}</p>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-3">
              <div className="grid gap-2 p-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onMarkAllAsRead?.();
                }}
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={() => {
                  onViewAll?.();
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                View all notifications
              </button>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ProfileDropdownProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userRole?: string;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  onSettings?: () => void;
}

export const ProfileDropdown = ({
  userName = 'John Doe',
  userEmail = 'john@example.com',
  userAvatar,
  userRole,
  onLogout,
  isLoggingOut = false,
  onSettings,
}: ProfileDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 p-2 hover:bg-slate-100 rounded-lg transition-colors min-h-11 min-w-11"
        aria-label="Profile menu"
      >
        <div className="w-8 h-8 overflow-hidden rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0 ring-1 ring-white/20 shadow-sm">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName || 'User avatar'}
              className="h-full w-full object-cover"
            />
          ) : (
            (userName.trim().charAt(0) || 'U').toUpperCase()
          )}
        </div>
        <ChevronDown size={16} className="text-slate-600 shrink-0 hidden sm:inline" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-screen sm:w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-900 wrap-break-word">
              {userRole ? `${userRole} - ${userName}` : userName}
            </p>
            <p className="text-xs text-slate-500 wrap-break-word">{userEmail}</p>
          </div>
          <div className="py-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onSettings?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors min-h-11"
            >
              <Settings size={18} className="shrink-0" />
              <span>Settings</span>
            </button>
            <button
              disabled={isLoggingOut}
              onClick={() => {
                if (isLoggingOut) {
                  return;
                }
                setIsOpen(false);
                onLogout?.();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors min-h-11 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={18} className="shrink-0" />
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
