import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Sidebar, SidebarItem, Navbar, Footer } from '../components/ui';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, FolderOpen, Bell, UserCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';
import type { Notification } from '../types';
import { getNavigationItemsForRole, getNotificationDestination, getNotificationsPathForRole } from '../lib/permissions';

interface EmployeeLayoutProps {
  children: ReactNode;
}

export const EmployeeLayout = ({ children }: EmployeeLayoutProps) => {
  const authUser = useAuthStore((state) => state.user);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  const [collapsed, setCollapsed] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1024 : false));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const notifications = useNotificationStore((state) => state.notifications);
  const notificationUnreadCount = useNotificationStore((state) => state.unreadCount);
  const loadNotifications = useNotificationStore((state) => state.loadNotifications);
  const markNotificationAsRead = useNotificationStore((state) => state.markNotificationAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const role = authUser?.role ?? 'employee';

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1024) {
        setSidebarOpen(true);
        setCollapsed(true);
        setIsMobileScreen(false);
      } else {
        setSidebarOpen(false);
        setCollapsed(true);
        setIsMobileScreen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileScreen) {
      queueMicrotask(() => setSidebarOpen(false));
    }
  }, [location.pathname, isMobileScreen]);

  useEffect(() => {
    let cancelled = false;

    const syncNotifications = async () => {
      try {
        await loadNotifications();

        if (!cancelled && import.meta.env.DEV) {
          const state = useNotificationStore.getState();
          console.log('[notifications/layout]', {
            userId: authUser?.id ?? null,
            notificationCount: state.notifications.length,
            unreadCount: state.unreadCount,
          });
        }
      } catch {
        // ignore notification bootstrap errors
      }
    };

    void syncNotifications();

    const intervalId = window.setInterval(() => {
      void syncNotifications();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authUser?.id, loadNotifications]);

  const effectiveCollapsed = collapsed && !isHoveringSidebar;
  const menuItems = getNavigationItemsForRole(role);
  const iconMap: Record<string, JSX.Element> = {
    dashboard: <LayoutDashboard size={20} />,
    projects: <FolderOpen size={20} />,
    tasks: <CheckSquare size={20} />,
    notifications: <Bell size={20} />,
    profile: <UserCircle2 size={20} />,
  };

  const resolveNotificationRoute = (notification: Notification): string => getNotificationDestination(role, notification);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
      }
    } catch {
      // keep navigation working even if mark-as-read fails
    } finally {
      navigate(resolveNotificationRoute(notification));
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    if (import.meta.env.DEV) {
      console.log('[auth/logout] clicked', { path: window.location.pathname, role: 'employee' });
    }

    try {
      if (import.meta.env.DEV) {
        console.log('[auth/logout] request', { endpoint: '/auth/logout' });
      }

      await authService.logout();

      if (import.meta.env.DEV) {
        console.log('[auth/logout] success');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log('[auth/logout] failure', error);
      }
    } finally {
      logout();
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={effectiveCollapsed}
        onMouseEnter={() => setIsHoveringSidebar(true)}
        onMouseLeave={() => {
          setIsHoveringSidebar(false);
          if (isMobileScreen) {
            setSidebarOpen(false);
          }
        }}
      >
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.path}
              to={item.path}
              icon={iconMap[item.key]}
              label={item.label}
              collapsed={effectiveCollapsed}
            />
          ))}
        </nav>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onCollapseToggle={() => setCollapsed((c) => !c)}
          userName={authUser?.name ?? 'Employee User'}
          userEmail={authUser?.email ?? 'john@example.com'}
          userAvatar={authUser?.avatar}
          userRole={authUser?.role ?? 'Employee'}
          onSettings={() => navigate('/employee/profile')}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          notifications={notifications}
          notificationUnreadCount={notificationUnreadCount}
          onNotificationClick={handleNotificationClick}
          onViewAllNotifications={() => navigate(getNotificationsPathForRole(role))}
          onMarkAllNotificationsAsRead={() => void markAllAsRead()}
        />

        <main className="flex-1 overflow-auto">
          <div className="px-4 py-6 sm:px-6 lg:px-8 w-full">{children}</div>
        </main>
        <Footer />
      </div>
    </div>
  );
};
