import { LedgerEntry } from '../models/LedgerEntry.js';
import { User } from '../models/User.js';

export async function sumLedgerForAccount(accountId, session) {
  const q = LedgerEntry.aggregate([
    { $match: { accountId } },
    { $group: { _id: null, total: { $sum: '$amountPaise' } } },
  ]);
  if (session) q.session(session);
  const result = await q;
  return result[0]?.total ?? 0;
}

export async function reconcileUserBalance(userId, session) {
  const ledgerTotal = await sumLedgerForAccount(userId, session);
  const user = await User.findById(userId).session(session || null);
  if (!user) return null;
  if (user.demoBalancePaise !== ledgerTotal) {
    user.demoBalancePaise = ledgerTotal;
    await user.save({ session: session || undefined });
  }
  return user.demoBalancePaise;
}
