import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../services/api';
import { Card, Input, Skeleton, StatusBadge } from '../components/ui';
import { formatDateTime, formatInrFromPaise } from '../utils/format';
import toast from 'react-hot-toast';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
  { key: 'successful', label: 'Success' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

export default function HistoryPage() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const direction = ['sent', 'received'].includes(filter) ? filter : 'all';
      const status = ['successful', 'pending', 'failed', 'refunded'].includes(filter) ? filter : undefined;
      const res = await api.get('/payments/history', {
        params: { q, sort, page: p, limit: 12, direction: direction === 'all' ? undefined : direction, status },
      });
      setData(res.data);
      setPage(p);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), 250);
    return () => clearTimeout(t);
  }, [q, filter, sort]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-primary">Transaction history</h1>
      <Input placeholder="Search name, UPI ID, reference…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              filter === f.key ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm">
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      <div className="space-y-2">
        {loading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        {!loading && data.items.length === 0 && <Card className="text-center text-sm text-slate-500">No transactions match your filters.</Card>}
        {data.items.map((tx) => (
          <Link key={tx.id} to={`/app/transactions/${tx.id}`}>
            <Card className="flex items-center justify-between hover:border-indigo-100">
              <div>
                <p className="text-sm font-medium">{tx.direction === 'sent' ? tx.recipient.name : tx.sender.name}</p>
                <p className="text-xs text-slate-500">{formatDateTime(tx.createdAt)} · {tx.transactionReference}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatInrFromPaise(tx.amountPaise)}</p>
                <StatusBadge status={tx.status} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" disabled={page <= 1} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40" onClick={() => load(page - 1)}>
            Prev
          </button>
          <span className="text-sm text-slate-500">
            Page {page} / {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => load(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
