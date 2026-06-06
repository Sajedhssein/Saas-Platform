import { Modal } from './Modal';
import { Button } from './Button';

interface DeleteTaskModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  taskTitle?: string;
  loading?: boolean;
}

export const DeleteTaskModal = ({ open, onClose, onConfirm, taskTitle, loading = false }: DeleteTaskModalProps) => {
  return (
    <Modal open={open} onClose={onClose} title="Delete Task">
      <div className="space-y-4">
        <p>Are you sure you want to delete the task <strong>{taskTitle}</strong>? This action cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button variant="danger" onClick={onConfirm} isLoading={loading}>Delete</Button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteTaskModal;
