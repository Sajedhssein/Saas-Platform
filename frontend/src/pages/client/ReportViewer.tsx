import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, FileText, LayoutDashboard } from 'lucide-react';
import api from '../../api/axios';
import { Button, DataFetchError, EmptyState, LoadingSpinner, PageContainer, ProgressBar, StatusBadge } from '../../components/ui';
import { clientReportService } from '../../services';
import type { ReportRecord } from '../../types/report';

type ReportBadgeStatus = 'pending' | 'in-progress' | 'in_progress' | 'completed' | 'on-hold' | 'active' | 'inactive' | 'low' | 'medium' | 'high';

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

export const ReportViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      if (!id) {
        setError('Report ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const fetchedReport = await clientReportService.getReportById(id);

        if (!cancelled) {
          setReport(fetchedReport);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load report');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <PageContainer title="Report Preview" description="Review the selected client report details." titleClassName="text-black">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={() => navigate('/client/reports')}>
          <ArrowLeft size={18} /> Back to reports
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
          <DataFetchError message={error} onRetry={() => window.location.reload()} />
        </div>
      ) : report ? (
        <div className="space-y-8">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  <FileText size={14} /> Report details
                </div>
                <h1 className="mt-4 text-3xl font-semibold text-slate-900">{report.title}</h1>
                <p className="mt-2 text-sm text-slate-600">{report.project_name ?? report.report_type}</p>
              </div>

              <div className="grid gap-3 sm:items-end">
                <StatusBadge status={normalizeReportStatus(report.status)} />
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock3 size={16} />
                    <span>{report.generated_at ? new Date(report.generated_at).toLocaleDateString() : 'No generation date'}</span>
                  </div>
                </div>
                {report.generated_by ? (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard size={16} />
                      <span>{report.generated_by}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.65fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Summary</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {report.summary ?? 'A detailed summary is not available for this report.'}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Project progress</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Completion</span>
                    <span>{report.progress != null ? `${report.progress}%` : 'N/A'}</span>
                  </div>
                  <ProgressBar value={report.progress ?? 0} />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Task statistics</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(report.task_statistics ?? {}).length === 0 ? (
                    <p className="text-sm text-slate-600">Task statistics are not available.</p>
                  ) : (
                    Object.entries(report.task_statistics ?? {}).map(([key, value]) => (
                      <div key={key} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{key.replace(/_/g, ' ')}</p>
                        <p className="mt-2 text-xl font-semibold text-slate-900">{value ?? 0}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Recommendations</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {report.recommendations ?? 'No recommendations have been provided for this report.'}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-900">Notes</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {report.notes ?? 'No additional notes were included.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
          <EmptyState title="Report not found" message="We could not locate this report. Please return to the reports list." />
        </div>
      )}
    </PageContainer>
  );
};

export default ReportViewer;
