import type { AxiosError } from 'axios';
import api from '../api/axios';
import { makeError } from '../utils/error';
import type {
    GeneralSettings,
    NotificationSettings,
    SecuritySettingsPayload,
    TeamMember,
    TeamSettingsResponse,
    UpdateGeneralSettingsPayload,
} from '../types/settings';

interface ApiEnvelope<T> {
    success?: boolean;
    data?: T;
    message?: string;
    total_members?: number;
}

interface ValidationEnvelope {
    message?: string;
    errors?: Record<string, string[] | string | undefined>;
}

export class SettingsValidationError extends Error {
    fieldErrors: Record<string, string>;

    constructor(message: string, fieldErrors: Record<string, string>) {
        super(message);
        this.name = 'SettingsValidationError';
        this.fieldErrors = fieldErrors;
    }
}

const toFieldErrors = (errors: ValidationEnvelope['errors']): Record<string, string> => {
    if (!errors || typeof errors !== 'object') {
        return {};
    }

    return Object.entries(errors).reduce<Record<string, string>>((accumulator, [field, value]) => {
        if (Array.isArray(value)) {
            const message = value.find((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
            if (message) {
                accumulator[field] = message;
            }
            return accumulator;
        }

        if (typeof value === 'string' && value.trim().length > 0) {
            accumulator[field] = value;
        }

        return accumulator;
    }, {});
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<ValidationEnvelope>;
    const responseData = axiosError.response?.data;

    if (responseData && typeof responseData === 'object' && typeof responseData.message === 'string' && responseData.message.trim()) {
        return responseData.message;
    }

    return axiosError.message || fallback;
};

const extractData = <T>(payload: ApiEnvelope<T> | T): T => {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
        return payload.data as T;
    }

    return payload as T;
};

const normalizeTeamMember = (member: Partial<TeamMember>): TeamMember => ({
    id: member.id ?? '',
    name: member.name ?? 'Unnamed User',
    email: member.email ?? '',
    role: member.role ?? null,
    status: member.status ?? null,
});

const normalizeNotificationSettings = (payload: Partial<NotificationSettings> | ApiEnvelope<Partial<NotificationSettings>>): NotificationSettings => {
    const data = extractData(payload);

    return {
        task_assigned: Boolean(data.task_assigned),
        task_completed: Boolean(data.task_completed),
        project_updated: Boolean(data.project_updated),
        report_generated: Boolean(data.report_generated),
        employee_joined: Boolean(data.employee_joined),
        invite_accepted: Boolean(data.invite_accepted),
    };
};

const handleRequestError = (error: unknown, fallback: string): never => {
    const axiosError = error as AxiosError<ValidationEnvelope>;

    if (axiosError.response?.status === 422) {
        const responseData = axiosError.response.data;
        throw new SettingsValidationError(
            responseData?.message ?? 'Please check the highlighted fields.',
            toFieldErrors(responseData?.errors),
        );
    }

    throw makeError(getErrorMessage(error, fallback), error);
};

export const settingsService = {
    getGeneralSettings: async (): Promise<GeneralSettings> => {
        try {
            const response = await api.get<ApiEnvelope<GeneralSettings>>('/settings/general');
            const data = extractData(response.data);

            return {
                name: data?.name ?? '',
                email: data?.email ?? null,
                phone: data?.phone ?? null,
            };
        } catch (error: unknown) {
            handleRequestError(error, 'Failed to load general settings');
        }
    },

    updateGeneralSettings: async (payload: UpdateGeneralSettingsPayload): Promise<GeneralSettings> => {
        try {
            const response = await api.put<ApiEnvelope<GeneralSettings>>('/settings/general', payload);
            const data = extractData(response.data);

            return {
                name: data?.name ?? payload.name,
                email: data?.email ?? payload.email ?? null,
                phone: data?.phone ?? payload.phone ?? null,
            };
        } catch (error: unknown) {
            handleRequestError(error, 'Failed to save general settings');
        }
    },

    updateSecuritySettings: async (payload: SecuritySettingsPayload): Promise<void> => {
        try {
            await api.put('/settings/security', payload);
        } catch (error: unknown) {
            handleRequestError(error, 'Failed to update security settings');
        }
    },

    getNotificationSettings: async (): Promise<NotificationSettings> => {
        try {
            const response = await api.get<ApiEnvelope<Partial<NotificationSettings>>>('/settings/notifications');
            return normalizeNotificationSettings(response.data);
        } catch (error: unknown) {
            handleRequestError(error, 'Failed to load notification settings');
        }
    },

    updateNotificationSettings: async (payload: NotificationSettings): Promise<NotificationSettings> => {
        try {
            const response = await api.put<ApiEnvelope<Partial<NotificationSettings>>>('/settings/notifications', payload);
            return normalizeNotificationSettings(response.data);
        } catch (error: unknown) {
            handleRequestError(error, 'Failed to save notification settings');
        }
    },

    getTeamSettings: async (): Promise<TeamSettingsResponse> => {
        try {
            const response = await api.get<ApiEnvelope<TeamMember[]> & { total_members?: number }>('/settings/team');
            const membersPayload = extractData(response.data);

            return {
                members: Array.isArray(membersPayload) ? membersPayload.map(normalizeTeamMember) : [],
                totalMembers: typeof response.data.total_members === 'number' ? response.data.total_members : Array.isArray(membersPayload) ? membersPayload.length : 0,
            };
        } catch (error: unknown) {
            handleRequestError(error, 'Failed to load team settings');
        }
    },
};
