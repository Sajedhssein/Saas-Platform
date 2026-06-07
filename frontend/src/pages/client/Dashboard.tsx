import { useEffect, useMemo, useState } from 'react';
import { FolderOpen, CheckSquare, TrendingUp, BarChart3, Files, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ActivityTimeline, DashboardCard, DataFetchError, EmptyState, LoadingSpinner, PageContainer, ProgressBar, QuickActions, StatusBadge } from '../../components/ui';
import { clientDashboardService, clientProjectService } from '../../services';
import type { Project } from '../../types/project';
import type { ClientDashboardPayload } from '../../services/clientDashboardService';

type ReportBadgeStatus = 'pending' | 'in-progress' | 'in_progress' | 'completed' | 'on-hold' | 'active' | 'inactive' | 'low' | 'medium' | 'high';

const normalizeReportStatus = (status?: string | null): ReportBadgeStatus => {
  if (!status) {
    return 'pending';
  }

  const normalized = status.toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');

  switch (normalized) {
    case 'pending':
    case 'in-progress':
    case 'in_progress':
    case 'completed':
    case 'on-hold':
    case 'active':
    case 'inactive':
    case 'low':
    case 'medium':
    case 'high':
      return normalized as ReportBadgeStatus;
    case 'in progress':
      return 'in-progress';
    case 'on hold':
      return 'on-hold';
    default:
      return 'pending';
  }
};

export const ClientDashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<ClientDashboardPayload | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashboardResponse, projectResponse] = await Promise.all([
          clientDashboardService.getDashboard(),
          clientProjectService.getProjects({ per_page: 6 }),
        ]);

        if (!cancelled) {
          setDashboard(dashboardResponse);
          setProjects(projectResponse.data ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data');
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
  }, []);

  const summaryCards = useMemo(
    () => [
      { title: 'Visible Projects', value: dashboard?.projects_count ?? 0, icon: <FolderOpen size={24} /> },
      { title: 'Active Projects', value: dashboard?.active_projects ?? 0, icon: <TrendingUp size={24} /> },
      { title: 'Completed Projects', value: dashboard?.completed_projects ?? 0, icon: <CheckSquare size={24} /> },
      { title: 'Reports', value: dashboard?.reports_count ?? 0, icon: <BarChart3 size={24} /> },
    ],
    [dashboard]
  );

  if (loading) {
    return (
      <PageContainer title="Dashboard" description="Welcome! Here's your overview." titleClassName="text-black">
        <div className="p-8">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Dashboard" description="Welcome! Here's your overview." titleClassName="text-black">
        <DataFetchError message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  if (!dashboard) {
    return (
      <PageContainer title="Dashboard" description="Welcome! Here's your overview." titleClassName="text-black">
        <EmptyState title="No dashboard data" message="Unable to load your dashboard summary." />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" description="Welcome! Here's your overview." titleClassName="text-black">
      <QuickActions
        actions={[
          { label: 'Projects', description: 'View active and completed project work.', icon: <FolderOpen size={18} />, onClick: () => navigate('/client/projects') },
          { label: 'Reports', description: 'Open shared reports and summaries.', icon: <BarChart3 size={18} />, onClick: () => navigate('/client/reports') },
          { label: 'Files', description: 'Browse files shared with your projects.', icon: <Files size={18} />, onClick: () => navigate('/client/files') },
          { label: 'Contact Team', description: 'Use notifications for team updates.', icon: <MessageCircle size={18} />, onClick: () => navigate('/client/notifications') },
        ]}
      />
      <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] mb-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Client overview</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">Your active projects and reports</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A clean client dashboard experience with project status, recent reports, and quick access to the work that matters most.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <FolderOpen size={14} className="text-cyan-600" />
              {dashboard.projects_count} projects
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <BarChart3 size={14} className="text-slate-600" />
              {dashboard.reports_count} reports
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {summaryCards.map((card) => (
          <DashboardCard key={card.title} title={card.title} value={card.value} icon={card.icon} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Projects</h2>
                <p className="mt-1 text-sm text-slate-600">Your most recent client-facing projects.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {projects.length === 0 ? (
                <EmptyState title="No projects yet" message="Projects shared with your account will appear here." />
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{project.name}</h3>
                        <p className="mt-1 text-sm text-slate-600">{project.description || 'No project description provided.'}</p>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    <div className="mt-4 space-y-3">
                      <ProgressBar value={project.progress} />
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{project.client?.name ?? 'Client project'}</span>
                        <span>{project.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Reports</h2>
                <p className="mt-1 text-sm text-slate-600">Latest work summaries shared for your account.</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {dashboard.recent_reports.length === 0 ? (
                <EmptyState title="No recent reports" message="New client reports will appear here when available." />
              ) : (
                dashboard.recent_reports.map((reportItem) => (
                  <div key={reportItem.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{reportItem.title}</h3>
                        <p className="text-xs text-slate-500">{reportItem.report_type}</p>
                      </div>
                      <StatusBadge status={normalizeReportStatus(reportItem.status)} />
                    </div>
                    <p className="mt-3 text-sm text-slate-600">Generated {reportItem.generated_at ? new Date(reportItem.generated_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <ActivityTimeline
          title="Recent Updates"
          subtitle="Client-visible project, report, and file activity."
          activities={dashboard.recent_updates ?? []}
          emptyMessage="Project updates, shared files, and reports will appear here."
        />
      </div>
    </PageContainer>
  );
};

export default ClientDashboard;
