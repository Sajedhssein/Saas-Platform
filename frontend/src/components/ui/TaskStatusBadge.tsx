import type { TaskStatus } from '../../types/task';

type DisplayStatus = TaskStatus | 'todo' | 'overdue';

interface TaskStatusBadgeProps {
  status: DisplayStatus;
  label?: string;
}

const normalizeStatus = (status: DisplayStatus): TaskStatus | 'overdue' => (
  status === 'todo' ? 'pending' : status
);

export const TaskStatusBadge = ({ status, label }: TaskStatusBadgeProps) => {
  const normalized = normalizeStatus(status);
  const styles: Record<TaskStatus | 'overdue', string> = {
    pending: 'bg-slate-100 text-slate-700 ring-slate-200',
    in_progress: 'bg-blue-100 text-blue-700 ring-blue-200',
    completed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    overdue: 'bg-rose-100 text-rose-700 ring-rose-200',
  };
  const labels: Record<TaskStatus | 'overdue', string> = {
    pending: 'Todo',
    in_progress: 'In Progress',
    completed: 'Completed',
    overdue: 'Overdue',
  };

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-5 ring-1 ${styles[normalized]}`}>
      {label ?? labels[normalized]}
    </span>
  );
};

export default TaskStatusBadge;
