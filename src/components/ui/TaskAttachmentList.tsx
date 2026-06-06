import { Archive, Download, ExternalLink, File, FileText, ImageIcon } from 'lucide-react';
import type { TaskFile } from '../../types/task';

interface TaskAttachmentListProps {
  files?: TaskFile[] | null;
  emptyMessage?: string;
  onDownload?: (file: TaskFile) => void;
  onDelete?: (file: TaskFile) => void;
  downloadingFileId?: string | null;
  deletingFileId?: string | null;
}

type UnknownRecord = Record<string, unknown>;

interface NormalizedTaskFile {
  id: string;
  name: string;
  url: string | null;
  size: number | null;
  createdAt: string | null;
  extension: string;
  mimeType: string;
  callbackFile: TaskFile;
}

const asRecord = (value: unknown): UnknownRecord => (typeof value === 'object' && value !== null ? (value as UnknownRecord) : {});

const getString = (record: UnknownRecord, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : null;
};

const getNumber = (record: UnknownRecord, key: string): number | null => {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const normalizeFile = (file: TaskFile, index: number): NormalizedTaskFile => {
  const record = asRecord(file);
  const nestedFileRecord = asRecord(record.file);
  const sourceRecord = Object.keys(nestedFileRecord).length > 0 ? nestedFileRecord : record;

  const name =
    getString(sourceRecord, 'name') ??
    getString(sourceRecord, 'file_name') ??
    getString(sourceRecord, 'filename') ??
    getString(sourceRecord, 'original_name') ??
    'Unknown file';

  const mimeType =
    getString(sourceRecord, 'mime_type') ??
    getString(sourceRecord, 'file_type') ??
    getString(sourceRecord, 'type') ??
    '';

  const extensionFromName = name.includes('.') ? name.split('.').pop()?.trim().toLowerCase() ?? '' : '';
  const extension =
    getString(sourceRecord, 'extension')?.toLowerCase() ??
    getString(sourceRecord, 'file_extension')?.toLowerCase() ??
    extensionFromName;

  const id =
    getString(sourceRecord, 'id') ??
    getString(sourceRecord, 'task_file_id') ??
    getString(sourceRecord, 'file_id') ??
    `file-${index}`;

  const url =
    getString(sourceRecord, 'url') ??
    getString(sourceRecord, 'download_url') ??
    getString(sourceRecord, 'file_url') ??
    getString(sourceRecord, 'path');

  const callbackFile: TaskFile = {
    ...file,
    id,
    name,
    url,
    size: getNumber(sourceRecord, 'size'),
    mime_type: getString(sourceRecord, 'mime_type') ?? getString(sourceRecord, 'file_type') ?? getString(sourceRecord, 'type'),
    created_at: getString(sourceRecord, 'created_at') ?? getString(sourceRecord, 'uploaded_at') ?? undefined,
  };

  return {
    id,
    name,
    url,
    size: callbackFile.size ?? null,
    createdAt: callbackFile.created_at ?? null,
    extension,
    mimeType: mimeType.toLowerCase(),
    callbackFile,
  };
};

export const TaskAttachmentList = ({
  files,
  emptyMessage = 'No files uploaded yet.',
  onDownload,
  onDelete,
  downloadingFileId,
  deletingFileId,
}: TaskAttachmentListProps) => {
  const safeFiles = Array.isArray(files) ? files : [];

  const resolveIcon = (file: NormalizedTaskFile) => {
    const extension = file.extension;
    const mimeType = file.mimeType;

    if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
      return <ImageIcon size={18} />;
    }

    if (extension === 'zip' || mimeType.includes('zip')) {
      return <Archive size={18} />;
    }

    if (extension === 'pdf' || mimeType.includes('pdf')) {
      return <FileText size={18} />;
    }

    return <File size={18} />;
  };

  const formatFileSize = (size?: number | null): string => {
    if (size == null) {
      return 'Size unavailable';
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatUploadedAt = (value?: string): string => {
    if (!value) {
      return 'Upload date unavailable';
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Upload date unavailable' : date.toLocaleString();
  };

  if (safeFiles.length === 0) {
    return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
      <ul className="divide-y divide-slate-200">
        {safeFiles.map((file, index) => {
          try {
            const normalized = normalizeFile(file, index);

            return (
              <li key={normalized.id} className="px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      {resolveIcon(normalized)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-slate-900">{normalized.name}</p>
                        {normalized.url && (
                          <a
                            href={normalized.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          >
                            Open
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{formatFileSize(normalized.size)}</span>
                        <span>{formatUploadedAt(normalized.createdAt ?? undefined)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {onDownload && (
                      <button
                        type="button"
                        onClick={() => onDownload(normalized.callbackFile)}
                        disabled={downloadingFileId === normalized.id || deletingFileId === normalized.id}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Download size={14} />
                        {downloadingFileId === normalized.id ? 'Downloading...' : 'Download'}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(normalized.callbackFile)}
                        disabled={deletingFileId === normalized.id || downloadingFileId === normalized.id}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingFileId === normalized.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          } catch {
            return (
              <li key={`invalid-file-${index}`} className="px-4 py-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Unable to render this attachment. Try reloading task details.
                </div>
              </li>
            );
          }
        })}
      </ul>
    </div>
  );
};

export default TaskAttachmentList;
