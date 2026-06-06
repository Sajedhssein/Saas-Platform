import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  MailPlus,
  RefreshCcw,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button, DataFetchError, EmptyState, Input, LoadingSpinner, Modal, PageContainer } from '../../components/ui';
import {
  inviteService,
  type CreateInvitePayload,
  type InviteRecord,
  type InviteRole,
  type InviteStatus,
  type InviteStats,
} from '../../services/inviteService';

const VALID_STATUSES: InviteStatus[] = ['all', 'pending', 'accepted', 'expired', 'revoked', 'hidden'];
const HIDDEN_STORAGE_KEY = 'invite-hidden-ids';

interface InviteFieldErrors {
  email?: string;
  role?: string;
  expires_in_minutes?: string;
}

interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[] | string>;
}

type ActionKey = `${'resend' | 'revoke' | 'restore'}:${string}` | null;

const normalizeError = (value: string[] | string | undefined): string => {
  if (!value) {
    return '';
  }

  return Array.isArray(value) ? value[0] ?? '' : value;
};

const readHiddenIds = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
  } catch {
    return [];
  }
};

const persistHiddenIds = (ids: string[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(ids));
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const formatRelativeTime = (value: string | null): string => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const diffMinutes = Math.round((Date.now() - parsed.getTime()) / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';

  return `${diffDays} days ago`;
};

const statusStyles: Record<string, { chip: string; dot: string; title: string; badge: string }> = {
  pending: {
    chip: 'bg-blue-50 text-blue-700 ring-blue-100',
    dot: 'bg-blue-500',
    title: 'Waiting for response',
    badge: 'Pending',
  },
  accepted: {
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    dot: 'bg-emerald-500',
    title: '✓ Joined company',
    badge: 'Accepted',
  },
  expired: {
    chip: 'bg-amber-50 text-amber-700 ring-amber-100',
    dot: 'bg-amber-500',
    title: 'Invite expired',
    badge: 'Expired',
  },
  revoked: {
    chip: 'bg-rose-50 text-rose-700 ring-rose-100',
    dot: 'bg-rose-500',
    title: 'Invite revoked',
    badge: 'Revoked',
  },
  hidden: {
    chip: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
    title: 'Hidden from active view',
    badge: 'Hidden',
  },
};

const tabMeta: Array<{ key: InviteStatus; label: string; icon: React.ReactNode }> = [
  { key: 'all', label: 'All', icon: <Users size={15} /> },
  { key: 'pending', label: 'Pending', icon: <Clock3 size={15} /> },
  { key: 'accepted', label: 'Accepted', icon: <BadgeCheck size={15} /> },
  { key: 'expired', label: 'Expired', icon: <AlertTriangle size={15} /> },
  { key: 'revoked', label: 'Revoked', icon: <ShieldAlert size={15} /> },
  { key: 'hidden', label: 'Hidden', icon: <EyeOff size={15} /> },
];

const inviteMatchesStatus = (invite: InviteRecord, status: InviteStatus): boolean => {
  const normalized = invite.status.toLowerCase();
  if (status === 'all') {
    return true;
  }

  if (status === 'hidden') {
    return true;
  }

  return normalized === status;
};

const getInviteStatus = (invite: InviteRecord, locallyHiddenIds: Set<string>): InviteStatus => {
  if (invite.hidden || invite.archived_at || locallyHiddenIds.has(invite.id)) {
    return 'hidden';
  }

  const normalized = invite.status.toLowerCase();
  return VALID_STATUSES.includes(normalized as InviteStatus) && normalized !== 'all' ? (normalized as InviteStatus) : 'pending';
};

const getInviteStatusMessage = (status: InviteStatus): string => statusStyles[status]?.title ?? 'Waiting for response';

const StatCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) => (
  <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>{icon}</div>
    </div>
  </div>
);

export const AdminInvites = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryRole = searchParams.get('role');
  const queryStatus = searchParams.get('status');
  const lockedRole = queryRole === 'employee' || queryRole === 'client' ? queryRole : null;
  const activeTab: InviteStatus = VALID_STATUSES.includes((queryStatus ?? 'all') as InviteStatus)
    ? ((queryStatus ?? 'all') as InviteStatus)
    : 'all';

  const [hiddenInviteIds, setHiddenInviteIds] = useState<string[]>(() => readHiddenIds());
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole | ''>('');
  const [expiresInMinutes, setExpiresInMinutes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<InviteRecord | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [actionKey, setActionKey] = useState<ActionKey>(null);
  const loadSeqRef = useRef(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    persistHiddenIds(hiddenInviteIds);
  }, [hiddenInviteIds]);

  const loadData = useCallback(async (tab: InviteStatus, showLoading = false) => {
    const requestSeq = ++loadSeqRef.current;

    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      setError(null);

      const [inviteFeed, inviteStats] = await Promise.all([
        inviteService.getInvites(tab === 'all' ? undefined : tab),
        inviteService.getInviteStats(),
      ]);

      if (requestSeq !== loadSeqRef.current) {
        return;
      }

      setInvites(inviteFeed.invites ?? []);
      setStats(inviteStats);
      hasLoadedRef.current = true;
    } catch (loadError) {
      if (requestSeq !== loadSeqRef.current) {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch invites');
    } finally {
      if (requestSeq === loadSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(activeTab, !hasLoadedRef.current);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, loadData]);

  const visibleInvites = useMemo(() => {
    const hiddenIds = new Set(hiddenInviteIds);

    return [...invites]
      .sort((left, right) => {
        const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightTime - leftTime;
      })
      .filter((invite) => {
        const inviteStatus = getInviteStatus(invite, hiddenIds);

        if (activeTab === 'hidden') {
          return inviteStatus === 'hidden';
        }

        if (inviteStatus === 'hidden') {
          return false;
        }

        return inviteMatchesStatus(invite, activeTab);
      });
  }, [activeTab, hiddenInviteIds, invites]);

  const activeCounts = useMemo(() => {
    const hiddenIds = new Set(hiddenInviteIds);
    return invites.reduce(
      (accumulator, invite) => {
        const inviteStatus = getInviteStatus(invite, hiddenIds);

        if (inviteStatus === 'hidden') {
          accumulator.hidden += 1;
          return accumulator;
        }

        if (inviteStatus === 'pending') accumulator.pending += 1;
        if (inviteStatus === 'accepted') accumulator.accepted += 1;
        if (inviteStatus === 'expired') accumulator.expired += 1;
        if (inviteStatus === 'revoked') accumulator.revoked += 1;

        accumulator.all += 1;
        return accumulator;
      },
      { all: 0, pending: 0, accepted: 0, expired: 0, revoked: 0, hidden: 0 },
    );
  }, [hiddenInviteIds, invites]);

  const handleTabChange = (nextTab: InviteStatus) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('status', nextTab);
    setSearchParams(nextParams, { replace: true });
  };

  const handleInviteContext = (nextRole: InviteRole) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('role', nextRole);
    setSearchParams(nextParams, { replace: true });
  };

  const handleHideInvite = (inviteId: string) => {
    setHiddenInviteIds((current) => (current.includes(inviteId) ? current : [...current, inviteId]));
    toast.success('Invite hidden from active view');
  };

  const handleRestoreInvite = async (invite: InviteRecord) => {
    const action = `restore:${invite.id}` as const;
    setActionKey(action);

    try {
      if (invite.hidden || invite.archived_at) {
        await inviteService.restoreInvite(invite.id);
        await loadData(activeTab, false);
        toast.success('Invite restored');
      } else {
        setHiddenInviteIds((current) => current.filter((id) => id !== invite.id));
        toast.success('Invite restored to active view');
      }
    } catch (restoreError) {
      toast.error(restoreError instanceof Error ? restoreError.message : 'Failed to restore invite');
    } finally {
      setActionKey(null);
    }
  };

  const handleResendInvite = async (invite: InviteRecord) => {
    const action = `resend:${invite.id}` as const;
    setActionKey(action);

    try {
      await inviteService.resendInvite(invite.id);
      toast.success('Invite resent successfully');
      await loadData(activeTab, false);
    } catch (resendError) {
      toast.error(resendError instanceof Error ? resendError.message : 'Failed to resend invite');
    } finally {
      setActionKey(null);
    }
  };

  const handleRevokeInvite = async () => {
    if (!revokeTarget) {
      return;
    }

    setIsRevoking(true);

    try {
      await inviteService.revokeInvite(revokeTarget.id);
      toast.success('Invite revoked successfully');
      setRevokeTarget(null);
      await loadData(activeTab, false);
    } catch (revokeError) {
      toast.error(revokeError instanceof Error ? revokeError.message : 'Failed to revoke invite');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleArchiveInvites = async () => {
    setIsArchiving(true);

    try {
      await inviteService.clearInvites();
      toast.success('Active invites archived');
      setArchiveConfirmOpen(false);
      await loadData(activeTab, false);
    } catch (archiveError) {
      toast.error(archiveError instanceof Error ? archiveError.message : 'Failed to archive invites');
    } finally {
      setIsArchiving(false);
    }
  };

  const validateForm = (): InviteFieldErrors => {
    const nextErrors: InviteFieldErrors = {};
    const currentRole = lockedRole ?? role;

    if (!email.trim()) {
      nextErrors.email = 'Email is required.';
    }

    if (!['employee', 'client'].includes(currentRole)) {
      nextErrors.role = 'Role must be employee or client.';
    }

    if (expiresInMinutes.trim()) {
      const parsed = Number(expiresInMinutes);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        nextErrors.expires_in_minutes = 'Expires in minutes must be a positive integer.';
      }
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm();
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload: CreateInvitePayload = {
      email: email.trim(),
      role: (lockedRole ?? role) as InviteRole,
      ...(expiresInMinutes.trim() ? { expires_in_minutes: Number(expiresInMinutes) } : {}),
    };

    setIsSubmitting(true);

    try {
      await inviteService.createInvite(payload);
      toast.success('Invite sent successfully');
      setEmail('');
      setRole('');
      setExpiresInMinutes('');
      setFieldErrors({});
      await loadData(activeTab, false);
    } catch (submitError: unknown) {
      const axiosError = submitError as { response?: { status?: number; data?: ApiErrorResponse } };

      if (axiosError.response?.status === 422) {
        const backendErrors = axiosError.response.data?.errors ?? {};
        setFieldErrors({
          email: normalizeError(backendErrors.email),
          role: normalizeError(backendErrors.role),
          expires_in_minutes: normalizeError(backendErrors.expires_in_minutes),
        });

        const backendMessage = axiosError.response.data?.message;
        if (backendMessage) {
          toast.error(backendMessage);
        }
      } else {
        toast.error(submitError instanceof Error ? submitError.message : 'Failed to send invite');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageAction = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleInviteContext('employee')}
        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
      >
        <MailPlus size={16} />
        + Invite Employee
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleInviteContext('client')}
        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
      >
        <Users size={16} />
        + Invite Client
      </Button>
    </div>
  );

  if (error && !loading) {
    return (
      <PageContainer title="Invites" description="Invite employees and clients to your workspace." action={pageAction}>
        <DataFetchError message={error} onRetry={() => void loadData(activeTab, true)} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Invite Center"
      description="A premium SaaS onboarding workspace for employees and clients."
      action={pageAction}
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-3xl border border-white/70 bg-linear-to-br from-slate-950 via-slate-900 to-cyan-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
          <div className="relative px-5 py-6 sm:px-6 lg:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_36%)]" />
            <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.9fr] xl:items-end">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 backdrop-blur-xl">
                  <Sparkles size={13} />
                  Onboarding center
                </div>
                <div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">Invite people with a clean enterprise flow</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    Manage pending, accepted, expired, revoked, and hidden invites from a single premium workspace.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard label="Pending" value={stats?.pending ?? 0} icon={<Clock3 size={18} />} accent="bg-blue-500/15 text-blue-200" />
                  <StatCard label="Accepted" value={stats?.accepted ?? 0} icon={<BadgeCheck size={18} />} accent="bg-emerald-500/15 text-emerald-200" />
                  <StatCard label="Expired" value={stats?.expired ?? 0} icon={<AlertTriangle size={18} />} accent="bg-amber-500/15 text-amber-200" />
                  <StatCard label="Revoked" value={stats?.revoked ?? 0} icon={<ShieldAlert size={18} />} accent="bg-rose-500/15 text-rose-200" />
                  <StatCard label="Hidden" value={activeCounts.hidden} icon={<EyeOff size={18} />} accent="bg-slate-500/15 text-slate-200" />
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">Current view</p>
                    <h3 className="mt-2 text-xl font-semibold capitalize text-white">{activeTab} invites</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {activeTab === 'hidden' ? 'Hidden invites are stored locally and can be restored.' : 'Newest invites stay at the top with live actions.'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Visible</p>
                    <p className="text-2xl font-semibold text-white">{visibleInvites.length}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setArchiveConfirmOpen(true)}
                    className="border-white/15 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Archive size={15} />
                    Archive active invites
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadData(activeTab, false)}
                    className="border-white/15 bg-white/10 text-white hover:bg-white/20"
                  >
                    <RefreshCcw size={15} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Invite user</h3>
              <p className="mt-1 text-sm text-slate-500">Reuse the same invite flow while giving it a cleaner onboarding shell.</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {lockedRole ? `Role locked to ${lockedRole}` : 'Choose employee or client'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Input
                label="Email"
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={fieldErrors.email}
                disabled={isSubmitting}
                required
                icon={<MailPlus size={18} />}
                className="rounded-2xl border-slate-200 bg-slate-50/80 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Role</label>
              <select
                value={lockedRole ?? role}
                onChange={(event) => setRole(event.target.value as InviteRole)}
                disabled={isSubmitting || Boolean(lockedRole)}
                className={`h-12 w-full rounded-2xl border px-4 text-sm text-slate-900 outline-none transition-colors focus:ring-2 focus:ring-cyan-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                  fieldErrors.role ? 'border-red-400' : 'border-slate-200 bg-slate-50/80'
                }`}
              >
                {!lockedRole && <option value="">Select a role</option>}
                <option value="employee">employee</option>
                <option value="client">client</option>
              </select>
              {fieldErrors.role ? <p className="mt-1 text-xs text-red-700">{fieldErrors.role}</p> : null}
            </div>

            <div>
              <Input
                label="Expires in minutes"
                type="number"
                min={1}
                placeholder="10080"
                value={expiresInMinutes}
                onChange={(event) => setExpiresInMinutes(event.target.value)}
                error={fieldErrors.expires_in_minutes}
                disabled={isSubmitting}
                icon={<CalendarDays size={18} />}
                className="rounded-2xl border-slate-200 bg-slate-50/80 focus:bg-white"
              />
            </div>

            <div className="lg:col-span-4 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEmail('');
                  setRole('');
                  setExpiresInMinutes('');
                  setFieldErrors({});
                }}
                disabled={isSubmitting}
                className="rounded-2xl"
              >
                Reset
              </Button>
              <Button type="submit" isLoading={isSubmitting} className="rounded-2xl bg-slate-900 px-5 hover:bg-slate-800" disabled={isSubmitting}>
                <Send size={16} />
                {lockedRole === 'employee' ? 'Send Employee Invite' : lockedRole === 'client' ? 'Send Client Invite' : 'Send Invite'}
              </Button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-cyan-600" />
                <h3 className="text-lg font-semibold text-slate-900">Invite status</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">Filter the onboarding queue without losing the current page state.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tabMeta.map((tab) => {
                const isActive = activeTab === tab.key;
                const count =
                  tab.key === 'all'
                    ? activeCounts.all
                    : tab.key === 'hidden'
                      ? activeCounts.hidden
                      : activeCounts[tab.key as keyof typeof activeCounts] ?? 0;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {count > 0 ? <span className={`rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/15 text-white' : 'bg-white text-slate-700'}`}>{count}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              <div className="flex justify-center py-6">
                <LoadingSpinner />
              </div>
            </div>
          ) : error ? (
            <DataFetchError message={error} onRetry={() => void loadData(activeTab, true)} />
          ) : visibleInvites.length === 0 ? (
            <EmptyState
              title={activeTab === 'hidden' ? 'No hidden invites yet' : 'No invites found'}
              message={
                activeTab === 'all'
                  ? 'Send the first invite to start onboarding.'
                  : activeTab === 'hidden'
                    ? 'Hidden invites will appear here after you archive or hide them.'
                    : `No ${activeTab} invites matched the current filter.`
              }
            />
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-275 text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/90 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Invited By</th>
                      <th className="px-4 py-3 font-semibold">Created At</th>
                      <th className="px-4 py-3 font-semibold">Expires At</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleInvites.map((invite, index) => {
                      const inviteStatus = getInviteStatus(invite, new Set(hiddenInviteIds));
                      const style = statusStyles[inviteStatus] ?? statusStyles.pending;
                      const resendBusy = actionKey === `resend:${invite.id}`;
                      const restoreBusy = actionKey === `restore:${invite.id}`;
                      const isRowHidden = inviteStatus === 'hidden';

                      return (
                        <motion.tr
                          key={invite.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.03, 0.18) }}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900">{invite.email}</p>
                              <p className="text-xs text-slate-500">{getInviteStatusMessage(inviteStatus)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 capitalize text-slate-700">{invite.role}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.chip}`}>
                              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                              {style.badge}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{invite.invited_by?.name ?? '—'}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDate(invite.created_at)}</td>
                          <td className="px-4 py-4 text-slate-700">{formatDate(invite.expires_at)}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {(inviteStatus === 'pending' || inviteStatus === 'expired') && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleResendInvite(invite)}
                                  isLoading={resendBusy}
                                >
                                  <RotateCcw size={14} />
                                  Resend
                                </Button>
                              )}

                              {inviteStatus === 'pending' && !isRowHidden && (
                                <Button type="button" variant="danger" size="sm" onClick={() => setRevokeTarget(invite)}>
                                  <Trash2 size={14} />
                                  Revoke
                                </Button>
                              )}

                              {!isRowHidden ? (
                                <Button type="button" variant="outline" size="sm" onClick={() => handleHideInvite(invite.id)}>
                                  <EyeOff size={14} />
                                  Hide
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleRestoreInvite(invite)}
                                  isLoading={restoreBusy}
                                >
                                  <Eye size={14} />
                                  Restore Invite
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {visibleInvites.map((invite, index) => {
                  const inviteStatus = getInviteStatus(invite, new Set(hiddenInviteIds));
                  const style = statusStyles[inviteStatus] ?? statusStyles.pending;
                  const resendBusy = actionKey === `resend:${invite.id}`;
                  const restoreBusy = actionKey === `restore:${invite.id}`;
                  const isRowHidden = inviteStatus === 'hidden';

                  return (
                    <motion.article
                      key={invite.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.18) }}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{invite.email}</p>
                          <p className="mt-1 text-xs text-slate-500">{getInviteStatusMessage(inviteStatus)}</p>
                        </div>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${style.chip}`}>
                          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                          {style.badge}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Role</p>
                          <p className="mt-1 font-medium capitalize text-slate-900">{invite.role}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invited by</p>
                          <p className="mt-1 font-medium text-slate-900">{invite.invited_by?.name ?? '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Created</p>
                          <p className="mt-1 font-medium text-slate-900">{formatRelativeTime(invite.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Expires</p>
                          <p className="mt-1 font-medium text-slate-900">{formatRelativeTime(invite.expires_at)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(inviteStatus === 'pending' || inviteStatus === 'expired') && (
                          <Button type="button" variant="outline" size="sm" onClick={() => void handleResendInvite(invite)} isLoading={resendBusy}>
                            <RotateCcw size={14} />
                            Resend
                          </Button>
                        )}

                        {inviteStatus === 'pending' && !isRowHidden && (
                          <Button type="button" variant="danger" size="sm" onClick={() => setRevokeTarget(invite)}>
                            <Trash2 size={14} />
                            Revoke
                          </Button>
                        )}

                        {!isRowHidden ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => handleHideInvite(invite.id)}>
                            <EyeOff size={14} />
                            Hide
                          </Button>
                        ) : (
                          <Button type="button" variant="outline" size="sm" onClick={() => void handleRestoreInvite(invite)} isLoading={restoreBusy}>
                            <Eye size={14} />
                            Restore Invite
                          </Button>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </>
          )}

          {refreshing && !loading && (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <LoadingSpinner />
              Refreshing invite data...
            </div>
          )}
        </section>
      </div>

      <Modal open={archiveConfirmOpen} onClose={() => !isArchiving && setArchiveConfirmOpen(false)} title="Archive Active Invites" panelClassName="max-w-lg">
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            This will hide all active invites from the main table. Hidden invites will stay available in the Hidden tab.
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setArchiveConfirmOpen(false)} disabled={isArchiving}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleArchiveInvites()} isLoading={isArchiving} disabled={isArchiving}>
              Archive invites
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(revokeTarget)} onClose={() => !isRevoking && setRevokeTarget(null)} title="Revoke Invite" panelClassName="max-w-lg">
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Are you sure you want to revoke this invite?</p>
            <p className="mt-1 text-amber-800">{revokeTarget?.email}</p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setRevokeTarget(null)} disabled={isRevoking}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleRevokeInvite()} isLoading={isRevoking} disabled={isRevoking}>
              Revoke invite
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
};

export default AdminInvites;