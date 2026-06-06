import { useEffect, useState, type FormEvent } from 'react';
import { Button } from './Button';
import { Input, Select, Textarea } from './Input';
import type { CreateTaskPayload, Task, TaskPriority } from '../../types/task';
import type { Project } from '../../types/project';
import { projectService } from '../../services/projectService';

interface TaskFormProps {
  initial?: Partial<CreateTaskPayload> | Task;
  onCancel: () => void;
  onSubmit: (data: CreateTaskPayload) => Promise<void>;
  submitting?: boolean;
}

export const TaskForm = ({ initial, onCancel, onSubmit, submitting = false }: TaskFormProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const buildFormState = (source?: Partial<CreateTaskPayload> | Task): CreateTaskPayload => ({
    project_id: source?.project_id ?? '',
    title: source?.title ?? '',
    description: source?.description ?? '',
    priority: source?.priority ?? ('medium' as TaskPriority),
    deadline: source?.deadline ?? '',
    estimated_hours: source?.estimated_hours ?? 0,
    status: source?.status ?? 'pending',
    progress: source?.progress ?? 0,
  });

  const [form, setForm] = useState<CreateTaskPayload>(() => buildFormState(initial));

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProjects(true);
      try {
        const resp = await projectService.getProjects({ per_page: 999 });
        if (cancelled) return;
        setProjects(resp.data);
      } catch {
        // ignore, dropdown can be empty
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title || form.title.trim() === '') e.title = 'Title is required';
    if (!form.project_id) e.project_id = 'Project is required';
    if (form.estimated_hours < 0) e.estimated_hours = 'Estimated hours must be 0 or more';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  function handleChange<K extends keyof CreateTaskPayload>(key: K, value: CreateTaskPayload[K]) {
    setForm((f) => ({ ...f, [key]: value } as CreateTaskPayload));
  }

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    await onSubmit(buildFormState(form));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Select
          label="Project"
          value={form.project_id}
          onChange={(e) => handleChange('project_id', e.target.value)}
          disabled={loadingProjects}
          error={errors.project_id}
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      <Input label="Title" value={form.title} onChange={(e) => handleChange('title', e.target.value)} error={errors.title} />

      <div>
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Select
            label="Priority"
            value={form.priority}
            onChange={(e) => handleChange('priority', e.target.value as TaskPriority)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>

        <div>
          <Input label="Estimated Hours" type="number" value={String(form.estimated_hours)} onChange={(e) => handleChange('estimated_hours', Number(e.target.value))} error={errors.estimated_hours} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-800 mb-2">Deadline</label>
        <Input
          type="datetime-local"
          value={form.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button variant="primary" type="submit" isLoading={submitting}>Save</Button>
      </div>
    </form>
  );
};

export default TaskForm;
