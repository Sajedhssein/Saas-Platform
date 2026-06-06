import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { CheckCircle2, FileArchive, File, FileText, ImageIcon, UploadCloud, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Modal } from './Modal';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';
import { taskService } from '../../services/taskService';

interface TaskFileUploadProps {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onUploaded: () => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'zip'] as const;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'application/zip',
  'application/x-zip-compressed',
]);

const ACCEPTED_TYPES_DESCRIPTION = ACCEPTED_EXTENSIONS.join(', ');

const getFileExtension = (fileName: string): string => {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
};

const isAcceptedFile = (file: File): boolean => {
  const extension = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number]) || ACCEPTED_MIME_TYPES.has(file.type);
};

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const resolveFileIcon = (file: File) => {
  const extension = getFileExtension(file.name);

  if (['png', 'jpg', 'jpeg'].includes(extension)) {
    return <ImageIcon size={18} />;
  }

  if (extension === 'zip') {
    return <FileArchive size={18} />;
  }

  if (extension === 'pdf' || extension === 'doc' || extension === 'docx') {
    return <FileText size={18} />;
  }

  return <File size={18} />;
};

export const TaskFileUpload = ({ open, taskId, onClose, onUploaded }: TaskFileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const validateAndSelect = (file: File | null) => {
    setUploadError(null);
    setUploadSuccess(null);

    if (!file) {
      clearSelectedFile();
      setValidationError(null);
      return;
    }

    if (!isAcceptedFile(file)) {
      clearSelectedFile();
      setValidationError(`Unsupported file type. Allowed: ${ACCEPTED_TYPES_DESCRIPTION}`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      clearSelectedFile();
      setValidationError('File must be 10MB or smaller.');
      return;
    }

    setSelectedFile(file);
    setValidationError(null);
  };

  const handleBrowseChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndSelect(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    validateAndSelect(event.dataTransfer.files?.[0] ?? null);
  };

  const handleUpload = async () => {
    if (!taskId || !selectedFile || isUploading) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      setValidationError(null);

      await taskService.uploadTaskFile(taskId, selectedFile);

      setUploadSuccess(`${selectedFile.name} uploaded successfully.`);
      toast.success('File uploaded');
      onUploaded();
      clearSelectedFile();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      setUploadError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const selectedFileSummary = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return {
      icon: resolveFileIcon(selectedFile),
      size: formatFileSize(selectedFile.size),
      type: selectedFile.type || getFileExtension(selectedFile.name).toUpperCase() || 'FILE',
    };
  }, [selectedFile]);

  return (
    <Modal open={open} onClose={onClose} title="Upload File" panelClassName="max-w-2xl">
      <div className="space-y-4">
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-5 transition-colors sm:p-6 ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${dragActive ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-500'}`}>
              <UploadCloud size={26} />
            </div>

            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-900">Drag and drop your file here</p>
              <p className="text-sm text-slate-600">or browse to choose a file</p>
              <p className="text-xs text-slate-500">Allowed: {ACCEPTED_TYPES_DESCRIPTION} · Max size 10MB</p>
            </div>

            <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
              Choose file
              <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" className="hidden" onChange={handleBrowseChange} />
            </label>
          </div>
        </div>

        {selectedFileSummary && selectedFile && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  {selectedFileSummary.icon}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {selectedFileSummary.type} · {selectedFileSummary.size}
                  </p>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={clearSelectedFile} disabled={isUploading}>
                Remove
              </Button>
            </div>
          </div>
        )}

        {validationError && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {uploadError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isUploading}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleUpload()} disabled={!selectedFile || isUploading} isLoading={isUploading}>
            Upload File
          </Button>
        </div>

        {isUploading && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <LoadingSpinner />
            Uploading file...
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TaskFileUpload;
