import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from './Modal';
import { Button, EmptyState, LoadingSpinner, StatusBadge, TaskActivityTimeline, TaskAttachmentList, TaskCommentList } from './index';
import { Select, Textarea } from './Input';
import TaskFileUpload from './TaskFileUpload';
import { taskService } from '../../services/taskService';
import type { Task, TaskComment, TaskFile } from '../../types/task';

const dedupeAssignees = (assignees: Task['assignees']): Task['assignees'] =>
  Array.from(new Map((assignees ?? []).map((assignee) => [assignee.id, assignee])).values());

interface Props {
  open: boolean;
  taskId?: string | null;
  task?: Task | null;
  onClose: () => void;
  onStatusChange?: (taskId: string, status: Task['status']) => Promise<Task>;
  onAssign?: (task: Task) => void;
  savingTaskIds?: Record<string, boolean>;
  refreshToken?: number;
}

const statusOptionClasses: Record<Task['status'], string> = {
  pending: 'border-slate-300 bg-slate-50 text-slate-900',
  in_progress: 'border-amber-300 bg-amber-50 text-amber-900',
  completed: 'border-green-300 bg-green-50 text-green-900',
};

const createOptimisticComment = (message: string): TaskComment => ({
  id: `temp-${Date.now()}`,
  message,
  content: message,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  author: {
    id: 'me',
    name: 'You',
    email: '',
  },
});

const TaskDetailsModal = ({
  open,
  taskId,
  task: taskProp,
  onClose,
  onStatusChange,
  onAssign,
  savingTaskIds,
  refreshToken,
}: Props) => {
  const [task, setTask] = useState<Task | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [comments, setComments] = useState<TaskComment[] | null>(null);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState<boolean>(false);
  const [downloadingFileIds, setDownloadingFileIds] = useState<Record<string, boolean>>({});
  const [deletingFileIds, setDeletingFileIds] = useState<Record<string, boolean>>({});
  const [taskRefreshToken, setTaskRefreshToken] = useState<number>(0);
  const [commentsRefreshToken, setCommentsRefreshToken] = useState<number>(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentMessage, setEditingCommentMessage] = useState<string>('');
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [deletingCommentIds, setDeletingCommentIds] = useState<Record<string, boolean>>({});
  const [isFileUploadOpen, setIsFileUploadOpen] = useState<boolean>(false);
  const displayedTask = taskProp && taskProp.id === taskId ? taskProp : task;

  useEffect(() => {
    let cancelled = false;

    if (!open || !taskId) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const fetchedTask = await taskService.getTask(taskId);
        if (cancelled) return;
        setTask(fetchedTask);
        setTaskError(null);
      } catch (fetchError) {
        if (cancelled) return;
        setTaskError(fetchError instanceof Error ? fetchError.message : 'Failed to load task');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, taskId, taskRefreshToken, refreshToken]);

  useEffect(() => {
    let cancelled = false;

    if (!open || !taskId) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const fetchedComments = await taskService.getTaskComments(taskId);
        if (cancelled) return;
        setComments(fetchedComments);
        setCommentsError(null);
      } catch (fetchError) {
        if (cancelled) return;
        setCommentsError(fetchError instanceof Error ? fetchError.message : 'Failed to load comments');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, taskId, commentsRefreshToken]);

  const handleClose = () => {
    setIsFileUploadOpen(false);
    onClose();
  };

  const busy = Boolean(savingTaskIds?.[displayedTask?.id ?? '']) || isCommentSubmitting;

  const retryTask = () => {
    setTask(null);
    setTaskError(null);
    setComments(null);
    setCommentsError(null);
    setTaskRefreshToken((current) => current + 1);
    setCommentsRefreshToken((current) => current + 1);
  };

  const handleStatusChange = async (nextStatus: Task['status']) => {
    if (!task || !onStatusChange) return;

    try {
      const updatedTask = await onStatusChange(task.id, nextStatus);
      setTask(updatedTask);
    } catch {
      // parent handles rollback/toast
    }
  };

  const handleAddComment = async () => {
    if (!task) return;

    const message = commentText.trim();
    if (!message) return;

    const optimisticComment = createOptimisticComment(message);
    const previousComments = comments ?? [];

    try {
      setIsCommentSubmitting(true);
      setComments((current) => [...(current ?? []), optimisticComment]);
      setCommentText('');

      const createdComment = await taskService.createTaskComment(task.id, { content: message });
      setComments((current) => (current ?? []).map((comment) => (comment.id === optimisticComment.id ? createdComment : comment)));
      toast.success('Comment added');
    } catch (commentError) {
      setComments(previousComments);
      setCommentText(message);
      toast.error(commentError instanceof Error ? commentError.message : 'Failed to add comment');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const startEditComment = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentMessage(comment.message);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentMessage('');
  };

  const handleUpdateComment = async () => {
    if (!task || !editingCommentId) return;

    const message = editingCommentMessage.trim();
    if (!message) return;

    const previousComments = comments ?? [];
    const originalComment = previousComments.find((comment) => comment.id === editingCommentId) ?? null;

    try {
      setIsEditingComment(true);
      setComments((current) =>
        (current ?? []).map((comment) =>
          comment.id === editingCommentId ? { ...comment, message, updated_at: new Date().toISOString() } : comment
        )
      );

      const updatedComment = await taskService.updateTaskComment(task.id, editingCommentId, { content: message });
      setComments((current) =>
        (current ?? []).map((comment) => (comment.id === editingCommentId ? updatedComment : comment))
      );
      toast.success('Comment updated');
      cancelEditComment();
    } catch (editError) {
      setComments(previousComments);
      if (originalComment) {
        setEditingCommentMessage(originalComment.message);
      }
      toast.error(editError instanceof Error ? editError.message : 'Failed to update comment');
    } finally {
      setIsEditingComment(false);
    }
  };

  const handleDeleteComment = async (comment: TaskComment) => {
    if (!task) return;

    const previousComments = comments ?? [];

    try {
      setDeletingCommentIds((current) => ({ ...current, [comment.id]: true }));
      setComments((current) => (current ?? []).filter((item) => item.id !== comment.id));
      if (editingCommentId === comment.id) {
        cancelEditComment();
      }
      await taskService.deleteTaskComment(task.id, comment.id);
      toast.success('Comment deleted');
    } catch (deleteError) {
      setComments(previousComments);
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete comment');
    } finally {
      setDeletingCommentIds((current) => ({ ...current, [comment.id]: false }));
    }
  };

  const setFileActionState = (fileId: string, key: 'downloading' | 'deleting', value: boolean) => {
    if (key === 'downloading') {
      setDownloadingFileIds((current) => ({ ...current, [fileId]: value }));
      return;
    }

    setDeletingFileIds((current) => ({ ...current, [fileId]: value }));
  };

  const handleDownloadFile = async (file: TaskFile) => {
    if (!task || !task.id || !file?.id) {
      toast.error('Unable to download file');
      return;
    }

    try {
      setFileActionState(file.id, 'downloading', true);
      const result = await taskService.downloadTaskFile(task.id, file.id);
      const objectUrl = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = result.filename;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : 'Unable to download file');
    } finally {
      setFileActionState(file.id, 'downloading', false);
    }
  };

  const handleDeleteFile = async (file: TaskFile) => {
    if (!task) return;

    const previousTask = task;

    try {
      setFileActionState(file.id, 'deleting', true);
      setTask((current) =>
        current
          ? {
              ...current,
              files: current.files.filter((item) => item.id !== file.id),
            }
          : current
      );
      await taskService.deleteTaskFile(task.id, file.id);
      toast.success('File deleted');
      setTaskRefreshToken((current) => current + 1);
    } catch (deleteError) {
      setTask(previousTask);
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete file');
    } finally {
      setFileActionState(file.id, 'deleting', false);
    }
  };

  const canEdit = !busy;
  const taskLoading = Boolean(open && taskId && !displayedTask && !taskError);
  const commentsLoading = Boolean(open && taskId && comments === null && !commentsError);
  const commentsControlsDisabled = busy || commentsLoading || Boolean(commentsError);
  const isSaving = displayedTask ? Boolean(savingTaskIds?.[displayedTask.id]) : false;
  const statusValue = displayedTask?.status ?? 'pending';
  const isAnyFileBusy = isFileUploadOpen || Object.values(downloadingFileIds).some(Boolean) || Object.values(deletingFileIds).some(Boolean);
  const isAnyCommentBusy = isCommentSubmitting || isEditingComment || Object.values(deletingCommentIds).some(Boolean);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={displayedTask ? `Task Details · ${displayedTask.title}` : 'Task Details'}
      panelClassName="max-w-4xl"
    >
      {taskLoading ? (
        <div className="space-y-4">
          <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          </div>
          <div className="flex justify-center pt-2">
            <LoadingSpinner />
          </div>
        </div>
      ) : taskError ? (
        <div className="p-4">
          <EmptyState title="Failed to load" message={taskError} />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button onClick={retryTask}>Retry</Button>
            <Button variant="secondary" onClick={handleClose}>Close</Button>
          </div>
        </div>
      ) : !displayedTask ? (
        <EmptyState title="No data" message="Task details unavailable." />
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm text-slate-500">Basic info</p>
                <h4 className="text-lg font-semibold text-slate-900 sm:text-xl">{displayedTask.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{displayedTask.description || 'No description provided.'}</p>
              </div>
              <StatusBadge status={displayedTask.status} />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Update Status</label>
                <div className="flex items-center gap-2">
                  <Select
                    value={statusValue}
                    onChange={(e) => void handleStatusChange(e.target.value as Task['status'])}
                    disabled={isSaving || !onStatusChange || isAnyFileBusy || isAnyCommentBusy}
                    className={`${statusOptionClasses[statusValue]} leading-6`}
                    style={{ lineHeight: '1.6', paddingBottom: '2px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </Select>
                  {isSaving && <LoadingSpinner />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                <div>
                  <p className="text-slate-500">Priority</p>
                  <p className="font-medium text-slate-900">{displayedTask.priority}</p>
                </div>
                <div>
                  <p className="text-slate-500">Progress</p>
                  <p className="font-medium text-slate-900">{displayedTask.progress}%</p>
                </div>
                <div>
                  <p className="text-slate-500">Deadline</p>
                  <p className="font-medium text-slate-900">{displayedTask.deadline ? new Date(displayedTask.deadline).toLocaleString() : '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Estimated Hours</p>
                  <p className="font-medium text-slate-900">{displayedTask.estimated_hours}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-900">Project</h4>
            <div className="text-sm text-slate-700">{displayedTask.project?.name ?? '-'}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-900">Creator</h4>
            <div className="text-sm text-slate-700">{displayedTask.creator?.name} &lt;{displayedTask.creator?.email}&gt;</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">Assignees ({displayedTask.assignees?.length ?? 0})</h4>
              {onAssign && (
                <Button variant="outline" size="sm" onClick={() => onAssign(displayedTask)} disabled={!canEdit}>
                  Assign Employees
                </Button>
              )}
            </div>
            {dedupeAssignees(displayedTask.assignees).length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {dedupeAssignees(displayedTask.assignees).map((assignee) => (
                  <span key={assignee.id} className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                    {assignee.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No assignees</div>
            )}
          </div>

          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-lg font-semibold text-slate-900">Attachments ({displayedTask.files?.length ?? 0})</h4>
              <Button variant="primary" size="sm" onClick={() => setIsFileUploadOpen(true)} disabled={!canEdit || isAnyCommentBusy}>
                Upload File
              </Button>
            </div>

            <TaskAttachmentList
              files={displayedTask.files ?? []}
              emptyMessage="No files uploaded yet. Use Upload File to add one."
              onDownload={handleDownloadFile}
              onDelete={handleDeleteFile}
              downloadingFileId={Object.keys(downloadingFileIds).find((id) => downloadingFileIds[id]) ?? null}
              deletingFileId={Object.keys(deletingFileIds).find((id) => deletingFileIds[id]) ?? null}
            />
          </section>

          <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-900">Comments ({comments?.length ?? 0})</h4>

            {commentsLoading ? (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
                <div className="h-12 animate-pulse rounded bg-slate-100" />
              </div>
            ) : commentsError ? (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{commentsError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCommentsRefreshToken((current) => current + 1)}
                  disabled={busy}
                >
                  Retry comments
                </Button>
              </div>
            ) : (
              <TaskCommentList
                comments={comments ?? []}
                emptyMessage="No comments yet."
                onEdit={startEditComment}
                onDelete={handleDeleteComment}
                editingCommentId={editingCommentId}
                deletingCommentId={Object.keys(deletingCommentIds).find((id) => deletingCommentIds[id]) ?? null}
              />
            )}

            {editingCommentId && (
              <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div>
                  <p className="text-sm font-medium text-blue-900">Edit comment</p>
                  <p className="text-xs text-blue-800">Update the selected comment and save your changes.</p>
                </div>
                <Textarea
                  value={editingCommentMessage}
                  onChange={(e) => setEditingCommentMessage(e.target.value)}
                  rows={4}
                  disabled={isEditingComment || isAnyFileBusy || !canEdit}
                  className="border-blue-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={cancelEditComment} disabled={isEditingComment}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleUpdateComment()}
                    disabled={!editingCommentMessage.trim() || isEditingComment || isAnyFileBusy}
                    isLoading={isEditingComment}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-700">Add comment</label>
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={4}
                disabled={commentsControlsDisabled || isCommentSubmitting || isEditingComment || !canEdit}
                placeholder="Write a comment..."
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCommentText('')}
                  disabled={commentsControlsDisabled || isCommentSubmitting || isEditingComment || !commentText.trim()}
                >
                  Clear
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void handleAddComment()}
                  disabled={commentsControlsDisabled || isCommentSubmitting || isEditingComment || !commentText.trim() || !canEdit}
                  isLoading={isCommentSubmitting}
                >
                  Post comment
                </Button>
              </div>
            </div>
          </section>

          <TaskActivityTimeline taskId={displayedTask.id} />

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-900">Timestamps</h4>
            <div className="text-sm text-slate-700">
              <p><strong>Created:</strong> {new Date(displayedTask.created_at).toLocaleString()}</p>
              <p><strong>Updated:</strong> {new Date(displayedTask.updated_at).toLocaleString()}</p>
            </div>
          </div>

          <TaskFileUpload
            key={`${displayedTask.id}-${open ? 'open' : 'closed'}-${isFileUploadOpen ? 'upload-open' : 'upload-closed'}`}
            open={isFileUploadOpen}
            taskId={displayedTask.id}
            onClose={() => setIsFileUploadOpen(false)}
            onUploaded={() => {
              setTaskRefreshToken((current) => current + 1);
            }}
          />
        </div>
      )}
    </Modal>
  );
};

export default TaskDetailsModal;
