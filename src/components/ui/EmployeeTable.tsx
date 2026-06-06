import { ProgressBar } from './StatusBadge';
import type { Employee } from '../../types';

interface EmployeeTableProps {
  employees: Employee[];
  onEmployeeClick?: (employee: Employee) => void;
}

export const EmployeeTable = ({
  employees,
  onEmployeeClick,
}: EmployeeTableProps) => {
  // Mobile card view
  const MobileCardView = () => (
    <div className="space-y-3 sm:space-y-4">
      {employees.map((employee) => (
        <div
          key={employee.id}
          onClick={() => onEmployeeClick?.(employee)}
          className="bg-white rounded-md border border-slate-200 p-4 sm:p-5 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-colors"
        >
          <div className="flex items-start gap-3 mb-3 sm:mb-4">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                {employee.name}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                {employee.email}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Role</span>
              <span className="text-xs sm:text-sm font-medium text-slate-900 text-right">
                {employee.position ?? employee.role}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Department</span>
              <span className="text-xs sm:text-sm text-slate-600 text-right">
                {employee.department}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Performance</span>
              <div className="flex items-center gap-2">
                <ProgressBar value={employee.performance} max={100} />
                <span className="text-xs sm:text-sm font-semibold text-slate-900 min-w-max">
                  {employee.performance}%
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Tasks Completed</span>
              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                {employee.completedTasks}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Desktop table view
  const DesktopTableView = () => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">
                Employee
              </th>
              <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">
                Role
              </th>
              <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">
                Department
              </th>
              <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">
                Performance
              </th>
              <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold text-slate-900">
                Tasks Completed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {employees.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => onEmployeeClick?.(employee)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 md:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={employee.avatar}
                      alt={employee.name}
                      className="w-10 h-10 rounded-full shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {employee.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {employee.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-slate-900">
                  {employee.position ?? employee.role}
                </td>
                <td className="px-4 md:px-6 py-4 text-xs md:text-sm text-slate-600">
                  {employee.department}
                </td>
                <td className="px-4 md:px-6 py-4">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={employee.performance} max={100} />
                    <span className="text-xs md:text-sm font-medium text-slate-900 w-12">
                      {employee.performance}%
                    </span>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium text-slate-900">
                  {employee.completedTasks}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile view - shown on sm breakpoint and below */}
      <div className="md:hidden">
        {MobileCardView()}
      </div>

      {/* Desktop view - shown on md breakpoint and above */}
      <div className="hidden md:block">
        {DesktopTableView()}
      </div>
    </>
  );
};
