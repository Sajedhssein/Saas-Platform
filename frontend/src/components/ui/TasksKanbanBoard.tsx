import { useMemo, useState } from 'react';
import { closestCenter, DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import TaskColumn from './TaskColumn';
import type { Task, TaskStatus } from '../../types/task';

const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

const STATUS_TITLES: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const EMPTY_MESSAGES: Record<TaskStatus, string> = {
  pending: 'No pending tasks',
  in_progress: 'No tasks in progress',
  completed: 'No completed tasks',
};

const isTaskStatus = (value: string): value is TaskStatus => TASK_STATUSES.includes(value as TaskStatus);

interface TasksKanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onAssignTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => Promise<Task>;
  isTaskSaving?: (taskId: string) => boolean;
}

export const TasksKanbanBoard = ({
  tasks = [],
  onTaskClick,
  onEditTask,
  onAssignTask,
  onDeleteTask,
  onTaskStatusChange,
  isTaskSaving,
}: TasksKanbanBoardProps) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const safeTasks = useMemo(() => tasks ?? [], [tasks]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const activeTask = useMemo(() => safeTasks.find((task) => task.id === activeTaskId) ?? null, [activeTaskId, safeTasks]);

  const groupedTasks = useMemo(
    () =>
      TASK_STATUSES.reduce<Record<TaskStatus, Task[]>>(
        (accumulator, status) => ({
          ...accumulator,
          [status]: safeTasks.filter((task) => task.status === status),
        }),
        {
          pending: [],
          in_progress: [],
          completed: [],
        }
      ),
    [safeTasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) {
      return;
    }

    const task = safeTasks.find((item) => item.id === active.id);
    if (!task) {
      return;
    }

    const overId = String(over.id);
    if (!isTaskStatus(overId) || task.status === overId) {
      return;
    }

    void onTaskStatusChange(task.id, overId).catch(() => undefined);
  };

  const handleDragCancel = () => {
    setActiveTaskId(null);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
        {TASK_STATUSES.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            title={STATUS_TITLES[status]}
            tasks={groupedTasks[status]}
            emptyMessage={EMPTY_MESSAGES[status]}
            onTaskClick={onTaskClick}
            onEditTask={onEditTask}
            onAssignTask={onAssignTask}
            onDeleteTask={onDeleteTask}
            isTaskSaving={isTaskSaving}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-full max-w-md">
            <TaskCard task={activeTask} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TasksKanbanBoard;
