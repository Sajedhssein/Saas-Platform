import { Download, Eye, Mail, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './DataFetchError';
import type { ReportFormat, ReportRecord, ReportType } from '../../types/report';

interface ReportHistoryTableProps {
  reports: ReportRecord[];
  loading?: boolean;
  busyReportId?: string | null;
  onView: (report: ReportRecord) => void;
  onDownload: (report: ReportRecord) => void;
  onEmail: (report: ReportRecord) => void;
  onDelete: (report: ReportRecord) => void;
}

const formatTypeLabel = (reportType: ReportType): string => {
  switch (reportType) {
    case 'company':
      return 'Company';
    case 'project':
      return 'Project';
    case 'employee':
      return 'Employee';
    case 'client':
      return 'Client';
    default:
      return reportType;
  }
};

const formatFormatLabel = (format: ReportFormat): string => {
  switch (format) {
    case 'pdf':
      return 'PDF';
    case 'xlsx':
      return 'Excel';
    case 'csv':
      return 'CSV';
    default:
      return format;
  }
};

const getStatusStyles = (status: string): string => {
  const normalized = status.toLowerCase();

  if (normalized.includes('fail')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  if (normalized.includes('send')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (normalized.includes('process') || normalized.includes('queue') || normalized.includes('generat')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
};

export const ReportHistoryTable = ({
  reports,
  loading = false,
  busyReportId = null,
  onView,
  onDownload,
  onEmail,
  onDelete,
}: ReportHistoryTableProps) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-4">
                <div className="h-4 flex-1 rounded bg-slate-200" />
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="h-4 w-20 rounded bg-slate-200" />
                <div className="h-4 w-20 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return <EmptyState title="No reports generated yet" message="No reports generated yet" />;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="text-lg font-semibold text-slate-900">Report History</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-275 w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Format</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Generated At</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {reports.map((report) => {
              const isBusy = busyReportId === report.id;

              return (
                <tr key={report.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4">
                    <div className="max-w-70">
                      <p className="font-medium text-slate-900 truncate">{report.title}</p>
                      <p className="text-xs text-slate-500 truncate">ID: {report.id}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{formatTypeLabel(report.report_type)}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 uppercase">{formatFormatLabel(report.format)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusStyles(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{report.recipient_email ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(report.generated_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => onView(report)} disabled={isBusy}>
                        <Eye size={14} />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDownload(report)} disabled={isBusy}>
                        <Download size={14} />
                        Download
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onEmail(report)} disabled={isBusy}>
                        <Mail size={14} />
                        Email
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onDelete(report)} disabled={isBusy}>
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportHistoryTable;
