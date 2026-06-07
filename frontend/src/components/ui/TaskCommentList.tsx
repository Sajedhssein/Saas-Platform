import type { TaskComment } from '../../types/task';
import { Avatar } from './Avatar';
import { Download, ExternalLink, Paperclip } from 'lucide-react';

interface TaskCommentListProps {
  comments: TaskComment[];
  emptyMessage?: string;
  onEdit?: (comment: TaskComment) => void;
  onDelete?: (comment: TaskComment) => void;
  onDownloadAttachment?: (comment: TaskComment) => void;
  onPreviewAttachment?: (comment: TaskComment) => void;
  editingCommentId?: string | null;
  deletingCommentId?: string | null;
}

const resolveAuthorName = (comment: TaskComment): string =>
  comment.user?.name ?? comment.author?.name ?? comment.created_by?.name ?? 'Unknown';

const resolveAuthorAvatar = (comment: TaskComment): string | null | undefined =>
  comment.user?.avatar ?? comment.author?.avatar ?? comment.created_by?.avatar;

export const TaskCommentList = ({
  comments,
  emptyMessage = 'No comments yet.',
  onEdit,
  onDelete,
  onDownloadAttachment,
  onPreviewAttachment,
  editingCommentId,
  deletingCommentId,
}: TaskCommentListProps) => {
  if (comments.length === 0) {
    return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{emptyMessage}</div>;
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white">
      <ul className="divide-y divide-slate-200">
        {comments.map((comment) => (
          <li key={comment.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar imageUrl={resolveAuthorAvatar(comment)} name={resolveAuthorName(comment)} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{resolveAuthorName(comment)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.message}</p>
                  {comment.attachment && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <Paperclip size={14} />
                      <span className="max-w-56 truncate font-medium text-slate-800">{comment.attachment.name}</span>
                      {onPreviewAttachment && (
                        <button
                          type="button"
                          onClick={() => onPreviewAttachment(comment)}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-blue-700 hover:bg-blue-50"
                        >
                          <ExternalLink size={12} />
                          Preview
                        </button>
                      )}
                      {onDownloadAttachment && (
                        <button
                          type="button"
                          onClick={() => onDownloadAttachment(comment)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-white"
                        >
                          <Download size={12} />
                          Download
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 text-xs text-slate-500">
                <span>{new Date(comment.created_at).toLocaleString()}</span>
                {(onEdit || onDelete) && (
                  <div className="flex gap-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(comment)}
                        disabled={editingCommentId === comment.id || deletingCommentId === comment.id}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {editingCommentId === comment.id ? 'Editing...' : 'Edit'}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(comment)}
                        disabled={deletingCommentId === comment.id || editingCommentId === comment.id}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingCommentId === comment.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskCommentList;
