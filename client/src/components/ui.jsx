import { Loader2 } from 'lucide-react';

export function Button({ children, variant = 'primary', className = '', loading, disabled, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:pointer-events-none';
  const variants = {
    primary: 'bg-accent text-white hover:bg-indigo-500 focus-visible:outline-accent',
    secondary: 'bg-white text-primary border border-slate-200 hover:bg-slate-50 focus-visible:outline-accent',
    ghost: 'bg-transparent text-primary hover:bg-slate-100',
    danger: 'bg-danger text-white hover:bg-red-700',
  };
  return (
    <button type="button" className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      <input
        className={`w-full rounded-xl border bg-white px-3 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-indigo-100 ${
          error ? 'border-red-400' : 'border-slate-200'
        }`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function StatusBadge({ status }) {
  const map = {
    successful: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    refunded: 'bg-violet-50 text-violet-700 border-violet-200',
    refund_pending: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  const label = (status || '').replace('_', ' ');
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${map[status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {label}
    </span>
  );
}

export function DemoBanner({ compact }) {
  return (
    <div className={`rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-900 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}>
      Demo simulator — no real UPI or bank money is moved.
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

export function Avatar({ name, color = '#4F46E5', size = 'md' }) {
  const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-14 w-14 text-base' };
  const letters = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${sizes[size]}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {letters}
    </div>
  );
}
