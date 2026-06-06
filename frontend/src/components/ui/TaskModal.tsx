import { Modal } from './Modal';
import TaskForm from './TaskForm';
import type { Task, CreateTaskPayload, UpdateTaskPayload } from '../../types/task';

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: CreateTaskPayload) => Promise<void>;
  onUpdate?: (id: string, data: UpdateTaskPayload) => Promise<void>;
  initial?: Task | null;
  submitting?: boolean;
}

export const TaskModal = ({ open, onClose, onCreate, onUpdate, initial, submitting = false }: TaskModalProps) => {
  const isEdit = !!initial;
  const formKey = `${open ? 'open' : 'closed'}-${initial?.id ?? 'new'}`;

  const handleSubmit = async (data: CreateTaskPayload) => {
    if (isEdit && initial && onUpdate) {
      await onUpdate(initial.id, data);
    } else {
      await onCreate(data);
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Task' : 'Create Task'} panelClassName="max-w-3xl">
      <TaskForm key={formKey} initial={initial ?? undefined} onCancel={onClose} onSubmit={handleSubmit} submitting={submitting} />
    </Modal>
  );
};

export default TaskModal;
