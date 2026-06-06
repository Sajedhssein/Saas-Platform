import api from '../api/axios';
import { makeError } from '../utils/error';
import type { AxiosError } from 'axios';
import type {
    EmailReportPayload,
    GenerateReportPayload,
    ReportCollectionEnvelope,
    ReportRecord,
    ReportRecordEnvelope,
} from '../types/report';

const REPORTS_ENDPOINT = '/admin/reports';

const getErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as AxiosError<unknown>;
    const responseData = err.response?.data;

    if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
        const message = (responseData as { message?: string }).message;
        if (message) {
            return message;
        }
    }

    return err.message || fallback;
};

const extractReports = (payload: ReportCollectionEnvelope | ReportRecord[] | { data?: ReportRecord[] } | null | undefined): ReportRecord[] => {
    if (!payload) {
        return [];
    }

    if (Array.isArray(payload)) {
        return payload;
    }

    if ('data' in payload) {
        const data = payload.data;

        if (Array.isArray(data)) {
            return data;
        }

        if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: ReportRecord[] }).data)) {
            return (data as { data?: ReportRecord[] }).data ?? [];
        }
    }

    return [];
};

const extractReport = (payload: ReportRecordEnvelope | ReportRecord | null | undefined): ReportRecord | null => {
    if (!payload) {
        return null;
    }

    if ('data' in payload) {
        return payload.data ?? null;
    }

    return payload;
};

type HeaderMap = Record<string, string | undefined>;

const extractFilename = (headers: HeaderMap): string => {
    const disposition = headers['content-disposition'] ?? headers['Content-Disposition'] ?? '';
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
    return decodeURIComponent(match?.[1] ?? match?.[2] ?? 'report');
};

const buildBlobResult = async (url: string): Promise<{ blob: Blob; filename: string; contentType: string | null }> => {
    const response = await api.get<Blob>(url, { responseType: 'blob' });
    return {
        blob: response.data,
        filename: extractFilename(response.headers as HeaderMap),
        contentType: response.headers['content-type'] ?? response.headers['Content-Type'] ?? null,
    };
};

export const enterpriseReportService = {
    getReports: async (): Promise<ReportRecord[]> => {
        try {
            const response = await api.get<ReportCollectionEnvelope | ReportRecord[] | { data?: ReportRecord[] }>(REPORTS_ENDPOINT);
            return extractReports(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch reports'));
        }
    },

    generateReport: async (payload: GenerateReportPayload): Promise<ReportRecord | null> => {
        try {
            const response = await api.post<ReportRecordEnvelope | ReportRecord>(`${REPORTS_ENDPOINT}/generate`, payload);
            return extractReport(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to generate report'));
        }
    },

    getReport: async (id: string): Promise<ReportRecord | null> => {
        try {
            const response = await api.get<ReportRecordEnvelope | ReportRecord>(`${REPORTS_ENDPOINT}/${id}`);
            return extractReport(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch report'));
        }
    },

    downloadReport: async (id: string): Promise<{ blob: Blob; filename: string; contentType: string | null }> => {
        try {
            return await buildBlobResult(`${REPORTS_ENDPOINT}/${id}/download`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to download report'));
        }
    },

    viewReport: async (id: string): Promise<{ blob: Blob; filename: string; contentType: string | null }> => {
        try {
            return await buildBlobResult(`${REPORTS_ENDPOINT}/${id}/view`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to open report'));
        }
    },

    emailReport: async (id: string, email: string): Promise<ReportRecord | null> => {
        try {
            const payload: EmailReportPayload = { email };
            const response = await api.post<ReportRecordEnvelope | ReportRecord>(`${REPORTS_ENDPOINT}/${id}/email`, payload);
            return extractReport(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to email report'));
        }
    },

    deleteReport: async (id: string): Promise<void> => {
        try {
            await api.delete(`${REPORTS_ENDPOINT}/${id}`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to delete report'));
        }
    },
};

export default enterpriseReportService;
