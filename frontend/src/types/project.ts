import type { User } from './index';

export type ProjectStatus = 'pending' | 'in-progress' | 'completed' | 'on-hold';

export interface ProjectEmployeeRef {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
}

export interface ProjectClientRef {
    id: string;
    name: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    progress: number;
    startDate?: string | null;
    endDate?: string | null;
    teamMembers: User[];
    employees: ProjectEmployeeRef[];
    client?: ProjectClientRef | null;
    clientId?: string | null;
    createdBy?: User | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateProjectPayload {
    name: string;
    description?: string;
    status?: ProjectStatus;
    progress?: number;
    startDate?: string | null;
    endDate?: string | null;
    clientId?: string | null;
    employee_ids?: string[];
}

export interface UpdateProjectPayload {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    progress?: number;
    startDate?: string | null;
    endDate?: string | null;
    clientId?: string | null;
    employee_ids?: string[];
}

export interface PaginatedProjectsResponse {
    data: Project[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    links?: {
        next?: string | null;
        prev?: string | null;
    };
}

export interface ProjectResponse {
    data: Project;
}

export interface ProjectDetailsResponse {
    data?: Project | null;
    success?: boolean;
    message?: string;
}
