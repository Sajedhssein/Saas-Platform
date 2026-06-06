import { PageContainer } from '../components/ui';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { getDashboardPathForUser, resolveUserRole } from '../utils/auth';

/**
 * Unauthorized Page
 * Shown when user tries to access a page they don't have permission for
 */
export const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const getDashboardPath = (): string => {
    if (!user) return '/login';
    const resolvedRole = resolveUserRole(user);
    const redirectPath = resolvedRole ? getDashboardPathForUser(user) : '/login';

    if (import.meta.env.DEV) {
      console.log('[auth/unauthorized]', {
        user,
        role: user.role,
        resolvedRole,
        redirectPath,
      });
    }

    return redirectPath;
  };

  return (
    <PageContainer title="403 Forbidden" description="This route is not available for your account">
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-rose-50 via-white to-cyan-50 opacity-90" />
          <div className="relative flex flex-col items-center text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg shadow-slate-900/20">
              <ShieldAlert className="h-10 w-10" />
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-rose-600">Access restricted</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl">You do not have access to this page.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Your account can still continue safely from the right dashboard. If you expected this page to be available,
              ask an administrator to review your permissions.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate(getDashboardPath())}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </button>
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};
