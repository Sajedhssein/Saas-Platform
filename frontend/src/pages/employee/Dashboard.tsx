import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListTodo,
  PieChart,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { LineTrend } from '../../components/ui/AnalyticsUI';
import { DataFetchError, EmptyState, PageContainer, ProgressBar, StatusBadge } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { dashboardService } from '../../services/dashboardService';
import type { EmployeeDashboard as EmployeeDashboardData, EmployeeDashboardTask } from '../../types/dashboard';

const cardMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};

const formatPercentage = (value: number): string => `${Math.round(value)}%`;

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'EM';
};

const getPriorityTone = (priority?: string | null): { label: string; className: string } => {
  const normalized = (priority ?? 'medium').toLowerCase();

  if (normalized === 'high') {
    return { label: 'High priority', className: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200' };
  }

  if (normalized === 'low') {
    return { label: 'Low priority', className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' };
  }

  return { label: 'Medium priority', className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' };
};

const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(value);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const from = previousValueRef.current;
    const duration = 700;

    const tick = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (value - from) * eased;
      setDisplayValue(next);

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        previousValueRef.current = value;
      }
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return <span>{Math.round(displayValue)}{suffix}</span>;
};

const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="h-56 animate-pulse bg-linear-to-br from-slate-100 via-slate-200 to-cyan-50" />
      <div className="space-y-4 p-6">
        <div className="h-6 w-48 rounded-full bg-slate-200 animate-pulse" />
        <div className="h-10 w-72 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-slate-200" />
              <div className="mt-4 h-4 w-24 rounded-full bg-slate-200" />
              <div className="mt-3 h-8 w-20 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] animate-pulse">
        <div className="h-6 w-40 rounded-full bg-slate-200" />
        <div className="mt-4 h-64 rounded-2xl bg-slate-100" />
      </div>
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] animate-pulse">
        <div className="h-6 w-36 rounded-full bg-slate-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MetricCard = ({ title, value, subtitle, icon, tone = 'slate' }: { title: string; value: number | string; subtitle: string; icon: JSX.Element; tone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose'; }) => {
  const toneStyles = {
    slate: 'from-slate-900 to-slate-700 text-white shadow-slate-900/10',
    cyan: 'from-cyan-600 to-blue-600 text-white shadow-cyan-600/15',
    emerald: 'from-emerald-600 to-teal-600 text-white shadow-emerald-600/15',
    amber: 'from-amber-500 to-orange-500 text-white shadow-amber-500/15',
    rose: 'from-rose-600 to-pink-600 text-white shadow-rose-600/15',
  }[tone];

  return (
    <motion.div
      {...cardMotion}
      whileHover={{ y: -4 }}
      className={`overflow-hidden rounded-[1.75rem] border border-slate-200 bg-linear-to-br p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${toneStyles}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <div className="mt-2 text-3xl font-semibold tracking-tight md:text-[2.35rem]">
            {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
          </div>
          <p className="mt-2 text-sm opacity-80">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

const TaskProgressCard = ({ task }: { task: EmployeeDashboardTask }) => {
  const priorityTone = getPriorityTone(task.priority);
  const status = task.status === 'overdue' ? 'high' : task.status === 'in-progress' ? 'in-progress' : task.status;

  return (
    <motion.div
      {...cardMotion}
      whileHover={{ y: -3 }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">{task.title}</h3>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityTone.className}`}>
              {priorityTone.label}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{task.description || 'No description provided.'}</p>
        </div>
        <StatusBadge status={status} label={task.status === 'overdue' ? 'Overdue' : undefined} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium text-slate-700">{task.project?.name ?? 'Project'}</span>
          <span>{task.deadline ? `Due ${task.deadline}` : 'No due date'}</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={task.progress} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{task.progress}% complete</span>
          <span>{task.status.replace('-', ' ')}</span>
        </div>
      </div>
    </motion.div>
  );
};

const NotificationCard = ({ title, message, type, read, timestamp }: { title: string; message: string; type: string; read: boolean; timestamp: string; }) => {
  const typeTone = type.toLowerCase();
  const accentClass = typeTone.includes('overdue') || typeTone.includes('alert')
    ? 'border-rose-200 bg-rose-50'
    : typeTone.includes('project')
      ? 'border-cyan-200 bg-cyan-50'
      : 'border-slate-200 bg-slate-50';

  return (
    <motion.div {...cardMotion} className={`rounded-[1.35rem] border p-4 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${read ? 'bg-slate-300' : 'bg-cyan-500'}`} />
            <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message || 'No details provided.'}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 shadow-sm">
          {type}
        </span>
      </div>
      <div className="mt-3 text-xs text-slate-500">{timestamp}</div>
    </motion.div>
  );
};

const ProjectProgressCard = ({ name, progress, taskCount }: { name: string; progress: number; taskCount: number; }) => {
  return (
    <motion.div {...cardMotion} whileHover={{ y: -3 }} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{name}</h4>
          <p className="mt-1 text-xs text-slate-500">{taskCount} tasks in view</p>
        </div>
        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{formatPercentage(progress)}</div>
      </div>
      <div className="mt-3">
        <ProgressBar value={progress} />
      </div>
    </motion.div>
  );
};

export const EmployeeDashboard = () => {
  const authUser = useAuthStore((state) => state.user);
  const [dashboard, setDashboard] = useState<EmployeeDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardService.getEmployeeDashboard();

        if (!cancelled) {
          setDashboard(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const recentTasks = useMemo(() => dashboard?.recentTasks ?? dashboard?.recent_tasks ?? [], [dashboard]);
  const notifications = useMemo(() => dashboard?.notifications ?? [], [dashboard]);
  const weeklyProductivity = useMemo(() => dashboard?.trendData ?? dashboard?.weeklyProductivity ?? dashboard?.weekly_productivity ?? [], [dashboard]);

  const summary = useMemo(() => {
    const myTasks = dashboard?.myTasks ?? recentTasks.length;
    const completedTasks = dashboard?.completedTasks ?? recentTasks.filter((task) => task.status === 'completed').length;
    const pendingTasks = dashboard?.pendingTasks ?? recentTasks.filter((task) => task.status === 'pending').length;
    const overdueTasks = dashboard?.overdueTasks ?? recentTasks.filter((task) => task.status === 'overdue').length;
    const myProjects = dashboard?.myProjects ?? Array.from(new Set(recentTasks.map((task) => task.project.id))).filter(Boolean).length;
    const completionRate = dashboard?.completionRate ?? (myTasks > 0 ? (completedTasks / myTasks) * 100 : 0);

    return { myTasks, completedTasks, pendingTasks, overdueTasks, myProjects, completionRate };
  }, [dashboard, recentTasks]);

  const projectCards = useMemo(() => {
    const grouped = new Map<string, { name: string; totalProgress: number; taskCount: number }>();

    recentTasks.forEach((task) => {
      const key = task.project.id || task.project.name;
      const current = grouped.get(key) ?? { name: task.project.name, totalProgress: 0, taskCount: 0 };
      current.name = task.project.name;
      current.totalProgress += task.progress;
      current.taskCount += 1;
      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .map((item) => ({ ...item, progress: item.taskCount > 0 ? item.totalProgress / item.taskCount : 0 }))
      .slice(0, 4);
  }, [recentTasks]);

  const greetingName = authUser?.name?.split(' ')[0] ?? 'there';

  const handleRetry = () => {
    setRefreshKey((value) => value + 1);
  };

  if (loading) {
    return (
      <PageContainer title="Dashboard" description="Welcome back! Here's your work overview." titleClassName="text-black">
        <div className="p-2 md:p-6">
          <DashboardSkeleton />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Dashboard" description="Welcome back! Here's your work overview." titleClassName="text-black">
        <DataFetchError message={error} onRetry={handleRetry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" description="Welcome! Here's your work overview." titleClassName="text-black">
      <div className="space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-4xl border border-slate-200 bg-linear-to-br from-slate-950 via-blue-950 to-cyan-900 text-white shadow-[0_24px_70px_rgba(8,15,32,0.24)]"
        >
          <div className="absolute inset-0 opacity-60">
            <div className="absolute -left-6 top-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute right-0 top-12 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-emerald-400/10 blur-3xl" />
          </div>
          <div className="relative grid gap-8 p-6 md:p-8 xl:grid-cols-[1.35fr_0.9fr] xl:p-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur-sm">
                <Sparkles size={12} />
                Employee workspace
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                  Welcome back, {greetingName}.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                  A focused view of your tasks, project progress, and team notifications with live data from your employee dashboard.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-slate-100">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <Zap size={14} />
                  {summary.myTasks} active items
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <TrendingUp size={14} />
                  {formatPercentage(summary.completionRate)} completion
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
                  <ShieldAlert size={14} />
                  {summary.overdueTasks} overdue
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <motion.div {...cardMotion} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Profile</p>
                    <p className="mt-2 text-xl font-semibold">{authUser?.name ?? 'Employee'}</p>
                    <p className="mt-1 text-sm text-slate-200">{authUser?.email ?? 'No email available'}</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold text-white">
                    {getInitials(authUser?.name ?? 'Employee')}
                  </div>
                </div>
              </motion.div>

              <motion.div {...cardMotion} className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <div className="flex items-center gap-3 text-sm text-slate-100">
                  <Clock3 size={18} />
                  <div>
                    <p className="font-medium">Today&apos;s focus</p>
                    <p className="text-slate-200">Prioritize high-impact tasks first.</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="My Tasks" value={summary.myTasks} subtitle="Assigned to you" icon={<ListTodo size={22} />} tone="slate" />
          <MetricCard title="Completed" value={summary.completedTasks} subtitle="Finished work" icon={<CheckCircle2 size={22} />} tone="emerald" />
          <MetricCard title="Pending" value={summary.pendingTasks} subtitle="Ready to pick up" icon={<Clock3 size={22} />} tone="amber" />
          <MetricCard title="Overdue" value={summary.overdueTasks} subtitle="Needs attention" icon={<AlertCircle size={22} />} tone="rose" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <motion.div {...cardMotion} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Weekly Productivity</h2>
                <p className="mt-1 text-sm text-slate-600">Trend data from your employee dashboard endpoint.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {weeklyProductivity.length > 0 ? `${weeklyProductivity.length} points` : 'No trend data'}
              </div>
            </div>

            <div className="mt-5">
              {weeklyProductivity.length > 0 ? (
                <LineTrend data={weeklyProductivity.map((item) => ({ label: item.day, completed: item.completed }))} dataKey="completed" xKey="label" height={260} />
              ) : (
                <EmptyState title="No weekly productivity data" message="When the backend returns a productivity series, it will appear here." />
              )}
            </div>
          </motion.div>

          <motion.div {...cardMotion} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                <p className="mt-1 text-sm text-slate-600">Recent updates and reminders.</p>
              </div>
              <Bell size={18} className="text-slate-500" />
            </div>

            <div className="mt-5 space-y-3">
              {notifications.length === 0 ? (
                <EmptyState title="No notifications" message="You are all caught up right now." />
              ) : (
                notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    title={notification.title}
                    message={notification.message}
                    type={notification.type}
                    read={notification.read}
                    timestamp={notification.timestamp}
                  />
                ))
              )}
            </div>
          </motion.div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <motion.div {...cardMotion} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Project Progress</h2>
                <p className="mt-1 text-sm text-slate-600">A quick view of the projects tied to your current work.</p>
              </div>
              <FolderKanban size={18} className="text-slate-500" />
            </div>

            <div className="mt-5 space-y-3">
              {projectCards.length === 0 ? (
                <EmptyState title="No assigned projects" message="Assigned project progress will show up here once you have active work." />
              ) : (
                projectCards.map((project) => (
                  <ProjectProgressCard
                    key={project.name}
                    name={project.name}
                    progress={project.progress}
                    taskCount={project.taskCount}
                  />
                ))
              )}
            </div>
          </motion.div>

          <motion.div {...cardMotion} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Tasks</h2>
                <p className="mt-1 text-sm text-slate-600">Your latest assignments with priority and progress.</p>
              </div>
              <PieChart size={18} className="text-slate-500" />
            </div>

            <div className="mt-5 space-y-4">
              {recentTasks.length === 0 ? (
                <EmptyState title="No assigned tasks" message="When tasks are assigned to you, they will appear here." />
              ) : (
                recentTasks.map((task) => <TaskProgressCard key={task.id} task={task} />)
              )}
            </div>
          </motion.div>
        </section>
      </div>
    </PageContainer>
  );
};

export default EmployeeDashboard;