import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, required: true, maxlength: 500 },
    type: {
      type: String,
      enum: ['payment_success', 'payment_failed', 'incoming_payment', 'refund_update', 'info'],
      required: true,
    },
    relatedTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', default: null },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
