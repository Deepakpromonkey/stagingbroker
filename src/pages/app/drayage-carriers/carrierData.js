/*
 * carrierData.js = (1) every Drayage API call, built on the existing api.js helpers
 * (apiFetch / apiDownload), and (2) helpers that build the filters/columns from /drayage/fields.
 *
 * ASSUMPTION: API_BASE already ends in /api/v1 (paths in the reference are relative to it).
 * If it does not, set API_PREFIX below to '/api/v1'.
 */
import { apiFetch, apiDownload } from '@/lib/api'; // <- adjust to where api.js lives

const API_PREFIX = '';
const P = `${API_PREFIX}/drayage`;

/* Arrays use bracket syntax (key[]=a&key[]=b). Empty values are dropped because the API
   refuses unknown parameters and has no use for blanks. */
export function toQuery(params = {}) {
    const out = [];
    for (const [k, v] of Object.entries(params)) {
        if (v == null || v === '') continue;
        if (Array.isArray(v)) {
            v.filter((x) => x != null && x !== '').forEach((x) => out.push(`${encodeURIComponent(k)}[]=${encodeURIComponent(x)}`));
        } else {
            out.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        }
    }
    return out.join('&');
}

export const friendlyError = (e) =>
    e && e.status === 429 ? 'Too many requests. Please wait a few seconds and try again.' : (e && e.message) || 'Something went wrong. Please try again.';

const withQuery = (path, params) => {
    const q = toQuery(params);
    return q ? `${path}?${q}` : path;
};

/* Success envelope is {status, message, data}; callers get `data`. */
const unwrap = (json) => (json && json.data !== undefined ? json.data : json);
const get = async (path, params) => unwrap(await apiFetch(withQuery(path, params)));

/* ---------- Read endpoints (permission: view-carrier-directory) ---------- */
export const getFields = () => get(`${P}/fields`); // GET /drayage/fields
export const getFacets = () => get(`${P}/facets`).then((d) => d.facets || d); // GET /drayage/facets (data nests the counts under `facets`)
export const getStats = () => get(`${P}/stats`); // GET /drayage/stats
export const searchCarriers = (params) => get(`${P}/carriers`, params); // GET /drayage/carriers
export const getCarrier = (carrierKey, include) =>
    get(`${P}/carriers/${encodeURIComponent(carrierKey)}`, include ? { include } : {}); // GET /drayage/carriers/{key}
/* Exactly one of { usdot } | { mc } | { scac }. Use on a DollarTraq carrier profile for an
   "Also in the drayage directory" badge. */
export const lookupCarrier = (params) => get(`${P}/carriers/lookup`, params); // GET /drayage/carriers/lookup

/* ---------- Export (permission: export-drayage-directory) ---------- */
/* Same filter/sort params as search, minus page/per_page/facets/include. Streams the CSV
   through apiDownload (bearer token + filename from Content-Disposition). */
export const exportCarriers = (params) =>
    apiDownload(withQuery(`${P}/export`, params), 'drayage_carriers.csv'); // GET /drayage/export

/* ---------- Existing endpoints the drayage screens call ---------- */
export async function getPermissions() {
    const me = await apiFetch(`${API_PREFIX}/me`); // GET /me -> data.permissions
    return (me && me.data && me.data.permissions) || [];
}
/* POST /carrier-connect. `endpoint` is actions.invite.endpoint ("/api/v1/carrier-connect"). */
export const sendInvite = (endpoint, body) =>
    apiFetch(String(endpoint || '/carrier-connect').replace(/^\/api\/v1/, ''), {
        method: 'POST',
        body: JSON.stringify(body),
    });
/* GET /carrier/scores?dots[]= -> {"scores": {"<dot>": 91}} (no envelope; DOT missing until ready) */
export const getScores = (dots) => apiFetch(withQuery(`${API_PREFIX}/carrier/scores`, { dots }));

/* ---------- Admin (permission: manage-drayage-directory) ---------- */
export const uploadImport = (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch(`${P}/imports`, { method: 'POST', body: fd }).then(unwrap); // POST /drayage/imports (202)
};
export const listImports = () => get(`${P}/imports`).then((d) => d.imports || []); // GET /drayage/imports
export const getImport = (id) => get(`${P}/imports/${encodeURIComponent(id)}`).then((d) => d.import || d); // poll every 5s
export const listDatasets = () => get(`${P}/datasets`); // GET /drayage/datasets
export const activateDataset = (id) =>
    apiFetch(`${P}/datasets/${encodeURIComponent(id)}/activate`, { method: 'POST' }).then(unwrap);
export const deleteDataset = (id) => apiFetch(`${P}/datasets/${encodeURIComponent(id)}`, { method: 'DELETE' });

/* ================= Helpers (filters / columns are built at runtime from GET /drayage/fields) ================= */

export const fmtN = (n) => (n == null ? '' : Number(n).toLocaleString('en-US'));
export const fmtM = (n) => (n == null ? '' : '$' + Number(n).toLocaleString('en-US'));
export const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
export const humanize = (s) => String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export const YEAR_KEYS = ['established', 'mcs150_year', 'authority_year', 'first_added_year'];

// Fallbacks in case the API's type strings differ from what the reference shows.
const LIST_KEYS = new Set(['metros', 'city_codes', 'states_served', 'provinces_served', 'terminals', 'languages', 'ingate']);
const MONEY_KEYS = new Set(['cargo_insurance', 'trailer_interchange']);
// Quick-pick chips are UI sugar only; bounds and options still come from /drayage/facets.
const PRESETS = {
    years_in_business: [[5, null, '5+ yrs'], [10, null, '10+ yrs'], [20, null, '20+ yrs']],
    cargo_insurance: [[100000, null, '≥ $100k'], [250000, null, '≥ $250k'], [500000, null, '≥ $500k'], [1000000, null, '≥ $1M']],
    trailer_interchange: [[40000, null, '≥ $40k'], [75000, null, '≥ $75k'], [100000, null, '≥ $100k']],
    overweight_max_lbs: [[90000, null, '≥ 90k'], [100000, null, '≥ 100k'], [120000, null, '≥ 120k']],
    drivers_approx: [[1, 10, '1–10'], [11, 50, '11–50'], [51, null, '51+']],
    completeness: [[75, null, '75%+'], [90, null, '90%+']],
};
// Virtual filters carry no group in the API, so place them.
const VIRTUAL_GROUP = { authority_year: 'authority', first_added_year: 'contact', canadian_authority: 'authority' };
const KIND = { tri_state: 'tri', range: 'range', multi: 'multi', presence: 'has', recency: 'recency' };

function uiType(f) {
    if (MONEY_KEYS.has(f.key)) return 'money';
    switch (f.type) {
        case 'bool': case 'boolean': return 'bool';
        case 'int': case 'integer': case 'float': case 'number': case 'decimal': return 'num';
        case 'money': case 'currency': return 'money';
        case 'date': return 'date';
        case 'list': case 'array': return 'list';
        default: return LIST_KEYS.has(f.key) ? 'list' : 'text';
    }
}

/* Turn the /drayage/fields response into everything the UI needs. */
export function buildMeta(res) {
    const groups = Object.entries(res.groups || {}).map(([id, t]) => ({ id, t }));
    const F = (res.fields || []).map((f) => ({
        k: f.key, l: f.label, g: f.group, t: uiType(f), section: f.section || null,
        sortable: !!f.sortable, def: !!f.default_visible, filters: f.filters || [], options: f.options || null,
    }));
    const FD = Object.fromEntries(F.map((f) => [f.k, f]));

    const sources = [
        ...(res.fields || []),
        ...(res.virtual_filters || []).map((v) => ({ ...v, group: VIRTUAL_GROUP[v.key] })),
    ];
    const FILTERS = [];
    for (const f of sources) {
        if (f.key === 'record_type' || f.filterable === false) continue; // record type = the toolbar toggle
        for (const fk of f.filters || []) {
            const kind = KIND[fk];
            if (!kind) continue;
            const type = uiType(f);
            FILTERS.push({
                id: `${kind}:${f.key}`, kind, k: f.key, g: f.group, section: f.section || null,
                label: kind === 'has' ? `Has ${f.label}` : f.label,
                money: type === 'money',
                list: kind === 'multi' && type === 'list',
                presets: PRESETS[f.key] || null,
            });
        }
    }
    const cardFields = (res.card_fields || []).filter((k) => FD[k]);
    return {
        groups, F, FD, FILTERS,
        cardFields,
       defaultColumns: (res.default_columns || cardFields).filter((k) => FD[k] && k !== 'company_name'),
        source: res.source,
    };
}

/* ---------- filter state helpers ---------- */
export function isActive(s, f) {
    if (!s) return false;
    if (f.kind === 'tri' || f.kind === 'has' || f.kind === 'recency') return !!s.v;
    if (f.kind === 'range') return s.min != null || s.max != null;
    if (f.kind === 'multi') return !!(s.sel && s.sel.size);
    return false;
}

export function chipLabel(f, s) {
    if (f.kind === 'has') return f.label;
    if (f.kind === 'tri') return `${f.label}: ${s.v === 'unknown' ? 'not stated' : s.v === 'yes' ? 'Yes' : 'No'}`;
    if (f.kind === 'range') {
        const fm = f.money ? fmtM : YEAR_KEYS.includes(f.k) ? String : fmtN;
        const text = s.min != null && s.max != null ? `${fm(s.min)}\u2013${fm(s.max)}` : s.min != null ? `\u2265 ${fm(s.min)}` : `\u2264 ${fm(s.max)}`;
        return `${f.label}: ${text}`;
    }
    if (f.kind === 'multi') {
        const arr = [...s.sel];
        return `${f.label}${s.all && arr.length > 1 ? ' (all)' : ''}: ${arr.slice(0, 3).join(', ')}${arr.length > 3 ? ` +${arr.length - 3}` : ''}`;
    }
    if (f.kind === 'recency') {
        const map = { 90: '3 months', 180: '6 months', 365: '12 months', 730: '24 months' };
        return `${f.label}: ${map[s.v] || s.v + ' days'}`;
    }
    return f.label;
}

/* Build query params for GET /drayage/carriers (and /drayage/export when forExport).
   `sort` is {k, d} or null (null = server default: -completeness, or relevance when q is set). */
export function buildSearchParams({ query, recordType, filterState, filters, sort, page, perPage, fields, forExport }) {
    const p = {};
    if (query && query.trim()) p.q = query.trim();
    if (recordType && recordType !== 'all') p.record_type = recordType;
    for (const f of filters) {
        const s = filterState[f.id];
        if (!isActive(s, f)) continue;
        if (f.kind === 'tri') p[f.k] = s.v; // yes | no | unknown
        else if (f.kind === 'has') (p.has = p.has || []).push(f.k);
        else if (f.kind === 'range') {
            if (s.min != null) p[`${f.k}_min`] = s.min;
            if (s.max != null) p[`${f.k}_max`] = s.max;
        } else if (f.kind === 'multi') {
            p[f.k] = [...s.sel];
            if (s.all && s.sel.size > 1 && f.list) p[`${f.k}_mode`] = 'all';
        } else if (f.kind === 'recency') p.updated_within_days = s.v;
    }
    if (sort) p.sort = (sort.d < 0 ? '-' : '') + sort.k + (sort.k === 'company_name' ? '' : ',company_name');
    if (fields && fields.length) p.fields = fields.join(',');
    if (!forExport) {
        if (page > 0) p.page = page + 1; // UI pages are 0-based, API pages are 1-based; page 1 is the default so it is omitted
        p.per_page = perPage;
    }
    return p;
}