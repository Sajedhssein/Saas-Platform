import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  Button,
  DataFetchError,
  EmployeeTable,
  Input,
  LoadingSpinner,
  Modal,
  PageContainer,
  SearchBar,
  EmptyState,
  Avatar,
  PerformanceCard,
} from '../../components/ui';
import type { Employee } from '../../types';
import {
  employeeService,
  type CreateEmployeePayload,
  type EmployeeRecord,
  type UpdateEmployeePayload,
} from '../../services/employeeService';

interface EmployeeFormState {
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: string;
  avatar: string;
}

const emptyFormState: EmployeeFormState = {
  name: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  status: 'active',
  avatar: '',
};

const normalizeEmployee = (employee: EmployeeRecord): Employee => ({
  id: employee.id,
  name: employee.name || 'Unnamed Employee',
  email: employee.email || '',
  role: employee.role || 'employee',
  position: employee.position || 'Employee',
  phone: employee.phone ?? '',
  status: employee.status ?? '',
  joinedDate: employee.joinedDate ?? employee.createdAt ?? employee.created_at ?? '',
  avatar: employee.avatar || '',
  performance: Number(employee.completion_rate ?? employee.performance ?? 0),
  completedTasks: Number(employee.completed_tasks ?? employee.completedTasks ?? 0),
  totalAssignedTasks: Number(employee.total_assigned_tasks ?? 0),
  inProgressTasks: Number(employee.in_progress_tasks ?? 0),
  todoTasks: Number(employee.todo_tasks ?? employee.pending_tasks ?? 0),
  completionRate: Number(employee.completion_rate ?? 0),
  activeTasks: employee.active_tasks ?? [],
  department: employee.department || 'General',
});

export const AdminEmployees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDetailsEmployee, setSelectedDetailsEmployee] = useState<Employee | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormState>(emptyFormState);

  const loadEmployees = async () => {
    try {
      const response = await employeeService.getEmployees();
      setEmployees(response.map(normalizeEmployee));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadEmployees();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    void loadEmployees();
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return employees;
    }

    return employees.filter((employee) => {
      return [employee.name, employee.email, employee.department, employee.position ?? employee.role]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [employees, search]);

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const averagePerformance =
      totalEmployees > 0
        ? Math.round(
            employees.reduce((total, employee) => total + employee.performance, 0) /
              totalEmployees
          )
        : 0;
    const activeToday = employees.filter((employee) => employee.completedTasks > 0).length;
    const tasksCompleted = employees.reduce((total, employee) => total + employee.completedTasks, 0);

    return [
      { label: 'Total Employees', value: totalEmployees.toString(), color: 'bg-blue-50' },
      { label: 'Active Today', value: activeToday.toString(), color: 'bg-green-50' },
      { label: 'Avg Performance', value: `${averagePerformance}%`, color: 'bg-purple-50' },
      { label: 'Tasks Completed', value: tasksCompleted.toString(), color: 'bg-orange-50' },
    ];
  }, [employees]);

  const openCreateModal = () => {
    navigate('/admin/invites?role=employee');
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone ?? '',
      position: employee.position ?? '',
      department: employee.department ?? '',
      status: employee.status || 'active',
      avatar: employee.avatar || '',
    });
    setFormOpen(true);
  };

  const openDetailsModal = async (employee: Employee) => {
    setDetailsOpen(true);
    setSelectedDetailsEmployee(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const employeeDetails = await employeeService.getEmployee(employee.id);
      setSelectedDetailsEmployee(normalizeEmployee(employeeDetails));
    } catch (loadError) {
      setDetailError(loadError instanceof Error ? loadError.message : 'Failed to load employee details');
      setSelectedDetailsEmployee(employee);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setDetailsOpen(false);
    setSelectedDetailsEmployee(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const closeForm = () => {
    if (isSubmitting || isDeleting) {
      return;
    }

    setFormOpen(false);
    setSelectedEmployee(null);
    setFormData(emptyFormState);
  };

  const handleChange = (field: keyof EmployeeFormState, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const createPayload: CreateEmployeePayload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      position: formData.position.trim() || 'Employee',
      department: formData.department.trim() || 'General',
      status: formData.status.trim() || 'active',
      avatar: formData.avatar.trim(),
      role: 'employee',
    };

    const updatePayload: UpdateEmployeePayload = { ...createPayload };

    setIsSubmitting(true);

    try {
      if (selectedEmployee) {
        await employeeService.updateEmployee(selectedEmployee.id, updatePayload);
        toast.success('Employee updated');
      } else {
        await employeeService.createEmployee(createPayload);
        toast.success('Employee created');
      }

      setFormOpen(false);
      setSelectedEmployee(null);
      setFormData(emptyFormState);
      await loadEmployees();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : 'Failed to save employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    if (!selectedEmployee) {
      return;
    }

    setFormOpen(false);
    setDeleteTarget(selectedEmployee);
  };

  useEffect(() => {
    if (!selectedDetailsEmployee) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDetailsModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDetailsEmployee]);

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      await employeeService.deleteEmployee(deleteTarget.id);
      toast.success('Employee deleted');
      setDeleteTarget(null);
      await loadEmployees();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete employee');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <PageContainer
        title="Employees"
        description="Manage your team members and track their performance"
      >
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer
        title="Employees"
        description="Manage your team members and track their performance"
      >
        <DataFetchError message={error} onRetry={handleRetry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Employees"
      description="Manage your team members and track their performance"
      action={
        <Button variant="primary" size="lg" className="gap-2" onClick={openCreateModal}>
          <Plus size={20} />
          Add Employee
        </Button>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-lg p-4 border border-slate-200`}>
              <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees by name, email, department, or position"
            className="w-full sm:max-w-xl"
          />
          <p className="text-sm text-slate-500">
            Click a row to view quick details. Use the details panel to inspect employee info.
          </p>
        </div>

        {filteredEmployees.length === 0 ? (
          <EmptyState
            title="No employees found"
            message={search.trim() ? 'Try a different search term.' : 'Add your first employee to get started.'}
          />
        ) : (
          <EmployeeTable employees={filteredEmployees} onEmployeeClick={openDetailsModal} />
        )}
      </div>

      <Modal
        open={detailsOpen}
        onClose={closeDetailsModal}
        title="Employee Details"
        panelClassName="max-w-xl"
      >
        <div className="space-y-6">
          {detailLoading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner />
            </div>
          ) : detailError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {detailError}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar imageUrl={selectedDetailsEmployee?.avatar} name={selectedDetailsEmployee?.name} size="lg" />
              <div>
                <p className="text-lg font-semibold text-slate-900">{selectedDetailsEmployee?.name ?? 'Not provided'}</p>
                <p className="text-sm text-slate-500">{selectedDetailsEmployee?.email ?? 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedDetailsEmployee) {
                    closeDetailsModal();
                    openEditModal(selectedDetailsEmployee);
                  }
                }}
              >
                Edit
              </Button>
              <Button type="button" onClick={closeDetailsModal}>Close</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.16em]">Phone Number</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedDetailsEmployee?.phone || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.16em]">Department</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedDetailsEmployee?.department || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.16em]">Position</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedDetailsEmployee?.position || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.16em]">Role</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedDetailsEmployee?.role || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.16em]">Status</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedDetailsEmployee?.status || 'Not provided'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.16em]">Join Date</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedDetailsEmployee?.joinedDate || 'Not provided'}</p>
            </div>
          </div>

          <PerformanceCard
            totalAssigned={selectedDetailsEmployee?.totalAssignedTasks ?? 0}
            completed={selectedDetailsEmployee?.completedTasks ?? 0}
            inProgress={selectedDetailsEmployee?.inProgressTasks ?? 0}
            todo={selectedDetailsEmployee?.todoTasks ?? 0}
            completionRate={selectedDetailsEmployee?.completionRate ?? selectedDetailsEmployee?.performance ?? 0}
            activeTasks={selectedDetailsEmployee?.activeTasks ?? []}
          />
        </div>
      </Modal>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={selectedEmployee ? 'Edit Employee' : 'Add Employee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              required
              disabled={isSubmitting}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(event) => handleChange('email', event.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(event) => handleChange('phone', event.target.value)}
              placeholder="+1 (555) 123-4567"
              disabled={isSubmitting}
            />
            <Input
              label="Position"
              value={formData.position}
              onChange={(event) => handleChange('position', event.target.value)}
              placeholder="Senior Developer"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Department"
              value={formData.department}
              onChange={(event) => handleChange('department', event.target.value)}
              placeholder="Engineering"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-slate-800">Status</span>
            <div className="flex gap-3 rounded-lg border border-slate-300 p-1 bg-slate-50">
              {['active', 'inactive'].map((status) => (
                <label key={status} className="flex-1">
                  <input
                    type="radio"
                    name="status"
                    value={status}
                    checked={formData.status === status}
                    onChange={(event) => handleChange('status', event.target.value)}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  <span className={`block px-4 py-2 rounded text-center text-sm font-medium cursor-pointer transition-colors ${
                    formData.status === status
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                      : 'bg-transparent text-slate-600 hover:text-slate-900'
                  } ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    {status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Avatar URL"
              value={formData.avatar}
              onChange={(event) => handleChange('avatar', event.target.value)}
              placeholder="https://..."
              helpText="Optional. Leave empty to use the initial fallback."
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center pt-2">
            <div>
              {selectedEmployee ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDeleteClick}
                  disabled={isSubmitting || isDeleting}
                  className="gap-2"
                >
                  <Trash2 size={18} />
                  Delete Employee
                </Button>
              ) : null}
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSubmitting || isDeleting}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting || isDeleting} className="gap-2">
                {!isSubmitting && <Save size={18} />}
                {selectedEmployee ? 'Update Employee' : 'Create Employee'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
          }
        }}
        title="Delete Employee"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} isLoading={isDeleting} disabled={isDeleting}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default AdminEmployees;
