import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { WorkloadData, ProjectProgress } from '../../types/dashboard';

// Animated number without external deps
const AnimatedNumber: React.FC<{ value: number; decimals?: number; className?: string }> = ({ value, decimals = 0, className }) => {
  const [display, setDisplay] = useState<number>(value);
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    const duration = 600;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      setDisplay(Number(next.toFixed(decimals)));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else prevRef.current = to;
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, decimals]);

  return <div className={className}>{decimals === 0 ? String(Math.round(display)) : display.toFixed(decimals)}</div>;
};

// Avatar fallback using initials
const Avatar: React.FC<{ name?: string; size?: number }> = ({ name = 'U', size = 36 }) => {
  const initials = name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-linear-to-br from-slate-50 to-white text-sm font-semibold text-slate-700"
    >
      {initials}
    </div>
  );
};

export const KpiCard: React.FC<{
  title: string;
  value?: number | string;
  subtitle?: string;
  change?: { value: number; trend: 'up' | 'down' } | null;
  icon?: React.ReactNode;
  sparkline?: Record<string, unknown>[];
  tone?: 'slate' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet' | 'blue';
}> = ({ title, value = '', subtitle, change = null, icon, sparkline, tone = 'cyan' }) => {
  const toneStyles = {
    slate: {
      accent: 'from-slate-600 via-slate-500 to-cyan-400',
      iconBg: 'from-slate-50 to-white',
      iconText: 'text-slate-700',
      value: 'text-slate-900',
    },
    cyan: {
      accent: 'from-cyan-500 via-sky-500 to-emerald-400',
      iconBg: 'from-cyan-50 to-white',
      iconText: 'text-cyan-600',
      value: 'text-slate-900',
    },
    emerald: {
      accent: 'from-emerald-500 via-teal-500 to-cyan-400',
      iconBg: 'from-emerald-50 to-white',
      iconText: 'text-emerald-600',
      value: 'text-slate-900',
    },
    amber: {
      accent: 'from-amber-500 via-orange-500 to-rose-400',
      iconBg: 'from-amber-50 to-white',
      iconText: 'text-amber-600',
      value: 'text-slate-900',
    },
    rose: {
      accent: 'from-rose-500 via-pink-500 to-fuchsia-400',
      iconBg: 'from-rose-50 to-white',
      iconText: 'text-rose-600',
      value: 'text-slate-900',
    },
    violet: {
      accent: 'from-violet-500 via-indigo-500 to-cyan-400',
      iconBg: 'from-violet-50 to-white',
      iconText: 'text-violet-600',
      value: 'text-slate-900',
    },
    blue: {
      accent: 'from-blue-500 via-sky-500 to-cyan-400',
      iconBg: 'from-blue-50 to-white',
      iconText: 'text-blue-600',
      value: 'text-slate-900',
    },
  }[tone];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.1)]"
    >
      <div className={`-mx-4 -mt-4 h-1 bg-linear-to-r ${toneStyles.accent} opacity-80`} />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-2xl border border-slate-200 bg-linear-to-br ${toneStyles.iconBg} p-3 shadow-sm transition-transform duration-200 group-hover:scale-[1.03]`}>
            <div className={toneStyles.iconText}>{icon}</div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className={`mt-1 text-2xl font-semibold tracking-tight ${toneStyles.value}`}>
              {typeof value === 'number' ? <AnimatedNumber value={value} /> : String(value)}
            </p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        {change ? (
          <div className={`flex items-center gap-1 text-sm font-semibold ${change.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {change.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
            {Math.abs(change.value)}%
          </div>
        ) : null}
      </div>

      {sparkline && Array.isArray(sparkline) && sparkline.length > 0 && (
        <div className="mt-3 h-12 rounded-xl bg-slate-50/60 p-2">
          <ResponsiveContainer width="100%" height={48}>
            <LineChart data={sparkline as Record<string, unknown>[] }>
              <Line
                type="monotone"
                dataKey={Object.keys(sparkline[0] as Record<string, unknown>).find((k) => k !== 'label') ?? 'value'}
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

export const LineTrend: React.FC<{ data?: Record<string, unknown>[]; dataKey?: string; xKey?: string; height?: number }> = ({ data, dataKey = 'value', xKey = 'label', height = 160 }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">No series data available</div>;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-cyan-50/40 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip wrapperClassName="rounded-xl border border-slate-200 bg-white/95 p-3 text-sm shadow-[0_16px_34px_rgba(15,23,42,0.12)]" contentStyle={{ border: 'none', background: 'transparent' }} />
          <Line type="monotone" dataKey={dataKey} stroke="#06b6d4" strokeWidth={2.5} dot={false} strokeLinecap="round" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const DonutStatus: React.FC<{ completed: number; inProgress: number; pending: number }> = ({ completed, inProgress, pending }) => {
  const data = [
    { name: 'Completed', value: completed, color: '#10b981' },
    { name: 'In Progress', value: inProgress, color: '#3b82f6' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
  ];

  const total = completed + inProgress + pending;
  if (total === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">No task data</div>;
  }

  const percent = Math.round((completed / Math.max(total, 1)) * 100);

  return (
    <div className="relative flex items-center justify-center rounded-3xl border border-slate-200 bg-linear-to-br from-white to-cyan-50/30 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data as unknown as Record<string, unknown>[]} innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={6} startAngle={90} endAngle={-270}>
            {data.map((entry, index) => (
              <Cell key={index} fill={(entry as unknown as { color?: string }).color ?? '#999'} cornerRadius={8} />
            ))}
          </Pie>
          <Tooltip wrapperClassName="rounded-xl border border-slate-200 bg-white/95 p-3 text-sm shadow-[0_16px_34px_rgba(15,23,42,0.12)]" contentStyle={{ border: 'none', background: 'transparent' }} />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute pointer-events-none text-center">
        <p className="text-2xl font-bold text-slate-900">{percent}%</p>
        <p className="text-xs text-slate-500">Completed</p>
      </div>
    </div>
  );
};

export const WorkloadBar: React.FC<{ items: WorkloadData[] }> = ({ items }) => {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">No workload data</div>;
  }

  const data = items.map((it) => ({ name: it.employee_name ?? it.employeeName, assigned: it.assigned_tasks ?? it.totalAssignedTasks, completed: it.completed_tasks ?? it.completedTasks }));

  return (
    <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ left: 0, right: 0 }}>
          <CartesianGrid strokeDasharray="6 6" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip wrapperClassName="rounded-xl border border-slate-200 bg-white/95 p-3 text-sm shadow-[0_16px_34px_rgba(15,23,42,0.12)]" contentStyle={{ border: 'none', background: 'transparent' }} />
          <Bar dataKey="assigned" fill="#38bdf8" radius={[10, 10, 0, 0]} />
          <Bar dataKey="completed" fill="#2dd4bf" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const Leaderboard: React.FC<{ performers: { id: string; name: string; completed_tasks: number }[] }> = ({ performers }) => {
  if (!Array.isArray(performers) || performers.length === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">No performance data</div>;
  }

  const medal = (i: number) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return '';
  };

  return (
    <div className="space-y-3">
      {performers.map((p, i) => (
        <motion.div key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} className="flex items-center justify-between rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="text-lg">{medal(i)}</div>
              <Avatar name={p.name} />
            </div>
            <div>
              <p className="font-medium text-slate-900">{p.name}</p>
              <p className="text-sm text-slate-500">Rank #{i + 1}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200">{p.completed_tasks} completed</div>
            {i < 3 && <div className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700">Top {i + 1}</div>}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export const ProjectProgressList: React.FC<{ projects: ProjectProgress[] }> = ({ projects }) => {
  if (!Array.isArray(projects) || projects.length === 0) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">No projects</div>;
  }

  return (
    <div className="space-y-3">
      {projects.map((pr) => (
        <motion.div key={pr.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ translateY: -2 }} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium text-slate-900 truncate">{pr.name}</p>
              <p className="text-xs text-slate-500">{pr.status}</p>
            </div>
            <div className="text-sm font-semibold text-slate-900">{pr.progress}%</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-linear-to-r from-sky-500 to-emerald-400" style={{ width: `${pr.progress}%`, transition: 'width 600ms cubic-bezier(.2,.8,.2,1)' }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default {} as unknown;
