const PAYFLOW_SCHEME = 'payflow://pay';

export function buildPayUri({ upiId, amountPaise, note }) {
  const params = new URLSearchParams();
  params.set('upiId', upiId);
  if (amountPaise != null && amountPaise > 0) {
    params.set('amountPaise', String(amountPaise));
  }
  if (note) params.set('note', note.slice(0, 140));
  return `${PAYFLOW_SCHEME}?${params.toString()}`;
}

export function parsePayUri(raw) {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, error: 'Empty payload' };
  }
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'External URLs are not supported in this demo' };
  }

  let url;
  try {
    if (trimmed.startsWith('payflow://')) {
      url = new URL(trimmed.replace('payflow://', 'http://payflow/'));
    } else if (trimmed.includes('@payflow')) {
      return { ok: true, upiId: trimmed.toLowerCase(), amountPaise: null, note: null };
    } else {
      return { ok: false, error: 'Unsupported QR format' };
    }
  } catch {
    return { ok: false, error: 'Malformed payment URI' };
  }

  if (url.pathname && url.pathname !== '/pay' && url.pathname !== '/') {
    return { ok: false, error: 'Invalid payflow path' };
  }

  const upiId = (url.searchParams.get('upiId') || '').toLowerCase();
  if (!upiId.endsWith('@payflow')) {
    return { ok: false, error: 'Invalid demo UPI ID in QR' };
  }

  const amountRaw = url.searchParams.get('amountPaise');
  let amountPaise = null;
  if (amountRaw != null && amountRaw !== '') {
    amountPaise = parseInt(amountRaw, 10);
    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return { ok: false, error: 'Invalid amount in QR' };
    }
  }

  const note = url.searchParams.get('note') || null;
  return { ok: true, upiId, amountPaise, note };
}

export function maskUpiId(upiId) {
  if (!upiId) return '';
  const [local, domain] = upiId.split('@');
  if (!domain) return upiId;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}
