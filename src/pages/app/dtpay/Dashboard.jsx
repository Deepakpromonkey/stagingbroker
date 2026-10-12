import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { dtpay } from './api';
import { STATUS_FILTERS, shortUsd, usd } from './format';
import { ACCENT, Amount, Button, Empty, ErrorBanner, Figure, GREEN, Label, Loading, Page, Panel, SectionTitle, Tabs } from './ui';
import PaymentsTable from './PaymentsTable';

/* /dt-pay: balances, money movement, what is waiting to be released, and the payments. */
export default function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        Promise.all([dtpay.summary(), dtpay.config()])
            .then(([summary, cfg]) => { setError(''); setData(summary); setConfig(cfg); })
            .catch((e) => setError(e.message));
    }, []);

    useEffect(load, [load]);

    return (
        <Page
            title='DT Pay'
            accent='Overview'
            intro='Pay carriers through DollarTraq. Money is held until the load delivers and you release it.'
            testMode={config && !config.livemode}
            actions={<>
                <Button variant='secondary' onClick={() => navigate('/dt-pay/funding-controls')}>Funding methods</Button>
                <Button onClick={() => navigate('/dt-pay/new')}>Pay a carrier</Button>
            </>}
        >
            <ErrorBanner onRetry={load}>{error}</ErrorBanner>
            {config && !config.configured && <ErrorBanner>DT Pay is not set up on this server yet: Stripe keys are missing.</ErrorBanner>}
            {!data && !error && <Loading />}

            {data && (
                <>
                    <div className='mb-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]'>
                        <section className='rounded-2xl border border-[#e8e8e8] bg-white'>
                            <div className='grid grid-cols-2 gap-y-6 px-5 pt-6 sm:px-7 lg:grid-cols-[1.25fr_1fr_1fr_1fr] lg:divide-x lg:divide-[#f1f5f9]'>
                                <div className='pr-4'>
                                    <Figure big label='Held for carriers' value={data.held.formatted} tone='#0f172a' note={plural(data.held.count, 'payment')} />
                                </div>
                                <div className='lg:px-6'>
                                    <Figure big label='Clearing' value={data.processing.formatted} tone={data.processing.count ? '#b45309' : '#94a3b8'} note={data.processing.count ? `${plural(data.processing.count, 'bank payment')} on the way` : 'Nothing clearing'} />
                                </div>
                                <div className='pr-4 lg:px-6'>
                                    <Figure big label='Paid this month' value={data.released_this_month.formatted} tone={data.released_this_month.count ? GREEN : '#94a3b8'} note={`${data.released_total.formatted} all time`} />
                                </div>
                                <div className='lg:pl-6'>
                                    <Figure big label='Fees this month' value={data.fees_this_month?.formatted ?? '$0.00'} tone='#475569' note={`${data.fees_paid.formatted} all time`} />
                                </div>
                            </div>

                            <div className='mt-6 border-t border-[#f1f5f9] px-5 pb-5 pt-5 sm:px-7'>
                                <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                                    <Label>Money movement, last 30 days</Label>
                                    <div className='flex items-center gap-4 text-xs text-[#6b7280]'>
                                        <Key color={ACCENT}>Paid in</Key>
                                        <Key color={GREEN}>Released</Key>
                                    </div>
                                </div>
                                <MovementChart days={data.daily || []} />
                            </div>
                        </section>

                        <ReleaseQueue data={data} />
                    </div>

                    <PaymentsSection counts={data.counts} />
                </>
            )}
        </Page>
    );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Key({ color, children }) {
    return (
        <span className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full' style={{ background: color }} />
            {children}
        </span>
    );
}

function MovementChart({ days }) {
    const quiet = days.every((d) => !d.funded_cents && !d.released_cents);

    return (
        <div className='relative h-[190px]'>
            <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={days} margin={{ top: 6, right: 4, left: -8, bottom: 0 }} barGap={2} barCategoryGap='22%'>
                    <CartesianGrid vertical={false} stroke='#f1f5f9' />
                    <XAxis
                        dataKey='date'
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        interval={6}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={shortUsd} />
                    <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 8px 20px rgba(15,23,42,0.08)' }}
                        labelFormatter={(d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        formatter={(v, name) => [usd(v), name === 'funded_cents' ? 'Paid in' : 'Released']}
                    />
                    <Bar dataKey='funded_cents' fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={10} />
                    <Bar dataKey='released_cents' fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={10} />
                </BarChart>
            </ResponsiveContainer>
            {quiet && (
                <p className='pointer-events-none absolute inset-0 m-0 flex items-center justify-center text-[13px] text-[#9ca3af]'>
                    No money moved in the last 30 days.
                </p>
            )}
        </div>
    );
}

/* The deep blue panel: held payments, oldest first, and whether each can be released. */
function ReleaseQueue({ data }) {
    const navigate = useNavigate();
    const items = data.to_release || [];

    return (
        <Panel tone='deep' padded={false} className='flex flex-col'>
            <div className='px-6 pt-6'>
                <Label light>Ready to release</Label>
                <Amount value={data.held.formatted} className='mt-2 block text-[30px] font-extrabold leading-none tracking-[-0.5px] text-white' />
                <p className='m-0 mt-2 text-xs text-white/70'>
                    {items.length ? 'Release each one once its load is delivered.' : 'Nothing is waiting on you.'}
                </p>
            </div>

            <ul className='m-0 mt-5 flex flex-1 list-none flex-col gap-1 px-3 py-0'>
                {items.map((p) => {
                    const state = p.refund_requested ? ['Refund requested', 'bg-red-200 text-red-950']
                        : p.disputed ? ['Disputed', 'bg-amber-300 text-amber-950']
                        : p.on_hold ? ['On hold', 'bg-amber-300 text-amber-950']
                            : p.payout_ready ? ['Ready', 'bg-green-300 text-green-950']
                                : ['Carrier setup pending', 'bg-white/15 text-white'];

                    return (
                        <li key={p.id}>
                            <button
                                type='button'
                                onClick={() => navigate(`/dt-pay/transactions/view/${p.id}`)}
                                className='flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-none bg-transparent px-3 py-2.5 text-left text-white transition-colors hover:bg-white/10'
                            >
                                <span className='min-w-0'>
                                    <span className='block truncate text-[13.5px] font-semibold'>{p.carrier.name || `DOT ${p.carrier.dot}`}</span>
                                    <span className='mt-1 flex items-center gap-2 text-[11.5px] text-white/65'>
                                        {p.reference}
                                        <span className={`rounded-full px-1.5 py-px text-[10.5px] font-bold ${state[1]}`}>{state[0]}</span>
                                    </span>
                                </span>
                                <Amount value={p.amount.formatted} className='shrink-0 text-[14px] font-bold' />
                            </button>
                        </li>
                    );
                })}
                {data.held.count > items.length && (
                    <li className='px-3 py-1 text-xs text-white/65'>and {data.held.count - items.length} more</li>
                )}
            </ul>

            <div className='mt-4 px-6 pb-6'>
                <Button variant='onDeep' className='w-full' onClick={() => navigate(items.length ? '/dt-pay/transactions?status=held' : '/dt-pay/new')}>
                    {items.length ? 'Review held payments' : 'Pay a carrier'}
                </Button>
            </div>
        </Panel>
    );
}

/* The payments table, filtered by tab, with counts from the summary. */
function PaymentsSection({ counts }) {
    const navigate = useNavigate();
    const [status, setStatus] = useState('');
    const [result, setResult] = useState({ key: null, rows: [] });

    useEffect(() => {
        dtpay.payments({ status, per_page: 8 })
            .then((r) => setResult({ key: status, rows: r.data }))
            .catch(() => setResult({ key: status, rows: [] }));
    }, [status]);

    const loading = result.key !== status;
    const tabs = STATUS_FILTERS.filter((f) => f.key === '' || counts?.[f.key]);

    return (
        <section>
            <SectionTitle aside={<Link to={`/dt-pay/transactions${status ? `?status=${status}` : ''}`} className='text-xs font-semibold text-[#185FA5] no-underline'>View all payments</Link>}>
                Payments
            </SectionTitle>
            <div className='mb-4'>
                <Tabs items={tabs} value={status} onChange={setStatus} counts={counts} />
            </div>
            <PaymentsTable
                rows={result.rows}
                loading={loading}
                empty={(
                    <Empty title='No payments yet' action={<Button onClick={() => navigate('/dt-pay/new')}>Pay a carrier</Button>}>
                        Pick one of your loads or enter one by hand. The carrier is paid when you release the money.
                    </Empty>
                )}
            />
        </section>
    );
}
