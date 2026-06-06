import type { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  titleClassName?: string;
}

export const PageContainer = ({
  title,
  description,
  children,
  action,
  titleClassName = '',
}: PageContainerProps) => {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 px-4 sm:space-y-4 sm:px-6 md:space-y-6 lg:px-8">
      {/* Header - Mobile-first responsive layout */}
      <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1
            className={
              `text-2xl sm:text-3xl lg:text-4xl font-bold wrap-break-word ${titleClassName || ''} ${
                title === 'Dashboard' ? 'text-3xl sm:text-5xl lg:text-6xl font-extrabold' : ''
              } !text-slate-900 dark:!text-white`
            }
          >
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-600 mt-2 sm:mt-3">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 w-full md:w-auto">{action}</div>}
      </div>

      {/* Content */}
      <div>{children}</div>
    </div>
  );
};
