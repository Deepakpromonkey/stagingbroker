import { useCallback, useEffect, useState } from 'react';

import {
    ResponsiveContainer,
    BarChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Bar,
} from 'recharts';

import Skeleton from '@mui/material/Skeleton';

import PaidOutlined from '@mui/icons-material/PaidOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import PendingActionsOutlined from '@mui/icons-material/PendingActionsOutlined';
import TrendingUpOutlined from '@mui/icons-material/TrendingUpOutlined';

import { apiFetch } from '../../../lib/api';

import { Card, Kpi } from '../DtPay/components/ui';

import { money, moneyShort, formatDate, formatPeriod } from './format';
import { InfoRow, UsageBar, StatusPill, btnGhost } from './components';

/*
| What the account has actually spent.
|
| Built from the same mirrored invoices the history tab lists, so the totals
| here and the rows there can never disagree. The window is selectable because
| twelve months is the useful default but a brokerage closing its books wants
| two years.
*/

const RANGES = [
    { months: 6, label: '6 months' },
    { months: 12, label: '12 months' },
    { months: 24, label: '24 months' },
];

/*
| The chart's own tooltip. Recharts' default one shows the raw series name and
| an unformatted number, which for money is worse than nothing.
*/
function SpendTooltip({ active, payload, label, currency }) {
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload || {};

    return (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
            <div className="text-[14px] font-bold text-gray-900 mt-1">
                {money(point.paid, currency)}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
                {point.invoice_count} invoice{point.invoice_count === 1 ? '' : 's'}
                {point.billed !== point.paid && ` · ${money(point.billed, currency)} billed`}
            </div>
        </div>
    );
}

function BillingReport() {

    const [months, setMonths] = useState(12);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        setError('');

        apiFetch(`/billing/report?months=${months}`)
            .then((response) => setReport(response?.data || null))
            .catch((err) => setError(err?.message || 'We could not build your billing report.'))
            .finally(() => setLoading(false));
    }, [months]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((tile) => (
                        <Skeleton key={tile} height={132} sx={{ transform: 'none', borderRadius: '16px' }} />
                    ))}
                </div>
                <Skeleton height={300} sx={{ transform: 'none', borderRadius: '16px' }} />
            </div>
        );
    }

    if (error) {
        return (
            <Card title="Billing report" titleClass="text-gray-900">
                <div className="py-10 text-center">
                    <div className="text-[13px] font-bold text-gray-900">{error}</div>
                    <button className={`${btnGhost} mt-4`} onClick={load}>Try again</button>
                </div>
            </Card>
        );
    }

    const totals = report?.totals || {};
    const currency = report?.currency || 'usd';
    const series = report?.monthly || [];
    const plan = report?.plan;

    // Nothing billed yet: an all-zero chart reads as a system fault rather
    // than a new account, so it is not drawn at all.
    const hasSpend = series.some((point) => point.paid > 0 || point.invoice_count > 0);

    return (
        <div className="flex flex-col gap-5">

            {/* ── Headline figures ───────────────────────────────── */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi
                    icon={<PaidOutlined sx={{ fontSize: 18 }} />}
                    bg="bg-green-50"
                    fg="text-green-600"
                    val={moneyShort(totals.paid, currency)}
                    lbl="Total paid"
                    sub={report?.last_payment_at ? `Last payment ${formatDate(report.last_payment_at)}` : 'No payments yet'}
                />

                <Kpi
                    icon={<ReceiptLongOutlined sx={{ fontSize: 18 }} />}
                    bg="bg-blue-50"
                    fg="text-[#0052CC]"
                    val={totals.invoice_count ?? 0}
                    lbl="Invoices"
                    sub={`${totals.paid_count ?? 0} paid · ${totals.open_count ?? 0} open`}
                />

                <Kpi
                    icon={<PendingActionsOutlined sx={{ fontSize: 18 }} />}
                    bg={totals.overdue_count > 0 ? 'bg-red-50' : 'bg-gray-100'}
                    fg={totals.overdue_count > 0 ? 'text-red-600' : 'text-gray-500'}
                    val={money(totals.outstanding ?? 0, currency)}
                    lbl="Outstanding"
                    sub={totals.overdue_count > 0
                        ? `${totals.overdue_count} overdue`
                        : 'Nothing overdue'}
                />

                <Kpi
                    icon={<TrendingUpOutlined sx={{ fontSize: 18 }} />}
                    bg="bg-purple-50"
                    fg="text-purple-600"
                    val={money(totals.average_per_invoice ?? 0, currency)}
                    lbl="Average per invoice"
                    sub={report?.first_invoice_at ? `Since ${formatDate(report.first_invoice_at)}` : '—'}
                />
            </div>

            {/* ── Spend over time ────────────────────────────────── */}

            <Card
                title="Spend by month"
                titleClass="text-gray-900"
                tilleAction={
                    <div className="flex gap-1.5">
                        {RANGES.map((range) => (
                            <button
                                key={range.months}
                                onClick={() => setMonths(range.months)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                                    months === range.months
                                        ? 'bg-blue-50 text-[#0052CC] border border-blue-200'
                                        : 'text-gray-500 border border-transparent hover:bg-gray-50'
                                }`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                }
            >
                {hasSpend ? (
                    <div className="h-[280px] pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={series} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />

                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10.5, fill: '#94A3B8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                />

                                <YAxis
                                    tick={{ fontSize: 10.5, fill: '#94A3B8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => (value === 0 ? '0' : moneyShort(value, currency))}
                                />

                                <Tooltip
                                    cursor={{ fill: 'rgba(0, 82, 204, 0.05)' }}
                                    content={<SpendTooltip currency={currency} />}
                                />

                                <Bar dataKey="paid" fill="#0052CC" radius={[5, 5, 0, 0]} maxBarSize={38} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="py-14 text-center">
                        <div className="text-[13.5px] font-bold text-gray-900">Nothing billed yet</div>
                        <p className="text-[12.5px] text-gray-500 mt-1 max-w-[400px] mx-auto leading-relaxed">
                            Your spend appears here after the first payment is taken. On a free trial,
                            that is the day the trial ends.
                        </p>
                    </div>
                )}
            </Card>

            {/* ── Plan and usage side by side ────────────────────── */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                <Card
                    title="Plan on this report"
                    titleClass="text-gray-900"
                    tilleAction={plan ? <StatusPill status={plan.status} size="sm" /> : null}
                >
                    {plan ? (
                        <div className="pt-1">
                            <InfoRow label="Plan">{plan.name}</InfoRow>
                            <InfoRow label="Price">
                                {moneyShort(plan.amount, currency)}
                                <span className="text-gray-400 font-normal"> /{plan.interval}</span>
                            </InfoRow>
                            <InfoRow label={plan.cancel_at_period_end ? 'Access ends' : 'Renews on'}>
                                {formatDate(plan.current_period_ends_at)}
                            </InfoRow>
                        </div>
                    ) : (
                        <div className="py-4 text-[12.5px] text-gray-500 leading-relaxed">
                            No active plan. This report covers the invoices raised while the account
                            was subscribed.
                        </div>
                    )}
                </Card>

                <Card title="Loads this billing period" titleClass="text-gray-900">
                    <div className="pt-1">
                        <UsageBar
                            used={report?.load_usage?.used}
                            limit={report?.load_usage?.limit}
                            unlimited={report?.load_usage?.unlimited}
                        />

                        {report?.load_usage?.period_starts_at && (
                            <div className="text-[11px] text-gray-400 mt-3">
                                {formatPeriod(
                                    report.load_usage.period_starts_at,
                                    report.load_usage.period_ends_at
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default BillingReport;
