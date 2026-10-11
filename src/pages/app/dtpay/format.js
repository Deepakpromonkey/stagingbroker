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
    draft: { color: '#475467', bg: '#F2F4F7', border: '#E4E7EC' },
    processing: { color: '#B54708', bg: '#FFFAEB', border: '#FEDF89' },
    funded: { color: '#2953E4', bg: '#EEF4FF', border: '#C7D7FE' },
    releasing: { color: '#2953E4', bg: '#EEF4FF', border: '#C7D7FE' },
    released: { color: '#067647', bg: '#ECFDF3', border: '#ABEFC6' },
    refunding: { color: '#5925DC', bg: '#F4F3FF', border: '#D9D6FE' },
    refunded: { color: '#5925DC', bg: '#F4F3FF', border: '#D9D6FE' },
    failed: { color: '#B42318', bg: '#FEF3F2', border: '#FECDCA' },
    cancelled: { color: '#667085', bg: '#F9FAFB', border: '#EAECF0' },
};

export const STATUS_FILTERS = [
    { key: '', label: 'All' },
    { key: 'draft', label: 'Not paid yet' },
    { key: 'processing', label: 'Clearing' },
    { key: 'held', label: 'Held' },
    { key: 'disputed', label: 'Disputed' },
    { key: 'released', label: 'Paid to carrier' },
    { key: 'refunded', label: 'Refunded' },
    { key: 'failed', label: 'Failed' },
    { key: 'cancelled', label: 'Cancelled' },
];

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
