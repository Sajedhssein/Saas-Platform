import { type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleClassName?: string;
  panelClassName?: string;
  children: ReactNode;
}

export const Modal = ({ open, onClose, title, titleClassName = '', panelClassName = '', children }: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-full rounded-lg bg-white shadow-lg z-10 overflow-hidden ${panelClassName || 'max-w-2xl'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <h3 className={`text-sm font-semibold ${titleClassName || 'text-slate-900'}`}>{title}</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900">✕</button>
        </div>
        <div className="max-h-[calc(90vh-4rem)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
};
