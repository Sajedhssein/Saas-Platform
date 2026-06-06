import api from '../api/axios';
import { makeError } from '../utils/error';
import type { AxiosError } from 'axios';
import type { ReportRecord } from '../types/report';

interface ClientReportsResponse {
    data?: unknown;
    pagination?: {
        total: number;
        per_page: number;
        current_page: number;
        last_page: number;
    };
}

const normalizeReportRecord = (payload: unknown, index: number): ReportRecord => {
    if (typeof payload !== 'object' || payload === null) {
        return {
            id: `report-${index}`,
            title: 'Untitled Report',
            report_type: 'company',
            format: 'pdf',
            status: 'completed',
            recipient_email: '',
            generated_at: null,
            sent_at: null,
            file_path: null,
            project_name: null,
        };
    }

    const record = payload as Record<string, unknown>;
    const projectName = String(record.project_name ?? (typeof record.project === 'object' && record.project !== null ? (record.project as Record<string, unknown>).name ?? '' : '') ?? '');

    return {
        id: String(record.id ?? `report-${index}`),
        title: String(record.title ?? 'Untitled Report'),
        report_type: String(record.report_type ?? 'company') as ReportRecord['report_type'],
        format: String(record.format ?? 'pdf') as ReportRecord['format'],
        status: String(record.status ?? 'completed') as ReportRecord['status'],
        recipient_email: String(record.recipient_email ?? ''),
        generated_at: record.generated_at == null ? null : String(record.generated_at),
        sent_at: record.sent_at == null ? null : String(record.sent_at),
        file_path: record.file_path == null ? null : String(record.file_path),
        project_name: projectName || null,
        project_id: record.project_id == null ? undefined : String(record.project_id),
        employee_id: record.employee_id == null ? undefined : String(record.employee_id),
        client_id: record.client_id == null ? undefined : String(record.client_id),
        start_date: record.start_date == null ? undefined : String(record.start_date),
        end_date: record.end_date == null ? undefined : String(record.end_date),
        summary: record.summary == null ? null : String(record.summary),
        progress: record.progress == null ? null : Number(record.progress),
        task_statistics: typeof record.task_statistics === 'object' && record.task_statistics !== null ? (record.task_statistics as Record<string, unknown>) : null,
        notes: record.notes == null ? null : String(record.notes),
        recommendations: record.recommendations == null ? null : String(record.recommendations),
        generated_by: record.generated_by == null ? null : String(record.generated_by),
    };
};

const getReportErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<unknown>;
    const responseData = axiosError.response?.data;

    if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
        const message = (responseData as { message?: string }).message;
        if (message) {
            return message;
        }
    }

    return axiosError.message || fallback;
};

const getReportRequestUrl = (id: string) => `/client/reports/${encodeURIComponent(id)}`;

export const clientReportService = {
    getReports: async (): Promise<ReportRecord[]> => {
        const requestUrl = '/client/reports';

        if (import.meta.env.DEV) {
            console.debug('[clientReportService.getReports] Requesting', requestUrl);
        }

        try {
            const response = await api.get<ClientReportsResponse>(requestUrl);
            const payload = response.data;
            const rawItems = Array.isArray(payload.data) ? payload.data : [];

            const reports = rawItems.map((item, index) => normalizeReportRecord(item, index));

            if (import.meta.env.DEV) {
                console.debug('[clientReportService.getReports] Response', response.status, { count: reports.length });
            }

            return reports;
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.debug('[clientReportService.getReports] Error', error);
            }
            throw makeError(getReportErrorMessage(error, 'Failed to fetch client reports'), error);
        }
    },

    getReportById: async (id: string): Promise<ReportRecord> => {
        const requestUrl = getReportRequestUrl(id);

        if (import.meta.env.DEV) {
            console.debug('[clientReportService.getReportById] Requesting', requestUrl);
        }

        try {
            const response = await api.get<Record<string, unknown> | { data?: unknown }>(requestUrl);
            const payload = response.data;
            const reportPayload = payload && typeof payload === 'object' && 'data' in payload ? (payload.data as unknown) : payload;
            const report = normalizeReportRecord(reportPayload, 0);

            if (import.meta.env.DEV) {
                console.debug('[clientReportService.getReportById] Response', response.status, report);
            }

            return report;
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.debug('[clientReportService.getReportById] Error', error);
            }
            throw makeError(getReportErrorMessage(error, 'Failed to fetch report details'), error);
        }
    },
};
