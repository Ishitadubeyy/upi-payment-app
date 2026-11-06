import { customAlphabet } from 'nanoid';

const txnAlphabet = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 12);
const refundAlphabet = customAlphabet('0123456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10);

export function generateTransactionReference() {
  return `PF${txnAlphabet()}`;
}

export function generateRefundReference() {
  return `RF${refundAlphabet()}`;
}

export function generateDemoUpiId(name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 24);
  const suffix = customAlphabet('0123456789', 4)();
  return `${slug || 'user'}.${suffix}@payflow`;
}
