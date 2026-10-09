/*
 * FMCSA-style BASIC percentiles, as the API's sms_measures.{basic}_basic
 * describes them: the carrier's peer group, that group's cut-points, the
 * estimated percentile and a verdict (over / elevated / clear / not_ranked).
 *
 * The verdict alone decides colour. The card's theme colour is decoration and
 * must never be read as risk.
 */

export const BASIC_KEYS = {
    unsafeDriving: 'unsafe_driv',
    hosCompliance: 'hos_driv',
    vehicleMaint: 'veh_maint',
    controlledSubstances: 'contr_subst',
    driverFitness: 'driv_fit',
};

export const VERDICT_STYLES = {
    over: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    elevated: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    clear: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    not_ranked: { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

export const TICKS = [50, 65, 75, 80, 90];

export function basicView(smsMeasures, metricKey) {
    const basic = BASIC_KEYS[metricKey];

    return basic ? smsMeasures?.[`${basic}_basic`] || null : null;
}

export function ordinal(n) {
    const v = n % 100;

    if (v >= 11 && v <= 13) return `${n}th`;

    return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

export function formatMeasure(value) {
    return value === null || value === undefined ? '—' : Number(value).toFixed(2);
}

export function verdictCopy(view) {
    if (!view) return '';

    const t = view.threshold_pct;

    switch (view.verdict) {
        case 'over':
            return `Above FMCSA ${ordinal(t)} intervention threshold`;
        case 'elevated':
            return `Elevated · below the ${ordinal(t)} line`;
        case 'clear':
            return Number(view.measure || 0) > 0 ? 'Clear · below peer median' : 'No violations';
        default:
            return 'Not ranked · measure for reference only';
    }
}

export const PERCENTILE_FOOTNOTE =
    'Percentiles are relative to carriers with violations in the same BASIC, inside the same FMCSA safety-event group.';
