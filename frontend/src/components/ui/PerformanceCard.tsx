import { CheckCircle2, ListTodo, Timer } from 'lucide-react';
import { ProgressBar } from './StatusBadge';
import { TaskStatusBadge } from './TaskStatusBadge';

export interface PerformanceTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  project?: {
    id: string;
    name: string;
  } | null;
}

interface PerformanceCardProps {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  todo: number;
  completionRate: number;
  activeTasks?: PerformanceTask[];
}

export const PerformanceCard = ({
  totalAssigned,
  completed,
  inProgress,
  todo,
  completionRate,
  activeTasks = [],
}: PerformanceCardProps) => {
  const visibleTasks = activeTasks.slice(0, 4);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold leading-6 text-slate-900">Performance</p>
          <p className="text-xs leading-5 text-slate-500">{totalAssigned} assigned tasks</p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold leading-6 text-slate-900 ring-1 ring-slate-200">
          {Math.round(completionRate)}%
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={completionRate} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
          <p className="mt-1 text-lg font-semibold leading-7 text-slate-900">{completed}</p>
          <p className="text-[11px] font-medium leading-4 text-slate-500">Done</p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <Timer className="mx-auto h-4 w-4 text-blue-600" />
          <p className="mt-1 text-lg font-semibold leading-7 text-slate-900">{inProgress}</p>
          <p className="text-[11px] font-medium leading-4 text-slate-500">Active</p>
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <ListTodo className="mx-auto h-4 w-4 text-slate-600" />
          <p className="mt-1 text-lg font-semibold leading-7 text-slate-900">{todo}</p>
          <p className="text-[11px] font-medium leading-4 text-slate-500">Todo</p>
        </div>
      </div>

      {visibleTasks.length > 0 && (
        <div className="mt-4 space-y-2">
          {visibleTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-5 text-slate-900">{task.title}</p>
                <p className="truncate text-[11px] leading-4 text-slate-500">{task.project?.name ?? 'No project'}</p>
              </div>
              <TaskStatusBadge status={task.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceCard;
