import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { EmptyState } from './DataFetchError';
import { LoadingSpinner } from './LoadingSpinner';
import { employeeService, type EmployeeRecord } from '../../services/employeeService';

interface EmployeeSelectorProps {
    value: string[];
    onChange: (employeeIds: string[]) => void;
    disabled?: boolean;
    error?: string | null;
}

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return 'EM';
    }

    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'EM';
};

export const EmployeeSelector = ({ value, onChange, disabled = false, error }: EmployeeSelectorProps) => {
    const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadEmployees = async () => {
            try {
                setLoading(true);
                setLoadError(null);
                const response = await employeeService.getEmployees();

                if (!cancelled) {
                    setEmployees(response);
                }
            } catch (loadError) {
                if (!cancelled) {
                    setLoadError(loadError instanceof Error ? loadError.message : 'Failed to load employees');
                    setEmployees([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadEmployees();

        return () => {
            cancelled = true;
        };
    }, []);

    const selectedEmployees = useMemo(
        () => employees.filter((employee) => value.includes(employee.id)),
        [employees, value]
    );

    const filteredEmployees = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return employees;
        }

        return employees.filter((employee) =>
            [employee.name, employee.email, employee.position ?? '', employee.department ?? '']
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [employees, search]);

    const toggleEmployee = (employeeId: string) => {
        if (disabled) {
            return;
        }

        if (value.includes(employeeId)) {
            onChange(value.filter((id) => id !== employeeId));
            return;
        }

        onChange([...value, employeeId]);
    };

    if (loading) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <LoadingSpinner />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {loadError}
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Team Members</h3>
                    <p className="text-xs text-slate-500">Assign employees to this project.</p>
                </div>
                {selectedEmployees.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                        {selectedEmployees.length} selected
                    </span>
                )}
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search employees"
                    disabled={disabled}
                    className="pl-9"
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {selectedEmployees.length === 0 ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">No team members assigned</span>
                ) : (
                    selectedEmployees.map((employee) => (
                        <span key={employee.id} className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600 text-[10px] font-semibold text-white">
                                {getInitials(employee.name)}
                            </span>
                            {employee.name}
                        </span>
                    ))
                )}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                {filteredEmployees.length === 0 ? (
                    <EmptyState title="No employees found" message="Try a different name or email." />
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredEmployees.map((employee) => {
                            const checked = value.includes(employee.id);

                            return (
                                <label
                                    key={employee.id}
                                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${checked ? 'bg-cyan-50' : 'bg-white hover:bg-slate-50'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleEmployee(employee.id)}
                                        disabled={disabled}
                                        className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                        {getInitials(employee.name)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-medium text-slate-900">{employee.name}</span>
                                        <span className="block truncate text-xs text-slate-500">{employee.email}</span>
                                    </span>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${checked ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-500'}`}>
                                        {checked ? 'Selected' : 'Add'}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-end">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onChange([])}
                    disabled={disabled || value.length === 0}
                >
                    Clear
                </Button>
            </div>
        </div>
    );
};