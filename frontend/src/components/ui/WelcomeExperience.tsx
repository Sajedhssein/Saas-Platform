import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authService } from '../../services/authService';

interface WelcomeExperienceProps {
  variant: 'admin' | 'employee' | 'client';
}

const roleCopy = {
  admin: {
    title: 'Your workspace is ready.',
    message: 'Create projects, invite teammates, add clients, and generate reports from one dashboard.',
  },
  employee: {
    title: 'Your employee workspace is ready.',
    message: 'Track assigned tasks, collaborate with your team, and keep project work moving.',
  },
  client: {
    title: 'Your client portal is ready.',
    message: 'Review projects, reports, and shared files from a focused client dashboard.',
  },
};

const getWelcomeSessionKey = (userId?: string, lastLoginAt?: string | null): string | null => {
  if (!userId) {
    return null;
  }

  return `welcome-dismissed:${userId}:${lastLoginAt ?? 'current-session'}`;
};

const getFirstLoginDismissedKey = (userId?: string): string | null => {
  if (!userId) {
    return null;
  }

  return `welcome-first-login-dismissed:${userId}`;
};

const hasStoredFlag = (storage: Storage, key: string | null): boolean => {
  if (!key) {
    return true;
  }

  try {
    return storage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

const setStoredFlag = (storage: Storage, key: string | null, enabled: boolean): void => {
  if (!key) {
    return;
  }

  try {
    if (enabled) {
      storage.setItem(key, 'true');
    } else {
      storage.removeItem(key);
    }
  } catch {
    // Browser storage can be unavailable in privacy modes; local state still handles the current render.
  }
};

export const WelcomeExperience = ({ variant }: WelcomeExperienceProps) => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const sessionKey = useMemo(() => getWelcomeSessionKey(user?.id, user?.last_login_at), [user?.id, user?.last_login_at]);
  const firstLoginDismissedKey = useMemo(() => getFirstLoginDismissedKey(user?.id), [user?.id]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const companyName = user?.company_name ?? user?.company ?? 'your company';
  const copy = roleCopy[variant];
  const isFirstLoginWelcome = Boolean(user?.show_welcome);
  const shouldShow = Boolean(user) && !isDismissed;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const dismissedThisSession = hasStoredFlag(sessionStorage, sessionKey);
      const dismissedFirstLogin = isFirstLoginWelcome && hasStoredFlag(localStorage, firstLoginDismissedKey);
      setIsDismissed(dismissedThisSession || dismissedFirstLogin);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [firstLoginDismissedKey, isFirstLoginWelcome, sessionKey]);

  const dismissWelcome = async () => {
    if (isDismissing) {
      return;
    }

    setIsDismissing(true);
    setIsDismissed(true);
    setStoredFlag(sessionStorage, sessionKey, true);

    if (!isFirstLoginWelcome) {
      setIsDismissing(false);
      return;
    }

    setStoredFlag(localStorage, firstLoginDismissedKey, true);
    if (user) {
      updateUser({ ...user, show_welcome: false });
    }

    try {
      const updatedUser = await authService.dismissWelcome();
      updateUser({ ...updatedUser, show_welcome: false });
    } catch {
      // Keep the UI dismissed after an explicit user action. The local flag prevents a stuck
      // welcome message on refresh if the network request fails after the click.
    } finally {
      setIsDismissing(false);
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <section className="mb-6 rounded-[1.75rem] border border-slate-200 bg-linear-to-br from-white via-cyan-50/40 to-slate-50 px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {user?.show_welcome ? `Welcome to ${companyName}, ${firstName}.` : `Good to see you again, ${firstName}.`}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {isFirstLoginWelcome ? "We're happy to have you here." : copy.message}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-100">
              <CheckCircle2 size={14} />
              Account ready
            </div>
            <button
              type="button"
              onClick={() => void dismissWelcome()}
              disabled={isDismissing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Close welcome"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </section>

      {isFirstLoginWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/20 bg-white shadow-2xl">
            <div className="bg-linear-to-br from-slate-950 via-blue-950 to-cyan-900 px-6 py-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Welcome</p>
                  <h2 className="mt-3 text-2xl font-semibold">Welcome, {firstName}.</h2>
                  <p className="mt-2 text-sm leading-6 text-cyan-50">Welcome to {companyName}. {copy.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void dismissWelcome()}
                  className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close welcome"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm leading-6 text-slate-600">{copy.message}</p>
              <button
                type="button"
                onClick={() => void dismissWelcome()}
                disabled={isDismissing}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDismissing ? 'Saving...' : 'Get started'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
