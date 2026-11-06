const STORAGE_KEY = 'payflow-demo-ledger-v1';

export const demoContacts = [
  { id: 'person-1', name: 'Maya Kapoor', upiId: 'maya.k@payflow', color: '#e67d68' },
  { id: 'person-2', name: 'Ishaan Rao', upiId: 'ishaan.r@payflow', color: '#488d82' },
  { id: 'person-3', name: 'Ananya Shah', upiId: 'ananya.s@payflow', color: '#9674c9' },
  { id: 'person-4', name: 'Kabir Nair', upiId: 'kabir.n@payflow', color: '#d19b47' },
  { id: 'person-5', name: 'Rhea Das', upiId: 'rhea.d@payflow', color: '#587eb8' },
  { id: 'person-6', name: 'Arjun Verma', upiId: 'arjun.v@payflow', color: '#728e5a' },
];

const defaultProfile = {
  name: 'Aarav Mehta',
  email: 'aarav.mehta@example.test',
  phone: '+91 98765 43210',
  upiId: 'aarav.mehta@payflow',
  color: '#564bd8',
};

function createSeedTransactions() {
  const now = Date.now();
  const seed = [
    ['sent', 45000, 'successful', 'Maya Kapoor', 'maya.k@payflow', 'Dinner', 'food'],
    ['received', 125000, 'successful', 'Ishaan Rao', 'ishaan.r@payflow', 'Concert tickets', 'travel'],
    ['sent', 28500, 'successful', 'Ananya Shah', 'ananya.s@payflow', 'Coffee & brunch', 'food'],
    ['sent', 89900, 'successful', 'Kabir Nair', 'kabir.n@payflow', 'Weekend groceries', 'shopping'],
    ['received', 250000, 'successful', 'Rhea Das', 'rhea.d@payflow', 'Trip share', 'travel'],
    ['sent', 16000, 'failed', 'Arjun Verma', 'arjun.v@payflow', 'Movie tickets', 'entertainment'],
  ];
  return seed.map(([direction, amountPaise, status, name, upiId, note, category], index) => ({
    id: `seed-${index + 1}`,
    transactionReference: `PF${String(730194 + index * 127).slice(0, 8)}`,
    direction,
    amountPaise,
    status,
    note,
    category,
    party: { name, upiId, color: demoContacts[index % demoContacts.length].color },
    createdAt: new Date(now - (index * 5 + 2) * 60 * 60 * 1000).toISOString(),
    refund: null,
  }));
}

export function readDemoState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (saved?.profile && Array.isArray(saved.transactions)) return saved;
  } catch {
    // Fall through to a fresh fictional ledger when stored demo data is invalid.
  }
  return createFreshDemoState();
}

export function createFreshDemoState() {
  return {
    profile: defaultProfile,
    balancePaise: 1845000,
    transactions: createSeedTransactions(),
    preferences: { notifications: true, biometric: false },
  };
}

export function persistDemoState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function makeDemoTransaction({ recipient, amountPaise, note, category = 'general' }) {
  return {
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    transactionReference: `PF${Math.floor(10000000 + Math.random() * 89999999)}`,
    direction: 'sent',
    amountPaise,
    status: 'successful',
    note: note || '',
    category,
    party: recipient,
    createdAt: new Date().toISOString(),
    refund: null,
  };
}