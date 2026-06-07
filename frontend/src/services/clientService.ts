import api from '../api/axios';
import type { AxiosError } from 'axios';
import type { Client } from '../types';
import type { Project } from '../types/project';
import { makeError } from '../utils/error';

export interface ClientRecord extends Client {
    contactName?: string;
}

type ClientProjectRef = Pick<Project, 'id' | 'name' | 'progress' | 'status' | 'teamMembers' | 'createdAt' | 'updatedAt'> & {
    tasks_count?: number;
    tasksCount?: number;
};

type BackendClientRecord = Partial<ClientRecord> & {
    company_name?: string | null;
    avatar_url?: string | null;
    projects_count?: number | null;
    projectsCount?: number | null;
    latest_projects?: ClientProjectRef[] | null;
    latestProjects?: ClientProjectRef[] | null;
};

export interface CreateClientPayload {
    name: string;
    email: string;
    phone?: string;
    company: string;
    avatar?: string;
    projects?: number;
    status?: Client['status'];
    contactName?: string;
}

export type UpdateClientPayload = Partial<CreateClientPayload>;

interface ClientsEnvelope {
    success?: boolean;
    data?: ClientRecord[];
    message?: string;
}

interface ClientEnvelope {
    success?: boolean;
    data?: ClientRecord;
    message?: string;
}

interface ClientDetailEnvelope {
    success?: boolean;
    data?: BackendClientRecord | null;
    message?: string;
}

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

const normalizeLatestProject = (project: ClientProjectRef): Project => ({
    id: project.id,
    name: project.name,
    description: '',
    status: project.status ?? 'pending',
    progress: typeof project.progress === 'number' ? project.progress : 0,
    startDate: null,
    endDate: null,
    teamMembers: [],
    client: null,
    clientId: null,
    createdBy: null,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
});

const extractClient = (payload: ClientRecord | ClientEnvelope | BackendClientRecord): ClientRecord => {
    if (typeof payload === 'object' && payload !== null && 'data' in payload) {
        return extractClient(payload.data as ClientRecord | BackendClientRecord);
    }

    const source = payload as BackendClientRecord;
    const projectsCount = source.projects_count ?? source.projectsCount ?? source.projects ?? 0;
    const latestProjectsSource = source.latest_projects ?? source.latestProjects ?? [];

    return {
        id: source.id ?? '',
        name: source.name ?? 'Unnamed Client',
        email: source.email ?? '',
        phone: source.phone ?? '',
        company: source.company ?? source.company_name ?? '',
        avatar: source.avatar ?? source.avatar_url ?? '',
        projects: Number(projectsCount ?? 0),
        projects_count: Number(projectsCount ?? 0),
        latest_projects: Array.isArray(latestProjectsSource) ? latestProjectsSource.map(normalizeLatestProject) : [],
        status: source.status ?? 'active',
        contactName: source.contactName,
    };
};

export const clientService = {
    getClients: async (): Promise<ClientRecord[]> => {
        try {
            const response = await api.get<ClientsEnvelope | ClientRecord[]>('/admin/clients');
            const payload = response.data;

            if (Array.isArray(payload)) {
                return payload;
            }

            return (payload.data ?? []).map((client) => extractClient(client));
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch clients'));
        }
    },

    getClient: async (id: string): Promise<ClientRecord> => {
        try {
            const response = await api.get<ClientDetailEnvelope>(`/admin/clients/${id}`);
            return extractClient(response.data.data ?? response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch client'));
        }
    },

    createClient: async (data: CreateClientPayload): Promise<ClientRecord> => {
        try {
            const response = await api.post<ClientEnvelope | ClientRecord>('/admin/clients', data);
            return extractClient(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to create client'));
        }
    },

    updateClient: async (id: string, data: UpdateClientPayload): Promise<ClientRecord> => {
        try {
            const response = await api.put<ClientEnvelope | ClientRecord>(`/admin/clients/${id}`, data);
            return extractClient(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to update client'));
        }
    },

    deleteClient: async (id: string): Promise<void> => {
        try {
            await api.delete(`/admin/clients/${id}`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to delete client'));
        }
    },
};
