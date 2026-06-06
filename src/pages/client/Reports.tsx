import api from '../../api/axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartNoAxesCombined, FolderOpen, CheckSquare, TimerReset } from 'lucide-react';
import { Button, DashboardCard, DataFetchError, EmptyState, LoadingSpinner, PageContainer, StatusBadge } from '../../components/ui';
import { clientReportService } from '../../services';
import type { ReportRecord } from '../../types/report';

type ReportBadgeStatus = 'pending' | 'in-progress' | 'in_progress' | 'completed' | 'on-hold' | 'active' | 'inactive' | 'low' | 'medium' | 'high';

const resolveReportUrl = (filePath: string | null): string | null => {
  if (!filePath) {
    return null;
  }

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const baseURL = api.defaults.baseURL?.replace(/\/+$/, '') ?? '';
  if (!baseURL) {
    return filePath;
  }

  return filePath.startsWith('/') ? `${baseURL}${filePath}` : `${baseURL}/${filePath}`;
};

const normalizeReportStatus = (status?: string | null): ReportBadgeStatus => {
  if (!status) {
    return 'pending';
  }

  const normalized = status.toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');

  switch (normalized) {
    case 'pending':
    case 'queued':
      return 'pending';
    case 'in-progress':
    case 'in_progress':
    case 'processing':
      return 'in-progress';
    case 'completed':
    case 'sent':
    case 'ready':
      return 'completed';
    case 'failed':
      return 'inactive';
    case 'on-hold':
      return 'on-hold';
    case 'active':
      return 'active';
    case 'inactive':
      return 'inactive';
    case 'low':
      return 'low';
    case 'medium':
      return 'medium';
    case 'high':
      return 'high';
    case 'in progress':
      return 'in-progress';
    case 'on hold':
      return 'on-hold';
    default:
      return 'pending';
  }
};

export const ClientReports = () => {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const clientReports = await clientReportService.getReports();

        if (!cancelled) {
          setReports(clientReports);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load reports');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <PageContainer title="Reports" description="Review your project summaries and delivery trends">
        <div className="p-8">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Reports" description="Review your project summaries and delivery trends">
        <DataFetchError message={error} onRetry={() => window.location.reload()} />
      </PageContainer>
    );
  }

  if (reports.length === 0) {
    return (
      <PageContainer title="Reports" description="Review your project summaries and delivery trends">
        <EmptyState title="No reports available" message="Reports shared with your account will appear here once available." />
      </PageContainer>
    );
  }

  const normalizedReports = reports.map((report) => ({
    ...report,
    normalizedStatus: normalizeReportStatus(report.status),
  }));

  const completedCount = normalizedReports.filter((report) => report.normalizedStatus === 'completed').length;
  const pendingCount = normalizedReports.filter((report) => report.normalizedStatus !== 'completed').length;
  const latestReport = normalizedReports[0];

  return (
    <PageContainer title="Reports" description="Review your project summaries and delivery trends">
      <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] mb-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Client reports</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Browse your latest project summaries, delivery status, and quick actions.</p>
          </div>
          <div className="inline-flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
              <FolderOpen size={14} className="text-cyan-600" />
              {reports.length} reports
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
        <DashboardCard title="Total Reports" value={reports.length} icon={<FolderOpen size={18} />} />
        <DashboardCard title="Completed" value={completedCount} icon={<CheckSquare size={18} />} />
        <DashboardCard title="Pending" value={pendingCount} icon={<ChartNoAxesCombined size={18} />} />
        <DashboardCard title="Latest" value={latestReport?.title ?? '—'} icon={<TimerReset size={18} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {normalizedReports.map((report) => (
          <div
            key={report.id}
            className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{report.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{report.project_name ?? report.report_type}</p>
              </div>
              <StatusBadge status={report.normalizedStatus} />
            </div>

            <div className="mt-5 grid gap-2 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-medium text-slate-900">Generated</span>
                <span>{report.generated_at ? new Date(report.generated_at).toLocaleDateString() : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="font-medium text-slate-900">Project</span>
                <span>{report.project_name ?? 'Unknown Project'}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link to={`/client/reports/${report.id}`} className="w-full sm:w-auto">
                <Button variant="primary" className="w-full sm:w-auto">
                  View Report
                </Button>
              </Link>
              <a
                href={resolveReportUrl(report.file_path) ?? undefined}
                download
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto"
              >
                <Button variant="outline" className="w-full sm:w-auto" disabled={!report.file_path}>
                  Download Report
                </Button>
              </a>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};

export default ClientReports;
