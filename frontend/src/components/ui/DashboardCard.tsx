import type { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  value?: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down';
  };
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const DashboardCard = ({
  title,
  value,
  change,
  icon,
  children,
  className = '',
}: DashboardCardProps) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-colors ${className}`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm md:text-base font-medium text-slate-600 truncate">{title}</p>
          {value !== undefined && (
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mt-1 sm:mt-2 wrap-break-word">{value}</p>
          )}
          {change && (
            <p
              className={`text-xs sm:text-sm font-medium mt-1 sm:mt-2 ${
                change.trend === 'up'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {change.trend === 'up' ? '↑' : '↓'} {change.value}%
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 sm:p-3 bg-slate-100 rounded-lg text-slate-600 shrink-0">
            <div className="flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
      {children && <div className="mt-3 sm:mt-4">{children}</div>}
    </div>
  );
};
