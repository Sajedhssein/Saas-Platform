import { useState, useEffect } from 'react';
import { Button, Input } from '../../components/ui';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import useAuthStore from '../../store/authStore';
import type { AxiosError } from 'axios';
import { getDashboardPathForUser, resolveUserRole } from '../../utils/auth';
import logo from '../../assets/WhatsApp_Image_2023-10-18_at_18.48.30_3f0dc5e9-removebg-preview (1).png';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(id);
  }, [error]);

  const location = useLocation();
  const from = (location.state as { from?: Location })?.from;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call login API
      const response = await authService.login({ email, password });
      
      // Store token and user in Zustand store
      login(response.user, response.token);

      const resolvedRole = resolveUserRole(response.user);
      const dashboardPath = getDashboardPathForUser(response.user);
      const redirectPath = from?.pathname ? from.pathname : dashboardPath;

      if (import.meta.env.DEV) {
        console.log('[auth/login] redirect target', {
          user: response.user,
          resolvedRole,
          redirectPath,
        });
      }

      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      // Handle error
      const error = err as AxiosError<{ message?: string }>;
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
              Admin Login
            </div>

            <h1 className="mt-6 text-4xl xl:text-6xl font-bold leading-tight">
              Sign in to manage your workspace
            </h1>
            <p className="mt-3 max-w-lg text-sm md:text-base text-cyan-100/90" dir="rtl">
              سجّل دخولك لإدارة مساحة العمل والوصول إلى اللوحات والمهام والدعوات.
            </p>

            <p className="mt-5 max-w-lg text-slate-200 text-base md:text-lg leading-7">
              Access dashboards, tasks, projects, and invites from one unified admin-first platform.
              <span className="mt-3 block text-sm text-white/85" dir="rtl">
                منصة واحدة تجمع اللوحات والمهام والمشاريع والدعوات.
              </span>
            </p>

            <div className="mt-8 space-y-4 max-w-lg">
              {[
                {
                  en: 'Secure role-based dashboards for every account',
                  ar: 'لوحات آمنة ومخصصة حسب الدور.',
                },
                {
                  en: 'Fast access to projects, tasks, and team operations',
                  ar: 'وصول سريع للمشاريع والمهام وعمليات الفريق.',
                },
                {
                  en: 'Invite flow and onboarding kept in one clean workspace',
                  ar: 'الدعوات والتسجيل ضمن مساحة عمل واحدة.',
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
                  Login
                </div>
                <h2 className="mt-5 text-2xl sm:text-3xl font-bold text-white">Sign In</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Enter your credentials to access your account.
                  <span className="mt-2 block text-white/85" dir="rtl">
                    أدخل بياناتك للوصول إلى حسابك.
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
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
                disabled={isLoading}
                labelClassName="text-white"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
              />

              <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-500 bg-slate-900 text-cyan-500"
                    disabled={isLoading}
                  />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-cyan-300 hover:text-cyan-200">
                  Forgot password?
                </Link>
              </div>

              <Button
                variant="primary"
                type="submit"
                isLoading={isLoading}
                className="w-full gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                disabled={isLoading}
              >
                Sign In
                {!isLoading && <ArrowRight size={18} />}
              </Button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-slate-300">
                Don&apos;t have an account?{' '}
                <Link to="/register" className="font-semibold text-cyan-300 hover:text-cyan-200">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// auto-dismiss handled via useEffect above
