import { apiFetch, apiDownload } from '../../../lib/api';

/*
 * DT Pay API (the rebuilt /dtpay endpoints). Every call returns parsed JSON
 * or throws an Error whose message is safe to show.
 */

const json = (method, body) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

function form(fields) {
    const data = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) value.forEach((v) => data.append(`${key}[]`, v));
        else data.append(key, value);
    });

    return data;
}

const qs = (params) => {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') search.set(k, v); });
    const s = search.toString();
    return s ? `?${s}` : '';
};

export const dtpay = {
    config: () => apiFetch('/dtpay/config'),
    summary: () => apiFetch('/dtpay/summary'),

    methods: () => apiFetch('/dtpay/methods'),
    setupIntent: (type) => apiFetch('/dtpay/methods/setup-intent', json('POST', { type })),
    removeMethod: (id) => apiFetch(`/dtpay/methods/${encodeURIComponent(id)}`, { method: 'DELETE' }),

    shipments: (params) => apiFetch(`/dtpay/shipments${qs(params)}`),
    carriers: (q) => apiFetch(`/dtpay/carriers${qs({ q })}`),
    carrierPayout: (dot) => apiFetch(`/dtpay/carriers/${dot}/payout`),
    carrierPayoutLink: (dot, body) => apiFetch(`/dtpay/carriers/${dot}/payout-link`, json('POST', body || {})),

    quote: (amount, methodType) => apiFetch('/dtpay/quote', json('POST', { amount, method_type: methodType })),

    payments: (params) => apiFetch(`/dtpay/payments${qs(params)}`),
    create: (fields) => apiFetch('/dtpay/payments', { method: 'POST', body: form(fields) }),
    payment: (id) => apiFetch(`/dtpay/payments/${id}`),
    pay: (id, paymentMethodId) => apiFetch(`/dtpay/payments/${id}/pay`, json('POST', { payment_method_id: paymentMethodId })),
    sync: (id) => apiFetch(`/dtpay/payments/${id}/sync`, json('POST', {})),
    release: (id) => apiFetch(`/dtpay/payments/${id}/release`, json('POST', {})),
    // Asks DollarTraq for a refund; an admin approves or rejects it.
    refund: (id, reason) => apiFetch(`/dtpay/payments/${id}/refund`, json('POST', { reason })),
    withdrawRefund: (id) => apiFetch(`/dtpay/payments/${id}/refund-request`, { method: 'DELETE' }),
    cancel: (id) => apiFetch(`/dtpay/payments/${id}/cancel`, json('POST', {})),
    hold: (id, hold, note) => apiFetch(`/dtpay/payments/${id}/hold`, json('POST', { hold, note })),
    pod: (id, file) => apiFetch(`/dtpay/payments/${id}/pod`, { method: 'POST', body: form({ file }) }),
    dispute: (id, fields) => apiFetch(`/dtpay/payments/${id}/disputes`, { method: 'POST', body: form(fields) }),
    resolveDispute: (id, disputeId, resolution) => apiFetch(`/dtpay/payments/${id}/disputes/${disputeId}/resolve`, json('POST', { resolution })),
    download: (id, kind, name, extra = '') => apiDownload(`/dtpay/payments/${id}/files/${kind}${extra}`, name),
};

export const guestPay = {
    config: () => apiFetch('/dtpay/guest/config', { skipAuth: true }),
    carriers: (q) => apiFetch(`/dtpay/guest/carriers${qs({ q })}`, { skipAuth: true }),
    quote: (amount, methodType) => apiFetch('/dtpay/guest/quote', { ...json('POST', { amount, method_type: methodType }), skipAuth: true }),
    create: (fields) => apiFetch('/dtpay/guest/payments', { method: 'POST', body: form(fields), skipAuth: true }),
    payment: (token) => apiFetch(`/dtpay/guest/payments/${token}`, { skipAuth: true }),
    intent: (token, methodType) => apiFetch(`/dtpay/guest/payments/${token}/intent`, { ...json('POST', { method_type: methodType }), skipAuth: true }),
    sync: (token) => apiFetch(`/dtpay/guest/payments/${token}/sync`, { ...json('POST', {}), skipAuth: true }),
    release: (token) => apiFetch(`/dtpay/guest/payments/${token}/release`, { ...json('POST', {}), skipAuth: true }),
    dispute: (token, fields) => apiFetch(`/dtpay/guest/payments/${token}/dispute`, { method: 'POST', body: form(fields), skipAuth: true }),
};
