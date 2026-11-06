export function formatInrFromPaise(paise) {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(rupees);
}

export function rupeesInputToPaise(value) {
  const n = parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function firstName(name) {
  return (name || 'there').split(' ')[0];
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
