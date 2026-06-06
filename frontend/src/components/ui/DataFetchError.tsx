/**
 * Data Fetch Error Component
 * Displays error state with retry functionality
 */

import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from './Button';
import type { ReactElement } from 'react';

interface DataFetchErrorProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

export const DataFetchError = ({
  message = 'Failed to load dashboard data. Please try again.',
  onRetry,
  isRetrying = false,
}: DataFetchErrorProps): ReactElement => (
  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
    <div className="flex justify-center mb-4">
      <div className="bg-red-50 p-3 rounded-full">
        <AlertCircle className="text-red-600" size={32} />
      </div>
    </div>

    <h3 className="text-lg font-semibold text-slate-900 mb-2">
      Oops! Something went wrong
    </h3>

    <p className="text-slate-600 mb-6 max-w-md mx-auto">{message}</p>

    <Button variant="primary" onClick={onRetry} disabled={isRetrying}>
      <RotateCw size={18} className={isRetrying ? 'animate-spin' : ''} />
      {isRetrying ? 'Retrying...' : 'Try Again'}
    </Button>
  </div>
);

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export const EmptyState = ({
  title = 'No data available',
  message = 'There is no data to display at the moment.',
}: EmptyStateProps): ReactElement => (
  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
    <div className="flex justify-center mb-4">
      <div className="bg-slate-50 p-3 rounded-full">
        <AlertCircle className="text-slate-400" size={32} />
      </div>
    </div>

    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 max-w-md mx-auto">{message}</p>
  </div>
);
