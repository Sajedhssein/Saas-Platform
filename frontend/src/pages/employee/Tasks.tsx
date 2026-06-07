import { useEffect, useState } from 'react';
import { CheckSquare, Clock, FolderOpen } from 'lucide-react';
import { DashboardCard, DataFetchError, EmptyState, LoadingSpinner, PageContainer, ProgressBar, StatusBadge } from '../../components/ui';
import TaskDetailsModal from '../../components/ui/TaskDetailsModal';
import { employeeService } from '../../services/employeeService';
import { taskService } from '../../services/taskService';
import type { Task } from '../../types/task';

export const EmployeeTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
  const [savingTaskIds, setSavingTaskIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    const loadTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await employeeService.getEmployeeTasks();

        if (!cancelled) {
          setTasks(response);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load tasks');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTasks();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <PageContainer title="My Tasks" description="View all your assigned tasks">
        <div className="p-8">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="My Tasks" description="View all your assigned tasks">
        <DataFetchError message={error} onRetry={() => setRefreshKey((value) => value + 1)} />
      </PageContainer>
    );
  }

  if (tasks.length === 0) {
    return (
      <PageContainer title="My Tasks" description="View all your assigned tasks">
        <EmptyState title="No assigned tasks" message="Tasks assigned to your account will appear here." />
      </PageContainer>
    );
  }

  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress');
  const selectedTask = detailsTaskId ? tasks.find((task) => task.id === detailsTaskId) ?? null : null;

  const handleStatusChange = async (taskId: string, status: Task['status']): Promise<Task> => {
    setSavingTaskIds((current) => ({ ...current, [taskId]: true }));

    try {
      const updatedTask = await taskService.updateEmployeeTaskStatus(taskId, status);
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...updatedTask } : task)));
      setRefreshKey((value) => value + 1);
      return updatedTask;
    } finally {
      setSavingTaskIds((current) => ({ ...current, [taskId]: false }));
    }
  };

  return (
    <PageContainer
      title="My Tasks"
      description="View all your assigned tasks"
    >
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <DashboardCard title="Tasks" value={tasks.length} icon={<CheckSquare size={22} />} />
        <DashboardCard title="In Progress" value={inProgressTasks.length} icon={<Clock size={22} />} />
        <DashboardCard title="Completed" value={completedTasks.length} icon={<FolderOpen size={22} />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => setDetailsTaskId(task.id)}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{task.description || 'No description provided.'}</p>
              </div>
              <StatusBadge status={task.status} />
            </div>

            <div className="mt-4 space-y-3">
              <ProgressBar value={task.progress} />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{task.project?.name ?? 'Project'}</span>
                <span>{task.progress}%</span>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
              {task.deadline ? `Due ${new Date(task.deadline).toLocaleDateString()}` : 'No due date set'}
            </div>
          </button>
        ))}
      </div>

      <TaskDetailsModal
        open={Boolean(detailsTaskId)}
        taskId={detailsTaskId}
        task={selectedTask}
        onClose={() => setDetailsTaskId(null)}
        onStatusChange={handleStatusChange}
        savingTaskIds={savingTaskIds}
        refreshToken={refreshKey}
        canUploadFiles={false}
        canDeleteFiles={false}
      />
    </PageContainer>
  );
};
