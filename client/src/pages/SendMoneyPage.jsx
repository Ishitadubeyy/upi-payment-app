import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '../services/api';
import { Button, Card, Input } from '../components/ui';
import { formatInrFromPaise, rupeesInputToPaise } from '../utils/format';

const STEPS = ['recipient', 'amount', 'confirm', 'result'];

export default function SendMoneyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState('recipient');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const idempotencyKey = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    const rid = params.get('recipient');
    if (rid) {
      api.get('/users/search', { params: { q: 'a' } }).then(() => {
        api
          .get('/users/resolve', { params: { upiId: '' } })
          .catch(() => {});
      });
      (async () => {
        try {
          const res = await api.get('/users/search', { params: { q: 'demo' } });
          const found = (res.data.users || []).find((u) => u.id === rid);
          if (found) {
            setRecipient(found);
            setStep('amount');
          }
        } catch {
          /* ignore */
        }
      })();
    }
  }, [params]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await api.get('/users/search', { params: { q: query } });
      setUsers(data.users || []);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const resolveManual = async () => {
    setLoading(true);
    try {
      const isPhone = /^[6-9]\d{9}$/.test(query.replace(/\s/g, ''));
      const { data } = await api.get('/users/resolve', {
        params: isPhone ? { phone: query.replace(/\s/g, '') } : { upiId: query.trim().toLowerCase() },
      });
      setRecipient(data.user);
      setStep('amount');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async () => {
    setLoading(true);
    try {
      const amountPaise = rupeesInputToPaise(amount);
      if (!amountPaise) {
        toast.error('Enter a valid amount');
        return;
      }
      const { data } = await api.post('/payments/send', {
        recipientId: recipient.id,
        amountPaise,
        note,
        idempotencyKey,
      });
      setResult(data.transaction);
      setStep('result');
      toast.success('Demo payment successful');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => (step === 'recipient' ? navigate(-1) : setStep(STEPS[STEPS.indexOf(step) - 1] || 'recipient'))} className="rounded-lg p-2 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-primary">Send money (demo)</h1>
      </div>

      {step === 'recipient' && (
        <>
          <Input label="Search name, mobile, or UPI ID" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-left hover:border-indigo-200"
                onClick={() => {
                  setRecipient(u);
                  setStep('amount');
                }}
              >
                <span>
                  <span className="block font-medium">{u.name}</span>
                  <span className="text-xs text-slate-500">{u.maskedUpiId || u.demoUpiId}</span>
                </span>
              </button>
            ))}
          </div>
          <Button className="w-full" variant="secondary" loading={loading} onClick={resolveManual}>
            Resolve recipient
          </Button>
        </>
      )}

      {step === 'amount' && recipient && (
        <>
          <Card>
            <p className="text-sm text-slate-500">Paying</p>
            <p className="font-semibold">{recipient.name}</p>
            <p className="text-xs text-slate-500">{recipient.maskedUpiId || recipient.demoUpiId}</p>
          </Card>
          <Input label="Amount (₹)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <Button className="w-full" onClick={() => setStep('confirm')}>
            Review
          </Button>
        </>
      )}

      {step === 'confirm' && recipient && (
        <>
          <Card className="space-y-2">
            <p className="text-sm text-slate-500">Confirm simulated transfer</p>
            <p className="text-2xl font-bold">{formatInrFromPaise(rupeesInputToPaise(amount))}</p>
            <p>To: {recipient.name}</p>
            {note && <p className="text-sm text-slate-600">Note: {note}</p>}
          </Card>
          <Button className="w-full" loading={loading} onClick={submitPayment}>
            Pay securely (demo)
          </Button>
        </>
      )}

      {step === 'result' && result && (
        <Card className="text-center">
          <p className="text-sm text-emerald-700">Payment successful (simulated)</p>
          <p className="mt-2 text-2xl font-bold">{formatInrFromPaise(result.amountPaise)}</p>
          <p className="mt-1 text-xs text-slate-500">Ref: {result.transactionReference}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link to={`/app/transactions/${result.id}`}>
              <Button className="w-full">View receipt</Button>
            </Link>
            <Link to="/app/home">
              <Button variant="secondary" className="w-full">
                Back to home
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
