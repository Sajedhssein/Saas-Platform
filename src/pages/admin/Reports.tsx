import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, FileText, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Button,
  DataFetchError,
  EmptyState,
  GenerateReportModal,
  EmailReportModal,
  Modal,
  PageContainer,
  ReportHistoryTable,
  SkeletonCard,
} from '../../components/ui';
import { enterpriseReportService } from '../../services/enterpriseReportService';
import { reportService } from '../../services/reportService';
import type {
  GenerateReportPayload,
  ReportRecord,
  ReportResponse,
} from '../../types/report';


type LegacyPeriod = 'weekly' | 'monthly' | 'custom';

const reportTypeLabels: Record<LegacyPeriod, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
};

const openBlobInNewTab = (blob: Blob, filename: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const newTab = window.open(objectUrl, '_blank', 'noopener,noreferrer');

  if (!newTab) {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  }

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const AdminReports = () => {
  const [legacyPeriod, setLegacyPeriod] = useState<LegacyPeriod>('weekly');
  const [legacyStartDate, setLegacyStartDate] = useState('');
  const [legacyEndDate, setLegacyEndDate] = useState('');
  const [legacyReport, setLegacyReport] = useState<ReportResponse | null>(null);
  const [legacyLoading, setLegacyLoading] = useState(true);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [legacyRetryToken, setLegacyRetryToken] = useState(0);

  const [historyReports, setHistoryReports] = useState<ReportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyRetryToken, setHistoryRetryToken] = useState(0);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateSubmitting, setGenerateSubmitting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailTarget, setEmailTarget] = useState<ReportRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportRecord | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchLegacyReport = async () => {
      try {
        if (legacyPeriod === 'custom' && (!legacyStartDate || !legacyEndDate)) {
          setLegacyReport(null);
          setLegacyError(null);
          return;
        }

        setLegacyLoading(true);
        setLegacyError(null);

        const response =
          legacyPeriod === 'weekly'
            ? await reportService.getWeeklyReport()
            : legacyPeriod === 'monthly'
              ? await reportService.getMonthlyReport()
              : await reportService.getCustomReport(legacyStartDate, legacyEndDate);

        if (!cancelled) {
          setLegacyReport(response);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setLegacyReport(null);
          setLegacyError(fetchError instanceof Error ? fetchError.message : 'Failed to load report snapshot');
        }
      } finally {
        if (!cancelled) {
          setLegacyLoading(false);
        }
      }
    };

    void fetchLegacyReport();

    return () => {
      cancelled = true;
    };
  }, [legacyEndDate, legacyPeriod, legacyRetryToken, legacyStartDate]);

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        setHistoryError(null);
        const reports = await enterpriseReportService.getReports();
        if (!cancelled) {
          setHistoryReports(reports);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setHistoryReports([]);
          setHistoryError(fetchError instanceof Error ? fetchError.message : 'Failed to load report history');
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [historyRetryToken]);

  const refreshHistory = () => setHistoryRetryToken((current) => current + 1);
  const refreshLegacy = () => setLegacyRetryToken((current) => current + 1);

  const handleGenerateReport = async (payload: GenerateReportPayload) => {
    setGenerateSubmitting(true);

    try {
      const created = await enterpriseReportService.generateReport(payload);

      if (!created) {
        throw new Error('Report generation failed');
      }

      let finalReport = created;
      let emailSent = false;

      if (payload.recipient_email) {
        try {
          const emailed = await enterpriseReportService.emailReport(created.id, payload.recipient_email);
          finalReport = emailed ?? finalReport;
          emailSent = true;
        } catch (emailError) {
          toast.error(emailError instanceof Error ? emailError.message : 'Report generated, but emailing failed');
        }
      }

      setHistoryReports((current) => [finalReport, ...current.filter((item) => item.id !== finalReport.id)]);
      setGenerateOpen(false);
      setBusyReportId(null);
      refreshHistory();
      toast.success('Report generated');
      if (emailSent) {
        toast.success('Report emailed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGenerateSubmitting(false);
    }
  };

  const handleViewReport = async (report: ReportRecord) => {
    setBusyReportId(report.id);

    try {
      if (report.format === 'pdf') {
        const result = await enterpriseReportService.viewReport(report.id);
        openBlobInNewTab(result.blob, result.filename);
        toast.success('Report opened');
        return;
      }

      const result = await enterpriseReportService.downloadReport(report.id);
      triggerBrowserDownload(result.blob, result.filename);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open report');
    } finally {
      setBusyReportId(null);
    }
  };

  const handleDownloadReport = async (report: ReportRecord) => {
    setBusyReportId(report.id);

    try {
      const result = await enterpriseReportService.downloadReport(report.id);
      triggerBrowserDownload(result.blob, result.filename);
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download report');
    } finally {
      setBusyReportId(null);
    }
  };

  const handleOpenEmailModal = (report: ReportRecord) => {
    setEmailTarget(report);
    setEmailOpen(true);
  };

  const handleEmailReport = async (email: string) => {
    if (!emailTarget) {
      return;
    }

    setEmailSubmitting(true);
    setBusyReportId(emailTarget.id);

    try {
      const updated = await enterpriseReportService.emailReport(emailTarget.id, email);
      if (updated) {
        setHistoryReports((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      }
      setEmailOpen(false);
      setEmailTarget(null);
      toast.success('Report emailed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to email report');
    } finally {
      setBusyReportId(null);
      setEmailSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    const previousReports = historyReports;
    setBusyReportId(deleteTarget.id);
    setHistoryReports((current) => current.filter((item) => item.id !== deleteTarget.id));

    try {
      await enterpriseReportService.deleteReport(deleteTarget.id);
      setDeleteTarget(null);
      refreshHistory();
      toast.success('Report deleted');
    } catch (error) {
      setHistoryReports(previousReports);
      toast.error(error instanceof Error ? error.message : 'Failed to delete report');
    } finally {
      setBusyReportId(null);
    }
  };

  const legacyLoadingState = legacyLoading && !legacyReport;
  const legacyEmptyState = legacyReport == null && !legacyLoading && !legacyError;
  const legacyActiveEmployees = legacyReport?.employees?.active_this_week ?? legacyReport?.employees?.active_this_period ?? 0;
  const legacyTopPerformers = legacyReport?.employees?.top_performers ?? [];
  const legacyPeriodLabel = legacyReport?.period ?? legacyPeriod;
  const canGenerateCustomLegacy = legacyPeriod === 'custom' ? Boolean(legacyStartDate && legacyEndDate) : true;

  return (
    <PageContainer
      title="Reports"
      description="Enterprise reporting center"
      action={
        <Button variant="primary" size="lg" className="gap-2" onClick={() => setGenerateOpen(true)}>
          <FileText size={18} />
          Generate Report
        </Button>
      }
    >
      <div className="space-y-8">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Legacy analytics snapshot</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Weekly, monthly, and custom reporting</h2>
              <p className="mt-1 text-sm text-slate-600">Keep the existing reporting views while the enterprise history center lives below.</p>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
                {(['weekly', 'monthly', 'custom'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLegacyPeriod(item)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${legacyPeriod === item ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {reportTypeLabels[item]}
                  </button>
                ))}
              </div>

              {legacyPeriod === 'custom' && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={legacyStartDate}
                    onChange={(event) => setLegacyStartDate(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                  <input
                    type="date"
                    value={legacyEndDate}
                    onChange={(event) => setLegacyEndDate(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                  <Button variant="outline" size="sm" onClick={refreshLegacy} disabled={!canGenerateCustomLegacy}>
                    <RefreshCw size={14} />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          </div>

          {legacyError ? (
            <DataFetchError message={legacyError} onRetry={refreshLegacy} />
          ) : legacyLoadingState ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          ) : legacyEmptyState ? (
            <EmptyState title="No analytics available" message={legacyPeriod === 'custom' ? 'Select a date range to load custom report data.' : 'No analytics available'} />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">Projects</p>
                    <BarChart3 size={18} className="text-slate-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{legacyReport?.projects?.total ?? 0}</p>
                      <p className="text-slate-500">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{legacyReport?.projects?.active ?? 0}</p>
                      <p className="text-slate-500">Active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-700">{legacyReport?.projects?.completed ?? 0}</p>
                      <p className="text-slate-500">Completed</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2 xl:col-span-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">Tasks</p>
                    <CalendarDays size={18} className="text-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center text-sm md:grid-cols-3 xl:grid-cols-6">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{legacyReport?.tasks?.total ?? 0}</p>
                      <p className="text-slate-500">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-700">{legacyReport?.tasks?.completed ?? 0}</p>
                      <p className="text-slate-500">Completed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{legacyReport?.tasks?.in_progress ?? 0}</p>
                      <p className="text-slate-500">In Progress</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{legacyReport?.tasks?.pending ?? 0}</p>
                      <p className="text-slate-500">Pending</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-rose-700">{legacyReport?.tasks?.overdue ?? 0}</p>
                      <p className="text-slate-500">Overdue</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{legacyReport?.tasks?.completion_rate ?? 0}%</p>
                      <p className="text-slate-500">Completion</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">Employees</p>
                    <CalendarDays size={18} className="text-slate-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center text-sm">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{legacyReport?.employees?.total ?? 0}</p>
                      <p className="text-slate-500">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{legacyActiveEmployees}</p>
                      <p className="text-slate-500">Active this period</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:col-span-2 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">Performance</p>
                    <CalendarDays size={18} className="text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-slate-900">{legacyReport?.performance?.average_project_progress ?? 0}%</p>
                    <p className="mt-1 text-sm text-slate-500">Average project progress</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Top Performers</h3>
                  {legacyTopPerformers.length === 0 ? (
                    <EmptyState title="No top performers yet" message="No top performers available for this period." />
                  ) : (
                    <div className="space-y-3">
                      {legacyTopPerformers.map((performer) => (
                        <div key={performer.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                          <div>
                            <p className="font-medium text-slate-900">{performer.name}</p>
                            <p className="text-sm text-slate-500">Completed tasks</p>
                          </div>
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-900">
                            {performer.completed_tasks}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Report Summary</h3>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 capitalize shadow-sm">
                      {legacyPeriodLabel}
                    </span>
                  </div>
                  <div className="space-y-3 text-sm text-slate-700">
                    <p><strong>Projects:</strong> {legacyReport?.projects?.completed ?? 0} completed of {legacyReport?.projects?.total ?? 0}</p>
                    <p><strong>Tasks:</strong> {legacyReport?.tasks?.completed ?? 0} completed, {legacyReport?.tasks?.overdue ?? 0} overdue</p>
                    <p><strong>Employees active:</strong> {legacyActiveEmployees}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Report History</h2>
              <p className="text-sm text-slate-600">Generated reports, downloads, and email actions.</p>
            </div>
            <Button variant="outline" size="sm" onClick={refreshHistory} disabled={historyLoading}>
              <RefreshCw size={14} className={historyLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          {historyError ? (
            <DataFetchError message={historyError} onRetry={refreshHistory} />
          ) : (
            <ReportHistoryTable
              reports={historyReports}
              loading={historyLoading}
              busyReportId={busyReportId}
              onView={(report) => void handleViewReport(report)}
              onDownload={(report) => void handleDownloadReport(report)}
              onEmail={handleOpenEmailModal}
              onDelete={(report) => setDeleteTarget(report)}
            />
          )}
        </section>
      </div>

      <GenerateReportModal
        key={generateOpen ? 'generate-report-open' : 'generate-report-closed'}
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSubmit={handleGenerateReport}
        submitting={generateSubmitting}
      />

      <EmailReportModal
        key={emailTarget ? `email-report-${emailTarget.id}` : 'email-report-empty'}
        open={emailOpen}
        onClose={() => {
          setEmailOpen(false);
          setEmailTarget(null);
        }}
        onSubmit={handleEmailReport}
        reportTitle={emailTarget?.title}
        submitting={emailSubmitting}
      />

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Report" panelClassName="max-w-xl">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleConfirmDelete()} isLoading={busyReportId === deleteTarget?.id}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default AdminReports;
