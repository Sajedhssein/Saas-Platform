import api from '../api/axios';
import { makeError } from '../utils/error';
import type { TaskFile } from '../types/task';

interface FilesEnvelope {
    success?: boolean;
    data?: unknown;
    message?: string;
}

const getErrorMessage = (error: unknown, fallback: string): string => {
    try {
        const err = error as { response?: { data?: unknown }; message?: string };
        const responseData = err.response?.data;
        if (responseData && typeof responseData === 'object' && 'message' in responseData) {
            const message = (responseData as { message?: unknown }).message;
            if (typeof message === 'string') {
                return message;
            }
        }
        return err.message || fallback;
    } catch {
        return fallback;
    }
};

const normalizeFile = (raw: unknown): TaskFile => {
    const record = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};

    return {
        id: String(record.id ?? record.file_id ?? record.task_file_id ?? ''),
        name: String(record.name ?? record.filename ?? record.original_name ?? record.file_name ?? 'file'),
        path: typeof record.path === 'string' ? record.path : typeof record.file_path === 'string' ? record.file_path : null,
        url: typeof record.url === 'string' ? record.url : typeof record.download_url === 'string' ? record.download_url : typeof record.file_url === 'string' ? record.file_url : null,
        size: typeof record.size === 'number' ? record.size : null,
        mime_type: typeof record.mime_type === 'string' ? record.mime_type : typeof record.file_type === 'string' ? record.file_type : typeof record.type === 'string' ? record.type : null,
        created_at: typeof record.created_at === 'string' ? record.created_at : typeof record.uploaded_at === 'string' ? record.uploaded_at : undefined,
        updated_at: typeof record.updated_at === 'string' ? record.updated_at : undefined,
    };
};

export const clientFileService = {
    getFiles: async (): Promise<TaskFile[]> => {
        try {
            const response = await api.get<FilesEnvelope>('/client/files');
            const payload = response.data;
            const source =
                payload && typeof payload === 'object' && 'data' in payload && Array.isArray((payload as { data?: unknown }).data)
                    ? (payload as { data: unknown }).data
                    : payload;

            if (!Array.isArray(source)) {
                return [];
            }

            return source.map(normalizeFile);
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to fetch files'));
        }
    },

    downloadFile: async (fileId: string, fallbackFilename?: string): Promise<{ blob: Blob; filename: string }> => {
        try {
            const response = await api.get(`/client/files/${encodeURIComponent(fileId)}`, {
                responseType: 'blob',
            });

            const disposition = response.headers?.['content-disposition'] ?? response.headers?.['Content-Disposition'];
            let filename = fallbackFilename ?? 'download';

            if (disposition && typeof disposition === 'string') {
                const match = /filename\*=UTF-8''(.+)$/.exec(disposition) || /filename="?([^";]+)"?/.exec(disposition);
                if (match && match[1]) {
                    try {
                        filename = decodeURIComponent(match[1]);
                    } catch {
                        filename = match[1];
                    }
                }
            }

            return { blob: response.data as Blob, filename };
        } catch (error: unknown) {
            throw makeError(getErrorMessage(error, 'Failed to download file'));
        }
    },
};

export default clientFileService;
