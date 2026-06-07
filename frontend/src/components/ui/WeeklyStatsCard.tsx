import { CheckCircle2, FolderKanban, ListChecks } from 'lucide-react';

interface WeeklyStatsCardProps {
  completedThisWeek: number;
  projectsThisWeek: number;
  activeTasks: number;
}

export const WeeklyStatsCard = ({ completedThisWeek, projectsThisWeek, activeTasks }: WeeklyStatsCardProps) => {
  const items = [
    { label: 'Completed this week', value: completedThisWeek, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Projects this week', value: projectsThisWeek, icon: FolderKanban, tone: 'text-cyan-600 bg-cyan-50' },
    { label: 'Currently active', value: activeTasks, icon: ListChecks, tone: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div>
        <h2 className="text-lg font-semibold leading-7 text-slate-900">Weekly Productivity</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">Your current week at a glance.</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
                <Icon size={18} />
              </div>
              <p className="mt-3 text-2xl font-semibold leading-8 text-slate-900">{item.value}</p>
              <p className="text-xs font-medium leading-5 text-slate-500">{item.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyStatsCard;
