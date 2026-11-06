import { Notification } from '../models/Notification.js';

export async function createNotification({ userId, title, message, type, relatedTransactionId }) {
  return Notification.create({
    userId,
    title,
    message,
    type,
    relatedTransactionId: relatedTransactionId || null,
  });
}

export async function listNotifications(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ userId }),
  ]);
  const unreadCount = await Notification.countDocuments({ userId, isRead: false });
  return { items, total, unreadCount, page, limit };
}

export async function markRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
}

export async function markAllRead(userId) {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
}
