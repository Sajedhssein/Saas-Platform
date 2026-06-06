import api from '../api/axios';
import type { AxiosError } from 'axios';
import { makeError } from '../utils/error';

export type InviteRole = 'employee' | 'client';
export type InviteStatus = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked' | 'hidden';

export interface InviteRecord {
    id: string;
    email: string;
    role: InviteRole;
    status: string;
    created_at: string | null;
    expires_at: string | null;
    hidden?: boolean;
    archived_at?: string | null;
    used_at?: string | null;
    revoked?: boolean;
    last_resent_at?: string | null;
    resent_count?: number;
    invited_by?: {
        id: string;
        name: string;
        avatar?: string | null;
    } | null;
}

export interface CreateInvitePayload {
    email: string;
    role: InviteRole;
    expires_in_minutes?: number;
}

interface InviteEnvelope {
    success?: boolean;
    message?: string;
    data?: unknown;
    meta?: unknown;
    filters?: unknown;
}

export interface InviteStats {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
}

interface InviteStatsEnvelope {
    success?: boolean;
    data?: Partial<InviteStats> | unknown;
}

export interface InviteListFeed {
    invites: InviteRecord[];
    meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters?: {
        status: InviteStatus;
        available: InviteStatus[];
    };
}

const getErrorMessage = (error: unknown, fallback: string): string => {
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

const toInviteRecord = (value: unknown): InviteRecord | null => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const source = value as Record<string, unknown>;
    const id = source.id;
    const email = source.email;
    const role = source.role;

    if (typeof id !== 'string' && typeof id !== 'number') {
        return null;
    }

    if (typeof email !== 'string') {
        return null;
    }

    if (role !== 'employee' && role !== 'client') {
        return null;
    }

    return {
        id: String(id),
        email,
        role,
        status: typeof source.status === 'string' ? source.status : 'pending',
        created_at: typeof source.created_at === 'string' ? source.created_at : null,
        expires_at: typeof source.expires_at === 'string' ? source.expires_at : null,
        hidden:
            source.hidden === true ||
            source.is_hidden === true ||
            source.archived === true ||
            typeof source.archived_at === 'string',
        archived_at: typeof source.archived_at === 'string' ? source.archived_at : null,
        used_at: typeof source.used_at === 'string' ? source.used_at : null,
        revoked: source.revoked === true,
        last_resent_at: typeof source.last_resent_at === 'string' ? source.last_resent_at : null,
        resent_count: typeof source.resent_count === 'number' ? source.resent_count : 0,
        invited_by: typeof source.invited_by === 'object' && source.invited_by !== null ? (() => {
            const invitedBy = source.invited_by as Record<string, unknown>;
            const invitedById = invitedBy.id;
            const invitedByName = invitedBy.name;

            if ((typeof invitedById !== 'string' && typeof invitedById !== 'number') || typeof invitedByName !== 'string') {
                return null;
            }

            return {
                id: String(invitedById),
                name: invitedByName,
                avatar: typeof invitedBy.avatar === 'string' ? invitedBy.avatar : null,
            };
        })() : null,
    };
};

const extractInvites = (payload: unknown): InviteRecord[] => {
    const candidates: unknown[] = [];

    if (Array.isArray(payload)) {
        candidates.push(...payload);
    } else if (payload && typeof payload === 'object') {
        const root = payload as Record<string, unknown>;

        if (Array.isArray(root.data)) {
            candidates.push(...root.data);
        }

        if (root.data && typeof root.data === 'object') {
            const nestedData = root.data as Record<string, unknown>;

            if (Array.isArray(nestedData.invites)) {
                candidates.push(...nestedData.invites);
            }

            if (Array.isArray(nestedData.data)) {
                candidates.push(...nestedData.data);
            }
        }

        if (Array.isArray(root.invites)) {
            candidates.push(...root.invites);
        }
    }

    return candidates.map(toInviteRecord).filter((invite): invite is InviteRecord => invite !== null);
};

const extractStats = (payload: unknown): InviteStats => {
    if (payload && typeof payload === 'object') {
        const data = 'data' in payload && payload.data && typeof payload.data === 'object'
            ? (payload.data as Record<string, unknown>)
            : (payload as Record<string, unknown>);

        return {
            total: Number(data.total ?? 0),
            pending: Number(data.pending ?? 0),
            accepted: Number(data.accepted ?? 0),
            expired: Number(data.expired ?? 0),
            revoked: Number(data.revoked ?? 0),
        };
    }

    return { total: 0, pending: 0, accepted: 0, expired: 0, revoked: 0 };
};

const parseInviteFeed = (payload: unknown): InviteListFeed => {
    const invites = extractInvites(payload);
    const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
    const metaSource = root?.meta && typeof root.meta === 'object' ? (root.meta as Record<string, unknown>) : null;
    const filtersSource = root?.filters && typeof root.filters === 'object' ? (root.filters as Record<string, unknown>) : null;

    return {
        invites,
        meta: metaSource
            ? {
                current_page: Number(metaSource.current_page ?? 1),
                last_page: Number(metaSource.last_page ?? 1),
                per_page: Number(metaSource.per_page ?? invites.length),
                total: Number(metaSource.total ?? invites.length),
            }
            : undefined,
        filters: filtersSource
            ? {
                status: (filtersSource.status as InviteStatus) ?? 'all',
                available: Array.isArray(filtersSource.available)
                    ? (filtersSource.available.filter((item): item is InviteStatus => typeof item === 'string') as InviteStatus[])
                    : ['all', 'pending', 'accepted', 'expired', 'revoked', 'hidden'],
            }
            : undefined,
    };
};

export const inviteService = {
    getInvites: async (status?: string): Promise<InviteListFeed> => {
        try {
            const response = await api.get<InviteEnvelope>('/admin/invites', {
                params: status ? { status } : undefined,
            });
            return parseInviteFeed(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch invites'), error);
        }
    },

    getInviteStats: async (): Promise<InviteStats> => {
        try {
            const response = await api.get<InviteStatsEnvelope>('/admin/invites/stats');
            return extractStats(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch invite stats'), error);
        }
    },

    createInvite: async (payload: CreateInvitePayload): Promise<void> => {
        try {
            await api.post('/admin/invites', payload);
        } catch (error: unknown) {
            const axiosError = error as AxiosError<unknown>;
            if (axiosError.response?.status === 403) {
                throw makeError('You are not authorized to send invites. Please contact an administrator.', error);
            }
            throw makeError(getErrorMessage(error, 'Failed to send invite'), error);
        }
    },

    resendInvite: async (inviteId: string): Promise<void> => {
        try {
            await api.post(`/admin/invites/${inviteId}/resend`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to resend invite'), error);
        }
    },

    revokeInvite: async (inviteId: string): Promise<void> => {
        try {
            await api.patch(`/admin/invites/${inviteId}/revoke`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to revoke invite'), error);
        }
    },

    getInviteHistory: async (): Promise<InviteRecord[]> => {
        try {
            const response = await api.get<InviteEnvelope | InviteRecord[]>('/admin/invites/history');
            return extractInvites(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch invite history'), error);
        }
    },

    cleanInvites: async (): Promise<void> => {
        try {
            await api.post('/admin/invites/clean');
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to archive invites'), error);
        }
    },

    clearInvites: async (): Promise<void> => {
        try {
            await api.post('/admin/invites/clean');
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to clear invites'), error);
        }
    },

    restoreInvite: async (inviteId: string): Promise<void> => {
        try {
            await api.patch(`/admin/invites/${inviteId}/restore`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to restore invite'), error);
        }
    },
};
