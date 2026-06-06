import { useEffect, useRef, useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable } from '@dnd-kit/core';
import { FolderKanban, MoreVertical, Users } from 'lucide-react';
import { ProgressBar, StatusBadge } from './index';
import type { Task } from '../../types/task';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onEdit?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  overlay?: boolean;
}

export const TaskCard = ({ task, onClick, onEdit, onAssign, onDelete, disabled = false, overlay = false }: TaskCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: task.id,
    disabled,
    data: {
      taskId: task.id,
      status: task.status,
    },
  });

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  const handleRootRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    cardRef.current = node;
  };

  const assigneeCount = task.assignees?.length ?? 0;
  const progress = Math.max(0, Math.min(100, task.progress ?? 0));
  const showActions = Boolean(onEdit || onAssign || onDelete || onClick);
  const cardIsDragging = isDragging || overlay;

  return (
    <div
      ref={handleRootRef}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!menuOpen) {
          onClick?.();
        }
      }}
      className={`group relative rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        cardIsDragging ? 'scale-[1.03] rotate-1 border-blue-300 shadow-2xl ring-2 ring-blue-400/30' : ''
      } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-grab active:cursor-grabbing'} ${overlay ? 'pointer-events-none' : ''}`}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: cardIsDragging && !overlay ? 0.35 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.priority} />
            {disabled && <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">Saving...</span>}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-5 text-slate-900 line-clamp-2">
            {task.title}
          </h3>
        </div>

        {showActions && !overlay && (
          <div className="relative shrink-0">
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((current) => !current);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
              aria-label={`Open task actions for ${task.title}`}
              aria-expanded={menuOpen}
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {onClick && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      onClick();
                    }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    View
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                )}
                {onAssign && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      onAssign();
                    }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Assign
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 line-clamp-1 text-xs leading-5 text-slate-500">
        {task.description || 'No description provided.'}
      </p>

      <div className="mt-3 space-y-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>Progress</span>
            <span className="font-medium text-slate-900">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
            <FolderKanban size={14} className="shrink-0 text-slate-500" />
            <span className="min-w-0 truncate">{task.project?.name ?? '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
            <Users size={14} className="shrink-0 text-slate-500" />
            <span>{assigneeCount} assignees</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
