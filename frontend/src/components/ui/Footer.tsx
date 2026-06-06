import { appConfig } from '../../config/app';

export const Footer = () => (
  <footer className="border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 lg:px-8">
    <div className="mx-auto flex flex-col gap-2 text-center text-xs text-slate-500 sm:flex-row sm:justify-between sm:text-left">
      <span>© {appConfig.footer.currentYear} <span className="text-slate-900 font-semibold">{appConfig.footer.companyName}</span>. All Rights Reserved.</span>
      <span>Built by <span className="text-slate-900 font-semibold">{appConfig.footer.developerName}</span>.</span>
    </div>
  </footer>
);
