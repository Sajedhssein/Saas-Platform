import { Menu, ChevronLeft, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './Input';
import { NotificationButton, ProfileDropdown } from './Notifications';
import { globalSearchService, type GlobalSearchFilter, type GlobalSearchResult } from '../../services/globalSearchService';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<GlobalSearchFilter>('all');
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const trimmedSearchQuery = searchQuery.trim();
  const shouldShowResults = Boolean(trimmedSearchQuery) && (searchFocused || showSearch);
  const searchPlaceholder = useMemo(() => {
    const normalizedRole = (userRole ?? '').toLowerCase();

    if (normalizedRole.includes('admin')) {
      return 'Search employees, clients, projects, tasks...';
    }

    if (normalizedRole.includes('client')) {
      return 'Search projects, reports, files...';
    }

    return 'Search projects, tasks, comments...';
  }, [userRole]);
  const searchFilters = useMemo<Array<{ label: string; value: GlobalSearchFilter }>>(() => {
    const normalizedRole = (userRole ?? '').toLowerCase();

    if (normalizedRole.includes('admin')) {
      return [
        { label: 'All', value: 'all' },
        { label: 'Projects', value: 'projects' },
        { label: 'Tasks', value: 'tasks' },
        { label: 'Employees', value: 'employees' },
        { label: 'Clients', value: 'clients' },
        { label: 'Reports', value: 'reports' },
        { label: 'Files', value: 'files' },
      ];
    }

    if (normalizedRole.includes('client')) {
      return [
        { label: 'All', value: 'all' },
        { label: 'Projects', value: 'projects' },
        { label: 'Reports', value: 'reports' },
        { label: 'Files', value: 'files' },
      ];
    }

    return [
      { label: 'All', value: 'all' },
      { label: 'Projects', value: 'projects' },
      { label: 'Tasks', value: 'tasks' },
      { label: 'Comments', value: 'comments' },
      { label: 'Files', value: 'files' },
    ];
  }, [userRole]);

  useEffect(() => {
    if (!trimmedSearchQuery) {
      return undefined;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);

      globalSearchService
        .search(trimmedSearchQuery, searchFilter)
        .then((results) => {
          if (!cancelled) {
            setSearchResults(results);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setSearchResults([]);
            setSearchError(error instanceof Error ? error.message : 'Search failed');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [searchFilter, trimmedSearchQuery]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (target && searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  const handleResultClick = (result: GlobalSearchResult) => {
    navigate(result.url);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
    setShowSearch(false);
  };

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);

    if (!value.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
    }
  };

  const handleSearchFilterChange = (value: GlobalSearchFilter) => {
    setSearchFilter(value);
    setSearchResults([]);
    setSearchError(null);
  };

  const renderSearchResults = () => {
    if (!shouldShowResults) {
      return null;
    }

    return (
      <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
        {searchLoading ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600">
            <Loader2 size={16} className="animate-spin" />
            Searching...
          </div>
        ) : searchError ? (
          <div className="px-4 py-3 text-sm text-red-700">{searchError}</div>
        ) : searchResults.length === 0 ? (
          <div className="px-4 py-3 text-sm text-slate-500">No results found</div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-2">
            {searchResults.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleResultClick(result)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                  <Search size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{result.title}</p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
                      {result.type}
                    </span>
                  </div>
                  {result.subtitle && <p className="mt-1 truncate text-xs text-slate-500">{result.subtitle}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSearchInput = (autoFocus = false) => (
    <div ref={searchContainerRef} className="relative w-full">
      <div className="flex w-full overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-cyan-400">
        <label className="sr-only" htmlFor={`navbar-search-filter-${autoFocus ? 'mobile' : 'desktop'}`}>Search filter</label>
        <select
          id={`navbar-search-filter-${autoFocus ? 'mobile' : 'desktop'}`}
          value={searchFilter}
          onChange={(event) => handleSearchFilterChange(event.target.value as GlobalSearchFilter)}
          onFocus={() => setSearchFocused(true)}
          className="min-h-11 shrink-0 border-0 border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition-colors hover:bg-slate-100"
          aria-label="Search filter"
        >
          {searchFilters.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <SearchBar
          value={searchQuery}
          onChange={(event) => handleSearchQueryChange(event.target.value)}
          onFocus={() => setSearchFocused(true)}
          placeholder={searchPlaceholder}
          autoFocus={autoFocus}
          className="rounded-none border-0 bg-white text-slate-900 placeholder:text-slate-500 focus:border-transparent focus:ring-0"
        />
      </div>
      {renderSearchResults()}
    </div>
  );

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
            {renderSearchInput(false)}
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
                {renderSearchInput(true)}
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
