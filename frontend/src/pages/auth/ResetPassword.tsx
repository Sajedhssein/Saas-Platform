import { useState, useEffect } from 'react';
import { Button, Input } from '../../components/ui';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../../services/authService';
import type { AxiosError } from 'axios';
import logo from '../../assets/WhatsApp_Image_2023-10-18_at_18.48.30_3f0dc5e9-removebg-preview (1).png';

const PASSWORD_RESET_EMAIL_KEY = 'password_reset_email';

interface ValidationErrors {
  email?: string[];
  password?: string[];
  password_confirmation?: string[];
}

export const ResetPassword = () => {
  const navigate = useNavigate();
  const { token: paramToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const queryEmail = searchParams.get('email');
  
  // Support both URL param (/reset-password/{token}) and query param (/reset-password?token=...)
  const token = paramToken || queryToken;
  const [email, setEmail] = useState(() => queryEmail || localStorage.getItem(PASSWORD_RESET_EMAIL_KEY) || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(id);
  }, [error]);

  useEffect(() => {
    if (!queryEmail?.trim()) return;
    localStorage.setItem(PASSWORD_RESET_EMAIL_KEY, queryEmail.trim());
  }, [queryEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setIsLoading(true);

    const resetEmail = email.trim();

    if (!token) {
      setError('Invalid reset token. Please try again.');
      setIsLoading(false);
      return;
    }

    if (!resetEmail) {
      setFieldErrors({ email: ['Email is required to reset your password.'] });
      setIsLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setFieldErrors({ password_confirmation: ['Passwords do not match'] });
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        email: resetEmail,
        token,
        password,
        password_confirmation: passwordConfirm,
      };

      if (import.meta.env.DEV) {
        console.log('[auth/reset-password] final payload', payload);
        console.log('[auth/reset-password] email value', resetEmail);
        console.log('[auth/reset-password] token value', token);
      }

      await authService.resetPassword(resetEmail, token, password, passwordConfirm);
      localStorage.removeItem(PASSWORD_RESET_EMAIL_KEY);
      setSuccess(true);

      if (import.meta.env.DEV) {
        console.log('[auth/reset-password] password reset successful', { email: resetEmail, token });
      }

      // Auto-redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 5000);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string; errors?: ValidationErrors }>;
      
      if (axiosError.response?.status === 422) {
        setFieldErrors(axiosError.response?.data?.errors ?? {});
      } else {
        const errorMessage = axiosError.response?.data?.message || 'Failed to reset password. Please try again.';
        setError(errorMessage);
      }
      
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <div className="absolute -top-28 -left-12 h-72 w-72 rounded-full bg-cyan-500 blur-3xl" />
          <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-blue-500 blur-3xl" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-white/80 blur-3xl" />
          <div className="absolute top-8 left-1/2 -translate-x-1/2 h-56 w-72 rounded-full bg-white/50 blur-3xl" />
          <div className="absolute inset-0 bg-linear-to-b from-white/12 via-transparent to-white/8" />
        </div>

        <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-5 sm:p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10">
              <CheckCircle2 className="text-green-400" size={32} />
            </div>
            <h1 className="text-2xl font-bold">Password Reset</h1>
            <p className="mt-3 text-sm text-slate-300">
              Your password has been successfully reset.
              <span className="mt-2 block text-white/85" dir="rtl">
                تم إعادة تعيين كلمة المرور بنجاح.
              </span>
            </p>
            <p className="mt-4 text-xs text-slate-400">Redirecting you to login in a moment...</p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-400/20 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-400/30"
            >
              Back to login
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-28 -left-12 h-72 w-72 rounded-full bg-cyan-500 blur-3xl" />
        <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-white/80 blur-3xl" />
        <div className="absolute top-8 left-1/2 -translate-x-1/2 h-56 w-72 rounded-full bg-white/50 blur-3xl" />
        <div className="absolute inset-0 bg-linear-to-b from-white/12 via-transparent to-white/8" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-2 lg:py-20">
        <section className="hidden lg:block lg:self-start lg:pt-8">
          <div className="max-w-xl rounded-4xl border border-white/15 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.12em] text-slate-200">
              Password Recovery
            </div>

            <h1 className="mt-6 text-4xl xl:text-6xl font-bold leading-tight">
              Create new password
            </h1>
            <p className="mt-3 max-w-lg text-sm md:text-base text-cyan-100/90" dir="rtl">
              استعد الوصول إلى حسابك بخطوات بسيطة وسريعة.
            </p>

            <p className="mt-5 max-w-lg text-slate-200 text-base md:text-lg leading-7">
              Enter a new password to reset your account access.
              <span className="mt-3 block text-sm text-white/85" dir="rtl">
                أدخل كلمة مرور جديدة آمنة لحسابك.
              </span>
            </p>

            <div className="mt-8 space-y-4 max-w-lg">
              {[
                {
                  en: 'Use a strong, unique password',
                  ar: 'استخدم كلمة مرور قوية وفريدة.',
                },
                {
                  en: 'Passwords must match for security',
                  ar: 'التأكد من تطابق كلمات المرور.',
                },
                {
                  en: 'Instant access after reset',
                  ar: 'الوصول الفوري بعد الإعادة.',
                },
              ].map((feature) => (
                <div
                  key={feature.en}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
                >
                  <div className="mt-1 h-2 w-2 rounded-full bg-cyan-300" />
                  <div>
                    <p className="text-sm leading-6 text-white/95">{feature.en}</p>
                    <p className="mt-1 text-xs text-cyan-100/80" dir="rtl">
                      {feature.ar}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/5 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
            <div className="mb-6 text-center">
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="ProjectHub logo"
                  className="h-24 w-auto object-contain transition-all duration-300 ease-out hover:scale-105 hover:drop-shadow-[0_0_28px_rgba(255,255,255,0.45)] sm:h-28"
                />
              </div>
              <p className="mt-3 text-sm uppercase tracking-[0.2em] text-slate-300">improver</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center sm:text-left">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                  Reset Password
                </div>
                <h2 className="mt-5 text-2xl sm:text-3xl font-bold text-white">New Password</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Enter your new password below.
                  <span className="mt-2 block text-white/85" dir="rtl">
                    أدخل كلمة المرور الجديدة.
                  </span>
                </p>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-300 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-100">{error}</p>
                </div>
              )}

              <Input
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
                disabled={isLoading}
                labelClassName="text-white"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
                error={fieldErrors.email?.[0]}
              />

              <Input
                label="New Password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
                disabled={isLoading}
                labelClassName="text-white"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
                error={fieldErrors.password?.[0]}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Confirm new password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                icon={<Lock size={18} />}
                required
                disabled={isLoading}
                labelClassName="text-white"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
                error={fieldErrors.password_confirmation?.[0]}
              />

              <Button
                type="submit"
                isLoading={isLoading}
                disabled={isLoading || !email.trim() || !password || !passwordConfirm}
                className="w-full bg-linear-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-lg shadow-cyan-500/20"
              >
                {isLoading ? 'Resetting...' : 'Reset Password'}
                {!isLoading && <ArrowRight size={18} />}
              </Button>

              <div className="pt-2 text-center text-sm">
                <span className="text-slate-300">Remember your password? </span>
                <Link to="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
