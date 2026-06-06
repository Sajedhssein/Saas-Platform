import { Menu, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { SearchBar } from './Input';
import { NotificationButton, ProfileDropdown } from './Notifications';
import type { Notification } from '../../types';

interface NavbarProps {
  onMenuClick: () => void;
  onCollapseToggle?: () => void;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userRole?: string;
  notifications?: Notification[];
  notificationUnreadCount?: number;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  onSettings?: () => void;
  onNotificationClick?: (notification: Notification) => void | Promise<void>;
  onViewAllNotifications?: () => void;
  onMarkAllNotificationsAsRead?: () => void;
}

export const Navbar = ({
  onMenuClick,
  onCollapseToggle,
  userName = 'John Doe',
  userEmail = 'john@example.com',
  userAvatar,
  userRole,
  notifications = [],
  notificationUnreadCount,
  onLogout,
  isLoggingOut = false,
  onSettings,
  onNotificationClick,
  onViewAllNotifications,
  onMarkAllNotificationsAsRead,
}: NavbarProps) => {
  const [showSearch, setShowSearch] = useState(false);
  
  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-900 text-white backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
      <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between">
        {/* Left side - Menu and Search - mobile-first flex layout */}
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          {/* Desktop sidebar collapse button - only visible on lg and up */}
          {onCollapseToggle && (
            <button
              onClick={onCollapseToggle}
              className="hidden lg:flex p-2 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors shrink-0 min-h-11 min-w-11 items-center justify-center"
              aria-label="Toggle sidebar"
            >
              <ChevronLeft size={24} className="text-slate-100" />
            </button>
          )}

          {/* Mobile menu button - lg:hidden ensures it's only visible on mobile/tablet */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Toggle menu"
          >
            <Menu size={24} className="text-slate-100" />
          </button>

          {/* Desktop search bar - hidden on mobile (default), shown on md screens */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar
              placeholder="Search projects, tasks..."
              style={{ color: 'white' }}
              className="pl-10 md:pl-11 bg-white/10 border-white/10 text-white placeholder:text-white/60 focus:ring-cyan-400 focus:border-cyan-300"
            />
          </div>

          {/* Mobile search button - hidden on md and up */}
          <button
            onClick={() => setShowSearch((s) => !s)}
            className="md:hidden p-2 hover:bg-slate-800 active:bg-slate-700 rounded-lg transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Toggle search"
          >
            <svg className="w-6 h-6 text-slate-100" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Mobile search overlay - hidden on md and up */}
          {showSearch && (
            <div className="absolute left-0 right-0 top-full md:static md:top-auto md:left-auto md:right-auto md:hidden z-50">
              <div className="bg-slate-900 border border-white/10 p-2 m-2 rounded-lg shadow-lg backdrop-blur-xl">
                <SearchBar
                  placeholder="Search projects, tasks..."
                  autoFocus
                  style={{ color: 'white' }}
                  className="pl-10 md:pl-11 bg-white/10 border-white/10 text-white placeholder:text-white/60 focus:ring-cyan-400 focus:border-cyan-300"
                />
              </div>
            </div>
          )}
          
        </div>

        <span className="mx-4 shrink-0 truncate text-lg font-semibold tracking-[0.18em] text-transparent bg-linear-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text drop-shadow-[0_0_10px_rgba(34,211,238,0.18)] md:mx-8">
          Improver
        </span>

        {/* Right side - Notifications and Profile - touch-friendly sizing */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Notifications button */}
          <NotificationButton
            notifications={notifications}
            unreadCount={notificationUnreadCount}
            onNotificationClick={onNotificationClick}
            onViewAll={onViewAllNotifications}
            onMarkAllAsRead={onMarkAllNotificationsAsRead}
          />

          {/* Profile Dropdown */}
          <ProfileDropdown
            userName={userName}
            userEmail={userEmail}
            userAvatar={userAvatar}
            userRole={userRole}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
            onSettings={onSettings}
          />
        </div>
      </div>
    </nav>
  );
};
