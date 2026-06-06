import { Button } from '../components/ui';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import logo from '../assets/WhatsApp_Image_2023-10-18_at_18.48.30_3f0dc5e9-removebg-preview (1).png';
import useAuthStore from '../store/authStore';
import { getDashboardPathForUser } from '../utils/auth';

export const Home = () => {
  const { isAuthenticated, user } = useAuthStore();
  const dashboardPath = getDashboardPathForUser(user);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <div className="absolute -top-28 -left-12 h-72 w-72 rounded-full bg-cyan-500 blur-3xl" />
        <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-blue-500 blur-3xl" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-72 w-96 rounded-full bg-white/80 blur-3xl" />
        <div className="absolute top-8 left-1/2 -translate-x-1/2 h-56 w-72 rounded-full bg-white/50 blur-3xl" />
        <div className="absolute inset-0 bg-linear-to-b from-white/12 via-transparent to-white/8" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <section className="order-2 lg:order-1">
            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.12em] text-slate-200">
                Improver Your Consultant
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold leading-tight">
                Manage Teams, Projects, and Delivery in One Place
              </h1>
              <p className="mt-3 max-w-xl text-sm md:text-base text-cyan-100/90" dir="rtl">
                إدارة الفرق والمشاريع والتنفيذ من مكان واحد بطريقة واضحة ومنظمة.
              </p>
            </div>

            <p className="mt-5 max-w-xl text-slate-200 text-base md:text-lg leading-7">
              Improver gives admins a unified workspace to onboard users, assign work, and monitor execution with clear ownership across teams.
              <span className="mt-3 block text-sm text-white/85" dir="rtl">
                تمنحك Improver مساحة موحّدة لتسجيل المستخدمين، توزيع المهام، ومتابعة التنفيذ.
              </span>
            </p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <p className="text-sm font-semibold">Role-based dashboards</p>
                <p className="text-xs text-slate-300 mt-1">Admin, employee, and client experiences.</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3">
                <p className="text-sm font-semibold">Invite-driven onboarding</p>
                <p className="text-xs text-slate-300 mt-1">Onboard users securely with expiring links.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link to={dashboardPath}>
                  <Button size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-xl">
                    Go to Dashboard
                    <ArrowRight size={18} />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl">
                      Login
                      <ArrowRight size={18} />
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-xl">
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </section>

          <section className="order-1 lg:order-2 lg:justify-self-end w-full max-w-lg">
            <div className="lg:hidden text-center mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.12em] text-slate-200">
                Improver Your Consultant
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl font-bold leading-tight">
                Manage Teams, Projects, and Delivery in One Place
              </h1>
                <p className="mt-3 text-sm text-cyan-100/90" dir="rtl">
                  إدارة الفرق والمشاريع والتنفيذ من مكان واحد.
                </p>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-md p-6 sm:p-8 shadow-2xl">

              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="Improver logo"
                  className="h-36 max-[420px]:h-40 max-[360px]:h-44 sm:h-44 w-auto object-contain transition-all duration-300 ease-out hover:scale-105 hover:drop-shadow-[0_0_28px_rgba(255,255,255,0.45)]"
                />
              </div>

              <div className="mt-6 space-y-4">
                {[
                  'Create and track projects with clear ownership',
                  'Manage tasks and priorities across departments',
                  'Invite employees and clients from one admin panel',
                ].map((item) => (
                  <div
                    key={item}
                    className="group flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10 hover:shadow-[0_10px_30px_rgba(56,189,248,0.2)]"
                  >
                    <CheckCircle2
                      className="text-cyan-300 shrink-0 mt-0.5 transition-all duration-300 group-hover:scale-110 group-hover:text-cyan-200"
                      size={18}
                    />
                      <p className="text-sm text-slate-100 transition-colors duration-300 group-hover:text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
