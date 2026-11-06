export function rupeesToPaise(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Invalid amount');
  }
  const paise = Math.round(n * 100);
  if (paise <= 0) throw new Error('Invalid amount');
  return paise;
}

export function paiseToRupees(paise) {
  return (Number(paise) / 100).toFixed(2);
}

export function formatInr(paise) {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}
