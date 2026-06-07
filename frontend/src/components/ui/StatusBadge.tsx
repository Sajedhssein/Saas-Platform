interface StatusBadgeProps {
  status: 'pending' | 'in-progress' | 'in_progress' | 'completed' | 'on-hold' | 'active' | 'inactive' | 'low' | 'medium' | 'high';
  label?: string;
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const statusStyles = {
    pending: 'bg-slate-100 text-slate-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    'on-hold': 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-slate-100 text-slate-800',
    low: 'bg-slate-100 text-slate-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    in_progress: 'In Progress',
    completed: 'Completed',
    'on-hold': 'On Hold',
    active: 'Active',
    inactive: 'Inactive',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium leading-5 sm:text-sm ${statusStyles[status]}`}
    >
      {label || statusLabels[status]}
    </span>
  );
};

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export const ProgressBar = ({
  value,
  max = 100,
  className = '',
}: ProgressBarProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full bg-slate-200 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className="bg-linear-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
