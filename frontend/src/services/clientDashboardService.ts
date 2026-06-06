import api from '../api/axios';
import { makeError } from '../utils/error';

export interface ClientDashboardPayload {
    projects_count: number;
    active_projects: number;
    completed_projects: number;
    reports_count: number;
    recent_projects: Array<{
        id: string;
        name: string;
        status: string;
        progress: number;
        created_at: string | null;
    }>;
    recent_reports: Array<{
        id: string;
        title: string;
        report_type: string;
        status: string;
        generated_at: string | null;
    }>;
}

const getDashboardErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : 'Failed to fetch dashboard data';
};

export const clientDashboardService = {
    getDashboard: async (): Promise<ClientDashboardPayload> => {
        const requestUrl = '/client/dashboard';

        if (import.meta.env.DEV) {
            console.debug('[clientDashboardService.getDashboard] Requesting', requestUrl);
        }

        try {
            const response = await api.get<ClientDashboardPayload>(requestUrl);

            if (import.meta.env.DEV) {
                console.debug('[clientDashboardService.getDashboard] Response', response.status, response.data);
            }

            return response.data;
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.debug('[clientDashboardService.getDashboard] Error', error);
            }
            throw makeError(getDashboardErrorMessage(error), error);
        }
    },
};
