/*
| The pieces only the billing screens use.
|
| Everything generic — the page header, the card shell, the KPI tile, the table
| cell classes — comes from the app's shared kit in
| pages/app/DtPay/components/ui, so billing does not grow a second look.
*/

import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';

/*
| The tones a subscription or an invoice can be in.
|
| `key` values match the API: subscription statuses come from Stripe verbatim
| (trialing / active / past_due / unpaid / canceled / incomplete) and invoice
| statuses likewise (open / paid / void / uncollectible).
*/
const TONES = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_META = {
    // Subscription
    active: { label: 'Active', tone: 'green', icon: CheckCircleOutlined },
    trialing: { label: 'Free trial', tone: 'blue', icon: ScienceOutlined },
    past_due: { label: 'Payment failed', tone: 'amber', icon: ErrorOutlineOutlined },
    unpaid: { label: 'Unpaid', tone: 'red', icon: ErrorOutlineOutlined },
    canceled: { label: 'Cancelled', tone: 'gray', icon: BlockOutlined },
    incomplete: { label: 'Payment pending', tone: 'amber', icon: ScheduleOutlined },
    incomplete_expired: { label: 'Expired', tone: 'gray', icon: BlockOutlined },
    paused: { label: 'Paused', tone: 'gray', icon: ScheduleOutlined },

    // Invoice
    paid: { label: 'Paid', tone: 'green', icon: CheckCircleOutlined },
    open: { label: 'Due', tone: 'amber', icon: ScheduleOutlined },
    overdue: { label: 'Overdue', tone: 'red', icon: ErrorOutlineOutlined },
    void: { label: 'Void', tone: 'gray', icon: BlockOutlined },
    uncollectible: { label: 'Uncollectible', tone: 'red', icon: ErrorOutlineOutlined },
    draft: { label: 'Draft', tone: 'gray', icon: ScheduleOutlined },
};

export function StatusPill({ status, label, size = 'md' }) {
    const meta = STATUS_META[status] || { label: status, tone: 'gray', icon: ScheduleOutlined };
    const Icon = meta.icon;

    const pad = size === 'sm' ? 'px-2 py-[3px] text-[10.5px]' : 'px-2.5 py-1 text-[11.5px]';

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wide whitespace-nowrap ${pad} ${TONES[meta.tone]}`}
        >
            <Icon sx={{ fontSize: size === 'sm' ? 12 : 14 }} />
            {label || meta.label}
        </span>
    );
}

/*
| A labelled value. Used all over the overview, where almost everything is a
| one-line fact about the subscription.
*/
export function InfoRow({ label, children, hint }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-b-0">
            <div className="text-[12.5px] text-gray-500 shrink-0">{label}</div>
            <div className="text-right">
                <div className="text-[13px] font-semibold text-gray-900">{children}</div>
                {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
            </div>
        </div>
    );
}

/*
| This period's load allowance.
|
| `limit` is null on an unlimited plan, which is not "0 of nothing" — it needs
| its own reading rather than a bar filled to an imaginary cap.
*/
export function UsageBar({ used, limit, unlimited }) {
    if (unlimited || limit === null || limit === undefined) {
        return (
            <div>
                <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[22px] font-semibold text-gray-900">{used ?? 0}</span>
                    <span className="text-[12px] text-gray-500">loads this period</span>
                </div>
                <div className="h-2 rounded-full bg-gradient-to-r from-blue-200 to-blue-500" />
                <div className="text-[11.5px] text-gray-500 mt-2">Unlimited on this plan</div>
            </div>
        );
    }

    const pct = limit > 0 ? Math.min(100, Math.round(((used ?? 0) / limit) * 100)) : 0;

    // Amber from four fifths, red once the allowance is gone — the point at
    // which the API starts refusing new loads.
    const barColour = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-blue-600';

    return (
        <div>
            <div className="flex items-baseline justify-between mb-2">
                <span className="text-[22px] font-semibold text-gray-900">
                    {used ?? 0}
                    <span className="text-[13px] font-normal text-gray-400"> / {limit}</span>
                </span>
                <span className="text-[12px] text-gray-500">loads this period</span>
            </div>

            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColour}`} style={{ width: `${pct}%` }} />
            </div>

            <div className="text-[11.5px] text-gray-500 mt-2">
                {pct >= 100
                    ? 'Allowance used — upgrade to book more loads this period.'
                    : `${Math.max(0, limit - (used ?? 0))} remaining`}
            </div>
        </div>
    );
}

/*
| A banner for the things the customer has to be told rather than look up: a
| failed card, a subscription set to end, a trial running out.
*/
const BANNER_TONES = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
};

export function Banner({ tone = 'blue', icon, title, children, action }) {
    const Icon = icon;

    return (
        <div className={`rounded-xl border px-4 py-3.5 flex items-start gap-3 ${BANNER_TONES[tone]}`}>
            {Icon && <Icon sx={{ fontSize: 19 }} className="mt-[1px] shrink-0" />}

            <div className="flex-1">
                {title && <div className="text-[13px] font-bold">{title}</div>}
                <div className="text-[12.5px] leading-relaxed opacity-90">{children}</div>
            </div>

            {action}
        </div>
    );
}

/*
| The app's buttons are written inline per page rather than componentised, so
| these two exist to keep the billing screens from drifting between them.
*/
export const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 h-[38px] px-4 rounded-lg bg-[#0052CC] text-white text-[12.5px] font-bold transition hover:bg-[#0066FF] disabled:opacity-50 disabled:cursor-not-allowed';

export const btnGhost =
    'inline-flex items-center justify-center gap-1.5 h-[38px] px-4 rounded-lg border border-gray-200 bg-white text-gray-700 text-[12.5px] font-bold transition hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed';

export const btnDanger =
    'inline-flex items-center justify-center gap-1.5 h-[38px] px-4 rounded-lg border border-red-200 bg-white text-red-600 text-[12.5px] font-bold transition hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed';
