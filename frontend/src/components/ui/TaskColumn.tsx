import { useDroppable } from '@dnd-kit/core';
import { AlertCircle } from 'lucide-react';
import TaskCard from './TaskCard';
import type { Task, TaskStatus } from '../../types/task';

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  emptyMessage: string;
  onTaskClick?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onAssignTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  isTaskSaving?: (taskId: string) => boolean;
}

export const TaskColumn = ({
  status,
  title,
  tasks,
  emptyMessage,
  onTaskClick,
  onEditTask,
  onAssignTask,
  onDeleteTask,
  isTaskSaving,
}: TaskColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={`flex min-w-80 flex-col rounded-3xl border bg-slate-50/80 p-3 shadow-sm transition-colors md:min-w-0 ${
        isOver ? 'border-blue-300 bg-blue-50/70 shadow-md' : 'border-slate-200'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{tasks.length} task{tasks.length === 1 ? '' : 's'}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${status === 'pending' ? 'bg-slate-100 text-slate-700' : status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
          {tasks.length}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-500">
            <div className="space-y-2">
              <AlertCircle size={18} className="mx-auto text-slate-400" />
              <p>{emptyMessage}</p>
            </div>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick ? () => onTaskClick(task) : undefined}
              onEdit={onEditTask ? () => onEditTask(task) : undefined}
              onAssign={onAssignTask ? () => onAssignTask(task) : undefined}
              onDelete={onDeleteTask ? () => onDeleteTask(task) : undefined}
              disabled={isTaskSaving?.(task.id)}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default TaskColumn;
