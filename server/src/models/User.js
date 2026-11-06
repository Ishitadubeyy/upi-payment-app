import mongoose from 'mongoose';

const notificationPreferencesSchema = new mongoose.Schema(
  {
    paymentSuccess: { type: Boolean, default: true },
    paymentFailed: { type: Boolean, default: true },
    incomingPayment: { type: Boolean, default: true },
    refundUpdates: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    demoUpiId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    demoBalancePaise: { type: Number, required: true, default: 0, min: 0 },
    avatarColor: { type: String, default: '#4F46E5' },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', demoUpiId: 'text', email: 'text' });

export const User = mongoose.model('User', userSchema);
