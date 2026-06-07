export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskProject {
    id: string;
    name: string;
}

export interface TaskCreator {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
}

export interface TaskAssignee {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
}

export interface TaskFile {
    id: string;
    name: string;
    path?: string | null;
    url?: string | null;
    size?: number | null;
    mime_type?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface TaskResponse {
    id: string;
    task_id?: string;
    user_id?: string;
    user?: TaskCreator;
    message: string;
    created_at: string;
    updated_at: string;
}

export interface TaskCommentAuthor {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
}

export interface TaskComment {
    id: string;
    task_id?: string;
    message: string;
    content?: string;
    attachment?: TaskFile | null;
    user_id?: string;
    user?: TaskCommentAuthor | null;
    author?: TaskCommentAuthor | null;
    created_by?: TaskCommentAuthor | null;
    created_at: string;
    updated_at: string;
}

export interface Task {
    id: string;
    project_id: string;
    project: TaskProject;
    created_by: string;
    creator: TaskCreator;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    progress: number;
    deadline: string;
    estimated_hours: number;
    assignees: TaskAssignee[];
    files: TaskFile[];
    responses: TaskResponse[];
    created_at: string;
    updated_at: string;
}

export interface PaginatedTasksResponse {
    success: boolean;
    data: Task[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    message?: string;
}

export interface TaskResponseEnvelope {
    success: boolean;
    data: Task;
    message?: string;
}

export interface TaskCommentsResponse {
    success: boolean;
    data: TaskComment[];
    message?: string;
}

export interface TaskCommentResponseEnvelope {
    success: boolean;
    data: TaskComment;
    message?: string;
}

export interface TaskFileResponseEnvelope {
    success: boolean;
    data?: TaskFile;
    message?: string;
}

export interface CreateTaskPayload {
    project_id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    deadline: string;
    estimated_hours: number;
    status?: TaskStatus;
    progress?: number;
}

export interface UpdateTaskPayload {
    project_id?: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    deadline?: string;
    estimated_hours?: number;
    status?: TaskStatus;
    progress?: number;
}

export interface CreateTaskCommentPayload {
    content: string;
}

export interface UpdateTaskCommentPayload {
    content: string;
}

export interface TaskListParams {
    page?: number;
    per_page?: number;
    search?: string;
    status?: TaskStatus | '';
    priority?: TaskPriority | '';
    project_id?: string;
}
