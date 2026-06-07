import { Clock3 } from 'lucide-react';
import type { ActivityLog } from '../../types/activity';
import { Avatar } from './Avatar';
import { EmptyState } from './DataFetchError';

interface ActivityTimelineProps {
  title: string;
  subtitle?: string;
  activities?: ActivityLog[];
  emptyTitle?: string;
  emptyMessage?: string;
}

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

  return date.toLocaleDateString();
};

const formatAction = (action: string): string => action.replace(/_/g, ' ').toLowerCase();

export const ActivityTimeline = ({
  title,
  subtitle,
  activities = [],
  emptyTitle = 'No activity yet',
  emptyMessage = 'Important updates will appear here.',
}: ActivityTimelineProps) => (
  <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm leading-6 text-slate-600">{subtitle}</p>}
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
        <Clock3 size={18} />
      </div>
    </div>

    <div className="mt-6">
      {activities.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <div className="relative space-y-5">
          <div className="absolute bottom-3 left-4 top-3 w-px bg-slate-200" />
          {activities.map((activity) => {
            const userName = activity.user?.name ?? 'System';

            return (
              <div key={activity.id} className="relative flex gap-4">
                <Avatar imageUrl={activity.user?.avatar ?? activity.user?.avatar_url} name={userName} size="sm" className="relative z-10 ring-4 ring-white" />
                <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold capitalize text-slate-600 ring-1 ring-slate-200">
                      {formatAction(activity.action)}
                    </span>
                    <span className="text-xs text-slate-500">{formatActivityTime(activity.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{activity.description}</p>
                  <p className="mt-1 text-xs text-slate-500">{userName}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </section>
);
