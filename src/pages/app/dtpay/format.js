/* Formatting and lookup tables shared by the DT Pay screens. */

/* What each status is called on screen: where the money is, in plain words. */
export const STATUS_LABELS = {
    draft: 'Not paid yet',
    processing: 'Clearing',
    funded: 'Held',
    releasing: 'Releasing',
    released: 'Paid to carrier',
    refunding: 'Refunding',
    refunded: 'Refunded',
    failed: 'Payment failed',
    cancelled: 'Cancelled',
};

export const statusLabel = (status) => STATUS_LABELS[status] || status;

/* Position on the money route: 0 not paid, 1 clearing, 2 held, 3 with the carrier. */
export function routeStage(status) {
    return { processing: 1, funded: 2, releasing: 2, released: 3 }[status] ?? 0;
}

export const routeStopped = (status) => ['refunded', 'refunding', 'failed', 'cancelled'].includes(status);

export const STATUS_STYLES = {
    draft: { color: '#475569', bg: '#f1f5f9', border: '#e2e8f0' },
    processing: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
    funded: { color: '#1d4ed8', bg: '#EFF6FF', border: '#BFDBFE' },
    releasing: { color: '#1d4ed8', bg: '#EFF6FF', border: '#BFDBFE' },
    released: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    refunding: { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    refunded: { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
    failed: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
    cancelled: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
};

export const STATUS_FILTERS = [
    { key: '', label: 'All' },
    { key: 'held', label: 'Held' },
    { key: 'processing', label: 'Clearing' },
    { key: 'draft', label: 'Not paid' },
    { key: 'disputed', label: 'Disputed' },
    { key: 'released', label: 'Paid' },
    { key: 'refunded', label: 'Refunded' },
    { key: 'failed', label: 'Failed' },
    { key: 'cancelled', label: 'Cancelled' },
];

/* Compact dollars for chart axes: $0, $950, $12.5k, $1.2m. */
export function shortUsd(cents) {
    const d = (Number(cents) || 0) / 100;
    if (d >= 1e6) return `$${(d / 1e6).toFixed(d >= 1e7 ? 0 : 1)}m`;
    if (d >= 1e3) return `$${(d / 1e3).toFixed(d >= 1e4 ? 0 : 1)}k`;
    return `$${Math.round(d)}`;
}

export const DISPUTE_REASONS = [
    { key: 'not_delivered', label: 'Load not delivered' },
    { key: 'damaged', label: 'Freight damaged' },
    { key: 'short', label: 'Shortage / missing items' },
    { key: 'late', label: 'Late delivery' },
    { key: 'wrong_amount', label: 'Wrong amount' },
    { key: 'duplicate', label: 'Duplicate payment' },
    { key: 'other', label: 'Other' },
];

export const usd = (cents) =>
    ((Number(cents) || 0) / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function date(iso, withTime = false) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('en-US', withTime
        ? { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }
        : { month: 'short', day: 'numeric', year: 'numeric' });
}

export const methodName = (type) => (type === 'card' ? 'Card' : type === 'us_bank_account' ? 'Bank (ACH)' : '—');

/** Parse a dollar amount typed by a person: "$1,250.50" -> 1250.5 */
export function parseAmount(value) {
    const n = Number(String(value ?? '').replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : NaN;
}
