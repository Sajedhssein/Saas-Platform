import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Bell, Users, FolderOpen, CheckSquare, TrendingUp, MailPlus, FileBarChart, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityLogPanel, PageContainer, QuickActions } from '../../components/ui';
import { DashboardSkeleton } from '../../components/ui/SkeletonLoader';
import { DataFetchError, EmptyState } from '../../components/ui/DataFetchError';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardStats, WorkloadEmployee, PerformanceData } from '../../types/dashboard';
import { KpiCard, LineTrend, DonutStatus, WorkloadBar, Leaderboard, ProjectProgressList } from '../../components/ui/AnalyticsUI';
import useNotificationStore from '../../store/notificationStore';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workload, setWorkload] = useState<WorkloadEmployee[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const hasLoadedNotifications = useNotificationStore((state) => state.hasLoaded);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const fetchDashboardData = async () => {
  try {
    setLoading(true);
    setError(null);

    const [statsData, workloadData, performanceData] = await Promise.all([
      dashboardService.getStats(),
      dashboardService.getWorkload(),
      dashboardService.getPerformance(),
    ]);

    setStats(statsData);
    setWorkload(workloadData);
    setPerformance(performanceData);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
  };

  const hasFetched = useRef(false);

    useEffect(() => {
    if (hasFetched.current && retryCount === 0) return;

    hasFetched.current = true;
    fetchDashboardData();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  if (error) {
    return (
      <PageContainer
        title="Dashboard"
        description="Welcome back! Here's your business overview."
        titleClassName="text-black"
      >
        <DataFetchError message={error} onRetry={handleRetry} />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer
        title="Dashboard"
        description="Welcome back! Here's your business overview."
        titleClassName="text-black"
      >
        <DashboardSkeleton />
      </PageContainer>
    );
  }

  if (!stats) {
    return (
      <PageContainer
        title="Dashboard"
        description="Welcome back! Here's your business overview."
        titleClassName="text-black"
      >
        <EmptyState
          title="No dashboard data available"
          message="Unable to load dashboard statistics."
        />
      </PageContainer>
    );
  }

  // KPI values
  const statCards: Array<{ title: string; value: string; subtitle: string; icon: ReactNode; tone: 'cyan' | 'amber' | 'emerald' | 'rose' }> = [
    {
      title: 'Active Projects',
      value: String(stats.activeProjects ?? stats.active_projects ?? 0),
      subtitle: 'Currently in progress',
      icon: <FolderOpen size={20} />,
      tone: 'cyan',
    },
    {
      title: 'Total Tasks',
      value: String(stats.totalTasks ?? stats.total_tasks ?? 0),
      subtitle: 'All tasks',
      icon: <CheckSquare size={20} />,
      tone: 'amber',
    },
    {
      title: 'Employees',
      value: String(stats.totalEmployees ?? stats.total_employees ?? 0),
      subtitle: 'Active users',
      icon: <Users size={20} />,
      tone: 'emerald',
    },
    {
      title: 'Overdue Tasks',
      value: String(stats.delayedTasks ?? 0),
      subtitle: 'Needs attention',
      icon: <TrendingUp size={20} />,
      tone: 'rose',
    },
  ];

  return (
    <PageContainer
      title="Dashboard"
      description="Welcome back! Here's your business overview."
    >
      <QuickActions
        actions={[
          { label: 'Create Project', description: 'Start a new client or internal project.', icon: <FolderOpen size={18} />, onClick: () => navigate('/admin/projects') },
          { label: 'Invite Employee', description: 'Send an invite to a new teammate.', icon: <MailPlus size={18} />, onClick: () => navigate('/admin/invites') },
          { label: 'Add Client', description: 'Create a client profile for your workspace.', icon: <UserPlus size={18} />, onClick: () => navigate('/admin/clients') },
          { label: 'Generate Report', description: 'Create and share an enterprise report.', icon: <FileBarChart size={18} />, onClick: () => navigate('/admin/reports') },
        ]}
      />
      <div className="mb-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-cyan-50 via-white to-slate-100 px-5 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-xl ${unreadCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Bell size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {hasLoadedNotifications
                  ? unreadCount > 0
                    ? `Notifications (${unreadCount > 9 ? '9+' : unreadCount})`
                    : 'Notifications'
                  : 'Notifications'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {hasLoadedNotifications
                  ? unreadCount > 0
                    ? 'You have unread notifications'
                    : 'No new notifications'
                  : 'Checking notification status...'}
              </p>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${unreadCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <span className={`h-2 w-2 rounded-full ${unreadCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            {hasLoadedNotifications ? (unreadCount > 0 ? 'Unread' : 'Up to date') : 'Loading'}
          </div>
        </div>
      </div>

      <div className="mb-8 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Enterprise overview
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Operations at a glance</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              A modern, data-focused summary of projects, people, workload, and performance across the admin workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <FolderOpen size={14} className="text-cyan-600" />
              Project health
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <Users size={14} className="text-emerald-600" />
              Team capacity
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <TrendingUp size={14} className="text-amber-500" />
              Performance trends
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <KpiCard key={card.title} title={card.title} value={card.value} subtitle={card.subtitle} icon={card.icon} tone={card.tone} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Weekly Productivity</h3>
          {stats.weeklyProductivity.length === 0 ? (
            <EmptyState title="No productivity data yet" message="No completed tasks have been reported for this week." />
          ) : (
            <LineTrend data={stats.weeklyProductivity as unknown as Record<string, unknown>[]} xKey="day" dataKey="completed" height={280} />
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Task Status</h3>
          <DonutStatus
            completed={stats.completedTasks ?? stats.completed_tasks ?? 0}
            inProgress={stats.inProgressTasks ?? stats.in_progress_tasks ?? 0}
            pending={stats.pendingTasks ?? stats.pending_tasks ?? 0}
          />
        </div>
      </div>

      {/* Workload and Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Employee Performance</h3>
          <Leaderboard performers={((performance?.top_performers ?? performance?.topPerformers ?? []) as unknown[]).map((p) => {
            const rec = p as Record<string, unknown>;
            return {
              id: String(rec.id ?? rec.employee_id ?? ''),
              name: String(rec.name ?? rec.employee_name ?? 'Unknown'),
              completed_tasks: Number(rec.completed_tasks ?? rec.completedTasks ?? 0),
            };
          })} />
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Workload</h3>
          <WorkloadBar items={workload as WorkloadEmployee[]} />
        </div>
      </div>

      {/* Project Progress Overview */}
      <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white to-cyan-50/50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Project Progress Overview</h3>
        <ProjectProgressList projects={stats.projectProgress ?? stats.project_progress ?? []} />
      </div>

      <div className="mt-8">
        <ActivityLogPanel initialActivities={stats.recentActivity ?? stats.recent_activity ?? []} />
      </div>
    </PageContainer>
  );
};
