import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema(
  {
    refundReference: { type: String, required: true, unique: true, index: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, unique: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending', index: true },
    reason: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

export const Refund = mongoose.model('Refund', refundSchema);
