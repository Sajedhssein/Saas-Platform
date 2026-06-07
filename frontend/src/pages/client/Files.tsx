import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FolderOpen } from 'lucide-react';
import { PageContainer } from '../../components/ui';
import TaskAttachmentList from '../../components/ui/TaskAttachmentList';
import type { TaskFile } from '../../types/task';
import { clientFileService } from '../../services';

export const ClientFiles = () => {
  const [files, setFiles] = useState<TaskFile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await clientFileService.getFiles();
      setFiles(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadFiles);
  }, [loadFiles]);

  const handleDownload = async (file: TaskFile) => {
    const id = file.id ?? String(file.path ?? file.url ?? file.name);
    try {
      setDownloadingFileId(id);
      const { blob, filename } = await clientFileService.downloadFile(id, file.name ?? undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || file.name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingFileId(null);
    }
  };

  return (
    <PageContainer title="Files" description="View shared files and documents">
      <div className="rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-slate-50 via-white to-cyan-50 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Shared files</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">All documents and attachments shared with your client account.</p>
          </div>
          <div className="inline-flex items-center gap-3 rounded-full bg-white px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            <FolderOpen size={14} className="text-cyan-600" />
            {files?.length ?? 0} files
          </div>
        </div>
      </div>

      {loading && <div className="text-sm text-slate-600">Loading files...</div>}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      <div className="mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <TaskAttachmentList
          files={files ?? []}
          emptyMessage={loading ? 'Loading files...' : 'No files available.'}
          onDownload={handleDownload}
          downloadingFileId={downloadingFileId}
        />
      </div>
    </PageContainer>
  );
};

export default ClientFiles;
