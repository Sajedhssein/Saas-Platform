import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

const baseControlClasses =
  'w-full rounded-2xl border border-slate-400 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed text-sm md:text-base';

// Force dark (readable) text and placeholder colors; only change text color and border per user request
const defaultColorClasses = 'text-slate-900 placeholder:text-slate-500';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  icon?: React.ReactNode;
  labelClassName?: string;
  helpTextClassName?: string;
}

export const Input = ({
  label,
  error,
  helpText,
  icon,
  className = '',
  labelClassName = '',
  helpTextClassName = '',
  ...props
}: InputProps) => {
  return (
    <div className="w-full">
      {label && (
        <label className={`block text-sm font-medium mb-2 ${labelClassName || 'text-slate-900'}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 shrink-0">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={(() => {
            const hasTextColor = /\btext-[^\s]+\b/.test(className) || /dark:text-/.test(className) || /!text-/.test(className);
            return `h-11 px-4 py-3 ${icon ? 'pl-11' : ''} ${baseControlClasses} ${hasTextColor ? '' : defaultColorClasses} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`;
          })()}
        />
      </div>
      {error && <p className="mt-1 text-xs sm:text-sm text-red-700">{error}</p>}
      {helpText && !error && (
        <p className={`mt-1 text-xs sm:text-sm ${helpTextClassName || 'text-slate-600 dark:text-slate-400'}`}>{helpText}</p>
      )}
    </div>
  );
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  labelClassName?: string;
  helpTextClassName?: string;
}

export const Select = ({
  label,
  error,
  helpText,
  className = '',
  labelClassName = '',
  helpTextClassName = '',
  children,
  ...props
}: SelectProps) => (
  <div className="w-full">
    {label && (
      <label className={`block text-sm font-medium mb-2 ${labelClassName || 'text-slate-900'}`}>
        {label}
      </label>
    )}
    <select
      {...props}
      className={(() => {
        const hasTextColor = /\btext-[^\s]+\b/.test(className) || /dark:text-/.test(className) || /!text-/.test(className);
        return `h-11 px-4 py-3 ${baseControlClasses} ${hasTextColor ? '' : defaultColorClasses} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`;
      })()}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs sm:text-sm text-red-700">{error}</p>}
    {helpText && !error && (
      <p className={`mt-1 text-xs sm:text-sm ${helpTextClassName || 'text-slate-600 dark:text-slate-400'}`}>{helpText}</p>
    )}
  </div>
);

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  labelClassName?: string;
  helpTextClassName?: string;
}

export const Textarea = ({
  label,
  error,
  helpText,
  className = '',
  labelClassName = '',
  helpTextClassName = '',
  ...props
}: TextareaProps) => (
  <div className="w-full">
    {label && (
      <label className={`block text-sm font-medium mb-2 ${labelClassName || 'text-slate-900'}`}>
        {label}
      </label>
    )}
    <textarea
      {...props}
      className={(() => {
        const hasTextColor = /\btext-[^\s]+\b/.test(className) || /dark:text-/.test(className) || /!text-/.test(className);
        return `min-h-[120px] px-4 py-3 ${baseControlClasses} ${hasTextColor ? '' : defaultColorClasses} ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`;
      })()}
    />
    {error && <p className="mt-1 text-xs sm:text-sm text-red-700">{error}</p>}
    {helpText && !error && (
      <p className={`mt-1 text-xs sm:text-sm ${helpTextClassName || 'text-slate-600 dark:text-slate-400'}`}>{helpText}</p>
    )}
  </div>
);

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

export const SearchBar = ({
  placeholder = 'Search...',
  ...props
}: SearchBarProps) => {
  return (
    <Input
      {...props}
      placeholder={placeholder}
      icon={<Search size={20} />}
      className="pl-11"
    />
  );
};
