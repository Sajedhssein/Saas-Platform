import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export interface QuickActionItem {
  label: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}

interface QuickActionsProps {
  title?: string;
  actions: QuickActionItem[];
}

export const QuickActions = ({ title = 'Quick Actions', actions }: QuickActionsProps) => (
  <section className="mb-8 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
    <div className="mb-4 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">Jump into common work without hunting through the sidebar.</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="group flex min-h-28 items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
        >
          <div className="min-w-0">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 transition-colors group-hover:bg-cyan-100">
              {action.icon}
            </div>
            <p className="text-sm font-semibold text-slate-900">{action.label}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
          </div>
          <ArrowRight size={16} className="mt-1 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-cyan-700" />
        </button>
      ))}
    </div>
  </section>
);
