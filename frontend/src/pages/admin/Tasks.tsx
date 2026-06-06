import { useCallback, useEffect, useMemo, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, DataFetchError, EmptyState, LoadingSpinner, PageContainer } from '../../components/ui';
import { ProgressBar, StatusBadge } from '../../components/ui';
import TasksKanbanBoard from '../../components/ui/TasksKanbanBoard';
import TaskModal from '../../components/ui/TaskModal';
import TaskDetailsModal from '../../components/ui/TaskDetailsModal';
import TaskAssignmentModal from '../../components/ui/TaskAssignmentModal';
import DeleteTaskModal from '../../components/ui/DeleteTaskModal';
import { projectService } from '../../services/projectService';
import { taskService, TASK_MUTATION_EVENT } from '../../services/taskService';
import { toast } from 'react-hot-toast';
import type { Project } from '../../types/project';
import type { CreateTaskPayload, PaginatedTasksResponse, Task, UpdateTaskPayload } from '../../types/task';

const statusSelectClasses: Record<Task['status'], string> = {
  pending: 'border-slate-300 bg-slate-50 text-slate-900',
  in_progress: 'border-amber-300 bg-amber-50 text-amber-900',
  completed: 'border-green-300 bg-green-50 text-green-900',
};

const dedupeAssignees = (assignees: Task['assignees']): Task['assignees'] =>
  Array.from(new Map((assignees ?? []).map((assignee) => [assignee.id, assignee])).values());

export const AdminTasks = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTaskId = searchParams.get('taskId');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [refreshToken, setRefreshToken] = useState<number>(0);
  const [meta, setMeta] = useState<PaginatedTasksResponse['meta'] | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [assignmentTask, setAssignmentTask] = useState<Task | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [savingTaskIds, setSavingTaskIds] = useState<Record<string, boolean>>({});
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [rowMenuPosition, setRowMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterProjectId, setFilterProjectId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await projectService.getProjects({ per_page: 100 });
        if (cancelled) return;
        setProjects(response.data ?? []);
      } catch {
        // Ignore filter loading failures; tasks still work without project names.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleMutation = () => {
      setRefreshToken((current) => current + 1);
    };

    window.addEventListener(TASK_MUTATION_EVENT, handleMutation);
    return () => window.removeEventListener(TASK_MUTATION_EVENT, handleMutation);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = { page, per_page: 10 };
        const response = await taskService.getTasks(params);
        if (cancelled) return;
        setTasks(response.data);
        setMeta(response.meta ?? null);
        setError(null);
      } catch (fetchError) {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load tasks');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, refreshToken]);

  const requestedTask = useMemo(
    () => (requestedTaskId ? tasks.find((task) => task.id === requestedTaskId) ?? null : null),
    [requestedTaskId, tasks],
  );
  const activeDetailsTaskId = detailsTaskId ?? requestedTask?.id ?? null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const filteredTasks = useMemo(() => {
    const query = debouncedSearch.toLowerCase();

    return tasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query)) return false;
      if (filterStatus && task.status !== filterStatus) return false;
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterProjectId && task.project?.id !== filterProjectId) return false;
      return true;
    });
  }, [tasks, debouncedSearch, filterStatus, filterPriority, filterProjectId]);

  const setTaskSaving = (taskId: string, saving: boolean) => {
    setSavingTaskIds((current) => ({
      ...current,
      [taskId]: saving,
    }));
  };

  const handleCreate = async (data: CreateTaskPayload) => {
    try {
      setCreateLoading(true);
      const created = await taskService.createTask(data);
      setTasks((current) => [created, ...current]);
      toast.success('Task created');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'Create failed');
      throw createError;
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (id: string, data: UpdateTaskPayload) => {
    const previousTask = tasks.find((task) => task.id === id) ?? null;

    try {
      setEditLoading(true);
      setTasks((current) => current.map((task) => (task.id === id ? ({ ...task, ...data } as Task) : task)));
      const updatedTask = await taskService.updateTask(id, data);
      setTasks((current) => current.map((task) => (task.id === id ? updatedTask : task)));
      toast.success('Task updated');
    } catch (updateError) {
      if (previousTask) {
        setTasks((current) => current.map((task) => (task.id === id ? previousTask : task)));
      }
      toast.error(updateError instanceof Error ? updateError.message : 'Update failed');
      throw updateError;
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (task: Task) => {
    const previousTasks = tasks;

    try {
      setDeleteLoading(true);
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setDeleteTarget(null);
      await taskService.deleteTask(task.id);
      toast.success('Task deleted');
    } catch (deleteError) {
      setTasks(previousTasks);
      toast.error(deleteError instanceof Error ? deleteError.message : 'Delete failed');
      throw deleteError;
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    const previousTask = tasks.find((task) => task.id === taskId) ?? null;

    if (!previousTask) {
      throw new Error('Task not found');
    }

    try {
      setTaskSaving(taskId, true);
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));

      const updatedTask = await taskService.updateTaskStatus(taskId, status);
      setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));
      toast.success('Task status updated');
      return updatedTask;
    } catch (statusError) {
      setTasks((current) => current.map((task) => (task.id === taskId ? previousTask : task)));
      toast.error(statusError instanceof Error ? statusError.message : 'Status update failed');
      throw statusError;
    } finally {
      setTaskSaving(taskId, false);
    }
  };

  const handleAssignTask = async (employeeIds: string[], selectedEmployees: Task['assignees']) => {
    if (!assignmentTask) {
      return;
    }

    const taskId = assignmentTask.id;
    const previousTask = tasks.find((task) => task.id === taskId) ?? null;

    if (!previousTask) {
      throw new Error('Task not found');
    }

    try {
      setTaskSaving(taskId, true);
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                assignees: selectedEmployees,
              }
            : task
        )
      );

      const updatedTask = await taskService.assignTask(taskId, employeeIds);
      setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));
      setAssignmentTask(null);
      toast.success('Task assigned');
    } catch (assignError) {
      setTasks((current) => current.map((task) => (task.id === taskId ? previousTask : task)));
      toast.error(assignError instanceof Error ? assignError.message : 'Assignment failed');
      throw assignError;
    } finally {
      setTaskSaving(taskId, false);
    }
  };

  const handlePageChange = (nextPage: number) => {
    setLoading(true);
    setError(null);
    setPage(nextPage);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRefreshToken((current) => current + 1);
  };

  const isTaskSaving = (taskId: string) => Boolean(savingTaskIds[taskId]);

  const closeRowMenu = useCallback(() => {
    setOpenRowMenuId(null);
    setRowMenuPosition(null);
  }, []);

  useEffect(() => {
    if (!openRowMenuId) {
      return;
    }

    const handleDocumentClick = () => {
      closeRowMenu();
    };

    document.addEventListener('pointerdown', handleDocumentClick);
    window.addEventListener('scroll', closeRowMenu, true);
    window.addEventListener('resize', closeRowMenu);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentClick);
      window.removeEventListener('scroll', closeRowMenu, true);
      window.removeEventListener('resize', closeRowMenu);
    };
  }, [closeRowMenu, openRowMenuId]);

  const renderAssignees = (task: Task) => {
    const assignees = dedupeAssignees(task.assignees);

    if (assignees.length === 0) {
      return <span className="text-slate-500">-</span>;
    }

    const visibleAssignees = assignees.slice(0, 2);
    const remainingCount = assignees.length - visibleAssignees.length;

    return (
      <div className="flex flex-wrap gap-1">
        {visibleAssignees.map((assignee) => (
          <span key={assignee.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {assignee.name}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
            +{remainingCount}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <PageContainer title="Tasks" description="Manage all tasks in your organization">
        <div className="p-8">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Tasks" description="Manage all tasks in your organization">
        <DataFetchError message={error} onRetry={handleRetry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Tasks"
      description="Manage all tasks in your organization"
      action={
        <Button variant="primary" size="lg" className="gap-2" onClick={() => setOpenNew(true)}>
          New Task
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-full rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setOpenRowMenuId(null);
              setRowMenuPosition(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              viewMode === 'list' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={viewMode === 'list'}
          >
            List View
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('board');
              setOpenRowMenuId(null);
              setRowMenuPosition(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              viewMode === 'board' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-pressed={viewMode === 'board'}
          >
            Board View
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {viewMode === 'board' ? 'Drag cards between columns to update status instantly.' : 'Use the list for filters, bulk review, and CRUD actions.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title..."
          className="w-full rounded-md border border-slate-300 px-3 py-2 sm:w-1/3"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <div className="sm:ml-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearch('');
              setDebouncedSearch('');
              setFilterStatus('');
              setFilterPriority('');
              setFilterProjectId('');
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <EmptyState title="No tasks found" message="Try adjusting your search or filters." />
      ) : viewMode === 'board' ? (
        <TasksKanbanBoard
          tasks={filteredTasks}
          onTaskClick={(task) => setDetailsTaskId(task.id)}
          onEditTask={(task) => setSelectedTask(task)}
          onAssignTask={(task) => setAssignmentTask(task)}
          onDeleteTask={(task) => setDeleteTarget(task)}
          onTaskStatusChange={handleStatusChange}
          isTaskSaving={isTaskSaving}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-350">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Creator</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Progress</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Deadline</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Est. Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Assignees</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Files</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="cursor-pointer align-top transition-colors hover:bg-slate-50/80"
                    onClick={() => setDetailsTaskId(task.id)}
                  >
                    <td className="px-4 py-4 text-sm text-slate-900">
                      <div className="max-w-[16rem] space-y-1">
                        <p className="font-medium leading-5 text-slate-900 line-clamp-2">{task.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2">{task.description || 'No description provided.'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{task.project?.name ?? '-'}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{task.creator?.name ?? '-'}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <StatusBadge status={task.priority} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          disabled={isTaskSaving(task.id)}
                          onChange={(e) => void handleStatusChange(task.id, e.target.value as Task['status'])}
                          className={`w-full rounded-md border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${statusSelectClasses[task.status]}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <div className="min-w-40 space-y-2">
                        <ProgressBar value={task.progress} />
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Progress</span>
                          <span className="font-medium text-slate-900">{task.progress}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(task.deadline).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{task.estimated_hours}h</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{renderAssignees(task)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{task.files?.length ?? 0}</td>
                    <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {new Date(task.created_at).toLocaleDateString()}
                    </td>
                    <td className="relative px-4 py-4 text-sm text-slate-600 overflow-visible">
                      <div className="flex justify-start" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(event) => {
                            const buttonRect = event.currentTarget.getBoundingClientRect();
                            setRowMenuPosition({
                              top: buttonRect.bottom + window.scrollY + 8,
                              left: buttonRect.right + window.scrollX - 160,
                            });
                            setOpenRowMenuId((current) => (current === task.id ? null : task.id));
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                          aria-label={`Open actions for ${task.title}`}
                          aria-expanded={openRowMenuId === task.id}
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openRowMenuId && rowMenuPosition && (
        <div
          className="fixed z-50 w-40 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
          style={{ top: rowMenuPosition.top, left: rowMenuPosition.left }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {(() => {
            const activeTask = filteredTasks.find((task) => task.id === openRowMenuId);

            if (!activeTask) {
              return null;
            }

            return (
              <>
                <button
                  type="button"
                  onClick={() => {
                    closeRowMenu();
                    setSelectedTask(activeTask);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeRowMenu();
                    setDetailsTaskId(activeTask.id);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeRowMenu();
                    setAssignmentTask(activeTask);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Assign
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeRowMenu();
                    setDeleteTarget(activeTask);
                  }}
                  className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}

      <TaskModal
        open={openNew || !!selectedTask}
        onClose={() => {
          setOpenNew(false);
          setSelectedTask(null);
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        initial={selectedTask ?? undefined}
        submitting={openNew ? createLoading : editLoading}
      />

      <TaskDetailsModal
        key={`details-${activeDetailsTaskId ?? 'closed'}`}
        open={Boolean(activeDetailsTaskId)}
        taskId={activeDetailsTaskId}
        task={activeDetailsTaskId ? tasks.find((task) => task.id === activeDetailsTaskId) ?? null : null}
        onClose={() => {
          setDetailsTaskId(null);
          if (requestedTaskId) {
            navigate('/admin/tasks', { replace: true });
          }
        }}
        onStatusChange={handleStatusChange}
        onAssign={(task: Task) => setAssignmentTask(task)}
        savingTaskIds={savingTaskIds}
      />

      <TaskAssignmentModal
        key={`assignment-${assignmentTask ? assignmentTask.id : 'closed'}`}
        open={Boolean(assignmentTask)}
        task={assignmentTask}
        onClose={() => setAssignmentTask(null)}
        onSubmit={handleAssignTask}
        submitting={assignmentTask ? isTaskSaving(assignmentTask.id) : false}
      />

      <DeleteTaskModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await handleDelete(deleteTarget);
          }
        }}
        taskTitle={deleteTarget?.title}
        loading={deleteLoading}
      />

      {meta && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page <= 1}>
            Prev
          </Button>
          <div className="rounded bg-slate-100 px-4 py-2">
            Page {meta.current_page} / {meta.last_page}
          </div>
          <Button onClick={() => handlePageChange(Math.min(meta.last_page, page + 1))} disabled={page >= meta.last_page}>
            Next
          </Button>
        </div>
      )}
    </PageContainer>
  );
};

export default AdminTasks;
