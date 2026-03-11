export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n) {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}
