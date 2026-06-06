import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarItemProps {
  to: string;
  icon: ReactNode;
  label: string;
  collapsed?: boolean;
  children?: ReactNode;
}

export const SidebarItem = ({ to, icon, label, collapsed = false, children }: SidebarItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 sm:py-2.5 rounded-md transition-colors min-h-10 ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <div className="size-4 sm:size-5 lg:size-6 flex items-center justify-center shrink-0">{icon}</div>
      {!collapsed && <span className="grow text-sm sm:text-base">{label}</span>}
      {children && !collapsed && <span className="text-xs sm:text-sm">{children}</span>}
    </NavLink>
  );
};
