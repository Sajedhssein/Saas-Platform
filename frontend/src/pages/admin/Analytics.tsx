import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  FolderOpen,
  RefreshCw,
  UserCheck,
  UserMinus,
  Users,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import { Button, DataFetchError, EmptyState, PageContainer, ProgressBar, SkeletonCard, SkeletonChart, SkeletonProgress, SkeletonTable } from '../../components/ui';
import { KpiCard, DonutStatus, WorkloadBar, Leaderboard } from '../../components/ui/AnalyticsUI';
import type { AnalyticsKPI, ClientAnalytics, DashboardStats, PerformanceData, WorkloadData } from '../../types/dashboard';

type AnalyticsState = {
  stats: DashboardStats | null;
  workload: WorkloadData[];
  performance: PerformanceData | null;
  clientAnalytics: ClientAnalytics | null;
};

const numberFormatter = new Intl.NumberFormat('en-US');

const metricCards = (stats: DashboardStats): AnalyticsKPI[] => [
  {
    title: 'Total Projects',
    value: stats.total_projects,
    subtitle: 'Projects tracked',
    tone: 'blue',
  },
  {
    title: 'Active Projects',
    value: stats.active_projects,
    subtitle: 'Currently in progress',
    tone: 'emerald',
  },
  {
    title: 'Completed Projects',
    value: stats.completed_projects,
    subtitle: 'Finished projects',
    tone: 'violet',
  },
  {
    title: 'Total Tasks',
    value: stats.total_tasks,
    subtitle: 'Tasks in the system',
    tone: 'amber',
  },
  {
    title: 'Completed Tasks',
    value: stats.completed_tasks,
    subtitle: 'Tasks finished',
    tone: 'emerald',
  },
  {
    title: 'Pending Tasks',
    value: stats.pending_tasks,
    subtitle: 'Waiting to start',
    tone: 'rose',
  },
  {
    title: 'Employees',
    value: stats.total_employees,
    subtitle: 'All employees',
    tone: 'slate',
  },
  {
    title: 'Completion Rate %',
    value: stats.project_completion_rate,
    subtitle: 'Project completion rate',
    tone: 'blue',
  },
];

const clientMetricCards = (clientAnalytics: ClientAnalytics): AnalyticsKPI[] => [
  {
    title: 'Total Clients',
    value: clientAnalytics.total_clients,
    subtitle: `${clientAnalytics.new_this_month} new this month`,
    tone: 'cyan',
  },
  {
    title: 'Active Clients',
    value: clientAnalytics.active_clients,
    subtitle: 'Currently engaged',
    tone: 'emerald',
  },
  {
    title: 'Inactive Clients',
    value: clientAnalytics.inactive_clients,
    subtitle: 'Needs re-engagement',
    tone: 'rose',
  },
];


const iconByTitle: Record<string, ReactNode> = {
  'Total Projects': <FolderOpen size={24} />,
  'Active Projects': <FolderOpen size={24} />,
  'Completed Projects': <CheckSquare size={24} />,
  'Total Tasks': <BarChart3 size={24} />,
  'Completed Tasks': <TrendingUp size={24} />,
  'Pending Tasks': <AlertTriangle size={24} />,
  Employees: <Users size={24} />,
  'Completion Rate %': <TrendingUp size={24} />,
};

const normalizeMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Failed to load analytics';

const clientActivityData = (clientAnalytics: ClientAnalytics | null) => {
  if (!clientAnalytics) {
    return [];
  }

  return [
    { name: 'Active', value: clientAnalytics.active_clients, color: '#10b981' },
    { name: 'Inactive', value: clientAnalytics.inactive_clients, color: '#f43f5e' },
  ];
};

const ClientActivityDonut = ({ clientAnalytics }: { clientAnalytics: ClientAnalytics | null }) => {
  const data = clientActivityData(clientAnalytics);
  const total = clientAnalytics?.total_clients ?? 0;

  if (!clientAnalytics || total === 0) {
    return <EmptyState title="No client analytics yet" message="Client activity will appear here once the backend returns live data." />;
  }

  return (
    <div className="relative rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={5}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            wrapperClassName="rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg"
            contentStyle={{ border: 'none', background: 'transparent' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">{total}</p>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-4 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Active</span>
        <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Inactive</span>
      </div>
    </div>
  );
};

const ClientTopClientsList = ({ clientAnalytics }: { clientAnalytics: ClientAnalytics | null }) => {
  const topClients = (clientAnalytics?.top_clients ?? []).slice(0, 5);

  if (!clientAnalytics || clientAnalytics.total_clients === 0) {
    return <EmptyState title="No client analytics yet" message="Top client rankings will appear once live client data is available." />;
  }

  if (topClients.length === 0) {
    return <EmptyState title="No client rankings yet" message="The backend has not returned any ranked clients for this period." />;
  }

  return (
    <div className="space-y-3">
      {topClients.map((client, index) => (
        <div key={client.id} className="group flex items-center justify-between rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-50 to-cyan-100 text-sm font-semibold text-slate-800">
              {index + 1}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{client.name}</p>
              <p className="text-sm text-slate-500">{client.projects_count} projects</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">{client.completed_projects} completed</p>
            <p className="text-xs text-slate-500">Projects closed</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminAnalytics = () => {
  const [state, setState] = useState<AnalyticsState>({
    stats: null,
    workload: [],
    performance: null,
    clientAnalytics: null,
  });
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasDataRef = useRef(false);

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [stats, workload, performance, clientAnalytics] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getWorkload(),
        dashboardService.getPerformance(),
        dashboardService.getClientAnalytics(),
      ]);

      setState({ stats, workload, performance, clientAnalytics });
      setError(null);
      setLastUpdated(new Date());
      hasDataRef.current = true;
    } catch (err) {
      const message = normalizeMessage(err);

      if (hasDataRef.current) {
        toast.error(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnalytics(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadAnalytics]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadAnalytics(true);
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadAnalytics]);

  const refreshAnalytics = useCallback(() => {
    void loadAnalytics(true);
  }, [loadAnalytics]);

  const stats = state.stats;
  const workload = state.workload;
  const performance = state.performance;
  const clientAnalytics = state.clientAnalytics;

  const hasEmptyAnalytics = useMemo(() => {
    if (!stats || !performance) {
      return false;
    }

    return (
      stats.total_projects === 0 &&
      stats.total_tasks === 0 &&
      stats.total_employees === 0 &&
      workload.length === 0 &&
      performance.top_performers.length === 0
    );
  }, [performance, stats, workload.length]);

  const taskBreakdown = useMemo(() => {
    if (!stats) {
      return [];
    }

    const total = Math.max(stats.total_tasks, 1);

    return [
      { label: 'Completed', value: stats.completed_tasks, color: 'bg-emerald-500' },
      { label: 'In Progress', value: stats.in_progress_tasks, color: 'bg-blue-500' },
      { label: 'Pending', value: stats.pending_tasks, color: 'bg-amber-500' },
    ].map((item) => ({
      ...item,
      percent: Math.min((item.value / total) * 100, 100),
    }));
  }, [stats]);

  if (loading) {
    return (
      <PageContainer title="Analytics" description="Detailed insights and metrics about your business">
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SkeletonChart />
            <SkeletonProgress />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SkeletonTable />
            <SkeletonTable />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Analytics" description="Detailed insights and metrics about your business">
        <DataFetchError message={error} onRetry={refreshAnalytics} isRetrying={refreshing} />
      </PageContainer>
    );
  }

  if (!stats || !performance || !clientAnalytics) {
    return (
      <PageContainer title="Analytics" description="Detailed insights and metrics about your business">
        <EmptyState title="No analytics data yet" message="There is no analytics data to display at the moment." />
      </PageContainer>
    );
  }

  if (hasEmptyAnalytics) {
    return (
      <PageContainer title="Analytics" description="Detailed insights and metrics about your business">
        <EmptyState title="No analytics data yet" message="No projects, tasks, or employee activity are available yet." />
      </PageContainer>
    );
  }

  const cards = metricCards(stats);
  const projectProgress = stats.project_completion_rate;

  return (
    <PageContainer
      title="Analytics"
      description="Detailed insights and metrics about your business"
      action={
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="hidden text-sm text-slate-500 md:block">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          <Button variant="outline" size="sm" onClick={refreshAnalytics} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600">Client Insights</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Live client activity and rankings</h3>
              <p className="mt-1 text-sm text-slate-600">A focused view of client health, engagement, and project distribution.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {clientMetricCards(clientAnalytics).map((card) => (
              <KpiCard
                key={card.title}
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.title === 'Total Clients' ? <Users size={24} /> : card.title === 'Active Clients' ? <UserCheck size={24} /> : <UserMinus size={24} />}
                tone={card.tone}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Client Activity</h4>
                  <p className="text-sm text-slate-600">Active versus inactive clients.</p>
                </div>
                <Users size={20} className="text-slate-400" />
              </div>

              <ClientActivityDonut clientAnalytics={clientAnalytics} />

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-3 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{clientAnalytics.active_clients}</p>
                </div>
                <div className="rounded-2xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-3 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Inactive</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{clientAnalytics.inactive_clients}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">Top Clients</h4>
                  <p className="text-sm text-slate-600">The clients driving the most project activity.</p>
                </div>
                <Users size={20} className="text-slate-400" />
              </div>

              <ClientTopClientsList clientAnalytics={clientAnalytics} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Project Distribution</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{clientAnalytics.project_distribution.active}</p>
              <p className="text-sm text-slate-600">Active projects</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Project Distribution</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{clientAnalytics.project_distribution.completed}</p>
              <p className="text-sm text-slate-600">Completed projects</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 shadow-sm ring-1 ring-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Project Distribution</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{clientAnalytics.project_distribution.pending}</p>
              <p className="text-sm text-slate-600">Pending projects</p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 flex-1">
            {cards.map((card) => (
              <KpiCard
                key={card.title}
                title={card.title}
                value={card.title === 'Completion Rate %' ? `${card.value.toFixed(1)}%` : String(card.value)}
                subtitle={card.subtitle}
                icon={iconByTitle[card.title]}
                tone={card.tone}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <Button variant={period === 'weekly' ? 'primary' : 'outline'} size="sm" onClick={() => setPeriod('weekly')}>Weekly</Button>
            <Button variant={period === 'monthly' ? 'primary' : 'outline'} size="sm" onClick={() => setPeriod('monthly')}>Monthly</Button>
            <Button variant={period === 'yearly' ? 'primary' : 'outline'} size="sm" onClick={() => setPeriod('yearly')}>Yearly</Button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Project Progress</h3>
                <p className="text-sm text-slate-600">Derived from live project completion rate.</p>
              </div>
              <BarChart3 size={20} className="text-slate-400" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Overall completion</span>
                  <span className="font-semibold text-slate-900">{projectProgress.toFixed(1)}%</span>
                </div>
                <ProgressBar value={projectProgress} max={100} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active projects</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{stats.active_projects}</p>
                </div>
                <div className="rounded-xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Completed projects</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{stats.completed_projects}</p>
                </div>
                <div className="rounded-xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 ring-1 ring-slate-200">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total projects</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total_projects}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Task Status</h3>
                <p className="text-sm text-slate-600">Completed, in progress, and pending tasks.</p>
              </div>
              <CheckSquare size={20} className="text-slate-400" />
            </div>

            <div className="space-y-4">
              <div className="mb-2">
                <DonutStatus completed={stats.completed_tasks} inProgress={stats.in_progress_tasks} pending={stats.pending_tasks} />
              </div>
              {taskBreakdown.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-semibold text-slate-900">{numberFormatter.format(item.value)}</span>
                  </div>
                  <ProgressBar value={item.percent} max={100} className={item.color} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Employee Workload</h3>
                <p className="text-sm text-slate-600">Live workload distribution from the backend.</p>
              </div>
              <Users size={20} className="text-slate-400" />
            </div>

            {workload.length === 0 ? (
              <EmptyState title="No employee activity" message="No workload data has been reported yet." />
            ) : (
              <WorkloadBar items={workload} />
            )}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Top Performers</h3>
                <p className="text-sm text-slate-600">Employees with the most completed work.</p>
              </div>
              <TrendingUp size={20} className="text-slate-400" />
            </div>

            {performance.top_performers.length === 0 ? (
              <EmptyState title="No top performers yet" message="No performance data is available for this period." />
            ) : (
              <Leaderboard performers={performance.top_performers.map((p) => ({ id: p.id, name: p.name, completed_tasks: p.completed_tasks }))} />
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Performance Metrics</h3>
                <p className="text-sm text-slate-600">Weekly productivity, overdue tasks, and task completion.</p>
              </div>
              <TrendingUp size={20} className="text-slate-400" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Weekly productivity</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{performance.weekly_productivity.toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Average task completion</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{performance.average_task_completion.toFixed(1)}%</p>
              </div>
              <div className="rounded-2xl bg-linear-to-br from-slate-50 to-cyan-50/50 p-4 ring-1 ring-slate-200">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Overdue tasks</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{performance.overdue_tasks}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Real-time task distribution.</p>
              </div>
              <BarChart3 size={20} className="text-slate-400" />
            </div>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Completed</span>
                  <span className="font-semibold text-slate-900">{stats.completed_tasks}</span>
                </div>
                <ProgressBar value={stats.total_tasks > 0 ? (stats.completed_tasks / stats.total_tasks) * 100 : 0} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">In progress</span>
                  <span className="font-semibold text-slate-900">{stats.in_progress_tasks}</span>
                </div>
                <ProgressBar value={stats.total_tasks > 0 ? (stats.in_progress_tasks / stats.total_tasks) * 100 : 0} />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Pending</span>
                  <span className="font-semibold text-slate-900">{stats.pending_tasks}</span>
                </div>
                <ProgressBar value={stats.total_tasks > 0 ? (stats.pending_tasks / stats.total_tasks) * 100 : 0} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
};

export default AdminAnalytics;
