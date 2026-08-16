// Small helpers for rendering AI data consistently across pages.

export const riskClass = (level) => {
  const l = String(level || '').toUpperCase();
  if (l === 'HIGH') return 'risk-high';
  if (l === 'MODERATE') return 'risk-moderate';
  return 'risk-low';
};

export const riskColor = (level) => {
  const l = String(level || '').toUpperCase();
  if (l === 'HIGH') return 'var(--danger)';
  if (l === 'MODERATE') return 'var(--warning)';
  return 'var(--success)';
};

export const severityClass = (severity) => {
  const s = Number(severity);
  if (s >= 3) return 'severity-3';
  if (s === 2) return 'severity-2';
  return 'severity-1';
};

export const intentLabel = (intent) => String(intent || '').replace(/_/g, ' ');

export const formatNumber = (n, digits = 1) => {
  const num = Number(n);
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-IN', { maximumFractionDigits: digits });
};
