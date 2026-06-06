import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from './Modal';
import { Button, EmptyState, LoadingSpinner, SearchBar } from './index';
import { employeeService } from '../../services/employeeService';
import type { Task, TaskAssignee } from '../../types/task';
import type { User } from '../../types';

interface TaskAssignmentModalProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSubmit: (employeeIds: string[], selectedEmployees: TaskAssignee[]) => Promise<void>;
  submitting?: boolean;
}

const toTaskAssignee = (employee: User): TaskAssignee => ({
  id: employee.id,
  name: employee.name,
  email: employee.email,
  avatar: employee.avatar ?? null,
});

const dedupeEmployees = (employees: User[]): User[] =>
  Array.from(new Map(employees.map((employee) => [employee.id, employee])).values());

export const TaskAssignmentModal = ({
  open,
  task,
  onClose,
  onSubmit,
  submitting = false,
}: TaskAssignmentModalProps) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => Array.from(new Set(task?.assignees?.map((assignee) => assignee.id) ?? [])));
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedEmployees, setHasLoadedEmployees] = useState<boolean>(false);
  const [isSubmittingLocal, setIsSubmittingLocal] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await employeeService.getEmployees();
        if (cancelled) return;
        const filtered = dedupeEmployees(response.filter((employee) => employee.role === 'employee' || !employee.role));
        setEmployees(filtered);
        setHasLoadedEmployees(true);
      } catch (fetchError) {
        if (cancelled) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load employees');
        setHasLoadedEmployees(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dedupeEmployees(employees).filter((employee) => {
      if (!query) return true;
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query)
      );
    });
  }, [employees, search]);

  const selectedEmployees = useMemo(
    () => dedupeEmployees(employees).filter((employee) => selectedIds.includes(employee.id)).map(toTaskAssignee),
    [employees, selectedIds]
  );

  const toggleEmployee = (employeeId: string) => {
    setSelectedIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const handleSubmit = async () => {
    try {
      setIsSubmittingLocal(true);
      await onSubmit(selectedIds, selectedEmployees);
      onClose();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to assign employees');
    } finally {
      setIsSubmittingLocal(false);
    }
  };

  const loadingEmployees = open && !error && !hasLoadedEmployees;
  const emptyState = !loadingEmployees && !error && filteredEmployees.length === 0;
  const busy = submitting || isSubmittingLocal;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? `Assign Employees · ${task.title}` : 'Assign Employees'}
    >
      <div className="space-y-4">
        {task && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Current assignees</p>
            <p>{task.assignees?.length ?? 0} employee(s) already assigned</p>
            <p className="mt-1 text-xs text-slate-500">Select or unselect employees, then save the final list.</p>
          </div>
        )}

        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees by name or email"
        />

        <div className="rounded-lg border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-medium text-slate-900">Employees</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {loadingEmployees ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="p-4">
                <EmptyState title="Failed to load employees" message={error} />
              </div>
            ) : emptyState ? (
              <div className="p-4">
                <EmptyState title="No employees found" message="Try a different search term." />
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEmployees.map((employee) => {
                  const checked = selectedIds.includes(employee.id);
                  return (
                    <label
                      key={employee.id}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        checked ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-900'
                      } ${busy ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmployee(employee.id)}
                        disabled={busy}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-slate-600">{employee.email}</p>
                      </div>
                      <span className="text-sm font-medium text-slate-500">{checked ? 'Selected' : 'Add'}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            type="button"
            isLoading={busy}
            disabled={busy}
          >
            Save Assignments
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskAssignmentModal;
