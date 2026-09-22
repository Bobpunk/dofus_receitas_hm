export function formatKamas(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const n = Math.round(value);
  return n.toLocaleString('pt-BR');
}

export function formatSigned(value: number): string {
  const s = formatKamas(Math.abs(value));
  return value < 0 ? `-${s}` : s;
}

export function pct(value: number, base: number): string {
  if (!base) return '—';
  return `${((value / base) * 100).toFixed(0)}%`;
}

export function formatCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const n = Math.round(value);
  const abs = Math.abs(n);
  if (abs < 1000) return String(n);
  if (abs < 1_000_000) return `${(n / 1000).toFixed(1)}k`.replace('.', ',');
  return `${(n / 1_000_000).toFixed(1)}M`.replace('.', ',');
}

export function formatSignedCompact(value: number): string {
  const s = formatCompact(Math.abs(value));
  return value < 0 ? `-${s}` : s;
}

export function formatRelDays(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return '1d';
  if (days === 1) return '2d';
  if (days === 2) return '3d';
  if (days === 3) return '4d';
  if (days === 4) return '5d';
  if (days === 5) return '6d';
  if (days <= 12) return '1w';
  if (days <= 19) return '2w';
  if (days <= 26) return '3w';
  return '4w';
}

export function formatRelDays29(ts?: number): string {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return '1d';
  if (days >= 29) return '29d+';
  return `${days + 1}d`;
}
