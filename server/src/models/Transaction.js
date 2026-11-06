import mongoose from 'mongoose';

const STATUSES = ['pending', 'successful', 'failed', 'refunded', 'refund_pending'];

const transactionSchema = new mongoose.Schema(
  {
    transactionReference: { type: String, required: true, unique: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },
    note: { type: String, default: '', maxlength: 200 },
    type: { type: String, enum: ['transfer'], default: 'transfer' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    failureReason: { type: String, default: null },
    idempotencyKey: { type: String, required: true, index: true },
    category: { type: String, default: 'general' },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund', default: null },
  },
  { timestamps: true }
);

transactionSchema.index({ senderId: 1, createdAt: -1 });
transactionSchema.index({ recipientId: 1, createdAt: -1 });
transactionSchema.index({ senderId: 1, idempotencyKey: 1 }, { unique: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);
export const TRANSACTION_STATUSES = STATUSES;
