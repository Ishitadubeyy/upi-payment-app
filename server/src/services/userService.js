import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { maskUpiId } from '../utils/payUri.js';
import { toContactUser, toPublicUser } from '../utils/userDto.js';

export async function searchUsers(currentUserId, q) {
  const term = (q || '').trim();
  if (term.length < 2) return [];

  const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [{ name: regex }, { demoUpiId: regex }, { phone: regex }, { email: regex }],
  })
    .limit(15)
    .select('name demoUpiId avatarColor phone');

  return users.map((u) => ({
    ...toContactUser(u),
    maskedUpiId: maskUpiId(u.demoUpiId),
    phoneMasked: u.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'),
  }));
}

export async function resolveRecipient(currentUserId, { upiId, phone }) {
  if (upiId) {
    const user = await User.findOne({ demoUpiId: upiId.toLowerCase().trim() });
    if (!user) throw new AppError('Recipient not found', 404);
    if (user._id.toString() === currentUserId.toString()) {
      throw new AppError('Cannot pay yourself', 400);
    }
    return {
      id: user._id.toString(),
      name: user.name,
      demoUpiId: user.demoUpiId,
      maskedUpiId: maskUpiId(user.demoUpiId),
    };
  }
  if (phone) {
    const normalized = phone.replace(/\s+/g, '');
    const user = await User.findOne({ phone: normalized });
    if (!user) throw new AppError('Recipient not found', 404);
    if (user._id.toString() === currentUserId.toString()) {
      throw new AppError('Cannot pay yourself', 400);
    }
    return {
      id: user._id.toString(),
      name: user.name,
      demoUpiId: user.demoUpiId,
      maskedUpiId: maskUpiId(user.demoUpiId),
    };
  }
  throw new AppError('Provide upiId or phone', 400);
}

export async function updateProfile(userId, { name, notificationPreferences }) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (name) user.name = name.trim();
  if (notificationPreferences) {
    user.notificationPreferences = { ...user.notificationPreferences.toObject(), ...notificationPreferences };
  }
  await user.save();
  return toPublicUser(user);
}

export async function getReceivePayload(userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  const { buildPayUri } = await import('../utils/payUri.js');
  return {
    demoUpiId: user.demoUpiId,
    payUri: buildPayUri({ upiId: user.demoUpiId }),
    disclaimer: 'For PayFlow UPI demo only. Not connected to NPCI or real banks.',
  };
}
