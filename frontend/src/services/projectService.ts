/**
 * Projects Service
 * This service will handle all project-related API calls
 */

import api from '../api/axios';
import type { AxiosError } from 'axios';
import type { User } from '../types';
import type {
    Project,
    ProjectEmployeeRef,
    CreateProjectPayload,
    UpdateProjectPayload,
    PaginatedProjectsResponse,
    ProjectResponse,
    ProjectClientRef,
} from '../types/project';

type BackendProjectPayload = {
    name: string;
    description?: string;
    status?: string;
    progress?: number;
    start_date?: string | null;
    end_date?: string | null;
    client_id?: string | null;
    employee_ids?: string[];
};

type BackendProject = Partial<Project> & {
    teamMembers?: User[] | null;
    team_members?: User[] | null;
    members?: User[] | null;
    employees?: ProjectEmployeeRef[] | null;
    employee_ids?: string[] | null;
    tasks?: unknown[] | null;
    client?: Project['client'] | string | null;
    client_id?: string | null;
    clientId?: string | null;
    created_by?: Project['createdBy'] | null;
    created_at?: Project['createdAt'] | null;
    updated_at?: Project['updatedAt'] | null;
};

type BackendProjectResponse = ProjectResponse | BackendProject;

const PROJECTS_ENDPOINT = '/admin/projects';

const toBackendProjectPayload = (data: CreateProjectPayload | UpdateProjectPayload): BackendProjectPayload => ({
    name: data.name,
    description: data.description,
    status: data.status,
    progress: data.progress,
    start_date: data.startDate,
    end_date: data.endDate,
    client_id: data.clientId,
    employee_ids: data.employee_ids,
});

const normalizeProjectEmployees = (project: BackendProject | null | undefined): ProjectEmployeeRef[] => {
    const employees = Array.isArray(project?.employees) ? project?.employees : [];

    return employees
        .map((employee, index) => {
            if (!employee || typeof employee !== 'object') {
                return null;
            }

            const candidate = employee as Record<string, unknown>;
            const id = String(candidate.id ?? candidate.employee_id ?? candidate.employeeId ?? `employee-${index}`);
            const name = String(candidate.name ?? candidate.full_name ?? candidate.fullName ?? `Employee ${index + 1}`);
            const email = String(candidate.email ?? '');

            return {
                id,
                name,
                email,
                avatar: typeof candidate.avatar === 'string' ? candidate.avatar : typeof candidate.photo_url === 'string' ? candidate.photo_url : null,
            };
        })
        .filter((employee): employee is ProjectEmployeeRef => employee !== null);
};

const normalizeProject = (project: BackendProject | null | undefined): Project => {
    const teamMembers =
        (Array.isArray(project?.teamMembers) && project?.teamMembers) ||
        (Array.isArray(project?.team_members) && project?.team_members) ||
        (Array.isArray(project?.members) && project?.members) ||
        [];

    const rawClient = project?.client;
    const normalizedClient: ProjectClientRef | null = typeof rawClient === 'string'
        ? (rawClient ? { id: project?.client_id ?? project?.clientId ?? '', name: rawClient } : null)
        : rawClient && typeof rawClient === 'object' && 'id' in rawClient && 'name' in rawClient
            ? { id: String(rawClient.id ?? project?.client_id ?? project?.clientId ?? ''), name: String(rawClient.name ?? '') }
            : null;
    const clientId = project?.client_id ?? project?.clientId ?? normalizedClient?.id ?? null;

    return {
        id: project?.id ?? '',
        name: project?.name ?? '',
        description: project?.description ?? '',
        status: project?.status ?? 'pending',
        progress: typeof project?.progress === 'number' ? project.progress : 0,
        startDate: project?.startDate ?? null,
        endDate: project?.endDate ?? null,
        teamMembers,
        employees: normalizeProjectEmployees(project),
        client: normalizedClient,
        clientId,
        createdBy: project?.createdBy ?? project?.created_by ?? null,
        createdAt: project?.createdAt ?? project?.created_at ?? undefined,
        updatedAt: project?.updatedAt ?? project?.updated_at ?? undefined,
    };
};

const extractProjectFromResponse = (responseData: BackendProjectResponse): Project => {
    if ('data' in responseData && responseData.data && typeof responseData.data === 'object' && 'id' in responseData.data) {
        return normalizeProject(responseData.data as BackendProject);
    }

    return normalizeProject(responseData as BackendProject);
};

const getProjectErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<unknown>;

    if (axiosError.response?.status === 403) {
        return 'You do not have access to this resource.';
    }

    const responseData = axiosError.response?.data;

    if (typeof responseData === 'object' && responseData !== null && 'message' in responseData) {
        const message = (responseData as { message?: string }).message;

        if (message) {
            return message;
        }
    }

    return axiosError.message || fallback;
};

const createProjectError = (error: unknown, fallback: string): Error =>
    new Error(getProjectErrorMessage(error, fallback), { cause: error instanceof Error ? error : undefined });

export const projectService = {
    getProjects: async (params?: {
        page?: number;
        search?: string;
        status?: string;
        from?: string;
        to?: string;
        per_page?: number;
        client_id?: string;
    }): Promise<PaginatedProjectsResponse> => {
        try {
            const response = await api.get<PaginatedProjectsResponse>(PROJECTS_ENDPOINT, { params });

            return {
                ...response.data,
                data: Array.isArray(response.data.data) ? response.data.data.map((project) => normalizeProject(project as BackendProject)) : [],
            };
        } catch (error: unknown) {
            throw createProjectError(error, 'Failed to fetch projects');
        }
    },

    getProject: async (id: string): Promise<Project> => {
        try {
            const response = await api.get<BackendProjectResponse>(`${PROJECTS_ENDPOINT}/${id}`);
            return extractProjectFromResponse(response.data);
        } catch (error: unknown) {
            throw createProjectError(error, 'Failed to fetch project');
        }
    },

    createProject: async (data: CreateProjectPayload): Promise<Project> => {
        const payload = toBackendProjectPayload(data);
        const requestUrl = `${api.defaults.baseURL ?? ''}${PROJECTS_ENDPOINT}`;

        if (import.meta.env.DEV) {
            console.debug('[projectService.createProject]', {
                method: 'POST',
                url: requestUrl,
                payload,
            });
        }

        try {
            const response = await api.post<BackendProjectResponse>(PROJECTS_ENDPOINT, payload);

            if (import.meta.env.DEV) {
                console.debug('[projectService.createProject:response]', response.status, response.data);
            }

            return extractProjectFromResponse(response.data);
        } catch (error) {
            if (import.meta.env.DEV) {
                const axiosError = error as { response?: { status?: number; data?: unknown }; message?: string };
                console.debug('[projectService.createProject:error]', {
                    method: 'POST',
                    url: requestUrl,
                    payload,
                    status: axiosError.response?.status,
                    response: axiosError.response?.data,
                    message: axiosError.message,
                });
            }

            throw createProjectError(error, 'Failed to create project');
        }
    },

    updateProject: async (id: string, data: UpdateProjectPayload): Promise<Project> => {
        const payload = toBackendProjectPayload(data);
        try {
            const response = await api.put<BackendProjectResponse>(`${PROJECTS_ENDPOINT}/${id}`, payload);
            return extractProjectFromResponse(response.data);
        } catch (error: unknown) {
            throw createProjectError(error, 'Failed to update project');
        }
    },

    deleteProject: async (id: string): Promise<void> => {
        try {
            await api.delete(`${PROJECTS_ENDPOINT}/${id}`);
        } catch (error: unknown) {
            throw createProjectError(error, 'Failed to delete project');
        }
    },
};
