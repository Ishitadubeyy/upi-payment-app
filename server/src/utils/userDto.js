export function toPublicUser(user) {
  if (!user) return null;
  const doc = user.toObject ? user.toObject() : user;
  return {
    id: doc._id?.toString() || doc.id,
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    demoUpiId: doc.demoUpiId,
    demoBalancePaise: doc.demoBalancePaise,
    avatarColor: doc.avatarColor,
    notificationPreferences: doc.notificationPreferences,
    createdAt: doc.createdAt,
  };
}

export function toContactUser(user) {
  const pub = toPublicUser(user);
  if (!pub) return null;
  return {
    id: pub.id,
    name: pub.name,
    demoUpiId: pub.demoUpiId,
    avatarColor: pub.avatarColor,
  };
}
