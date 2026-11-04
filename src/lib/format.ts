const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const full = new Intl.NumberFormat('en-US');

export function formatCash(value: number, opts: { compact?: boolean; noSymbol?: boolean } = {}) {
  const n = opts.compact && Math.abs(value) >= 10_000 ? compact.format(value) : full.format(value);
  if (opts.noSymbol) return n;
  // Negative values: keep the symbol next to the digits, like "-$1,200"
  if (value < 0) return n.replace('-', '-$');
  return `$${n}`;
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return 'arriving now';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

export function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
