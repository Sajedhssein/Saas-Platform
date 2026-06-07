import api from '../api/axios';
import type { User } from '../types';
import type { Project } from '../types/project';
import type { Task } from '../types/task';
import type { AxiosError } from 'axios';
import { makeError } from '../utils/error';

export interface EmployeeRecord extends User {
    position?: string;
    department?: string;
    performance?: number;
    completedTasks?: number;
    avatar?: string;
    status?: string;
    joinedDate?: string;
    createdAt?: string;
    created_at?: string;
    total_assigned_tasks?: number | null;
    completed_tasks?: number | null;
    in_progress_tasks?: number | null;
    pending_tasks?: number | null;
    todo_tasks?: number | null;
    completion_rate?: number | null;
    active_tasks?: Array<{
        id: string;
        title: string;
        status: 'pending' | 'in_progress' | 'completed';
        progress?: number;
        deadline?: string | null;
        project?: {
            id: string;
            name: string;
        } | null;
    }>;
}

export interface CreateEmployeePayload {
    name: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
    status?: string;
    avatar?: string;
    role?: 'employee';
}

export type UpdateEmployeePayload = Partial<CreateEmployeePayload>;

interface EmployeesEnvelope {
    success?: boolean;
    data?: EmployeeRecord[];
    message?: string;
}

interface EmployeeEnvelope {
    success?: boolean;
    data?: EmployeeRecord;
    message?: string;
}

interface EmployeeProjectsEnvelope {
    success?: boolean;
    data?: unknown;
    message?: string;
}

interface EmployeeTasksEnvelope {
    success?: boolean;
    data?: unknown;
    message?: string;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return fallback;
};

const readNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
};

const pickString = (source: UnknownRecord, keys: string[], fallback = ''): string => {
    for (const key of keys) {
        if (key in source) {
            return readString(source[key], fallback);
        }
    }

    return fallback;
};

const pickNumber = (source: UnknownRecord, keys: string[], fallback = 0): number => {
    for (const key of keys) {
        if (key in source) {
            return readNumber(source[key], fallback);
        }
    }

    return fallback;
};

const extractArray = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (isRecord(payload)) {
        if (Array.isArray(payload.data)) {
            return payload.data;
        }

        if (isRecord(payload.data) && Array.isArray(payload.data.data)) {
            return payload.data.data;
        }
    }

    return [];
};

const normalizeProjectStatus = (value: unknown): Project['status'] => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase().replace(/_/g, '-');

        if (normalized === 'pending' || normalized === 'in-progress' || normalized === 'completed' || normalized === 'on-hold') {
            return normalized;
        }
    }

    return 'pending';
};

const normalizeTaskStatus = (value: unknown): Task['status'] => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (normalized === 'pending' || normalized === 'in_progress' || normalized === 'completed') {
            return normalized as Task['status'];
        }
    }

    return 'pending';
};

const normalizeProject = (item: unknown, index: number): Project => {
    const source = isRecord(item) ? item : {};
    const clientRecord = isRecord(source.client) ? source.client : null;
    const teamMembers = Array.isArray(source.teamMembers)
        ? source.teamMembers
        : Array.isArray(source.team_members)
            ? source.team_members
            : [];

    return {
        id: pickString(source, ['id', 'project_id', 'projectId'], `project-${index}`),
        name: pickString(source, ['name', 'project_name', 'projectName'], `Project ${index + 1}`),
        description: pickString(source, ['description', 'details'], ''),
        status: normalizeProjectStatus(source.status),
        progress: pickNumber(source, ['progress', 'completion_rate', 'completionRate'], 0),
        startDate: typeof source.startDate === 'string' ? source.startDate : typeof source.start_date === 'string' ? source.start_date : null,
        endDate: typeof source.endDate === 'string' ? source.endDate : typeof source.end_date === 'string' ? source.end_date : null,
        teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
        client: clientRecord
            ? {
                id: pickString(clientRecord, ['id', 'client_id', 'clientId'], ''),
                name: pickString(clientRecord, ['name', 'client_name', 'clientName'], 'Client'),
            }
            : null,
        clientId: typeof source.clientId === 'string'
            ? source.clientId
            : typeof source.client_id === 'string'
                ? source.client_id
                : null,
        createdBy: isRecord(source.createdBy) ? source.createdBy as Project['createdBy'] : null,
        createdAt: typeof source.createdAt === 'string' ? source.createdAt : typeof source.created_at === 'string' ? source.created_at : undefined,
        updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : typeof source.updated_at === 'string' ? source.updated_at : undefined,
    };
};

const normalizeTask = (item: unknown, index: number): Task => {
    const source = isRecord(item) ? item : {};
    const projectRecord = isRecord(source.project) ? source.project : null;

    return {
        id: pickString(source, ['id', 'task_id', 'taskId'], `task-${index}`),
        project_id: pickString(source, ['project_id', 'projectId'], projectRecord ? pickString(projectRecord, ['id', 'project_id', 'projectId'], `project-${index}`) : `project-${index}`),
        project: {
            id: projectRecord ? pickString(projectRecord, ['id', 'project_id', 'projectId'], `project-${index}`) : pickString(source, ['project_id', 'projectId'], `project-${index}`),
            name: projectRecord ? pickString(projectRecord, ['name', 'project_name', 'projectName'], `Project ${index + 1}`) : pickString(source, ['project_name', 'projectName'], `Project ${index + 1}`),
        },
        created_by: pickString(source, ['created_by', 'createdBy'], ''),
        creator: {
            id: pickString(source, ['creator_id', 'created_by', 'createdBy'], ''),
            name: pickString(source, ['creator_name', 'created_by_name', 'creatorName'], 'Unknown'),
            email: pickString(source, ['creator_email', 'email'], ''),
            avatar: typeof source.avatar === 'string' ? source.avatar : null,
        },
        title: pickString(source, ['title', 'name'], `Task ${index + 1}`),
        description: pickString(source, ['description', 'details'], 'No description provided.'),
        status: normalizeTaskStatus(source.status),
        priority: ((): Task['priority'] => {
            const value = pickString(source, ['priority'], 'medium').toLowerCase();
            if (value === 'low' || value === 'medium' || value === 'high') {
                return value;
            }
            return 'medium';
        })(),
        progress: pickNumber(source, ['progress', 'completion_rate', 'completionRate'], 0),
        deadline: typeof source.deadline === 'string' ? source.deadline : typeof source.due_date === 'string' ? source.due_date : '',
        estimated_hours: pickNumber(source, ['estimated_hours', 'estimatedHours'], 0),
        assignees: Array.isArray(source.assignees) ? source.assignees : [],
        files: Array.isArray(source.files) ? source.files : [],
        responses: Array.isArray(source.responses) ? source.responses : [],
        created_at: typeof source.created_at === 'string' ? source.created_at : new Date().toISOString(),
        updated_at: typeof source.updated_at === 'string' ? source.updated_at : new Date().toISOString(),
    };
};

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

const extractEmployee = (payload: EmployeeRecord | EmployeeEnvelope): EmployeeRecord => {
    if (typeof payload === 'object' && payload !== null && 'data' in payload) {
        return payload.data as EmployeeRecord;
    }

    return payload as EmployeeRecord;
};

const extractDataArray = (payload: EmployeeProjectsEnvelope | EmployeeTasksEnvelope | unknown): unknown[] => {
    if (isRecord(payload) && 'data' in payload) {
        return extractArray(payload.data);
    }

    return extractArray(payload);
};

const logEmployeeRequest = (method: string, path: string, payload?: unknown): void => {
    if (!import.meta.env.DEV) {
        return;
    }

    console.log('[employeeService]', method, path, payload ?? '');
};

export const employeeService = {
    getEmployees: async (): Promise<EmployeeRecord[]> => {
        logEmployeeRequest('GET', '/admin/employees');

        try {
            const response = await api.get<EmployeesEnvelope | EmployeeRecord[]>('/admin/employees');
            const payload = response.data;

            if (Array.isArray(payload)) {
                return payload;
            }

            return payload.data ?? [];
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch employees'));
        }
    },

    createEmployee: async (data: CreateEmployeePayload): Promise<EmployeeRecord> => {
        logEmployeeRequest('POST', '/admin/employees', data);

        try {
            const response = await api.post<EmployeeEnvelope | EmployeeRecord>('/admin/employees', data);
            return extractEmployee(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to create employee'));
        }
    },

    getEmployee: async (id: string): Promise<EmployeeRecord> => {
        logEmployeeRequest('GET', `/admin/employees/${id}`);

        try {
            const response = await api.get<EmployeeEnvelope>(`/admin/employees/${id}`);
            return extractEmployee(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch employee'));
        }
    },

    updateEmployee: async (id: string, data: UpdateEmployeePayload): Promise<EmployeeRecord> => {
        logEmployeeRequest('PUT', `/admin/employees/${id}`, data);

        try {
            const response = await api.put<EmployeeEnvelope | EmployeeRecord>(`/admin/employees/${id}`, data);
            return extractEmployee(response.data);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to update employee'));
        }
    },

    deleteEmployee: async (id: string): Promise<void> => {
        try {
            await api.delete(`/admin/employees/${id}`);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to delete employee'));
        }
    },

    getEmployeeProjects: async (): Promise<Project[]> => {
        try {
            const response = await api.get<EmployeeProjectsEnvelope | unknown>('/employee/projects');
            return extractDataArray(response.data).map((project, index) => normalizeProject(project, index));
        } catch (error: unknown) {
            const err = error as AxiosError<unknown>;

            if (err.response?.status === 403) {
                throw makeError('You do not have access to this resource.');
            }

            throw makeError(getErrorMessage(error, 'Failed to fetch employee projects'));
        }
    },

    getEmployeeTasks: async (): Promise<Task[]> => {
        try {
            const response = await api.get<EmployeeTasksEnvelope | unknown>('/employee/tasks');
            return extractDataArray(response.data).map((task, index) => normalizeTask(task, index));
        } catch (error: unknown) {
            const err = error as AxiosError<unknown>;

            if (err.response?.status === 403) {
                throw makeError('You do not have access to this resource.');
            }

            throw makeError(getErrorMessage(error, 'Failed to fetch employee tasks'));
        }
    },
};
