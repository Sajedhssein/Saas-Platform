import api from '../api/axios';
import { makeError } from '../utils/error';
import type { AxiosError } from 'axios';
import type { ReportEnvelope, ReportResponse } from '../types/report';

const unwrapReport = (payload: unknown): ReportResponse | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    if ('data' in payload) {
        const envelope = payload as ReportEnvelope;
        return envelope.data ?? null;
    }

    return payload as ReportResponse;
};

const getReportErrorMessage = (error: unknown, fallback: string): string => {
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

export const reportService = {
    getWeeklyReport: async (): Promise<ReportResponse | null> => {
        try {
            const response = await api.get<ReportEnvelope>('/reports/weekly');
            return unwrapReport(response.data);
        } catch (error) {
            throw makeError(getReportErrorMessage(error, 'Failed to fetch weekly report'));
        }
    },

    getMonthlyReport: async (): Promise<ReportResponse | null> => {
        try {
            const response = await api.get<ReportEnvelope>('/reports/monthly');
            return unwrapReport(response.data);
        } catch (error) {
            throw makeError(getReportErrorMessage(error, 'Failed to fetch monthly report'));
        }
    },

    getCustomReport: async (startDate: string, endDate: string): Promise<ReportResponse | null> => {
        try {
            const params = { start_date: startDate, end_date: endDate };
            const response = await api.get<ReportEnvelope>('/reports/custom', { params });
            return unwrapReport(response.data);
        } catch (error) {
            throw makeError(getReportErrorMessage(error, 'Failed to fetch custom report'));
        }
    },
};

export default reportService;
