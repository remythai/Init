export function normalizePhone(phone) {
  let normalized = phone.replace(/[^\d+]/g, '');

  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '+33' + normalized.substring(1);
  } else if (normalized.startsWith('33') && !normalized.startsWith('+')) {
    normalized = '+' + normalized;
  } else if (!normalized.startsWith('+')) {
    normalized = '+33' + normalized;
  }

  return normalized;
}

export function isValidPhone(phone) {
  const normalized = normalizePhone(phone);
  return /^\+\d{10,15}$/.test(normalized);
}
