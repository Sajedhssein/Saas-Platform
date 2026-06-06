/**
 * Skeleton Loader Components
 * Animated placeholders for loading states
 */

import type { ReactElement } from 'react';

const chartHeights = [35, 60, 45, 70, 50, 40, 65];

export const SkeletonCard = (): ReactElement => (
  <div className="animate-pulse space-y-4">
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 bg-slate-200 rounded-lg" />
      <div className="w-16 h-6 bg-slate-200 rounded" />
    </div>
    <div className="space-y-2">
      <div className="w-20 h-4 bg-slate-200 rounded" />
      <div className="w-32 h-8 bg-slate-200 rounded" />
    </div>
  </div>
);

export const SkeletonChart = (): ReactElement => (
  <div className="bg-white rounded-lg border border-slate-200 p-6">
    <div className="animate-pulse space-y-4">
      <div className="w-32 h-6 bg-slate-200 rounded" />

      <div className="h-64 flex items-end justify-around gap-2">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="flex-1 space-y-2">
            <div
              className="w-full bg-slate-200 rounded-t-lg"
              style={{ height: `${chartHeights[idx]}%` }}
            />
            <div className="w-full h-3 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonProgress = (): ReactElement => (
  <div className="bg-white rounded-lg border border-slate-200 p-6">
    <div className="animate-pulse space-y-4">
      <div className="w-40 h-6 bg-slate-200 rounded" />

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex justify-between">
              <div className="w-24 h-4 bg-slate-200 rounded" />
              <div className="w-12 h-4 bg-slate-200 rounded" />
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SkeletonTable = (): ReactElement => (
  <div className="bg-white rounded-lg border border-slate-200 p-6">
    <div className="animate-pulse space-y-4">
      <div className="w-40 h-6 bg-slate-200 rounded mb-4" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="w-12 h-4 bg-slate-200 rounded" />
            <div className="flex-1 h-4 bg-slate-200 rounded" />
            <div className="w-20 h-4 bg-slate-200 rounded" />
            <div className="w-20 h-4 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DashboardSkeleton = (): ReactElement => (
  <div className="space-y-8">
    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, idx) => (
        <SkeletonCard key={idx} />
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonChart />
      <SkeletonProgress />
    </div>

    {/* Projects and Overview */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="space-y-4">
          <div className="w-40 h-6 bg-slate-200 rounded animate-pulse" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        </div>
      </div>

      <SkeletonProgress />
    </div>

    {/* Recent Tasks */}
    <div className="space-y-4">
      <div className="w-40 h-6 bg-slate-200 rounded animate-pulse" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <SkeletonCard key={idx} />
        ))}
      </div>
    </div>
  </div>
);