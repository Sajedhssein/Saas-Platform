import api from '../api/axios';
import type { ActivityLog, ActivityLogFeed, ActivityLogPagination } from '../types/activity';

export type ActivityPeriod = 'today' | 'weekly' | 'monthly' | 'all';

interface ActivityLogListParams {
    period?: ActivityPeriod;
    search?: string;
    page?: number;
    perPage?: number;
}

interface ActivityLogApiResponse {
    data?: ActivityLog[];
    pagination?: ActivityLogPagination;
}

const normalizeActivityFeed = (payload: ActivityLogApiResponse | ActivityLog[] | unknown): ActivityLogFeed => {
    if (Array.isArray(payload)) {
        return { logs: payload };
    }

    if (payload && typeof payload === 'object') {
        const response = payload as ActivityLogApiResponse;

        return {
            logs: Array.isArray(response.data) ? response.data : [],
            pagination: response.pagination,
        };
    }

    return { logs: [] };
};

export const activityService = {
    async getActivityLogs(params: ActivityLogListParams = {}): Promise<ActivityLogFeed> {
        const response = await api.get<ActivityLogApiResponse>('/activity-logs', {
            params: {
                period: params.period ?? 'all',
                search: params.search || undefined,
                page: params.page ?? 1,
                per_page: params.perPage ?? 20,
            },
        });

        return normalizeActivityFeed(response.data);
    },

    async clearActivityLogs(): Promise<{ message: string; deleted_count: number }> {
        const response = await api.delete<{ message: string; deleted_count: number }>('/activity-logs');
        return response.data;
    },
};
