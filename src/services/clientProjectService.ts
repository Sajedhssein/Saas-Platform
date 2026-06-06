import api from '../api/axios';
import type { AxiosError } from 'axios';
import type { User } from '../types';
import type { Project, ProjectEmployeeRef, ProjectClientRef, PaginatedProjectsResponse } from '../types/project';
import { makeError } from '../utils/error';

interface BackendClientProject {
    id?: string;
    name?: string;
    description?: string;
    status?: string;
    progress?: number;
    start_date?: string | null;
    end_date?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    client?: ProjectClientRef | string | null;
    client_id?: string | null;
    clientId?: string | null;
    team_members?: User[] | null;
    teamMembers?: User[] | null;
    members?: User[] | null;
    employees?: ProjectEmployeeRef[] | null;
    created_by?: User | null;
    createdAt?: string | null;
    created_at?: string | null;
    updatedAt?: string | null;
    updated_at?: string | null;
}

interface ClientProjectsResponse {
    data?: BackendClientProject[];
    pagination?: {
        total: number;
        per_page: number;
        current_page: number;
        last_page: number;
    };
}

const CLIENT_PROJECTS_ENDPOINT = '/client/projects';

const normalizeClientProject = (project: BackendClientProject): Project => {
    const rawClient = project.client;
    const normalizedClient: ProjectClientRef | null = typeof rawClient === 'string'
        ? rawClient
            ? { id: project.client_id ?? project.clientId ?? '', name: rawClient }
            : null
        : rawClient && typeof rawClient === 'object' && 'id' in rawClient && 'name' in rawClient
            ? { id: String(rawClient.id ?? project.client_id ?? project.clientId ?? ''), name: String(rawClient.name ?? '') }
            : null;

    return {
        id: project.id ?? '',
        name: project.name ?? '',
        description: project.description ?? '',
        status: project.status ?? 'pending',
        progress: typeof project.progress === 'number' ? project.progress : 0,
        startDate: project.start_date ?? project.startDate ?? null,
        endDate: project.end_date ?? project.endDate ?? null,
        teamMembers: Array.isArray(project.teamMembers)
            ? project.teamMembers
            : Array.isArray(project.team_members)
                ? project.team_members
                : Array.isArray(project.members)
                    ? project.members
                    : [],
        employees: Array.isArray(project.employees) ? project.employees : [],
        client: normalizedClient,
        clientId: project.client_id ?? project.clientId ?? normalizedClient?.id ?? null,
        createdBy: project.created_by ?? null,
        createdAt: project.createdAt ?? project.created_at ?? undefined,
        updatedAt: project.updatedAt ?? project.updated_at ?? undefined,
    };
};

const getProjectErrorMessage = (error: unknown, fallback: string): string => {
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

export const clientProjectService = {
    getProjects: async (params?: {
        page?: number;
        search?: string;
        status?: string;
        from?: string;
        to?: string;
        per_page?: number;
    }): Promise<PaginatedProjectsResponse> => {
        const requestUrl = CLIENT_PROJECTS_ENDPOINT;

        if (import.meta.env.DEV) {
            console.debug('[clientProjectService.getProjects] Requesting', requestUrl, { params });
        }

        try {
            const response = await api.get<ClientProjectsResponse>(requestUrl, { params });
            const payload = response.data;
            const projects = Array.isArray(payload.data) ? payload.data.map(normalizeClientProject) : [];

            const pagination = payload.pagination ?? {
                total: projects.length,
                per_page: projects.length,
                current_page: 1,
                last_page: 1,
            };

            const result: PaginatedProjectsResponse = {
                data: projects,
                meta: {
                    current_page: pagination.current_page,
                    last_page: pagination.last_page,
                    per_page: pagination.per_page,
                    total: pagination.total,
                },
            };

            if (import.meta.env.DEV) {
                console.debug('[clientProjectService.getProjects] Response', response.status, result);
            }

            return result;
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.debug('[clientProjectService.getProjects] Error', error);
            }
            throw makeError(getProjectErrorMessage(error, 'Failed to fetch client projects'), error);
        }
    },
};
