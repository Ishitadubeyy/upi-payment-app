import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, History, ScanLine, BarChart3, User } from 'lucide-react';

const tabs = [
  { to: '/app/home', label: 'Home', icon: Home },
  { to: '/app/history', label: 'History', icon: History },
  { to: '/app/scan', label: 'Scan', icon: ScanLine, center: true },
  { to: '/app/insights', label: 'Insights', icon: BarChart3 },
  { to: '/app/profile', label: 'Profile', icon: User },
];

export default function AppLayout() {
  const location = useLocation();
  const hideNav = location.pathname.includes('/send') || location.pathname.includes('/receive') || location.pathname.includes('/transactions/');

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col bg-surface lg:max-w-4xl lg:flex-row">
      <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white lg:p-4">
        <div className="mb-6 px-2">
          <p className="text-lg font-bold text-primary">PayFlow UPI</p>
          <p className="text-xs text-slate-500">Demo wallet</p>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        <main className={`flex-1 px-4 pb-24 pt-4 lg:pb-6 ${hideNav ? 'pb-6' : ''}`}>
          <Outlet />
        </main>

        {!hideNav && (
          <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-lg items-end justify-around px-2 pb-2 pt-1">
              {tabs.map(({ to, label, icon: Icon, center }) =>
                center ? (
                  <NavLink key={to} to={to} className="-mt-5 flex flex-col items-center gap-1">
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg ${
                            isActive ? 'bg-accent text-white' : 'bg-primary text-white'
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </span>
                        <span className="text-[10px] font-medium text-slate-600">{label}</span>
                      </>
                    )}
                  </NavLink>
                ) : (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-medium ${
                        isActive ? 'text-accent' : 'text-slate-500'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </NavLink>
                )
              )}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
