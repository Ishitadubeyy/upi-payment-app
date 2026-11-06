import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Transaction } from '../models/Transaction.js';
import { LedgerEntry } from '../models/LedgerEntry.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { generateTransactionReference } from '../utils/refs.js';
import { formatInr } from '../utils/money.js';
import { createNotification } from './notificationService.js';

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

async function fallbackDebitCredit({ senderId, recipientId, amountPaise, session }) {
  const debit = await User.findOneAndUpdate(
    { _id: senderId, demoBalancePaise: { $gte: amountPaise } },
    { $inc: { demoBalancePaise: -amountPaise } },
    { new: true, session: session || undefined }
  );
  if (!debit) {
    throw new AppError('Insufficient demo balance', 402, 'INSUFFICIENT_FUNDS');
  }
  await User.findByIdAndUpdate(recipientId, { $inc: { demoBalancePaise: amountPaise } }, { session: session || undefined });
  return debit;
}

export async function sendPayment(senderId, { recipientId, amountPaise, note, idempotencyKey, category }) {
  if (senderId === recipientId) {
    throw new AppError('Cannot send money to yourself', 400, 'SELF_TRANSFER');
  }
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new AppError('Invalid amount', 400, 'INVALID_AMOUNT');
  }
  if (amountPaise > env.maxPaymentPaise) {
    throw new AppError('Amount exceeds demo limit', 400, 'AMOUNT_TOO_LARGE');
  }

  const existing = await Transaction.findOne({ senderId, idempotencyKey });
  if (existing) {
    return populateTransaction(existing);
  }

  const [sender, recipient] = await Promise.all([
    User.findById(senderId),
    User.findById(recipientId),
  ]);
  if (!recipient) throw new AppError('Recipient not found', 404, 'RECIPIENT_NOT_FOUND');
  if (!sender) throw new AppError('Sender not found', 404, 'SENDER_NOT_FOUND');

  const txnRef = generateTransactionReference();
  let transaction;

  const runTransfer = async (session) => {
    const opts = session ? { session } : {};
    transaction = await Transaction.create(
      [
        {
          transactionReference: txnRef,
          senderId,
          recipientId,
          amountPaise,
          note: note || '',
          status: 'pending',
          idempotencyKey,
          category: category || 'general',
        },
      ],
      opts
    );
    transaction = transaction[0] || transaction;

    await fallbackDebitCredit({ senderId, recipientId, amountPaise, session });

    const opDebit = `debit:${transaction._id}:${senderId}`;
    const opCredit = `credit:${transaction._id}:${recipientId}`;

    await LedgerEntry.create(
      [
        {
          accountId: senderId,
          transactionId: transaction._id,
          entryType: 'debit',
          amountPaise: -amountPaise,
          operationId: opDebit,
        },
        {
          accountId: recipientId,
          transactionId: transaction._id,
          entryType: 'credit',
          amountPaise: amountPaise,
          operationId: opCredit,
        },
      ],
      opts
    );

    transaction.status = 'successful';
    await transaction.save(opts);
    return transaction;
  };

  try {
    transaction = await withOptionalSession(runTransfer);
  } catch (err) {
    if (err.code === 11000 && String(err.message).includes('idempotencyKey')) {
      const dup = await Transaction.findOne({ senderId, idempotencyKey });
      if (dup) return populateTransaction(dup);
    }
    if (transaction?._id) {
      await Transaction.findByIdAndUpdate(transaction._id, {
        status: 'failed',
        failureReason: err.message || 'Transfer failed',
      });
    }
    throw err;
  }

  const populated = await populateTransaction(transaction);
  const amt = formatInr(amountPaise);

  await Promise.all([
    createNotification({
      userId: senderId,
      title: 'Simulated payment sent',
      message: `You sent ${amt} to ${recipient.name}. Demo only — not real UPI.`,
      type: 'payment_success',
      relatedTransactionId: transaction._id,
    }),
    createNotification({
      userId: recipientId,
      title: 'Simulated payment received',
      message: `You received ${amt} from ${sender.name}. Demo wallet credit.`,
      type: 'incoming_payment',
      relatedTransactionId: transaction._id,
    }),
  ]);

  return populated;
}

export async function markTransactionFailed(transactionId, userId, reason) {
  const txn = await Transaction.findById(transactionId);
  if (!txn) throw new AppError('Transaction not found', 404);
  if (txn.senderId.toString() !== userId && txn.recipientId.toString() !== userId) {
    throw new AppError('Forbidden', 403);
  }
  if (txn.status !== 'successful') {
    throw new AppError('Only successful payments can be simulated as failed', 400);
  }

  const amountPaise = txn.amountPaise;
  await withOptionalSession(async (session) => {
    const opts = session ? { session } : {};
    txn.status = 'failed';
    txn.failureReason = reason || 'Simulated payment failure (demo)';
    await txn.save(opts);

    await User.findByIdAndUpdate(txn.senderId, { $inc: { demoBalancePaise: amountPaise } }, opts);
    await User.findByIdAndUpdate(txn.recipientId, { $inc: { demoBalancePaise: -amountPaise } }, opts);

    await LedgerEntry.create(
      [
        {
          accountId: txn.senderId,
          transactionId: txn._id,
          entryType: 'credit',
          amountPaise: amountPaise,
          operationId: `reversal-credit:${txn._id}`,
        },
        {
          accountId: txn.recipientId,
          transactionId: txn._id,
          entryType: 'debit',
          amountPaise: -amountPaise,
          operationId: `reversal-debit:${txn._id}`,
        },
      ],
      opts
    );
  });

  await createNotification({
    userId: txn.senderId,
    title: 'Simulated payment failed',
    message: txn.failureReason,
    type: 'payment_failed',
    relatedTransactionId: txn._id,
  });

  return populateTransaction(await Transaction.findById(transactionId));
}

async function populateTransaction(txn) {
  return Transaction.findById(txn._id || txn)
    .populate('senderId', 'name demoUpiId avatarColor')
    .populate('recipientId', 'name demoUpiId avatarColor')
    .populate('refundId');
}

export async function getTransactionForUser(transactionId, userId) {
  const txn = await populateTransaction(transactionId);
  if (!txn) throw new AppError('Transaction not found', 404);
  const uid = userId.toString();
  if (txn.senderId._id.toString() !== uid && txn.recipientId._id.toString() !== uid) {
    throw new AppError('Forbidden', 403);
  }
  return serializeTransaction(txn, userId);
}

export function serializeTransaction(txn, viewerId) {
  const viewer = viewerId?.toString();
  const isSender = txn.senderId._id.toString() === viewer;
  return {
    id: txn._id.toString(),
    transactionReference: txn.transactionReference,
    amountPaise: txn.amountPaise,
    currency: txn.currency,
    note: txn.note,
    type: txn.type,
    status: txn.status,
    failureReason: txn.failureReason,
    category: txn.category,
    direction: isSender ? 'sent' : 'received',
    sender: {
      id: txn.senderId._id.toString(),
      name: txn.senderId.name,
      demoUpiId: txn.senderId.demoUpiId,
    },
    recipient: {
      id: txn.recipientId._id.toString(),
      name: txn.recipientId.name,
      demoUpiId: txn.recipientId.demoUpiId,
    },
    refund: txn.refundId
      ? {
          id: txn.refundId._id?.toString() || txn.refundId,
          refundReference: txn.refundId.refundReference,
          status: txn.refundId.status,
        }
      : null,
    createdAt: txn.createdAt,
    updatedAt: txn.updatedAt,
    demoDisclaimer: 'Simulated demo transaction — not a real UPI payment.',
  };
}

export async function listHistory(userId, filters) {
  const {
    q,
    direction,
    status,
    sort = 'newest',
    page = 1,
    limit = 15,
  } = filters;

  const baseOr = [{ senderId: userId }, { recipientId: userId }];
  const query = { $or: baseOr };

  if (direction === 'sent') {
    delete query.$or;
    query.senderId = userId;
  } else if (direction === 'received') {
    delete query.$or;
    query.recipientId = userId;
  }

  if (status && status !== 'all') {
    if (status === 'refunded') {
      query.status = { $in: ['refunded', 'refund_pending'] };
    } else {
      query.status = status;
    }
  }

  let txns = await Transaction.find(query)
    .populate('senderId', 'name demoUpiId avatarColor')
    .populate('recipientId', 'name demoUpiId avatarColor')
    .populate('refundId')
    .sort({ createdAt: sort === 'oldest' ? 1 : -1 })
    .lean(false);

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    txns = txns.filter((t) => {
      const ref = t.transactionReference.toLowerCase();
      const sName = t.senderId.name.toLowerCase();
      const rName = t.recipientId.name.toLowerCase();
      const sUpi = t.senderId.demoUpiId.toLowerCase();
      const rUpi = t.recipientId.demoUpiId.toLowerCase();
      return ref.includes(term) || sName.includes(term) || rName.includes(term) || sUpi.includes(term) || rUpi.includes(term);
    });
  }

  const total = txns.length;
  const skip = (page - 1) * limit;
  const pageItems = txns.slice(skip, skip + limit).map((t) => serializeTransaction(t, userId));

  return { items: pageItems, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}
