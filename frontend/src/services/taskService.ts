/**
 * Tasks Service
 * This service handles all task-related API calls
 */

import api from '../api/axios';
import type {
    CreateTaskPayload,
    CreateTaskCommentPayload,
    PaginatedTasksResponse,
    Task,
    TaskComment,
    TaskCommentResponseEnvelope,
    TaskCommentsResponse,
    TaskFile,
    TaskFileResponseEnvelope,
    TaskStatus,
    TaskListParams,
    TaskResponseEnvelope,
    UpdateTaskCommentPayload,
    UpdateTaskPayload,
} from '../types/task';
import type { ActivityLogFeed } from '../types/activity';
import type { AxiosError } from 'axios';
import { makeError } from '../utils/error';

export interface AssignTaskPayload {
    assignees: Array<{
        id: string;
    }>;
}

export interface ApiEnvelope<T> {
    success?: boolean;
    data?: T;
    message?: string;
}

const TASK_BASE_PATH = '/admin/tasks';
const TASK_COMMENTS_PATH = (taskId: string) => `/tasks/${taskId}/comments`;
const COMMENT_PATH = (commentId: string) => `/comments/${commentId}`;
const TASK_ACTIVITY_LOGS_PATH = (taskId: string) => `/tasks/${taskId}/activity-logs`;
export const TASK_MUTATION_EVENT = 'task-mutation';

const notifyTaskMutation = (): void => {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(TASK_MUTATION_EVENT));
};

const getEnvelopeData = <T>(payload: unknown): T | null => {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        return (payload as { data?: T }).data ?? null;
    }

    return null;
};

const normalizeComment = (comment: TaskComment | null | undefined): TaskComment => {
    const text = comment?.message ?? comment?.content ?? '';

    return {
        id: comment?.id ?? '',
        task_id: comment?.task_id,
        message: text,
        content: comment?.content ?? text,
        attachment: comment?.attachment ?? null,
        user_id: comment?.user_id,
        user: comment?.user ?? null,
        author: comment?.author ?? null,
        created_by: comment?.created_by ?? null,
        created_at: comment?.created_at ?? new Date().toISOString(),
        updated_at: comment?.updated_at ?? comment?.created_at ?? new Date().toISOString(),
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return fallback;
};

const readNullableString = (value: unknown): string | null => {
    const parsed = readString(value, '');
    return parsed ? parsed : null;
};

const readObject = (value: unknown): Record<string, unknown> | null => (isRecord(value) ? value : null);

const extractArrayPayload = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!isRecord(payload)) {
        return [];
    }

    if (Array.isArray(payload.data)) {
        return payload.data;
    }

    if (isRecord(payload.data) && Array.isArray(payload.data.data)) {
        return payload.data.data;
    }

    return [];
};

const normalizeActivityLog = (value: unknown, index: number) => {
    const record = readObject(value);

    if (!record) {
        return null;
    }

    const userRecord = readObject(record.user) ?? readObject(record.actor) ?? readObject(record.author) ?? readObject(record.causer);
    const metadataRecord = readObject(record.metadata) ?? readObject(record.properties) ?? readObject(record.context) ?? readObject(record.data);
    const createdAt = readString(record.created_at ?? record.timestamp ?? record.createdAt ?? '', '');
    const action = readString(record.action ?? record.type ?? record.event ?? record.log_type ?? record.activity ?? '', 'activity');
    const description = readString(record.description ?? record.message ?? record.details ?? record.summary ?? '', action);
    const id = readString(record.id ?? record.activity_id ?? record.log_id ?? '', `activity-${index}`);

    return {
        id,
        action,
        description,
        metadata: metadataRecord,
        user: userRecord
            ? {
                id: readString(userRecord.id ?? userRecord.user_id ?? userRecord.actor_id ?? '', 'unknown'),
                name: readString(userRecord.name ?? userRecord.full_name ?? userRecord.display_name ?? '', 'Unknown'),
                avatar: readNullableString(userRecord.avatar ?? userRecord.image ?? userRecord.profile_photo_url ?? userRecord.photo_url),
            }
            : null,
        created_at: createdAt || new Date().toISOString(),
    };
};

const normalizeActivityFeed = (payload: unknown): ActivityLogFeed => {
    const logs = extractArrayPayload(payload)
        .map((item, index) => normalizeActivityLog(item, index))
        .filter((item): item is NonNullable<ReturnType<typeof normalizeActivityLog>> => item !== null);

    const pagination = isRecord(payload) && isRecord(payload.pagination)
        ? {
            total: Number(payload.pagination.total ?? logs.length),
            per_page: Number(payload.pagination.per_page ?? logs.length),
            current_page: Number(payload.pagination.current_page ?? 1),
            last_page: Number(payload.pagination.last_page ?? 1),
            from: typeof payload.pagination.from === 'number' ? payload.pagination.from : null,
            to: typeof payload.pagination.to === 'number' ? payload.pagination.to : null,
            has_more: Boolean(payload.pagination.has_more),
        }
        : undefined;

    return {
        logs,
        pagination,
        taskId: isRecord(payload) && typeof payload.task_id === 'string' ? payload.task_id : null,
    };
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
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

const extractUploadValidationMessage = (error: unknown, fallback: string): string => {
    const err = error as AxiosError<{ message?: string; errors?: Record<string, string[] | string> }>;
    const responseData = err.response?.data;

    const fileError = responseData?.errors?.file;

    if (Array.isArray(fileError) && fileError.length > 0 && fileError[0]) {
        return fileError[0];
    }

    if (typeof fileError === 'string' && fileError) {
        return fileError;
    }

    if (responseData?.message) {
        return responseData.message;
    }

    return extractErrorMessage(error, fallback);
};

const toTaskFile = (payload: unknown): TaskFile | null => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const record = payload as Record<string, unknown>;

    const id =
        (typeof record.id === 'string' && record.id) ||
        (typeof record.task_file_id === 'string' && record.task_file_id) ||
        (typeof record.file_id === 'string' && record.file_id) ||
        '';

    const name =
        (typeof record.name === 'string' && record.name) ||
        (typeof record.file_name === 'string' && record.file_name) ||
        (typeof record.filename === 'string' && record.filename) ||
        (typeof record.original_name === 'string' && record.original_name) ||
        '';

    if (!id) {
        return null;
    }

    return {
        id,
        name: name || 'Unknown file',
        path: (typeof record.path === 'string' ? record.path : null) ?? null,
        url:
            (typeof record.url === 'string' && record.url) ||
            (typeof record.download_url === 'string' && record.download_url) ||
            (typeof record.file_url === 'string' && record.file_url) ||
            null,
        size: typeof record.size === 'number' ? record.size : typeof record.file_size === 'number' ? record.file_size : null,
        mime_type:
            (typeof record.mime_type === 'string' && record.mime_type) ||
            (typeof record.file_type === 'string' && record.file_type) ||
            (typeof record.type === 'string' && record.type) ||
            null,
        created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
        updated_at: typeof record.updated_at === 'string' ? record.updated_at : undefined,
    };
};

export const taskService = {
    /**
     * Get all tasks
     */
    getTasks: async (params?: TaskListParams): Promise<PaginatedTasksResponse> => {
        try {
            const response = await api.get<PaginatedTasksResponse>(TASK_BASE_PATH, { params });
            return response.data;
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to fetch tasks'));
        }
    },

    /**
     * Get task by ID
     */
    getTask: async (id: string): Promise<Task> => {
        try {
            const response = await api.get<TaskResponseEnvelope>(`/tasks/${id}`);
            return response.data.data;
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to fetch task'));
        }
    },

    /**
     * Create a new task
     */
    createTask: async (data: CreateTaskPayload): Promise<Task> => {
        try {
            const response = await api.post<TaskResponseEnvelope>(TASK_BASE_PATH, data);
            notifyTaskMutation();
            return response.data.data;
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to create task'));
        }
    },

    /**
     * Update a task
     */
    updateTask: async (id: string, data: UpdateTaskPayload): Promise<Task> => {
        try {
            const response = await api.put<TaskResponseEnvelope>(`${TASK_BASE_PATH}/${id}`, data);
            notifyTaskMutation();
            return response.data.data;
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to update task'));
        }
    },

    /**
     * Delete a task
     */
    deleteTask: async (id: string): Promise<void> => {
        try {
            await api.delete(`${TASK_BASE_PATH}/${id}`);
            notifyTaskMutation();
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to delete task'));
        }
    },

    /**
     * Update task status
     */
    updateTaskStatus: async (taskId: string, status: TaskStatus): Promise<Task> => {
        try {
            const response = await api.patch<TaskResponseEnvelope>(`${TASK_BASE_PATH}/${taskId}/status`, { status });
            notifyTaskMutation();
            return response.data.data;
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to update task status'));
        }
    },

    /**
     * Assign employees to a task
     */
    assignTask: async (taskId: string, employeeIds: string[]): Promise<Task> => {
        try {
            const response = await api.post<TaskResponseEnvelope>(`${TASK_BASE_PATH}/${taskId}/assign`, {
                assignees: employeeIds.map((id) => ({ id })),
            });
            notifyTaskMutation();
            return response.data.data;
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to assign task'));
        }
    },

    uploadTaskFile: async (taskId: string, file: File): Promise<TaskFile> => {
        try {
            const formData = new FormData();
            const requestUrl = `${api.defaults.baseURL ?? ''}${TASK_BASE_PATH}/${taskId}/files`;

            formData.append('file', file);

            if (import.meta.env.DEV) {
                console.debug('[taskService.uploadTaskFile] request', {
                    requestUrl,
                    selectedFile: {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                    },
                    formDataKeys: Array.from(formData.keys()),
                });
            }

            const response = await api.post<TaskFileResponseEnvelope | ApiEnvelope<TaskFile>>(
                `${TASK_BASE_PATH}/${taskId}/files`,
                formData
            );

            if (import.meta.env.DEV) {
                console.debug('[taskService.uploadTaskFile] response', {
                    status: response.status,
                    data: response.data,
                });
            }

            const payload = response.data;
            const envelopeFile = toTaskFile(getEnvelopeData<unknown>(payload));
            const rawFile = toTaskFile(payload);
            const uploadedFile = envelopeFile ?? rawFile;

            if (uploadedFile) {
                // Notify other parts of the app that a task changed (files added)
                notifyTaskMutation();
                return uploadedFile;
            }

            throw new Error('Invalid file upload response');
        } catch (error: unknown) {
            throw makeError(extractUploadValidationMessage(error, 'Failed to upload file'));
        }
    },

    uploadTaskFiles: async (taskId: string, file: File): Promise<void> => {
        await taskService.uploadTaskFile(taskId, file);
    },

    getTaskComments: async (taskId: string): Promise<TaskComment[]> => {
        try {
            const response = await api.get<TaskCommentsResponse | TaskComment[] | ApiEnvelope<TaskComment[]>>(
                TASK_COMMENTS_PATH(taskId)
            );
            const payload = response.data;

            if (Array.isArray(payload)) {
                return payload.map((comment) => normalizeComment(comment));
            }

            const data = getEnvelopeData<TaskComment[]>(payload);
            return (data ?? []).map((comment) => normalizeComment(comment));
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to fetch comments'));
        }
    },

    createTaskComment: async (taskId: string, data: CreateTaskCommentPayload & { attachment?: File | null }): Promise<TaskComment> => {
        try {
            const hasAttachment = data.attachment instanceof File;
            const requestPayload = hasAttachment
                ? (() => {
                    const formData = new FormData();
                    formData.append('content', data.content);
                    formData.append('attachment', data.attachment as File);
                    return formData;
                })()
                : { content: data.content };

            const response = await api.post<TaskCommentResponseEnvelope | ApiEnvelope<TaskComment>>(
                TASK_COMMENTS_PATH(taskId),
                requestPayload
            );

            const responsePayload = response.data;
            const comment = getEnvelopeData<TaskComment>(responsePayload);

            if (comment) {
                notifyTaskMutation();
                return normalizeComment(comment);
            }

            throw new Error('Invalid comment response');
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to add comment'));
        }
    },

    deleteTaskComment: async (taskId: string, commentId: string): Promise<void> => {
        try {
            await api.delete(COMMENT_PATH(commentId));
            notifyTaskMutation();
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to delete comment'));
        }
    },

    updateTaskComment: async (taskId: string, commentId: string, data: UpdateTaskCommentPayload): Promise<TaskComment> => {
        try {
            const response = await api.put<TaskCommentResponseEnvelope | ApiEnvelope<TaskComment>>(
                COMMENT_PATH(commentId),
                { content: data.content }
            );

            const payload = response.data;
            const comment = getEnvelopeData<TaskComment>(payload);

            if (comment) {
                notifyTaskMutation();
                return normalizeComment(comment);
            }

            throw new Error('Invalid comment response');
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to update comment'));
        }
    },

    deleteTaskFile: async (taskId: string, fileId: string): Promise<void> => {
        try {
            await api.delete(`${TASK_BASE_PATH}/${taskId}/files/${fileId}`);
            // Notify other parts of the app that a task changed (file removed)
            notifyTaskMutation();
        } catch (error: unknown) {
            const status = (error as AxiosError<unknown>)?.response?.status;

            if (status === 404) {
                throw makeError('File delete route is not enabled on the server yet.');
            }

            throw makeError(extractErrorMessage(error, 'Failed to delete file'));
        }
    },

    downloadTaskFile: async (taskId: string, fileId: string): Promise<{ blob: Blob; filename: string }> => {
        try {
            if (!taskId || !fileId) {
                throw new Error('Unable to download file');
            }

            const response = await api.get<Blob>(`/tasks/${taskId}/files/${fileId}`, {
                responseType: 'blob',
            });

            const disposition = response.headers['content-disposition'] ?? response.headers['Content-Disposition'] ?? '';
            const filenameMatch = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
            const filename = decodeURIComponent(filenameMatch?.[1] ?? filenameMatch?.[2] ?? `file-${fileId}`);

            return {
                blob: response.data,
                filename,
            };
        } catch (error: unknown) {
            const status = (error as AxiosError<unknown>)?.response?.status;

            if (status === 404) {
                throw makeError('Unable to download file');
            }

            throw makeError(extractErrorMessage(error, 'Failed to download file'));
        }
    },

    previewTaskFile: async (taskId: string, fileId: string): Promise<{ blob: Blob; filename: string; contentType: string }> => {
        try {
            if (!taskId || !fileId) {
                throw new Error('Unable to preview file');
            }

            const response = await api.get<Blob>(`/tasks/${taskId}/files/${fileId}`, {
                params: { preview: 1 },
                responseType: 'blob',
            });

            const disposition = response.headers['content-disposition'] ?? response.headers['Content-Disposition'] ?? '';
            const filenameMatch = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);

            return {
                blob: response.data,
                filename: decodeURIComponent(filenameMatch?.[1] ?? filenameMatch?.[2] ?? `file-${fileId}`),
                contentType: response.headers['content-type'] ?? response.headers['Content-Type'] ?? response.data.type,
            };
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to preview file'));
        }
    },

    getTaskActivityLogs: async (taskId: string): Promise<ActivityLogFeed> => {
        try {
            const response = await api.get(TASK_ACTIVITY_LOGS_PATH(taskId));
            return normalizeActivityFeed(response.data);
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to load activity timeline'));
        }
    },

    updateEmployeeTaskStatus: async (taskId: string, status: TaskStatus): Promise<Task> => {
        try {
            const response = await api.patch<ApiEnvelope<Task>>(`/employee/tasks/${taskId}/status`, { status });
            const task = getEnvelopeData<Task>(response.data);

            if (!task) {
                throw new Error('Invalid task status response');
            }

            notifyTaskMutation();
            return task;
        } catch (error: unknown) {
            throw makeError(extractErrorMessage(error, 'Failed to update task status'));
        }
    },
};
