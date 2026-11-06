import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
    entryType: { type: String, enum: ['debit', 'credit', 'refund_debit', 'refund_credit'], required: true },
    amountPaise: { type: Number, required: true },
    operationId: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

export const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
