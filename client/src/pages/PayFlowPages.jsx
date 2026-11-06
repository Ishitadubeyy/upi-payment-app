import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  ArrowDownLeft, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BarChart3,
  Bell, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp,
  Clock3, Copy, Download, Eye, Home, Info, LogOut, QrCode, ReceiptText,
  Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, UserRound,
  Wallet, X,
} from 'lucide-react';
import { api, getErrorMessage, setAuthToken } from '../services/api';
import { createFreshDemoState, demoContacts, makeDemoTransaction, persistDemoState, readDemoState } from '../services/demoStore';
import { formatDateTime, formatInrFromPaise } from '../utils/format';

const DemoContext = createContext(null);
const navItems = [
  { to: '/app/home', label: 'Overview', icon: Home },
  { to: '/app/history', label: 'Transactions', icon: ReceiptText },
  { to: '/app/scan', label: 'Scan & pay', icon: QrCode },
  { to: '/app/insights', label: 'Insights', icon: BarChart3 },
  { to: '/app/profile', label: 'Profile & settings', icon: UserRound },
];

function normalizeTransaction(transaction) {
  const party = transaction.direction === 'received' ? transaction.sender : transaction.recipient;
  return {
    id: transaction.id,
    transactionReference: transaction.transactionReference,
    direction: transaction.direction,
    amountPaise: transaction.amountPaise,
    status: transaction.status,
    note: transaction.note || '',
    category: transaction.category || 'general',
    party: { name: party?.name || 'PayFlow user', upiId: party?.demoUpiId || '', color: party?.avatarColor || '#6154dc' },
    createdAt: transaction.createdAt,
    refund: transaction.refund || null,
  };
}

export function DemoProvider({ children }) {
  const [state, setState] = useState(readDemoState);

  useEffect(() => persistDemoState(state), [state]);

  useEffect(() => {
    if (!window.localStorage.getItem('payflow-demo-token')) return undefined;
    let active = true;
    api.get('/auth/me')
      .then(({ data }) => {
        if (!active || !data.user) return;
        const user = data.user;
        setState((current) => ({
          ...current,
          balancePaise: user.demoBalancePaise ?? current.balancePaise,
          profile: {
            ...current.profile,
            name: user.name || current.profile.name,
            email: user.email || current.profile.email,
            phone: user.phone || current.profile.phone,
            upiId: user.demoUpiId || current.profile.upiId,
            color: user.avatarColor || current.profile.color,
          },
        }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({
    ...state,
    contacts: demoContacts,
    setProfile: (profile) => setState((current) => ({ ...current, profile: { ...current.profile, ...profile } })),
    setPreference: (key, enabled) => setState((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: enabled },
    })),
    resetDemo: () => {
      window.localStorage.removeItem('payflow-demo-ledger-v1');
      setState(createFreshDemoState());
    },
    sendPayment: async (payment) => {
      const token = window.localStorage.getItem('payflow-demo-token');
      if (token) {
        try {
              const { data } = await api.post('/payments/send', {
            recipientId: payment.recipient.id,
            amountPaise: payment.amountPaise,
            note: payment.note,
            category: payment.category,
            idempotencyKey: crypto.randomUUID(),
          });
          const transaction = normalizeTransaction(data.transaction);
          setState((current) => ({
            ...current,
            balancePaise: data.demoBalancePaise,
            transactions: [transaction, ...current.transactions.filter((item) => item.id !== transaction.id)],
          }));
          return transaction;
        } catch (error) {
          if (error.response && error.response.status !== 401) throw new Error(getErrorMessage(error));
          window.localStorage.removeItem('payflow-demo-token');
          setAuthToken(null);
        }
      }

      if (payment.amountPaise > state.balancePaise) throw new Error('This demo payment is above your available balance.');
      const transaction = makeDemoTransaction(payment);
      setState((current) => ({
        ...current,
        balancePaise: current.balancePaise - payment.amountPaise,
        transactions: [transaction, ...current.transactions],
      }));
      return transaction;
    },
    requestRefund: async (transaction) => {
      const token = window.localStorage.getItem('payflow-demo-token');
      if (token && !transaction.id.startsWith('demo-') && !transaction.id.startsWith('seed-')) {
        try {
          const { data } = await api.post('/refunds', { transactionId: transaction.id, reason: 'Requested from PayFlow demo' });
          const updated = normalizeTransaction(data.transaction);
          setState((current) => ({ ...current, transactions: current.transactions.map((item) => item.id === updated.id ? updated : item) }));
          return updated;
        } catch (error) {
          if (error.response && error.response.status !== 401) throw new Error(getErrorMessage(error));
          window.localStorage.removeItem('payflow-demo-token');
          setAuthToken(null);
        }
      }
      const updated = { ...transaction, status: 'refunded', refund: { refundReference: `RF${Date.now().toString().slice(-8)}`, status: 'completed' } };
      setState((current) => ({
        ...current,
        balancePaise: current.balancePaise + transaction.amountPaise,
        transactions: current.transactions.map((item) => item.id === transaction.id ? updated : item),
      }));
      return updated;
    },
    simulateFailure: (payment) => {
      const transaction = {
        ...makeDemoTransaction(payment),
        status: 'failed',
        failureReason: 'Simulated payment failure',
      };
      setState((current) => ({ ...current, transactions: [transaction, ...current.transactions] }));
      return transaction;
    },
  }), [state]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw new Error('PayFlow demo state is unavailable');
  return value;
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PF';
}

function Avatar({ name, color = '#6154dc', small = false }) {
  return <span className={`avatar${small ? ' small' : ''}`} style={{ backgroundColor: color }}>{initials(name)}</span>;
}

function Status({ status }) {
  const label = (status || 'pending').replaceAll('_', ' ');
  const Icon = status === 'successful' ? CheckCircle2 : status === 'failed' ? X : Clock3;
  return <span className={`status ${status}`}><Icon size={11} />{label}</span>;
}

function DemoNote({ children = 'Demo mode: balances and transfers are fictional. No real bank account or UPI network is connected.' }) {
  return <div className="demo-note"><ShieldCheck size={15} /> <span>{children}</span></div>;
}

function PageTitle({ eyebrow, title, subtitle, action }) {
  return <div className="page-title-row"><div><p className="eyebrow">{eyebrow}</p><h1 className="page-title">{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>{action}</div>;
}

function AppBrand() {
  return <div className="brand"><span className="brand-mark"><ArrowDownRight size={20} strokeWidth={2.5} /></span><span className="brand-name">PayFlow <span>UPI</span></span></div>;
}

export function AppFrame({ apiState }) {
  const { profile } = useDemo();
  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <Link to="/app/home"><AppBrand /></Link>
        <p className="workspace-label">Your money space</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><Icon size={17} />{label}</NavLink>)}
        </nav>
        <div className="side-bottom">
          <div className="demo-side-card"><b><Sparkles size={13} /> Demo wallet</b><p>All activity is simulated. Your demo balance has no cash value.</p></div>
          <Link className="profile-link" to="/app/profile"><Avatar name={profile.name} color={profile.color} small /><span><b>{profile.name}</b><small>Personal account</small></span><ChevronRight size={15} color="#999bac" /></Link>
        </div>
      </aside>
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left"><span className="mode-pill"><i className="mode-dot" /> DEMO MODE</span><span>{apiState === 'checking' ? 'Checking service…' : apiState === 'connected' ? 'API service available' : 'Local demo ledger'}</span></div>
          <div className="topbar-actions"><button type="button" className="icon-button" aria-label="Notifications" title="Demo notifications" onClick={() => toast('You’re all caught up in this demo.')}><Bell size={17} /></button><Link to="/app/profile" aria-label="Open profile"><Avatar name={profile.name} color={profile.color} small /></Link></div>
        </header>
        <div className="page-wrap page-enter"><Outlet /></div>
      </main>
      <nav className="mobile-nav" aria-label="Main navigation">
        {[
          { to: '/app/home', label: 'Home', icon: Home },
          { to: '/app/history', label: 'Activity', icon: ReceiptText },
          { to: '/app/scan', label: 'Scan', icon: QrCode, scan: true },
          { to: '/app/insights', label: 'Insights', icon: BarChart3 },
          { to: '/app/profile', label: 'Profile', icon: UserRound },
        ].map(({ to, label, icon: Icon, scan }) => <NavLink key={to} to={to} className={({ isActive }) => `${scan ? 'scan-tab ' : ''}${isActive ? 'active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}
      </nav>
    </div>
  );
}

function transactionTitle(transaction) {
  return transaction.direction === 'sent' ? `To ${transaction.party?.name || 'PayFlow user'}` : `From ${transaction.party?.name || 'PayFlow user'}`;
}

function TransactionRow({ transaction, compact = false }) {
  const incoming = transaction.direction === 'received';
  return (
    <Link className="tx-row" to={`/app/transactions/${transaction.id}`}>
      <span className="tx-person"><Avatar name={transaction.party?.name} color={transaction.party?.color} small /><span className="tx-person-copy"><b>{transactionTitle(transaction)}</b><span>{transaction.note || formatDateTime(transaction.createdAt)}</span></span></span>
      <span className="tx-amount"><b className={incoming ? 'incoming' : ''}>{incoming ? '+' : '−'}{formatInrFromPaise(transaction.amountPaise)}</b>{!compact && <span><Status status={transaction.status} /></span>}</span>
    </Link>
  );
}

export function HomePage() {
  const { profile, balancePaise, transactions, contacts } = useDemo();
  const [today] = useState(() => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()));
  const [remoteTransactions, setRemoteTransactions] = useState(null);
  const [remoteSummary, setRemoteSummary] = useState(null);
  const [remoteContacts, setRemoteContacts] = useState(null);
  useEffect(() => {
    if (!window.localStorage.getItem('payflow-demo-token')) return undefined;
    let active = true;
    Promise.all([
      api.get('/payments/history', { params: { limit: 5 } }),
      api.get('/users/search', { params: { q: 'demo' } }),
      api.get('/insights/summary'),
    ]).then(([history, users, insights]) => {
      if (!active) return;
      setRemoteTransactions((history.data.items || []).map(normalizeTransaction));
      setRemoteContacts((users.data.users || []).map((user) => ({
        id: user.id,
        name: user.name,
        upiId: user.demoUpiId,
        color: user.avatarColor || '#6154dc',
      })));
      setRemoteSummary(insights.data.summary);
    }).catch(() => { if (active) { setRemoteTransactions(null); setRemoteContacts(null); setRemoteSummary(null); } });
    return () => { active = false; };
  }, []);
  const shownTransactions = remoteTransactions ?? transactions;
  const shownContacts = remoteContacts?.length ? remoteContacts : contacts;
  const outgoing = remoteSummary
    ? (remoteSummary.recentTransactions || []).filter((item) => item.direction === 'sent' && item.status === 'successful')
    : transactions.filter((item) => item.direction === 'sent' && item.status === 'successful');
  const incoming = remoteSummary
    ? (remoteSummary.recentTransactions || []).filter((item) => item.direction === 'received' && item.status === 'successful')
    : transactions.filter((item) => item.direction === 'received' && item.status === 'successful');
  const spent = outgoing.reduce((total, item) => total + item.amountPaise, 0);
  const bars = [34, 55, 42, 74, 49, 65, 38];

  return (
    <>
      <div className="welcome-row"><div><p>{today}</p><h1 className="page-title">Good afternoon, {profile.name.split(' ')[0]}</h1></div><Link className="icon-button" to="/app/profile" aria-label="Profile settings"><Settings2 size={17} /></Link></div>
      <div className="home-grid">
        <div className="home-primary">
          <section>
            <div className="balance-card surface">
              <div className="balance-head"><span>Available demo balance</span><Eye size={16} /></div>
              <div className="balance-value">{formatInrFromPaise(balancePaise)}</div>
              <div className="balance-footer"><span><Wallet size={13} /> Fictional wallet balance</span><span>{profile.upiId}</span></div>
            </div>
            <div className="quick-actions">
              <Link className="quick-action" to="/app/send"><span className="quick-icon"><ArrowUpRight size={19} /></span>Send money</Link>
              <Link className="quick-action" to="/app/receive"><span className="quick-icon"><ArrowDownLeft size={19} /></span>Receive</Link>
              <Link className="quick-action" to="/app/scan"><span className="quick-icon"><QrCode size={19} /></span>Scan QR</Link>
              <Link className="quick-action" to="/app/history"><span className="quick-icon"><ReceiptText size={19} /></span>History</Link>
            </div>
          </section>
          <section className="surface content-card">
            <div className="section-heading"><h2>People</h2><Link className="text-link" to="/app/send">All contacts <ArrowRight size={13} /></Link></div>
            <div className="contacts-row">{shownContacts.map((person) => <Link className="contact-link" key={person.id} to={`/app/send?recipient=${person.id}`}><Avatar name={person.name} color={person.color} /><span>{person.name.split(' ')[0]}</span></Link>)}</div>
          </section>
          <section className="surface content-card">
            <div className="section-heading"><h2>Recent activity</h2><Link className="text-link" to="/app/history">See all <ArrowRight size={13} /></Link></div>
            <div className="tx-list">{shownTransactions.length ? shownTransactions.slice(0, 5).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />) : <EmptyState title="Nothing here yet" text="Your demo payments will show up here." />}</div>
          </section>
        </div>
        <aside className="home-secondary">
          <section className="surface snapshot">
            <div className="section-heading"><h2>Spending snapshot</h2><Link className="text-link" to="/app/insights">Details <ArrowRight size={13} /></Link></div>
            <div className="snapshot-top"><div><p>Total sent in demo</p><b className="snapshot-total">{formatInrFromPaise(spent)}</b></div><span className="mode-pill">THIS MONTH</span></div>
            <div className="sparkline" aria-label="Demo spending activity chart">{bars.map((height, index) => <i key={index} className="sparkbar" style={{ height: `${height}%` }} />)}</div>
            <div className="snapshot-footer"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          </section>
          <section className="surface content-card">
            <div className="section-heading"><h2>At a glance</h2><BarChart3 size={17} color="#7b71df" /></div>
            <div className="insight-stat"><span>Money sent</span><b>{formatInrFromPaise(remoteSummary?.totalSentPaise ?? spent)}</b></div>
            <div className="insight-stat"><span>Money received</span><b>{formatInrFromPaise(incoming.reduce((total, item) => total + item.amountPaise, 0))}</b></div>
            <div className="insight-stat"><span>Successful transfers</span><b>{outgoing.length + incoming.length}</b></div>
          </section>
          <div className="tip-box"><b><ShieldCheck size={14} /> A quick safety note</b><p>PayFlow is a payment simulator. Never enter a real UPI PIN or share an OTP here.</p></div>
          <DemoNote />
        </aside>
      </div>
    </>
  );
}

function EmptyState({ title, text, action }) {
  return <div className="empty-state"><span className="empty-state-icon"><ReceiptText size={21} /></span><b>{title}</b><p>{text}</p>{action && <div style={{ marginTop: 15 }}>{action}</div>}</div>;
}

export function SendMoneyPage() {
  const { contacts, balancePaise, profile, sendPayment, simulateFailure } = useDemo();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRecipient = contacts.find((person) => person.id === params.get('recipient')) || null;
  const [step, setStep] = useState(initialRecipient ? 1 : 0);
  const [query, setQuery] = useState('');
  const [directory, setDirectory] = useState(contacts);
  const [recipient, setRecipient] = useState(initialRecipient);
  const [amount, setAmount] = useState(params.get('amount') || '');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('general');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);
  const paise = Math.round(Number(amount) * 100);
  const matchingContacts = directory.filter((person) => `${person.name} ${person.upiId}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!window.localStorage.getItem('payflow-demo-token')) return undefined;
    let active = true;
    api.get('/users/search', { params: { q: 'demo' } })
      .then(({ data }) => {
        if (!active || !data.users?.length) return;
        const users = data.users.map((user) => ({
          id: user.id,
          name: user.name,
          upiId: user.demoUpiId,
          color: user.avatarColor || '#6154dc',
        }));
        setDirectory(users);
        setRecipient((current) => current ? users.find((user) => user.upiId === current.upiId) || current : null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const goToAmount = (person) => { setRecipient(person); setStep(1); setFormError(''); };
  const submitPayment = async () => {
    if (!Number.isFinite(paise) || paise < 100) { setFormError('Enter at least ₹1.00.'); return; }
    if (paise > balancePaise) { setFormError('That is above your current demo balance.'); return; }
    setBusy(true); setFormError('');
    try {
      const transaction = await sendPayment({ recipient, amountPaise: paise, note: note.trim(), category });
      setResult(transaction); setStep(3); toast.success('Demo payment complete');
    } catch (error) {
      setFormError(error.message || 'Payment could not be completed.');
    } finally { setBusy(false); }
  };
  const submitFailure = () => {
    setResult(simulateFailure({ recipient, amountPaise: paise, note: note.trim(), category }));
    setStep(3);
  };

  return (
    <div className="flow-panel">
      <PageTitle eyebrow="PAYMENTS" title="Send money" subtitle="Move demo funds between fictional PayFlow users." action={<button className="icon-button" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={17} /></button>} />
      <DemoNote />
      <div className="stepper" style={{ marginTop: 22 }}>{['Recipient', 'Amount', 'Review'].map((label, index) => <div key={label} className={`step${step === index ? ' active' : ''}${step > index ? ' done' : ''}`}><span className="step-number">{step > index ? <Check size={14} /> : index + 1}</span>{label}</div>)}</div>
      <div className="surface content-card">
        {step === 0 && <>
          <label className="form-control">Search contacts<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or demo UPI ID" autoFocus /></label>
          <div style={{ marginTop: 11 }}>{matchingContacts.map((person) => <button type="button" className="recipient-option" key={person.id} onClick={() => goToAmount(person)}><Avatar name={person.name} color={person.color} small /><span><b>{person.name}</b><small>{person.upiId}</small></span><ChevronRight className="option-arrow" size={16} /></button>)}</div>
          {matchingContacts.length === 0 && <EmptyState title="No matching demo users" text="Try searching for a contact by name or UPI ID." />}
          <div style={{ marginTop: 15 }}><label className="form-control">Enter a PayFlow UPI ID<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="name@payflow" /></label><button type="button" className="button secondary full" style={{ marginTop: 10 }} onClick={() => { const found = contacts.find((person) => person.upiId.toLowerCase() === query.trim().toLowerCase()); if (found) goToAmount(found); else setFormError('That UPI ID is not in this fictional demo directory.'); }}>Find demo recipient</button></div>
          {formError && <p className="form-error" style={{ marginTop: 10 }}>{formError}</p>}
        </>}
        {step === 1 && recipient && <>
          <div className="tx-person" style={{ padding: '4px 0 15px', borderBottom: '1px solid var(--line)' }}><Avatar name={recipient.name} color={recipient.color} /><span className="tx-person-copy"><b>{recipient.name}</b><span>{recipient.upiId}</span></span><button className="text-link" onClick={() => setStep(0)}>Change</button></div>
          <div className="amount-input-wrap"><input aria-label="Amount in rupees" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1')); setFormError(''); }} placeholder="₹0" /></div>
          <p className="amount-caption">Available demo balance {formatInrFromPaise(balancePaise)}</p><p className="amount-error">{formError}</p>
          <div className="field-row" style={{ marginTop: 7 }}><label className="form-control">Payment note<input maxLength={80} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What's it for?" /></label><label className="form-control">Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="general">General</option><option value="food">Food</option><option value="shopping">Shopping</option><option value="bills">Bills</option><option value="travel">Travel</option></select></label></div>
          <button type="button" className="button full" style={{ marginTop: 18 }} onClick={() => { if (!Number.isFinite(paise) || paise < 100) setFormError('Enter at least ₹1.00.'); else if (paise > balancePaise) setFormError('That is above your current demo balance.'); else { setFormError(''); setStep(2); } }}>Review payment <ArrowRight size={15} /></button>
        </>}
        {step === 2 && recipient && <>
          <div style={{ textAlign: 'center', padding: '10px 0 18px' }}><Avatar name={recipient.name} color={recipient.color} /><p style={{ margin: '10px 0 4px', fontSize: 12, fontWeight: 700 }}>{recipient.name}</p><small style={{ color: 'var(--muted)', fontSize: 10 }}>{recipient.upiId}</small><div className="success-amount">{formatInrFromPaise(paise)}</div></div>
          <div className="confirm-row"><span>Payment note</span><b>{note || 'Not added'}</b></div><div className="confirm-row"><span>Category</span><b style={{ textTransform: 'capitalize' }}>{category}</b></div><div className="confirm-row"><span>From</span><b>{profile.upiId}</b></div>
          {formError && <p className="form-error" style={{ marginTop: 12 }}>{formError}</p>}
          <div className="flow-actions"><button type="button" className="button secondary" onClick={submitFailure}>Simulate failure</button><button type="button" className="button" disabled={busy} onClick={submitPayment}>{busy ? 'Processing…' : 'Confirm demo payment'} <ArrowRight size={14} /></button></div>
        </>}
        {step === 3 && result && <div className="success-state"><span className={`success-mark${result.status === 'failed' ? ' failed-mark' : ''}`}>{result.status === 'failed' ? <X size={32} /> : <CheckCircle2 size={34} />}</span><h2>{result.status === 'failed' ? 'Payment not completed' : 'Payment successful'}</h2><p>{result.status === 'failed' ? 'This transfer was simulated as failed. Your demo balance is unchanged.' : 'Your simulated transfer is complete.'}</p><div className="success-amount">{formatInrFromPaise(result.amountPaise)}</div><div className="confirm-row"><span>{result.status === 'failed' ? 'Attempted to' : 'Paid to'}</span><b>{recipient?.name}</b></div><div className="confirm-row"><span>Reference</span><b>{result.transactionReference}</b></div><div className="flow-actions"><Link className="button secondary" to={`/app/transactions/${result.id}`}>View receipt</Link><Link className="button" to="/app/home">Done</Link></div></div>}
      </div>
    </div>
  );
}

export function ReceivePage() {
  const { profile } = useDemo();
  const [copied, setCopied] = useState(false);
  const payUri = `upi://pay?pa=${encodeURIComponent(profile.upiId)}&pn=${encodeURIComponent(profile.name)}&cu=INR`;
  const copyUpi = async () => {
    try { await navigator.clipboard.writeText(profile.upiId); setCopied(true); toast.success('Demo UPI ID copied'); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error('Clipboard is unavailable in this browser.'); }
  };
  const share = async () => {
    const text = `Pay me on PayFlow UPI demo: ${profile.upiId}`;
    if (navigator.share) { try { await navigator.share({ title: 'PayFlow UPI Demo', text }); return; } catch { /* User dismissed the share sheet. */ } }
    copyUpi();
  };
  return <><PageTitle eyebrow="GET PAID" title="Receive money" subtitle="Share your demo ID or QR with another PayFlow user." /><div className="surface content-card"><DemoNote /><div className="qr-panel" style={{ marginTop: 19 }}><div className="qr-copy"><span className="mode-pill">PERSONAL DEMO QR</span><h2>Ready when you are</h2><p>This QR contains a fictional PayFlow address. Scanning it will not initiate a real payment.</p><span className="upi-copy">{profile.upiId}<button className="text-link" onClick={copyUpi} aria-label="Copy demo UPI ID">{copied ? <Check size={14} /> : <Copy size={14} />}</button></span><div className="flow-actions"><button className="button" onClick={share}><ArrowUpRight size={15} /> Share</button><button className="button secondary" onClick={copyUpi}><Copy size={14} /> Copy ID</button></div></div><div className="qr-frame"><QRCodeSVG value={payUri} size={205} level="M" includeMargin /><small>PayFlow UPI · Demo only</small></div></div></div></>;
}

export function ScanPage() {
  const { contacts } = useDemo();
  const navigate = useNavigate();
  const [mode, setMode] = useState('choose');
  const [manual, setManual] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [scanner, setScanner] = useState(null);

  useEffect(() => () => { scanner?.stop().catch(() => {}); }, [scanner]);

  const validatePayload = (payload) => {
    let upiId = payload.trim();
    try {
      if (upiId.includes('?')) {
        const params = new URLSearchParams(upiId.split('?')[1]);
        upiId = params.get('pa') || params.get('upi') || upiId;
      }
    } catch { /* Keep the typed value for the directory lookup. */ }
    const found = contacts.find((person) => person.upiId.toLowerCase() === upiId.toLowerCase());
    if (!found) { toast.error('That QR does not match a PayFlow demo user.'); return; }
    setRecipient(found); setMode('preview');
  };

  const startCamera = async () => {
    setMode('camera'); setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const camera = new Html5Qrcode('payflow-qr-reader');
      setScanner(camera);
      await camera.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 220, height: 220 } }, (decoded) => { validatePayload(decoded); camera.stop().catch(() => {}); }, () => {});
    } catch {
      setCameraError('Camera access is unavailable. Use the manual demo UPI ID or upload a QR image.');
      setMode('manual');
    }
  };

  const uploadQr = async (event) => {
    const image = event.target.files?.[0];
    if (!image) return;
    try {
      const bitmap = await createImageBitmap(image);
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
      const { default: jsQR } = await import('jsqr');
      const result = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      if (result) validatePayload(result.data); else toast.error('No readable QR code found in that image.');
      bitmap.close();
    } catch { toast.error('This image could not be scanned.'); }
  };

  return <><PageTitle eyebrow="QUICK PAY" title="Scan & pay" subtitle="Identify a fictional PayFlow recipient before deciding whether to pay." />
    <div className="flow-panel surface content-card"><DemoNote /><div style={{ marginTop: 18 }}>
      {mode === 'choose' && <div style={{ display: 'grid', gap: 12 }}><button className="button full" onClick={startCamera}><QrCode size={17} /> Open camera scanner</button><label className="form-control">Upload a QR image<input type="file" accept="image/*" onChange={uploadQr} /></label><button className="button secondary full" onClick={() => setMode('manual')}>Enter demo UPI ID instead</button></div>}
      {mode === 'camera' && <><div id="payflow-qr-reader" className="scanner-box"><span className="scanner-overlay" /></div>{cameraError && <p className="form-error">{cameraError}</p>}<button className="button secondary full" style={{ marginTop: 12 }} onClick={() => { scanner?.stop().catch(() => {}); setMode('choose'); }}>Cancel scan</button></>}
      {mode === 'manual' && <><label className="form-control">Demo UPI ID or UPI payment URI<input value={manual} onChange={(event) => setManual(event.target.value)} placeholder="maya.k@payflow" /></label>{cameraError && <p className="form-error">{cameraError}</p>}<div className="flow-actions"><button className="button secondary" onClick={() => setMode('choose')}>Back</button><button className="button" onClick={() => validatePayload(manual)}>Find recipient</button></div></>}
      {mode === 'preview' && recipient && <div className="success-state"><Avatar name={recipient.name} color={recipient.color} /><h2 style={{ marginTop: 12 }}>{recipient.name}</h2><p>{recipient.upiId}</p><div className="flow-actions"><button className="button secondary" onClick={() => setMode('choose')}>Scan again</button><button className="button" onClick={() => navigate(`/app/send?recipient=${recipient.id}`)}>Continue to pay <ArrowRight size={14} /></button></div></div>}
    </div></div>
  </>;
}

export function TransactionHistoryPage() {
  const { transactions } = useDemo();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [remoteTransactions, setRemoteTransactions] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const filters = ['all', 'sent', 'received', 'successful', 'pending', 'failed', 'refunded'];
  useEffect(() => {
    if (!window.localStorage.getItem('payflow-demo-token')) return undefined;
    let active = true;
    setRemoteLoading(true);
    const timer = setTimeout(() => {
      const direction = filter === 'sent' || filter === 'received' ? filter : undefined;
      const status = ['successful', 'pending', 'failed', 'refunded'].includes(filter) ? filter : undefined;
      api.get('/payments/history', { params: { q: query, sort, direction, status, page: 1, limit: 100 } })
        .then(({ data }) => { if (active) setRemoteTransactions((data.items || []).map(normalizeTransaction)); })
        .catch(() => { if (active) setRemoteTransactions(null); })
        .finally(() => { if (active) setRemoteLoading(false); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [filter, query, sort]);
  const sourceTransactions = remoteTransactions ?? transactions;
  const filtered = sourceTransactions.filter((item) => {
    const matchesFilter = filter === 'all' || item.direction === filter || item.status === filter || (filter === 'refunded' && item.status === 'refund_pending');
    const term = query.toLowerCase();
    return matchesFilter && `${item.party?.name} ${item.party?.upiId} ${item.transactionReference} ${item.note}`.toLowerCase().includes(term);
  }).sort((a, b) => sort === 'newest' ? new Date(b.createdAt) - new Date(a.createdAt) : new Date(a.createdAt) - new Date(b.createdAt));
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  return <><PageTitle eyebrow="YOUR ACTIVITY" title="Transaction history" subtitle="Search and review your simulated payments." action={<span className="mode-pill"><SlidersHorizontal size={12} /> {filtered.length} records</span>} /><DemoNote />
    <section className="surface content-card" style={{ marginTop: 16 }}><div className="toolbar"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search name, UPI ID, note or reference" aria-label="Search transactions" /></label><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort transactions"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div>
      <div className="filter-row">{filters.map((option) => <button key={option} className={`filter-button${filter === option ? ' selected' : ''}`} onClick={() => { setFilter(option); setPage(1); }}>{option === 'all' ? 'All activity' : option.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())}</button>)}</div>
      {remoteLoading && <p className="page-subtitle">Refreshing account activity…</p>}
      {visible.length ? <><div className="table-head"><span>Contact</span><span>Reference</span><span>Date</span><span>Amount</span></div><div>{visible.map((transaction) => <Link className="table-row" key={transaction.id} to={`/app/transactions/${transaction.id}`}><span className="tx-person"><Avatar name={transaction.party?.name} color={transaction.party?.color} small /><span className="tx-person-copy"><b>{transactionTitle(transaction)}</b><span>{transaction.note || transaction.party?.upiId}</span></span></span><span>{transaction.transactionReference}</span><span className="table-date">{new Date(transaction.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className="tx-amount"><b className={transaction.direction === 'received' ? 'incoming' : ''}>{transaction.direction === 'received' ? '+' : '−'}{formatInrFromPaise(transaction.amountPaise)}</b><span><Status status={transaction.status} /></span></span></Link>)}</div>
        <div className="pagination"><button className="icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={15} /></button><span>Page {page} of {totalPages}</span><button className="icon-button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={15} /></button></div></> : <EmptyState title="No matching transactions" text="Try another search or filter, or make a demo payment." action={<Link className="button small-button" to="/app/send">Send demo money</Link>} />}
    </section></>;
}

export function TransactionDetailsPage() {
  const { id } = useParams();
  const { transactions, requestRefund } = useDemo();
  const [busy, setBusy] = useState(false);
  const [remoteTransaction, setRemoteTransaction] = useState(null);
  useEffect(() => {
    if (transactions.some((item) => item.id === id) || !window.localStorage.getItem('payflow-demo-token')) return undefined;
    let active = true;
    api.get(`/payments/${id}`)
      .then(({ data }) => { if (active) setRemoteTransaction(normalizeTransaction(data.transaction)); })
      .catch(() => { if (active) setRemoteTransaction(null); });
    return () => { active = false; };
  }, [id, transactions]);
  const transaction = transactions.find((item) => item.id === id) || remoteTransaction;
  const [updatedStatus, setUpdatedStatus] = useState(null);
  if (!transaction) return <><PageTitle eyebrow="RECEIPT" title="Transaction not found" /><EmptyState title="This receipt is unavailable" text="It may have been cleared from the local demo ledger." action={<Link className="button small-button" to="/app/history">Back to history</Link>} /></>;
  const canRefund = transaction.direction === 'sent' && transaction.status === 'successful';
  const refund = async () => { setBusy(true); try { const updated = await requestRefund(transaction); setUpdatedStatus(updated.status); toast.success('Demo refund completed'); } catch (error) { toast.error(error.message); } finally { setBusy(false); } };
  return <><PageTitle eyebrow="PAYMENT RECEIPT" title="Transaction details" subtitle="A receipt for your simulated PayFlow activity." action={<button className="button secondary small-button no-print" onClick={() => window.print()}><Download size={14} /> Print receipt</button>} /><div className="details-layout"><article className="surface receipt"><div className="receipt-brand"><span className="brand-mark"><ArrowDownRight size={20} /></span><h2>PayFlow UPI</h2><p>DEMO TRANSACTION RECEIPT</p></div><div className="receipt-amount"><Status status={updatedStatus || transaction.status} /><strong>{transaction.direction === 'received' ? '+' : '−'}{formatInrFromPaise(transaction.amountPaise)}</strong><small>{transaction.direction === 'sent' ? 'Paid to' : 'Received from'} {transaction.party?.name}</small></div><div className="receipt-details">{[["UPI ID", transaction.party?.upiId || 'PayFlow demo user'], ['Date & time', formatDateTime(transaction.createdAt)], ['Reference number', transaction.transactionReference], ['Payment note', transaction.note || 'Not provided'], ['Category', transaction.category || 'General']].map(([label, value]) => <div className="receipt-detail" key={label}><span>{label}</span><b>{value}</b></div>)}{transaction.refund && <div className="receipt-detail"><span>Refund reference</span><b>{transaction.refund.refundReference || 'Demo refund'}</b></div>}</div><DemoNote>Simulated demo transaction only. This receipt does not represent a bank transfer or claim on funds.</DemoNote></article><aside className="surface content-card no-print"><div className="section-heading"><h2>Need help?</h2><CircleHelp size={17} color="#6b61d9" /></div><p style={{ color: 'var(--muted)', fontSize: 10, lineHeight: 1.6 }}>This is a simulated record. You can print it for your demo, or return to your activity.</p>{canRefund && <button className="button secondary full" style={{ marginTop: 8 }} disabled={busy} onClick={refund}>{busy ? 'Processing…' : 'Simulate refund'}</button>}{(updatedStatus === 'refunded' || transaction.status === 'refunded') && <div className="demo-note" style={{ marginTop: 10 }}>Refund complete in the fictional demo ledger.</div>}<Link className="button ghost full" style={{ marginTop: 7 }} to="/app/history"><ArrowLeft size={14} /> Back to history</Link></aside></div></>;
}

export function InsightsPage() {
  const { transactions } = useDemo();
  const [now] = useState(() => new Date());
  const [remoteSummary, setRemoteSummary] = useState(null);
  const [remoteMonthly, setRemoteMonthly] = useState(null);
  useEffect(() => {
    if (!window.localStorage.getItem('payflow-demo-token')) return undefined;
    let active = true;
    Promise.all([api.get('/insights/summary'), api.get('/insights/monthly')])
      .then(([summaryResult, monthlyResult]) => {
        if (!active) return;
        setRemoteSummary(summaryResult.data.summary);
        setRemoteMonthly(monthlyResult.data);
      })
      .catch(() => { if (active) { setRemoteSummary(null); setRemoteMonthly(null); } });
    return () => { active = false; };
  }, []);
  const sent = transactions.filter((item) => item.direction === 'sent' && item.status === 'successful');
  const received = transactions.filter((item) => item.direction === 'received' && item.status === 'successful');
  const totalSent = remoteSummary?.totalSentPaise ?? sent.reduce((sum, item) => sum + item.amountPaise, 0);
  const totalReceived = remoteSummary?.totalReceivedPaise ?? received.reduce((sum, item) => sum + item.amountPaise, 0);
  const categories = remoteSummary?.categoryBreakdown
    ? Object.entries(remoteSummary.categoryBreakdown).map(([category, amount]) => ({ category, amount })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount)
    : ['food', 'shopping', 'bills', 'travel', 'general', 'entertainment'].map((category) => ({ category, amount: sent.filter((item) => item.category === category).reduce((sum, item) => sum + item.amountPaise, 0) })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const localDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now); date.setDate(date.getDate() - (6 - index));
    const dayItems = sent.filter((item) => new Date(item.createdAt).toDateString() === date.toDateString());
    return { label: date.toLocaleDateString('en-IN', { weekday: 'short' }), sent: dayItems.reduce((sum, item) => sum + item.amountPaise, 0), received: received.filter((item) => new Date(item.createdAt).toDateString() === date.toDateString()).reduce((sum, item) => sum + item.amountPaise, 0) };
  });
  const days = remoteMonthly?.weekly || localDays;
  const maxAmount = Math.max(1, ...days.flatMap((day) => [day.sent, day.received]));
  return <><PageTitle eyebrow="YOUR NUMBERS" title="Spending insights" subtitle="A simple view of activity in your fictional demo wallet." action={<span className="mode-pill">{remoteSummary ? 'ACCOUNT DATA' : 'DEMO DATA'}</span>} /><DemoNote /><div className="metric-grid" style={{ marginTop: 16 }}><div className="surface metric-card"><span>Total sent</span><b>{formatInrFromPaise(totalSent)}</b></div><div className="surface metric-card"><span>Total received</span><b>{formatInrFromPaise(totalReceived)}</b></div><div className="surface metric-card"><span>Net movement</span><b>{formatInrFromPaise(totalReceived - totalSent)}</b></div></div><div className="home-grid"><section className="surface chart-card"><div className="section-heading"><h2>Recent activity</h2><span className="mode-pill">LAST 7 DAYS</span></div><div className="bar-chart">{days.map((day) => <div className="chart-group" key={day.label} title={`${day.label}: sent ${formatInrFromPaise(day.sentPaise ?? day.sent)}, received ${formatInrFromPaise(day.receivedPaise ?? day.received)}`}><i className="chart-bar" style={{ height: `${Math.max(3, (day.sentPaise ?? day.sent) / maxAmount * 100)}%` }} /><i className="chart-bar received" style={{ height: `${Math.max(3, (day.receivedPaise ?? day.received) / maxAmount * 100)}%` }} /></div>)}</div><div className="chart-labels">{days.map((day) => <span key={day.label}>{day.label}</span>)}</div><div style={{ display: 'flex', gap: 18, marginTop: 14, color: '#85879a', fontSize: 9 }}><span><i className="category-dot" style={{ display: 'inline-block', marginRight: 6 }} />Sent</span><span><i className="category-dot" style={{ display: 'inline-block', marginRight: 6, background: '#72c4a3' }} />Received</span></div></section><section className="surface content-card"><div className="section-heading"><h2>Spending by category</h2><SlidersHorizontal size={15} color="#999bac" /></div>{categories.length ? categories.map((item) => <div className="category-row" key={item.category}><i className="category-dot" /><span>{item.category}</span><b>{formatInrFromPaise(item.amount)}</b></div>) : <EmptyState title="No spending yet" text="Successful demo payments will build this breakdown." />}</section></div><p className="page-subtitle" style={{ marginTop: 18 }}><Info size={13} /> Insights include only simulated records stored in this browser.</p></>;
}

export function ProfilePage() {
  const { profile, setProfile, preferences, setPreference, resetDemo } = useDemo();
  const navigate = useNavigate();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [saved, setSaved] = useState(false);
  const saveProfile = async (event) => { event.preventDefault(); if (name.trim().length < 2) { toast.error('Enter your name.'); return; } setProfile({ name: name.trim(), email: email.trim() }); const token = window.localStorage.getItem('payflow-demo-token'); if (token) { try { await api.patch('/users/profile', { name: name.trim() }); } catch { /* Local profile remains usable in demo mode. */ } } setSaved(true); toast.success('Profile updated'); setTimeout(() => setSaved(false), 1800); };
  const signOut = () => { window.localStorage.removeItem('payflow-demo-token'); setAuthToken(null); navigate('/login'); };
  const restore = () => { resetDemo(); toast.success('Demo ledger restored'); };
  return <><PageTitle eyebrow="YOUR ACCOUNT" title="Profile & settings" subtitle="Manage the local demo profile and app preferences." /><DemoNote /><div className="profile-grid" style={{ marginTop: 16 }}><div style={{ display: 'grid', gap: 15 }}><div className="surface profile-hero"><Avatar name={profile.name} color={profile.color} /><div><h2>{profile.name}</h2><p>{profile.upiId} · Demo user</p></div></div><form className="surface content-card" onSubmit={saveProfile}><div className="section-heading"><h2>Personal details</h2><UserRound size={16} color="#8f91a3" /></div><div style={{ display: 'grid', gap: 13 }}><label className="form-control">Full name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="form-control">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="form-control">Demo UPI ID<input value={profile.upiId} readOnly /></label><button className="button" type="submit">{saved ? <Check size={14} /> : null}{saved ? 'Saved' : 'Save changes'}</button></div></form></div><div style={{ display: 'grid', gap: 15 }}><section className="surface content-card"><div className="section-heading"><h2>Preferences</h2><Settings2 size={16} color="#8f91a3" /></div><div className="settings-row"><span><b>Activity notifications</b><small>Show local demo transaction feedback</small></span><button type="button" role="switch" aria-checked={preferences.notifications} className={`toggle${preferences.notifications ? ' on' : ''}`} onClick={() => setPreference('notifications', !preferences.notifications)} /></div><div className="settings-row"><span><b>Biometric sign-in</b><small>Visual setting only; no device auth is used</small></span><button type="button" role="switch" aria-checked={preferences.biometric} className={`toggle${preferences.biometric ? ' on' : ''}`} onClick={() => setPreference('biometric', !preferences.biometric)} /></div></section><section className="surface content-card"><div className="section-heading"><h2>Demo wallet</h2><Wallet size={16} color="#8f91a3" /></div><div className="settings-row"><span><b>Reset demo activity</b><small>Restore fictional contacts and sample transactions</small></span><button className="button secondary small-button" onClick={restore}>Restore</button></div><div className="settings-row"><span><b>Sign out</b><small>Return to the welcome screen</small></span><button className="button secondary small-button" onClick={signOut}><LogOut size={13} /> Sign out</button></div></section><DemoNote>Demo profile data and transactions are stored in this browser only. Never add real financial credentials.</DemoNote></div></div></>;
}

function AuthLayout({ children, register = false }) {
  return <div className="auth-page"><aside className="auth-aside"><Link to="/app/home"><AppBrand /></Link><div className="auth-aside-copy"><h1>{register ? 'A better way to explore digital payments.' : 'Your everyday payments, reimagined.'}</h1><p>A polished UPI-style experience for learning and demos. No bank connection, no real money, just a safe sandbox.</p></div><small className="auth-aside-foot">PayFlow UPI · Simulated payment experience</small></aside><section className="auth-form-side"><div className="auth-form"><div className="mobile-brand"><AppBrand /></div>{children}</div></section></div>;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { profile } = useDemo();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const login = async (event) => {
    event.preventDefault();
    if (!identifier.trim() || !password) { toast.error('Enter your email or mobile and password.'); return; }
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', { identifier: identifier.trim(), password });
      if (data.token) { window.localStorage.setItem('payflow-demo-token', data.token); setAuthToken(data.token); }
      navigate('/app/home'); toast.success('Signed in to PayFlow');
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <AuthLayout><h2>Welcome back</h2><p>Sign in to your PayFlow demo account.</p><div className="demo-note" style={{ marginBottom: 18 }}><ShieldCheck size={15} /><span>DEMO MODE · No real UPI or bank money is moved.</span></div><form className="auth-form-fields" onSubmit={login}><label className="form-control">Email, mobile or UPI ID<input autoComplete="username" value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="you@example.test" /></label><label className="form-control">Password<span style={{ position: 'relative' }}><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" style={{ paddingRight: 43 }} /><button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 5, top: 4, width: 36, height: 36, border: 0 }}><Eye size={15} /></button></span></label><button className="button full" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={15} /></button></form><button className="button secondary full" style={{ marginTop: 10 }} onClick={() => { window.localStorage.removeItem('payflow-demo-token'); setAuthToken(null); navigate('/app/home'); }}>Explore demo as {profile.name.split(' ')[0]}</button><div className="auth-bottom">New to PayFlow? <Link to="/register">Create a demo account</Link></div></AuthLayout>;
}

export function RegisterPage() {
  const { setProfile } = useDemo();
  const navigate = useNavigate();
  const [fields, setFields] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const setField = (key) => (event) => setFields((current) => ({ ...current, [key]: event.target.value }));
  const register = async (event) => {
    event.preventDefault();
    if (fields.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(fields.email) || !/^[6-9]\d{9}$/.test(fields.phone) || fields.password.length < 8 || fields.password !== fields.confirm) { toast.error('Check your details. Use a valid Indian mobile and matching password (8+ characters).'); return; }
    setBusy(true);
    const profile = { name: fields.name.trim(), email: fields.email.trim(), phone: `+91 ${fields.phone}`, upiId: `${fields.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')}@payflow` };
    try {
      const { data } = await api.post('/auth/register', { name: fields.name.trim(), email: fields.email.trim(), phone: fields.phone, password: fields.password });
      if (data.token) { window.localStorage.setItem('payflow-demo-token', data.token); setAuthToken(data.token); }
      setProfile({ ...profile, ...(data.user || {}) }); toast.success('Demo account created');
    } catch {
      setProfile(profile); toast.success('Local demo profile created');
    } finally { setBusy(false); navigate('/app/home'); }
  };
  return <AuthLayout register><h2>Create your account</h2><p>Start with a fictional wallet. No bank details required.</p><div className="demo-note" style={{ marginBottom: 18 }}><ShieldCheck size={15} /><span>Phone verification is simulated. This account is for demo use only.</span></div><form className="auth-form-fields" onSubmit={register}><label className="form-control">Full name<input autoComplete="name" value={fields.name} onChange={setField('name')} placeholder="Aarav Mehta" /></label><label className="form-control">Email<input type="email" autoComplete="email" value={fields.email} onChange={setField('email')} placeholder="you@example.test" /></label><label className="form-control">Mobile number<input inputMode="numeric" autoComplete="tel-national" value={fields.phone} onChange={setField('phone')} placeholder="10-digit Indian mobile" /></label><div className="field-row"><label className="form-control">Password<input type="password" autoComplete="new-password" value={fields.password} onChange={setField('password')} placeholder="8 characters minimum" /></label><label className="form-control">Confirm password<input type="password" autoComplete="new-password" value={fields.confirm} onChange={setField('confirm')} placeholder="Repeat password" /></label></div><button type="submit" className="button full" disabled={busy}>{busy ? 'Creating…' : 'Create demo account'} <ArrowRight size={15} /></button></form><div className="auth-bottom">Already registered? <Link to="/login">Sign in</Link></div></AuthLayout>;
}