import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Clock3,
    MessageSquare,
    Paperclip,
    PlusCircle,
    RefreshCw,
    Send,
    Trash,
    UserMinus,
    UserPlus,
    Loader2,
} from 'lucide-react';
import { taskService, TASK_MUTATION_EVENT } from '../../services/taskService';
import { formatDate, formatRelativeTime } from '../../utils/formatters';
import type { ActivityLog } from '../../types/activity';
import { Avatar } from './Avatar';

interface TaskActivityTimelineProps {
    taskId: string;
    className?: string;
}

type ActivityGroup = {
    label: string;
    logs: ActivityLog[];
};

type ActivityTone = {
    icon: ReactNode;
    iconClassName: string;
    accentClassName: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const getActionLabel = (action: string): string =>
    action
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
        .trim() || 'Activity';

const getDayKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getGroupLabel = (date: Date): string => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const time = date.getTime();

    if (time >= startOfToday.getTime()) {
        return 'Today';
    }

    if (time >= startOfYesterday.getTime()) {
        return 'Yesterday';
    }

    return formatDate(date);
};

const resolveTone = (action: string): ActivityTone => {
    const normalized = action.toLowerCase();

    if (normalized.includes('assign')) {
        return { icon: <UserPlus size={16} />, iconClassName: 'text-emerald-600', accentClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-100' };
    }

    if (normalized.includes('unassign')) {
        return { icon: <UserMinus size={16} />, iconClassName: 'text-rose-600', accentClassName: 'bg-rose-50 text-rose-700 ring-rose-100' };
    }

    if (normalized.includes('status')) {
        return { icon: <RefreshCw size={16} />, iconClassName: 'text-blue-600', accentClassName: 'bg-blue-50 text-blue-700 ring-blue-100' };
    }

    if (normalized.includes('comment')) {
        return { icon: <MessageSquare size={16} />, iconClassName: 'text-violet-600', accentClassName: 'bg-violet-50 text-violet-700 ring-violet-100' };
    }

    if (normalized.includes('file') && normalized.includes('delete')) {
        return { icon: <Trash size={16} />, iconClassName: 'text-rose-600', accentClassName: 'bg-rose-50 text-rose-700 ring-rose-100' };
    }

    if (normalized.includes('file')) {
        return { icon: <Paperclip size={16} />, iconClassName: 'text-cyan-600', accentClassName: 'bg-cyan-50 text-cyan-700 ring-cyan-100' };
    }

    if (normalized.includes('response')) {
        return { icon: <Send size={16} />, iconClassName: 'text-amber-600', accentClassName: 'bg-amber-50 text-amber-700 ring-amber-100' };
    }

    if (normalized.includes('create')) {
        return { icon: <PlusCircle size={16} />, iconClassName: 'text-slate-600', accentClassName: 'bg-slate-50 text-slate-700 ring-slate-200' };
    }

    return { icon: <Clock3 size={16} />, iconClassName: 'text-slate-600', accentClassName: 'bg-slate-50 text-slate-700 ring-slate-200' };
};

const SkeletonRow = () => (
    <div className="flex items-start gap-4 py-4">
        <div className="mt-1 h-10 w-10 animate-pulse rounded-full bg-slate-100" />
        <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
        </div>
    </div>
);

export const TaskActivityTimeline = ({ taskId, className }: TaskActivityTimelineProps) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchPromiseRef = useRef<Promise<void> | null>(null);
    const inFlightTaskIdRef = useRef<string | null>(null);
    const requestSeqRef = useRef(0);

    const loadLogs = useCallback(async (silent = false) => {
        if (!taskId) {
            setLogs([]);
            setLoading(false);
            setRefreshing(false);
            return;
        }

        if (fetchPromiseRef.current && inFlightTaskIdRef.current === taskId) {
            return fetchPromiseRef.current;
        }

        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        const requestSeq = ++requestSeqRef.current;
        inFlightTaskIdRef.current = taskId;

        fetchPromiseRef.current = taskService
            .getTaskActivityLogs(taskId)
            .then((feed) => {
                if (requestSeq === requestSeqRef.current) {
                    setLogs(feed.logs ?? []);
                    setError(null);
                }
            })
            .catch((fetchError) => {
                if (requestSeq === requestSeqRef.current) {
                    setError(fetchError instanceof Error ? fetchError.message : 'Failed to load activity timeline');
                }
            })
            .finally(() => {
                if (requestSeq === requestSeqRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                    fetchPromiseRef.current = null;
                    inFlightTaskIdRef.current = null;
                }
            });

        return fetchPromiseRef.current;
    }, [taskId]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadLogs();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadLogs]);

    useEffect(() => {
        const handleMutation = () => {
            void loadLogs(true);
        };

        window.addEventListener(TASK_MUTATION_EVENT, handleMutation);
        return () => window.removeEventListener(TASK_MUTATION_EVENT, handleMutation);
    }, [loadLogs]);

    const groupedLogs = useMemo<ActivityGroup[]>(() => {
        const sorted = [...logs].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
        const groups: ActivityGroup[] = [];
        const groupIndexByKey = new Map<string, number>();

        sorted.forEach((log) => {
            const date = new Date(log.created_at);
            const key = getDayKey(date);
            const label = getGroupLabel(date);
            const existingIndex = groupIndexByKey.get(key);

            if (existingIndex === undefined) {
                groupIndexByKey.set(key, groups.length);
                groups.push({ label, logs: [log] });
                return;
            }

            groups[existingIndex].logs.push(log);
        });

        return groups;
    }, [logs]);

    return (
        <section className={className ?? 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h4 className="text-lg font-semibold text-slate-900">Activity Timeline</h4>
                    <p className="mt-1 text-sm text-slate-500">Task history synced from the live backend.</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    {refreshing && <Loader2 size={14} className="animate-spin" />}
                    <span>{logs.length} events</span>
                </div>
            </div>

            <div className="mt-4 max-h-112 overflow-y-auto pr-1">
                {loading ? (
                    <div className="space-y-1">
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                        <p className="font-medium">Unable to load activity timeline</p>
                        <p className="mt-1 text-rose-600">{error}</p>
                        <button
                            type="button"
                            onClick={() => void loadLogs()}
                            className="mt-3 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition-colors hover:bg-rose-50"
                        >
                            Retry
                        </button>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-slate-900">No activity yet</p>
                        <p className="mt-1 text-sm text-slate-500">Once the task changes, the history will appear here automatically.</p>
                    </div>
                ) : (
                    <div className="relative space-y-6 pl-1">
                        <div className="absolute left-5 top-2 bottom-2 w-px bg-slate-200" />

                        <AnimatePresence initial={false} mode="popLayout">
                            {groupedLogs.map((group, groupIndex) => (
                                <motion.div
                                    key={`${group.label}-${groupIndex}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.18, delay: Math.min(groupIndex * 0.04, 0.16) }}
                                    className="relative"
                                >
                                    <div className="relative mb-3 flex items-center gap-3 pl-10">
                                        <span className="absolute left-4.5 top-2 h-3 w-3 rounded-full border-2 border-white bg-cyan-500 shadow-sm" />
                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{group.label}</p>
                                    </div>

                                    <div className="space-y-3">
                                        {group.logs.map((log, logIndex) => {
                                            const tone = resolveTone(log.action);
                                            const activityUser = log.user;
                                            const avatarName = activityUser?.name ?? 'Activity';
                                            const description = log.description || getActionLabel(log.action);

                                            return (
                                                <motion.article
                                                    key={log.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.16, delay: Math.min(logIndex * 0.03, 0.12) }}
                                                    whileHover={{ y: -2 }}
                                                    className="group relative flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all hover:shadow-md"
                                                >
                                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ${tone.accentClassName}`}>
                                                        <div className={tone.iconClassName}>{tone.icon}</div>
                                                    </div>

                                                    <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                                                        <div className="min-w-0 space-y-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <Avatar imageUrl={activityUser?.avatar} name={avatarName} size="sm" className="h-9 w-9" />
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-900">
                                                                            {activityUser?.name ?? 'System'}
                                                                        </p>
                                                                        <p className="text-xs text-slate-500">{getActionLabel(log.action)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <p className="text-sm leading-6 text-slate-700">
                                                                {description}
                                                            </p>

                                                            {isRecord(log.metadata) && Object.keys(log.metadata).length > 0 && (
                                                                <div className="flex flex-wrap gap-2 pt-1">
                                                                    {typeof log.metadata['file_name'] === 'string' && log.metadata['file_name'] && (
                                                                        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700">
                                                                            {log.metadata['file_name']}
                                                                        </span>
                                                                    )}
                                                                    {typeof log.metadata['new_status'] === 'string' && log.metadata['new_status'] && (
                                                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                                            {String(log.metadata['new_status']).replace(/_/g, ' ')}
                                                                        </span>
                                                                    )}
                                                                    {typeof log.metadata['assignee_name'] === 'string' && log.metadata['assignee_name'] && (
                                                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                                            {log.metadata['assignee_name']}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="shrink-0 text-right">
                                                            <p className="text-xs text-slate-400">{formatRelativeTime(log.created_at)}</p>
                                                        </div>
                                                    </div>
                                                </motion.article>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </section>
    );
};

export default TaskActivityTimeline;
