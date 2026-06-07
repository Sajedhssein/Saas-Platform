import { Clock, FileText, FolderKanban, Users } from 'lucide-react';
import type { Task, Project } from '../../types';
import { StatusBadge } from './StatusBadge';
import { Avatar } from './Avatar';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export const TaskCard = ({ task, onClick }: TaskCardProps) => {
  const previewAssignees = task.assignees.slice(0, 3);

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
          {task.title}
        </h3>
        <StatusBadge status={task.priority} />
      </div>

      <p className="text-xs text-slate-500 mb-4 line-clamp-2">
        {task.description}
      </p>

      <div className="flex items-center justify-between gap-2 mb-4 text-xs text-slate-600">
        <div className="flex items-center gap-2 min-w-0">
          <FolderKanban size={14} className="shrink-0" />
          <span className="truncate">{task.project.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Users size={14} />
          <span>{task.assignees.length}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex -space-x-2">
          {previewAssignees.map((assignee) => (
            <Avatar
              key={assignee.id}
              imageUrl={assignee.avatar}
              name={assignee.name}
              size="sm"
              className="h-6 w-6 border border-white"
            />
          ))}
        </div>
        {task.assignees.length > 3 && (
          <span className="text-xs text-slate-500">+{task.assignees.length - 3}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
        <div className="flex items-center gap-1">
          <Clock size={14} />
          {new Date(task.deadline).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-1">
          <FileText size={14} />
          {task.files.length}
        </div>
        <div className="flex items-center gap-1">
          <Users size={14} />
          {task.responses.length}
        </div>
      </div>
    </div>
  );
};

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const teamMembers = Array.isArray(project.employees) && project.employees.length > 0
    ? project.employees
    : Array.isArray(project.teamMembers) ? project.teamMembers : [];

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="h-24 bg-linear-to-r from-blue-500 to-blue-600" />

      <div className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          {project.name}
        </h3>
        <p className="text-xs text-slate-500 mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Client info (subtle) */}
        <div className="text-xs text-slate-500 mb-3 flex items-center justify-between gap-2">
          <span>
            Client: <span className="text-slate-700">{project.client?.name ?? 'No client assigned'}</span>
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            {teamMembers.length} Team Members
          </span>
        </div>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-700">
              Progress
            </span>
            <span className="text-xs font-semibold text-slate-900">
              {project.progress}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-linear-to-r from-blue-500 to-blue-600 h-full rounded-full"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {teamMembers.slice(0, 3).map((member, idx) => (
                <Avatar
                  key={idx}
                  imageUrl={member.avatar}
                  name={member.name}
                  size="sm"
                  className="h-6 w-6 border border-white text-[10px]"
                />
              ))}
            </div>
            {teamMembers.length > 3 && (
              <span className="text-xs text-slate-500">
                +{teamMembers.length - 3}
              </span>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>
    </div>
  );
};
