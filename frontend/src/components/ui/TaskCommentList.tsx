import type { TaskComment } from '../../types/task';

interface TaskCommentListProps {
  comments: TaskComment[];
  emptyMessage?: string;
  onEdit?: (comment: TaskComment) => void;
  onDelete?: (comment: TaskComment) => void;
  editingCommentId?: string | null;
  deletingCommentId?: string | null;
}

const resolveAuthorName = (comment: TaskComment): string =>
  comment.user?.name ?? comment.author?.name ?? comment.created_by?.name ?? 'Unknown';

export const TaskCommentList = ({
  comments,
  emptyMessage = 'No comments yet.',
  onEdit,
  onDelete,
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
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{resolveAuthorName(comment)}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.message}</p>
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
