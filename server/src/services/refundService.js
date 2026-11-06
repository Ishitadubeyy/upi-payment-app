import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Refund } from '../models/Refund.js';
import { Transaction } from '../models/Transaction.js';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { generateRefundReference } from '../utils/refs.js';
import { formatInr } from '../utils/money.js';
import { createNotification } from './notificationService.js';
import { serializeTransaction } from './paymentService.js';

async function withOptionalSession(fn) {
  if (!env.useMongoTransactions) {
    return fn(null);
  }
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function requestRefund(userId, { transactionId, reason }) {
  const txn = await Transaction.findById(transactionId).populate('refundId');
  if (!txn) throw new AppError('Transaction not found', 404);
  if (txn.senderId.toString() !== userId) {
    throw new AppError('Only the sender can request a demo refund', 403);
  }
  if (txn.status !== 'successful') {
    throw new AppError('Refunds are only available for successful demo payments', 400);
  }
  if (txn.refundId) {
    throw new AppError('Refund already requested for this transaction', 409);
  }

  const refundRef = generateRefundReference();
  let refund;

  await withOptionalSession(async (session) => {
    const opts = session ? { session } : {};
    refund = await Refund.create(
      [
        {
          refundReference: refundRef,
          transactionId: txn._id,
          requestedBy: userId,
          amountPaise: txn.amountPaise,
          status: 'pending',
          reason: reason || 'Demo refund request',
        },
      ],
      opts
    );
    refund = refund[0] || refund;

    txn.status = 'refund_pending';
    txn.refundId = refund._id;
    await txn.save(opts);

    const amountPaise = txn.amountPaise;
    await User.findByIdAndUpdate(txn.recipientId, { $inc: { demoBalancePaise: -amountPaise } }, opts);
    await User.findByIdAndUpdate(txn.senderId, { $inc: { demoBalancePaise: amountPaise } }, opts);

    await LedgerEntry.create(
      [
        {
          accountId: txn.recipientId,
          transactionId: txn._id,
          entryType: 'refund_debit',
          amountPaise: -amountPaise,
          operationId: `refund-debit:${refund._id}`,
        },
        {
          accountId: txn.senderId,
          transactionId: txn._id,
          entryType: 'refund_credit',
          amountPaise: amountPaise,
          operationId: `refund-credit:${refund._id}`,
        },
      ],
      opts
    );

    refund.status = 'completed';
    await refund.save(opts);
    txn.status = 'refunded';
    await txn.save(opts);
  });

  const amt = formatInr(txn.amountPaise);
  await Promise.all([
    createNotification({
      userId: txn.senderId,
      title: 'Demo refund completed',
      message: `Simulated refund of ${amt} credited to your demo wallet. Not a bank refund.`,
      type: 'refund_update',
      relatedTransactionId: txn._id,
    }),
    createNotification({
      userId: txn.recipientId,
      title: 'Demo refund processed',
      message: `${amt} was reversed in the demo ledger.`,
      type: 'refund_update',
      relatedTransactionId: txn._id,
    }),
  ]);

  const updated = await Transaction.findById(transactionId)
    .populate('senderId', 'name demoUpiId avatarColor')
    .populate('recipientId', 'name demoUpiId avatarColor')
    .populate('refundId');

  return { refund, transaction: serializeTransaction(updated, userId) };
}

export async function getRefund(refundId, userId) {
  const refund = await Refund.findById(refundId).populate('transactionId');
  if (!refund) throw new AppError('Refund not found', 404);
  const txn = refund.transactionId;
  if (txn.senderId.toString() !== userId && txn.recipientId.toString() !== userId) {
    throw new AppError('Forbidden', 403);
  }
  return refund;
}
