import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock3, Loader2, Search, Trash2 } from 'lucide-react';
import type { ActivityLog } from '../../types/activity';
import { activityService, type ActivityPeriod } from '../../services/activityService';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { EmptyState } from './DataFetchError';
import { Modal } from './Modal';

interface ActivityLogPanelProps {
  initialActivities?: ActivityLog[];
}

const PERIOD_OPTIONS: Array<{ label: string; value: ActivityPeriod }> = [
  { label: 'Today', value: 'today' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'All', value: 'all' },
];

const formatAction = (action: string): string => action.replace(/_/g, ' ').toLowerCase();

const formatActivityTime = (value?: string): string => {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) {
    return 'Just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatGroupLabel = (value?: string): string => {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const dateKey = date.toDateString();

  if (dateKey === today.toDateString()) {
    return 'Today';
  }

  if (dateKey === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

const groupActivitiesByDate = (activities: ActivityLog[]): Array<{ label: string; items: ActivityLog[] }> => {
  const grouped = activities.reduce<Record<string, ActivityLog[]>>((groups, activity) => {
    const label = formatGroupLabel(activity.created_at);
    groups[label] = [...(groups[label] ?? []), activity];
    return groups;
  }, {});

  return Object.entries(grouped).map(([label, items]) => ({ label, items }));
};

export const ActivityLogPanel = ({ initialActivities = [] }: ActivityLogPanelProps) => {
  const [period, setPeriod] = useState<ActivityPeriod>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activities, setActivities] = useState<ActivityLog[]>(initialActivities);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const requestIdRef = useRef(0);

  const groupedActivities = useMemo(() => groupActivitiesByDate(activities), [activities]);

  const loadActivities = useCallback(async (page: number, append = false) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    try {
      const feed = await activityService.getActivityLogs({
        period,
        search: searchTerm,
        page,
        perPage: 20,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setActivities((current) => (append ? [...current, ...feed.logs] : feed.logs));
      setCurrentPage(feed.pagination?.current_page ?? page);
      setHasMore(Boolean(feed.pagination?.has_more));
    } catch (loadError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Unable to load activity logs.');
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [period, searchTerm]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadActivities(1);
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [loadActivities]);

  const handleLoadMore = () => {
    void loadActivities(currentPage + 1, true);
  };

  const handleClearActivity = async () => {
    setIsClearing(true);
    setError(null);

    try {
      await activityService.clearActivityLogs();
      setActivities([]);
      setCurrentPage(1);
      setHasMore(false);
      setShowConfirmClear(false);
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear activity logs.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Latest tracked actions across projects, tasks, files, reports, users, and clients.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`h-9 rounded-xl px-3 text-sm font-semibold leading-5 transition-colors ${
                  period === option.value
                    ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setShowConfirmClear(true)}
            disabled={activities.length === 0 || isLoading || isClearing}
          >
            <Trash2 size={15} />
            Clear Activity
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search user, project, task, or report"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm leading-6 text-black shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 placeholder:text-slate-400"
          />
        </div>

        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Clock3 size={16} />
          {isLoading ? 'Refreshing activity...' : `${activities.length} shown`}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        {isLoading && activities.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-500">
            <Loader2 className="mr-2 animate-spin" size={18} />
            Loading activity logs...
          </div>
        ) : groupedActivities.length === 0 ? (
          <EmptyState
            title="No activity found"
            message={searchTerm ? 'Try another search term or time filter.' : 'Tracked company activity will appear here as your team works.'}
          />
        ) : (
          <div className="space-y-7">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                <h3 className="mb-4 text-sm font-semibold text-slate-900">{group.label}</h3>
                <div className="relative space-y-5">
                  <div className="absolute bottom-3 left-4 top-3 w-px bg-slate-200" />
                  {group.items.map((activity) => {
                    const userName = activity.user?.name ?? 'System';

                    return (
                      <div key={activity.id} className="relative flex gap-4">
                        <Avatar
                          imageUrl={activity.user?.avatar ?? activity.user?.avatar_url}
                          name={userName}
                          size="sm"
                          className="relative z-10 ring-4 ring-white"
                        />
                        <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize leading-4 text-slate-600 ring-1 ring-slate-200">
                              {formatAction(activity.action)}
                            </span>
                            <span className="text-xs leading-5 text-slate-500">{formatActivityTime(activity.created_at)}</span>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{activity.description}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{userName}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button type="button" variant="secondary" onClick={handleLoadMore} isLoading={isLoadingMore}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        open={showConfirmClear}
        onClose={() => setShowConfirmClear(false)}
        title="Clear activity log?"
        panelClassName="max-w-md"
      >
        <p className="text-sm leading-6 text-slate-600">
          This clears every activity log for your company. Dashboard activity will be empty until new actions are tracked.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => setShowConfirmClear(false)} disabled={isClearing}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleClearActivity} isLoading={isClearing}>
            Clear Activity Log
          </Button>
        </div>
      </Modal>
    </section>
  );
};
