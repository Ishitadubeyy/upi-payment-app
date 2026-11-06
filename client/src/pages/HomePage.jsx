import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ArrowUpRight, ArrowDownLeft, QrCode, History, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Avatar, Card, DemoBanner, Skeleton, StatusBadge } from '../components/ui';
import { firstName, formatDateTime, formatInrFromPaise } from '../utils/format';

export default function HomePage() {
  const { user, refreshUser } = useAuth();
  const [recent, setRecent] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [hist, search, insight] = await Promise.all([
          api.get('/payments/history', { params: { limit: 5 } }),
          api.get('/users/search', { params: { q: 'demo' } }),
          api.get('/insights/summary'),
        ]);
        setRecent(hist.data.items || []);
        setContacts((search.data.users || []).slice(0, 6));
        setSummary(insight.data.summary);
        await refreshUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  const quick = [
    { to: '/app/send', label: 'Send', icon: ArrowUpRight, color: 'bg-indigo-600' },
    { to: '/app/receive', label: 'Receive', icon: ArrowDownLeft, color: 'bg-violet-600' },
    { to: '/app/scan', label: 'Scan QR', icon: QrCode, color: 'bg-blue-600' },
    { to: '/app/history', label: 'History', icon: History, color: 'bg-slate-700' },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Good day,</p>
          <h1 className="text-xl font-bold text-primary">{firstName(user?.name)}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/notifications" className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Notifications">
            <Bell className="h-5 w-5 text-slate-700" />
          </Link>
          <Avatar name={user?.name} color={user?.avatarColor} />
        </div>
      </header>

      <DemoBanner compact />

      <Card className="bg-gradient-to-br from-primary to-primary-light p-5 text-white">
        <p className="text-sm text-indigo-200">Demo wallet balance</p>
        {loading ? (
          <Skeleton className="mt-2 h-9 w-40 bg-white/20" />
        ) : (
          <p className="mt-1 text-3xl font-bold tracking-tight">{formatInrFromPaise(user?.demoBalancePaise)}</p>
        )}
        <p className="mt-2 text-xs text-indigo-200">Not a verified bank balance · {user?.demoUpiId}</p>
      </Card>

      <div className="grid grid-cols-4 gap-3">
        {quick.map(({ to, label, icon: Icon, color }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-2 text-center">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-slate-700">{label}</span>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-primary">People</h2>
          <Link to="/app/send" className="text-xs font-medium text-accent">
            See all
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {loading
            ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-16 shrink-0 rounded-2xl" />)
            : contacts.map((c) => (
                <Link key={c.id} to={`/app/send?recipient=${c.id}`} className="flex w-16 shrink-0 flex-col items-center gap-1">
                  <Avatar name={c.name} color={c.avatarColor} size="sm" />
                  <span className="w-full truncate text-center text-[10px] text-slate-600">{c.name.split(' ')[0]}</span>
                </Link>
              ))}
        </div>
      </section>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-primary">Spending snapshot</h2>
          <Link to="/app/insights" className="text-xs text-accent">
            Insights
          </Link>
        </div>
        {summary ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">Sent (demo)</p>
              <p className="font-semibold">{formatInrFromPaise(summary.totalSentPaise)}</p>
            </div>
            <div>
              <p className="text-slate-500">Received</p>
              <p className="font-semibold">{formatInrFromPaise(summary.totalReceivedPaise)}</p>
            </div>
          </div>
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
      </Card>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold text-primary">Recent activity</h2>
          <Link to="/app/history" className="flex items-center text-xs text-accent">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {loading &&
            [1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-10 w-full" />
              </Card>
            ))}
          {!loading && recent.length === 0 && (
            <Card className="text-center text-sm text-slate-500">No transactions yet. Send a demo payment!</Card>
          )}
          {recent.map((tx) => (
            <Link key={tx.id} to={`/app/transactions/${tx.id}`}>
              <Card className="flex items-center justify-between transition hover:border-indigo-100">
                <div>
                  <p className="text-sm font-medium">
                    {tx.direction === 'sent' ? `To ${tx.recipient.name}` : `From ${tx.sender.name}`}
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.direction === 'sent' ? 'text-slate-800' : 'text-emerald-700'}`}>
                    {tx.direction === 'sent' ? '-' : '+'}
                    {formatInrFromPaise(tx.amountPaise)}
                  </p>
                  <StatusBadge status={tx.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <Card className="border-dashed bg-slate-50 text-sm text-slate-600">
        Safety tip: PayFlow UPI is a college demo. Never enter real UPI PINs or share OTPs here.
      </Card>
    </div>
  );
}
