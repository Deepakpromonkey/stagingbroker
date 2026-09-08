/*
| Formatting shared by the billing screens.
|
| The API already returns money in whole currency units and dates as ISO
| strings, so nothing here converts — it only presents.
*/

const CURRENCY_LOCALE = 'en-US';

/*
| Amounts arrive as numbers (249, 541.41). Intl gives the currency its proper
| symbol and grouping, which matters because the same page shows a $249 plan
| next to a $12,480 lifetime total.
*/
export function money(amount, currency = 'usd') {
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
        return '—';
    }

    try {
        return new Intl.NumberFormat(CURRENCY_LOCALE, {
            style: 'currency',
            currency: (currency || 'usd').toUpperCase(),
            minimumFractionDigits: 2,
        }).format(Number(amount));
    } catch {
        // An unknown currency code should not blank out the number.
        return `${Number(amount).toFixed(2)} ${(currency || '').toUpperCase()}`;
    }
}

/*
| Whole dollars, for the headline figures where cents are noise. Falls back to
| the exact amount when there are cents worth showing.
*/
export function moneyShort(amount, currency = 'usd') {
    if (amount === null || amount === undefined) return '—';

    const value = Number(amount);

    if (Number.isNaN(value)) return '—';

    if (Number.isInteger(value)) {
        try {
            return new Intl.NumberFormat(CURRENCY_LOCALE, {
                style: 'currency',
                currency: (currency || 'usd').toUpperCase(),
                maximumFractionDigits: 0,
            }).format(value);
        } catch {
            return `${value} ${(currency || '').toUpperCase()}`;
        }
    }

    return money(value, currency);
}

export function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString(CURRENCY_LOCALE, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/*
| A billing period reads better without the year repeated on both ends, so the
| year is dropped from the start date when both fall in the same one.
*/
export function formatPeriod(from, to) {
    if (!from || !to) return '—';

    const start = new Date(from);
    const end = new Date(to);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';

    const sameYear = start.getFullYear() === end.getFullYear();

    const startLabel = start.toLocaleDateString(CURRENCY_LOCALE, {
        month: 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
    });

    return `${startLabel} – ${formatDate(to)}`;
}

/*
| How long until a date, in the plainest terms. Used for "renews in 12 days"
| and for the countdown on a subscription that has been set to end.
*/
export function daysUntil(value) {
    if (!value) return null;

    const target = new Date(value);

    if (Number.isNaN(target.getTime())) return null;

    const diff = target.getTime() - Date.now();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function relativeDays(value) {
    const days = daysUntil(value);

    if (days === null) return null;
    if (days < 0) return 'passed';
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';

    return `in ${days} days`;
}

/*
| Card brands come off Stripe lower-cased and unpunctuated ('visa',
| 'amex', 'mastercard').
*/
const CARD_BRANDS = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
    eftpos_au: 'Eftpos',
};

export function cardBrand(brand) {
    if (!brand) return 'Card';

    return CARD_BRANDS[brand] || brand.charAt(0).toUpperCase() + brand.slice(1);
}
