import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Clock3, Lock, Mail, ShieldAlert, User, Users } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { authService } from '../../services/authService';
import useAuthStore from '../../store/authStore';
import type { User as AuthUser } from '../../types';
import type { AxiosError } from 'axios';
import { getDashboardPathForUser } from '../../utils/auth';

type InviteFieldErrors = Partial<{
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
}>;

interface InviteErrorResponse {
  message?: string;
  errors?: Record<string, string[] | string>;
  data?: {
    status?: string;
  };
}

interface InviteValidationData {
  invite_id: string;
  email: string;
  role: 'admin' | 'employee' | 'client';
  expires_at?: string;
  status: 'pending' | 'expired' | 'accepted' | 'used' | string;
}

type InviteUiState = 'loading' | 'ready' | 'invalid' | 'expired' | 'used' | 'error';

const INVALID_INVITE_MESSAGE = 'Invite link is invalid or expired.';
const EXPIRED_INVITE_MESSAGE = 'This invite has expired.';
const USED_INVITE_MESSAGE = 'This invite has already been accepted.';
const GENERIC_INVITE_ERROR_MESSAGE = 'We could not load this invitation. Please try again.';

const normalizeFieldMessage = (value: string[] | string | undefined): string => {
  if (!value) {
    return '';
  }

  return Array.isArray(value) ? value[0] ?? '' : value;
};

const normalizeInviteStatus = (value?: string): InviteUiState => {
  const status = value?.toLowerCase().trim() ?? '';

  if (!status) {
    return 'invalid';
  }

  if (status.includes('expired')) {
    return 'expired';
  }

  if (status.includes('used') || status.includes('accepted') || status.includes('completed')) {
    return 'used';
  }

  if (status.includes('invalid')) {
    return 'invalid';
  }

  return 'invalid';
};

const getInviteStateFromError = (error: AxiosError<InviteErrorResponse>): { state: InviteUiState; message: string } => {
  const status = error.response?.status;
  const message = error.response?.data?.message?.toLowerCase() ?? error.message.toLowerCase();
  const backendStatus = error.response?.data?.data?.status?.toLowerCase();
  const statusHint = backendStatus || message;

  if (status === 410 || statusHint.includes('expired')) {
    return { state: 'expired', message: EXPIRED_INVITE_MESSAGE };
  }

  if (status === 409 || statusHint.includes('already used') || statusHint.includes('already accepted') || statusHint.includes('used')) {
    return { state: 'used', message: USED_INVITE_MESSAGE };
  }

  if (status === 404 || status === 401 || statusHint.includes('invalid')) {
    return { state: 'invalid', message: INVALID_INVITE_MESSAGE };
  }

  if (typeof status === 'number' && status >= 500) {
    return { state: 'error', message: GENERIC_INVITE_ERROR_MESSAGE };
  }

  return { state: 'error', message: error.response?.data?.message || GENERIC_INVITE_ERROR_MESSAGE };
};

const getInviteNoticeMeta = (state: InviteUiState) => {
  switch (state) {
    case 'expired':
      return {
        icon: <Clock3 className="text-amber-400" size={28} />,
        badge: 'Expired invite',
        title: EXPIRED_INVITE_MESSAGE,
        description: 'Ask the sender to generate a new invite link.',
        borderClass: 'border-amber-400/30',
        backgroundClass: 'bg-amber-400/10',
      };
    case 'used':
      return {
        icon: <ShieldAlert className="text-sky-400" size={28} />,
        badge: 'Already used',
        title: USED_INVITE_MESSAGE,
        description: 'This link has already been consumed. Use a new invitation to continue.',
        borderClass: 'border-sky-400/30',
        backgroundClass: 'bg-sky-400/10',
      };
    case 'error':
      return {
        icon: <AlertCircle className="text-rose-400" size={28} />,
        badge: 'Temporary error',
        title: GENERIC_INVITE_ERROR_MESSAGE,
        description: 'Refresh the page or try the link again in a moment.',
        borderClass: 'border-rose-400/30',
        backgroundClass: 'bg-rose-400/10',
      };
    case 'invalid':
    default:
      return {
        icon: <Users className="text-rose-400" size={28} />,
        badge: 'Invalid invite',
        title: INVALID_INVITE_MESSAGE,
        description: 'The invitation is missing, malformed, or no longer available.',
        borderClass: 'border-rose-400/30',
        backgroundClass: 'bg-rose-400/10',
      };
  }
};

export const AcceptInvite = () => {
  const navigate = useNavigate();
  const { publicId } = useParams<{ publicId: string }>();
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  const [invite, setInvite] = useState<InviteValidationData | null>(null);
  const [inviteState, setInviteState] = useState<InviteUiState>('loading');
  const [inviteMessage, setInviteMessage] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<InviteFieldErrors>({});

  const handleGoToLogin = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let isActive = true;

    const loadInvite = async () => {
      if (!publicId) {
        setInvite(null);
        setInviteState('invalid');
        setInviteMessage(INVALID_INVITE_MESSAGE);
        return;
      }

      setInvite(null);
      setInviteState('loading');
      setInviteMessage('');
      setFieldErrors({});

      try {
        const inviteData = await authService.validateInvite(publicId);

        if (!isActive) {
          return;
        }

        const normalizedState = normalizeInviteStatus(inviteData.status);

        if (normalizedState !== 'invalid' && normalizedState !== 'ready') {
          setInvite(inviteData);
          setInviteState(normalizedState);
          setInviteMessage(getInviteNoticeMeta(normalizedState).title);
          return;
        }

        if (inviteData.status !== 'pending') {
          setInvite(inviteData);
          setInviteState('invalid');
          setInviteMessage(INVALID_INVITE_MESSAGE);
          return;
        }

        setInvite(inviteData);
        setInviteState('ready');
        setInviteMessage('');
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        const axiosError = error as AxiosError<InviteErrorResponse>;
        const result = getInviteStateFromError(axiosError);
        setInviteState(result.state);
        setInviteMessage(result.message);
      }
    };

    void loadInvite();

    return () => {
      isActive = false;
    };
  }, [publicId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!invite || inviteState !== 'ready') {
      setInviteState('invalid');
      setInviteMessage(INVALID_INVITE_MESSAGE);
      return;
    }

    const nextFieldErrors: InviteFieldErrors = {};

    if (!firstName.trim()) {
      nextFieldErrors.first_name = 'First name is required.';
    }

    if (!lastName.trim()) {
      nextFieldErrors.last_name = 'Last name is required.';
    }

    if (!password.trim()) {
      nextFieldErrors.password = 'Password is required.';
    }

    if (!passwordConfirmation.trim()) {
      nextFieldErrors.password_confirmation = 'Password confirmation is required.';
    }

    if (password && passwordConfirmation && password !== passwordConfirmation) {
      nextFieldErrors.password_confirmation = 'Passwords do not match.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);
    setInviteMessage('');
    setFieldErrors({});

    try {
      const response = await authService.acceptInvite({
        invite_id: invite.invite_id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });

      // Clear any previous error message
      setInviteMessage('');

      // Ensure response.user has a usable role; fall back to invite.role if missing
      const userToLogin: AuthUser = {
        ...(response.user ?? {}),
        role: response.user?.role ?? invite.role,
      } as AuthUser;
      if (!userToLogin.role && invite?.role) {
        userToLogin.role = invite.role;
      }

      // Persist auth and initialize store
      if (import.meta.env.DEV) {
        console.debug('[acceptInvite] success response', response);
      }
      login(userToLogin, response.token);


      try {
        // Ensure auth store is fully initialized (will be a no-op if already initialized)
        await initializeAuth();
      } catch (initErr) {
        if (import.meta.env.DEV) {
          console.error('[acceptInvite] initializeAuth failed', initErr);
        }
        // proceed with navigation even if initializeAuth failed — login already set the user/token
      }

      setSuccess(true);

      const redirectPath = getDashboardPathForUser(userToLogin);

      if (import.meta.env.DEV) {
        console.log('[auth/invite-accept] redirect target', {
          user: response.user,
          resolvedRole: response.user?.role,
          redirectPath,
        });
      }

      navigate(redirectPath, { replace: true });

      // Sanity check: ensure auth store shows authenticated state; log if not
      try {
        const state = useAuthStore.getState();
        if (import.meta.env.DEV) {
          console.log('[acceptInvite] post-login auth state', state);
        }
      } catch {
        // ignore
      }
    } catch (error: unknown) {
      const wrappedError = error as Error & { cause?: unknown };
      const axiosError = (wrappedError.cause ?? error) as AxiosError<InviteErrorResponse>;

      if (import.meta.env.DEV) {
        console.debug('[acceptInvite] error caught', { error, axiosResponse: axiosError.response });
      }

      if (axiosError.response?.status === 422) {
        const backendErrors = axiosError.response.data?.errors ?? {};
        setFieldErrors({
          email: normalizeFieldMessage(backendErrors.email),
          first_name: normalizeFieldMessage(backendErrors.first_name),
          last_name: normalizeFieldMessage(backendErrors.last_name),
          password: normalizeFieldMessage(backendErrors.password),
          password_confirmation:
            normalizeFieldMessage(backendErrors.password_confirmation) || normalizeFieldMessage(backendErrors.confirm_password),
        });

        const nonFieldMessage = axiosError.response.data?.message;
        if (nonFieldMessage) {
          setInviteMessage(nonFieldMessage);
        }

        if (import.meta.env.DEV) {
          console.error('[acceptInvite] validation failed', {
            requestBody: {
              invite_id: invite.invite_id,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              password,
              password_confirmation: passwordConfirmation,
            },
            responseBody: axiosError.response.data,
          });
        }

        return;
      }

      const resolvedMessage = axiosError.response?.data?.message || GENERIC_INVITE_ERROR_MESSAGE;
      setInviteMessage(resolvedMessage);

      if (import.meta.env.DEV) {
        console.debug('[acceptInvite] axios response body', axiosError.response?.data);
      }

      if (axiosError.response?.status && axiosError.response.status >= 500) {
        console.error('Invite acceptance failed with server error:', {
          status: axiosError.response.status,
          message: resolvedMessage,
          data: axiosError.response.data,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (inviteState === 'loading') {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-r-transparent" />
          </div>
          <h1 className="text-2xl font-bold">Checking your invitation</h1>
          <p className="mt-3 text-sm text-slate-300">
            Verifying invite status and loading your account details.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10">
            <CheckCircle2 className="text-green-400" size={30} />
          </div>
          <h1 className="text-2xl font-bold">Invite accepted</h1>
          <p className="mt-3 text-sm text-slate-300">
            Your account is ready. Redirecting you to your dashboard now.
          </p>
        </div>
      </div>
    );
  }

  if (inviteState !== 'ready' || !invite) {
    const notice = getInviteNoticeMeta(inviteState);

    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4 text-white">
        <div className={`w-full max-w-md rounded-3xl border ${notice.borderClass} ${notice.backgroundClass} p-8 text-center shadow-2xl backdrop-blur-md`}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            {notice.icon}
          </div>
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
            {notice.badge}
          </div>
          <div className="relative">
            <h1 className="mt-5 text-2xl font-bold">{inviteMessage || notice.title}</h1>
            <button
              type="button"
              onClick={() => setInviteMessage('')}
              aria-label="Dismiss"
              className="absolute right-0 top-0 inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-300">{notice.description}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoToLogin}
              className="w-full sm:w-auto bg-white text-slate-950 hover:bg-slate-100"
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4 text-white">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-0 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute top-24 right-0 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10">
            <Mail className="text-cyan-300" size={28} />
          </div>
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
            Secure invite onboarding
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Accept your invitation</h1>
          <p className="mt-3 text-sm text-slate-300">
            Verify your secure invite, then finish account setup with your name and password.
          </p>
        </div>

        {inviteMessage && (
          <div className="relative mb-6 rounded-2xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
            <button
              type="button"
              onClick={() => setInviteMessage('')}
              aria-label="Dismiss"
              className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-1 text-rose-100/80 hover:text-rose-100"
            >
              ×
            </button>
            {inviteMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              value={invite.email}
              readOnly
              error={fieldErrors.email}
              icon={<Mail size={18} />}
              labelClassName="text-white"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-500 read-only:cursor-not-allowed"
            />
            <Input
              label="First Name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              error={fieldErrors.first_name}
              icon={<User size={18} />}
              disabled={isSubmitting}
              required
              autoComplete="given-name"
              labelClassName="text-white"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-500"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              error={fieldErrors.last_name}
              icon={<User size={18} />}
              disabled={isSubmitting}
              required
              autoComplete="family-name"
              labelClassName="text-white"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-500"
            />
          </div>

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              icon={<Lock size={18} />}
              helpText="Choose a password you have not used before."
              disabled={isSubmitting}
              required
              autoComplete="new-password"
              labelClassName="text-white"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-500"
            />

            <Input
              label="Password Confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              error={fieldErrors.password_confirmation}
              icon={<Lock size={18} />}
              disabled={isSubmitting}
              required
              autoComplete="new-password"
              labelClassName="text-white"
              className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-500"
            />

          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-500/20"
          >
            {isSubmitting ? 'Accepting Invite...' : 'Accept Invite'}
            {!isSubmitting && <ArrowRight size={18} />}
          </Button>
        </form>
      </div>
    </div>
  );
};
