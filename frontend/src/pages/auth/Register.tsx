import { useState, useEffect } from 'react';
import { Button, Input } from '../../components/ui';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Building2, ArrowRight, AlertCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import type { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import logo from '../../assets/WhatsApp_Image_2023-10-18_at_18.48.30_3f0dc5e9-removebg-preview (1).png';

type RegisterFieldErrors = Partial<{
  fullName: string;
  email: string;
  company: string;
  password: string;
  confirmPassword: string;
}>;

type RegisterErrorResponse = {
  message?: string;
  errors?: Record<string, string[] | string>;
};

const normalizeErrorMessage = (value: string[] | string | undefined): string => {
  if (!value) {
    return '';
  }

  return Array.isArray(value) ? value[0] ?? '' : value;
};

const pickFieldFromMessage = (message: string): keyof RegisterFieldErrors | undefined => {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('email')) {
    return 'email';
  }

  if (normalizedMessage.includes('password')) {
    return 'password';
  }

  if (normalizedMessage.includes('company')) {
    return 'company';
  }

  if (normalizedMessage.includes('name')) {
    return 'fullName';
  }

  return undefined;
};

export const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!formError) return;
    const id = setTimeout(() => setFormError(''), 5000);
    return () => clearTimeout(id);
  }, [formError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Check if passwords match
    if (name === 'confirmPassword' || name === 'password') {
      setPasswordMatch(
        name === 'confirmPassword'
          ? formData.password === value
          : value === formData.confirmPassword
      );
    }
  };

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const nextFieldErrors: RegisterFieldErrors = {};

    if (!formData.fullName.trim()) {
      nextFieldErrors.fullName = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      nextFieldErrors.email = 'Email address is required.';
    }

    if (!formData.company.trim()) {
      nextFieldErrors.company = 'Company name is required.';
    }

    if (!formData.password) {
      nextFieldErrors.password = 'Password is required.';
    }

    if (!formData.confirmPassword) {
      nextFieldErrors.confirmPassword = 'Please confirm your password.';
    }

    if (!passwordMatch) {
      nextFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        fullName: formData.fullName,
        company: formData.company,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });
      toast.success('Registration successful. Please sign in.');
      setIsLoading(false);
      // Redirect to login after successful registration
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      setIsLoading(false);
      const axiosError = err as AxiosError<RegisterErrorResponse>;

      if (axiosError.response?.status === 422) {
        const backendErrors = axiosError.response.data?.errors ?? {};
        const backendMessage = axiosError.response.data?.message ?? '';
        const fullNameError =
          normalizeErrorMessage(backendErrors.full_name) ||
          normalizeErrorMessage(backendErrors.first_name) ||
          normalizeErrorMessage(backendErrors.last_name) ||
          normalizeErrorMessage(backendErrors.name);

        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          fullName: fullNameError,
          email: normalizeErrorMessage(backendErrors.email),
          company: normalizeErrorMessage(backendErrors.company_name) || normalizeErrorMessage(backendErrors.company),
          password: normalizeErrorMessage(backendErrors.password),
          confirmPassword:
            normalizeErrorMessage(backendErrors.password_confirmation) ||
            normalizeErrorMessage(backendErrors.confirm_password),
        }));

        if (backendMessage) {
          const targetField = pickFieldFromMessage(backendMessage);

          if (targetField) {
            setFieldErrors((currentErrors) => ({
              ...currentErrors,
              [targetField]: currentErrors[targetField] || backendMessage,
            }));
          } else {
            setFormError(backendMessage);
          }
        }

        return;
      }

      if (import.meta.env.DEV) {
        console.error('[register] request failed', {
          requestBody: {
            fullName: formData.fullName,
            company: formData.company,
            email: formData.email,
            password: formData.password,
            confirmPassword: formData.confirmPassword,
          },
          responseBody: axiosError.response?.data,
        });
      }

      let msg = 'Registration failed';
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'string') msg = err;
      else if (err && typeof err === 'object' && 'message' in err) {
        // @ts-expect-error: narrow unknown with runtime check
        msg = (err as unknown).message ?? msg;
      }
      setFormError(msg);
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
              Fast Onboarding
            </div>

            <h1 className="mt-6 text-4xl xl:text-6xl font-bold leading-tight">
              Create your workspace in minutes
            </h1>
            <p className="mt-3 max-w-lg text-sm md:text-base text-cyan-100/90" dir="rtl">
              أنشئ مساحة عملك خلال دقائق وابدأ بدعوة فريقك مباشرة.
            </p>

            <p className="mt-5 max-w-lg text-slate-200 text-base md:text-lg leading-7">
              Register your admin account, then start inviting employees and clients from one consistent platform.
              <span className="mt-3 block text-sm text-white/85" dir="rtl">
                سجّل حساب المدير ثم ابدأ بدعوة الموظفين والعملاء من منصة واحدة.
              </span>
            </p>

            <div className="mt-8 space-y-4 max-w-lg">
              {[
                {
                  en: 'Smooth onboarding with clean validation feedback',
                  ar: 'تسجيل سلس مع رسائل تحقق واضحة.',
                },
                {
                  en: 'Invite your team immediately after registration',
                  ar: 'ادعُ فريقك مباشرة بعد التسجيل.',
                },
                {
                  en: 'Keep admin, employee, and client flows aligned',
                  ar: 'حافظ على اتساق مسارات المدير والموظف والعميل.',
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
              <p className="mt-3 text-sm uppercase tracking-[0.2em] text-slate-300">Improver</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center sm:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                  Register
                </div>
                <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-white">Create Account</h1>
                <p className="mt-2 text-sm text-slate-300">
                  Start your free trial today.
                  <span className="mt-2 block text-white/85" dir="rtl">
                    ابدأ تجربتك المجانية اليوم.
                  </span>
                </p>
              </div>

              {formError && (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-red-200">
                      <AlertCircle size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-red-100">Registration error</p>
                      <p className="mt-1 text-sm leading-6 text-red-100/90">{formError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  type="text"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  icon={<User size={18} />}
                  error={fieldErrors.fullName}
                  required
                  labelClassName="text-white"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
                />

                <Input
                  label="Company Name"
                  type="text"
                  name="company"
                  placeholder="Your Company"
                  value={formData.company}
                  onChange={handleChange}
                  icon={<Building2 size={18} />}
                  error={fieldErrors.company}
                  required
                  labelClassName="text-white"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                name="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                icon={<Mail size={18} />}
                error={fieldErrors.email}
                required
                labelClassName="text-white"
                className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Password"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  icon={<Lock size={18} />}
                  error={fieldErrors.password}
                  required
                  labelClassName="text-white"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  icon={<Lock size={18} />}
                  error={fieldErrors.confirmPassword}
                  required
                  labelClassName="text-white"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:ring-cyan-400"
                />
              </div>

              <label className="flex items-start gap-2 cursor-pointer rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500"
                  required
                />
                <span className="text-xs text-slate-300">
                  I agree to the{' '}
                  <a href="#" className="text-cyan-300 hover:text-cyan-200">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-cyan-300 hover:text-cyan-200">
                    Privacy Policy
                  </a>
                </span>
              </label>

              <Button
                variant="primary"
                type="submit"
                isLoading={isLoading}
                disabled={!passwordMatch}
                className="w-full gap-2 rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
              >
                Create Account
                {!isLoading && <ArrowRight size={18} />}
              </Button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-6 text-center">
              <p className="text-sm text-slate-300">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
