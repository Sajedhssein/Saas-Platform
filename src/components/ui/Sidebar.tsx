import type { MouseEventHandler, ReactNode } from 'react';
import { X } from 'lucide-react';
import logo from '../../assets/WhatsApp_Image_2023-10-18_at_18.48.30_3f0dc5e9-removebg-preview (1).png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  children: ReactNode;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
}

export const Sidebar = ({ isOpen, onClose, collapsed = false, children, onMouseEnter, onMouseLeave }: SidebarProps) => {
  const asideClass = `fixed left-0 top-0 h-screen bg-slate-900 text-white transform transition-all duration-300 ease-in-out z-50 overflow-y-auto lg:static lg:z-0 ${
    collapsed ? 'lg:w-20' : 'lg:w-64'
  } w-56 sm:w-64 ${
    isOpen ? 'translate-x-0' : '-translate-x-full'
  } lg:translate-x-0`;

  return (
    <>
      {/* Backdrop for mobile/tablet - z-40, responsive visibility */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Mobile-first responsive drawer/static layout */}
      <aside onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={asideClass}>
        {/* Header with logo and close button - mobile-first padding */}
        <div className="flex items-center justify-between border-b border-white/10 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-transparent">
              <img
                src={logo}
                alt="Company logo"
                className="h-10 w-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
              />
            </div>
            {!collapsed && (
              <span className="truncate text-lg font-semibold tracking-[0.18em] text-transparent bg-linear-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text drop-shadow-[0_0_10px_rgba(34,211,238,0.18)]">
                Improver
              </span>
            )}
          </div>

          {/* Close button - visible on mobile/tablet, hidden on desktop */}
          <button 
            onClick={onClose} 
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors shrink-0 min-h-11 min-w-11 flex items-center justify-center"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation items - mobile-first padding */}
        <div className="p-3 sm:p-4 space-y-1">{children}</div>
      </aside>
    </>
  );
};
