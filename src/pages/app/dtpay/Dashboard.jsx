import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dtpay } from './api';
import { date } from './format';
import { Button, Card, Empty, ErrorBanner, Loading, Page, Stat, StatusBadge } from './ui';

/* /dt-pay — what is held, clearing and paid out, plus the latest payments. */
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
            subtitle='Pay carriers through DollarTraq. Funds are held until you release them.'
            testMode={config && !config.livemode}
            actions={<>
                <Button variant='secondary' onClick={() => navigate('/dt-pay/funding-controls')}>Funding methods</Button>
                <Button variant='secondary' onClick={() => navigate('/dt-pay/transactions')}>All payments</Button>
                <Button onClick={() => navigate('/dt-pay/new')}>New payment</Button>
            </>}
        >
            <ErrorBanner onRetry={load}>{error}</ErrorBanner>
            {config && !config.configured && (
                <div className='mb-4'><ErrorBanner>DT Pay is not configured on this server yet (Stripe keys missing).</ErrorBanner></div>
            )}

            {!data && !error && <Loading />}

            {data && (
                <>
                    <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                        <Stat label='Held · ready to release' value={data.held.formatted} sub={`${data.held.count} payment${data.held.count === 1 ? '' : 's'}`} tone='#175CD3' />
                        <Stat label='Clearing' value={data.processing.formatted} sub={`${data.processing.count} in progress`} tone='#B54708' />
                        <Stat label='Released this month' value={data.released_this_month.formatted} sub={`${data.released_this_month.count} paid out`} tone='#067647' />
                        <Stat label='Needs attention' value={data.awaiting_payment.count + data.open_disputes} sub={`${data.awaiting_payment.count} unpaid · ${data.open_disputes} disputed`} />
                    </div>

                    <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3'>
                        <Stat label='Released, all time' value={data.released_total.formatted} />
                        <Stat label='Refunded' value={data.refunded.formatted} sub={`${data.refunded.count} payment${data.refunded.count === 1 ? '' : 's'}`} />
                        <Stat label='Fees paid' value={data.fees_paid.formatted} sub='Platform and card fees' />
                    </div>

                    <Card
                        title='Recent payments'
                        padded={false}
                        actions={<Link to='/dt-pay/transactions' className='text-[13px] font-semibold text-[#175CD3]'>View all</Link>}
                    >
                        {data.recent.length === 0 ? (
                            <Empty title='No payments yet' action={<Button onClick={() => navigate('/dt-pay/new')}>Make your first payment</Button>}>
                                Pay a carrier for one of your loads, or enter one by hand.
                            </Empty>
                        ) : (
                            <PaymentRows rows={data.recent} />
                        )}
                    </Card>
                </>
            )}
        </Page>
    );
}

export function PaymentRows({ rows }) {
    const navigate = useNavigate();

    return (
        <div className='overflow-x-auto'>
            <table className='w-full min-w-[760px] text-left text-[13.5px]'>
                <thead>
                    <tr className='border-b border-[#EAECF0] bg-[#F9FAFB] text-[12px] font-semibold text-[#667085]'>
                        <th className='px-5 py-3'>Payment</th>
                        <th className='px-5 py-3'>Carrier</th>
                        <th className='px-5 py-3'>Load</th>
                        <th className='px-5 py-3 text-right'>Amount</th>
                        <th className='px-5 py-3'>Status</th>
                        <th className='px-5 py-3'>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((p) => (
                        <tr
                            key={p.id}
                            onClick={() => navigate(`/dt-pay/transactions/view/${p.id}`)}
                            className='cursor-pointer border-b border-[#F2F4F7] last:border-0 hover:bg-[#F9FAFB]'
                        >
                            <td className='px-5 py-3 font-semibold text-[#101828]'>{p.reference}</td>
                            <td className='px-5 py-3'>
                                <div className='font-medium text-[#101828]'>{p.carrier.name || '—'}</div>
                                <div className='text-[12px] text-[#667085]'>DOT {p.carrier.dot}</div>
                            </td>
                            <td className='px-5 py-3 text-[#475467]'>
                                <div>{p.load_number || '—'}</div>
                                {(p.origin || p.destination) && <div className='text-[12px] text-[#98A2B3]'>{p.origin || '?'} → {p.destination || '?'}</div>}
                            </td>
                            <td className='px-5 py-3 text-right font-semibold text-[#101828]'>{p.amount.formatted}</td>
                            <td className='px-5 py-3'><StatusBadge status={p.status} label={p.status_label} onHold={p.on_hold} /></td>
                            <td className='px-5 py-3 text-[#667085]'>{date(p.created_at)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
