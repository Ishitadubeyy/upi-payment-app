import { Transaction } from '../models/Transaction.js';

const DEMO_CATEGORIES = ['food', 'shopping', 'bills', 'travel', 'general'];

export async function getSummary(userId) {
  const uid = userId.toString();
  const txns = await Transaction.find({
    $or: [{ senderId: userId }, { recipientId: userId }],
    status: { $in: ['successful', 'refunded', 'refund_pending'] },
  });

  let totalSentPaise = 0;
  let totalReceivedPaise = 0;
  const categoryMap = Object.fromEntries(DEMO_CATEGORIES.map((c) => [c, 0]));

  for (const t of txns) {
    if (t.senderId.toString() === uid && t.status === 'successful') {
      totalSentPaise += t.amountPaise;
      const cat = DEMO_CATEGORIES.includes(t.category) ? t.category : 'general';
      categoryMap[cat] += t.amountPaise;
    }
    if (t.recipientId.toString() === uid && t.status === 'successful') {
      totalReceivedPaise += t.amountPaise;
    }
  }

  const recent = await Transaction.find({
    $or: [{ senderId: userId }, { recipientId: userId }],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('senderId', 'name')
    .populate('recipientId', 'name');

  return {
    totalSentPaise,
    totalReceivedPaise,
    netPaise: totalReceivedPaise - totalSentPaise,
    categoryBreakdown: categoryMap,
    recentCount: txns.length,
    recentTransactions: recent.map((t) => ({
      id: t._id.toString(),
      reference: t.transactionReference,
      amountPaise: t.amountPaise,
      status: t.status,
      createdAt: t.createdAt,
      direction: t.senderId._id.toString() === uid ? 'sent' : 'received',
      counterparty:
        t.senderId._id.toString() === uid ? t.recipientId.name : t.senderId.name,
    })),
    demoDisclaimer: 'Insights are computed from simulated demo transactions only.',
  };
}

export async function getMonthly(userId) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const txns = await Transaction.find({
    $or: [{ senderId: userId }, { recipientId: userId }],
    status: 'successful',
    createdAt: { $gte: sixMonthsAgo },
  });

  const uid = userId.toString();
  const buckets = {};

  for (const t of txns) {
    const key = `${t.createdAt.getFullYear()}-${String(t.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) buckets[key] = { month: key, sentPaise: 0, receivedPaise: 0, volume: 0 };
    buckets[key].volume += 1;
    if (t.senderId.toString() === uid) buckets[key].sentPaise += t.amountPaise;
    if (t.recipientId.toString() === uid) buckets[key].receivedPaise += t.amountPaise;
  }

  const months = Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month));

  const weekly = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const dayTxns = txns.filter((t) => t.createdAt >= d && t.createdAt < next);
    let sent = 0;
    let received = 0;
    for (const t of dayTxns) {
      if (t.senderId.toString() === uid) sent += t.amountPaise;
      if (t.recipientId.toString() === uid) received += t.amountPaise;
    }
    weekly.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      sentPaise: sent,
      receivedPaise: received,
    });
  }

  return { months, weekly };
}
