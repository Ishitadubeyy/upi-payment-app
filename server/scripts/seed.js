import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../src/models/User.js';
import { Transaction } from '../src/models/Transaction.js';
import { Refund } from '../src/models/Refund.js';
import { LedgerEntry } from '../src/models/LedgerEntry.js';
import { Notification } from '../src/models/Notification.js';
import { generateTransactionReference, generateRefundReference } from '../src/utils/refs.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/payflow_upi';
const SEED_TAG = 'payflow_demo_v1';

const DEMO_USERS = [
  {
    key: 'arjun',
    name: 'Arjun Mehta',
    email: 'arjun.demo@payflow.test',
    phone: '9876543210',
    password: 'Demo@1234',
    demoUpiId: 'arjun.mehta@payflow',
    demoBalancePaise: 12500000,
    avatarColor: '#4F46E5',
  },
  {
    key: 'priya',
    name: 'Priya Sharma',
    email: 'priya.demo@payflow.test',
    phone: '9123456780',
    password: 'Demo@1234',
    demoUpiId: 'priya.sharma@payflow',
    demoBalancePaise: 8500000,
    avatarColor: '#7C3AED',
  },
  {
    key: 'rahul',
    name: 'Rahul Verma',
    email: 'rahul.demo@payflow.test',
    phone: '9988776655',
    password: 'Demo@1234',
    demoUpiId: 'rahul.verma@payflow',
    demoBalancePaise: 4200000,
    avatarColor: '#2563EB',
  },
  {
    key: 'ananya',
    name: 'Ananya Iyer',
    email: 'ananya.demo@payflow.test',
    phone: '9012345678',
    password: 'Demo@1234',
    demoUpiId: 'ananya.iyer@payflow',
    demoBalancePaise: 15600000,
    avatarColor: '#059669',
  },
  {
    key: 'vikram',
    name: 'Vikram Singh',
    email: 'vikram.demo@payflow.test',
    phone: '9090909090',
    password: 'Demo@1234',
    demoUpiId: 'vikram.singh@payflow',
    demoBalancePaise: 3100000,
    avatarColor: '#DC2626',
  },
];

async function upsertUser(def) {
  const passwordHash = await bcrypt.hash(def.password, 12);
  return User.findOneAndUpdate(
    { email: def.email },
    {
      name: def.name,
      email: def.email,
      phone: def.phone,
      passwordHash,
      demoUpiId: def.demoUpiId,
      demoBalancePaise: def.demoBalancePaise,
      avatarColor: def.avatarColor,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected for seed:', MONGO_URI);

  const existing = await Transaction.findOne({ note: SEED_TAG });
  if (existing) {
    console.log('Seed already applied (tag found). Skipping to avoid duplicates.');
    console.log('To re-seed, drop database payflow_upi or remove seeded transactions.');
    await mongoose.disconnect();
    return;
  }

  const users = {};
  for (const def of DEMO_USERS) {
    users[def.key] = await upsertUser(def);
    console.log('User ready:', def.email, def.demoUpiId);
  }

  const arjun = users.arjun;
  const priya = users.priya;
  const rahul = users.rahul;
  const ananya = users.ananya;

  const tx1 = await Transaction.create({
    transactionReference: generateTransactionReference(),
    senderId: arjun._id,
    recipientId: priya._id,
    amountPaise: 25000,
    note: `Chai & snacks — ${SEED_TAG}`,
    status: 'successful',
    idempotencyKey: `${SEED_TAG}-tx1`,
    category: 'food',
    createdAt: daysAgo(2),
  });

  await LedgerEntry.create([
    {
      accountId: arjun._id,
      transactionId: tx1._id,
      entryType: 'debit',
      amountPaise: -25000,
      operationId: `${SEED_TAG}-tx1-debit`,
    },
    {
      accountId: priya._id,
      transactionId: tx1._id,
      entryType: 'credit',
      amountPaise: 25000,
      operationId: `${SEED_TAG}-tx1-credit`,
    },
  ]);

  const tx2 = await Transaction.create({
    transactionReference: generateTransactionReference(),
    senderId: priya._id,
    recipientId: rahul._id,
    amountPaise: 150000,
    note: `Split cab fare — ${SEED_TAG}`,
    status: 'successful',
    idempotencyKey: `${SEED_TAG}-tx2`,
    category: 'travel',
    createdAt: daysAgo(5),
  });

  await LedgerEntry.create([
    {
      accountId: priya._id,
      transactionId: tx2._id,
      entryType: 'debit',
      amountPaise: -150000,
      operationId: `${SEED_TAG}-tx2-debit`,
    },
    {
      accountId: rahul._id,
      transactionId: tx2._id,
      entryType: 'credit',
      amountPaise: 150000,
      operationId: `${SEED_TAG}-tx2-credit`,
    },
  ]);

  const txFailed = await Transaction.create({
    transactionReference: generateTransactionReference(),
    senderId: arjun._id,
    recipientId: ananya._id,
    amountPaise: 500000,
    note: `Demo failed payment — ${SEED_TAG}`,
    status: 'failed',
    failureReason: 'Simulated NPCI timeout (demo only)',
    idempotencyKey: `${SEED_TAG}-tx-failed`,
    category: 'shopping',
    createdAt: daysAgo(1),
  });

  const txRefund = await Transaction.create({
    transactionReference: generateTransactionReference(),
    senderId: arjun._id,
    recipientId: priya._id,
    amountPaise: 75000,
    note: `Merchant refund demo — ${SEED_TAG}`,
    status: 'refunded',
    idempotencyKey: `${SEED_TAG}-tx-refund`,
    category: 'shopping',
    createdAt: daysAgo(7),
  });

  const refund = await Refund.create({
    refundReference: generateRefundReference(),
    transactionId: txRefund._id,
    requestedBy: arjun._id,
    amountPaise: 75000,
    status: 'completed',
    reason: 'Demo refund — wrong item',
  });
  txRefund.refundId = refund._id;
  await txRefund.save();

  await LedgerEntry.create([
    {
      accountId: arjun._id,
      transactionId: txRefund._id,
      entryType: 'debit',
      amountPaise: -75000,
      operationId: `${SEED_TAG}-tx-refund-debit`,
    },
    {
      accountId: priya._id,
      transactionId: txRefund._id,
      entryType: 'credit',
      amountPaise: 75000,
      operationId: `${SEED_TAG}-tx-refund-credit`,
    },
    {
      accountId: priya._id,
      transactionId: txRefund._id,
      entryType: 'refund_debit',
      amountPaise: -75000,
      operationId: `${SEED_TAG}-refund-debit`,
    },
    {
      accountId: arjun._id,
      transactionId: txRefund._id,
      entryType: 'refund_credit',
      amountPaise: 75000,
      operationId: `${SEED_TAG}-refund-credit`,
    },
  ]);

  await Notification.insertMany([
    {
      userId: arjun._id,
      title: 'Simulated payment sent',
      message: 'You sent ₹250.00 to Priya Sharma (demo).',
      type: 'payment_success',
      relatedTransactionId: tx1._id,
      createdAt: daysAgo(2),
    },
    {
      userId: priya._id,
      title: 'Simulated payment received',
      message: 'You received ₹250.00 from Arjun Mehta (demo).',
      type: 'incoming_payment',
      relatedTransactionId: tx1._id,
      createdAt: daysAgo(2),
    },
    {
      userId: arjun._id,
      title: 'Simulated payment failed',
      message: txFailed.failureReason,
      type: 'payment_failed',
      relatedTransactionId: txFailed._id,
      createdAt: daysAgo(1),
    },
    {
      userId: arjun._id,
      title: 'Demo refund completed',
      message: 'Simulated refund of ₹750.00 — not a bank refund.',
      type: 'refund_update',
      relatedTransactionId: txRefund._id,
      createdAt: daysAgo(6),
    },
  ]);

  console.log('\nSeed complete. Demo logins (local only):');
  for (const def of DEMO_USERS) {
    console.log(`  ${def.email} / ${def.password}  UPI: ${def.demoUpiId}`);
  }
  console.log('\nPrimary demo account: arjun.demo@payflow.test / Demo@1234');

  await mongoose.disconnect();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
