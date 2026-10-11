import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dtpay } from './api';
import { date } from './format';
import { Amount, Button, Empty, ErrorBanner, Loading, MoneyRoute, Page, Panel, StatusBadge } from './ui';

/* /dt-pay — the money you are holding for carriers, and what needs you. */
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
            intro='Pay carriers through DollarTraq. Your money is held until the load is delivered and you release it.'
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
                    <div className='mb-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]'>
                        <Panel tone='blue' padded={false}>
                            <div className='px-7 pb-7 pt-6'>
                                <p className='m-0 text-[14px] font-medium text-white/80'>Held for your carriers</p>
                                <Amount value={data.held.formatted} className='mt-1 block text-[44px] font-extrabold leading-none tracking-[-0.03em] text-white sm:text-[52px]' />
                                <p className='m-0 mt-2 text-[14px] text-white/80'>
                                    {data.held.count === 0
                                        ? 'Nothing waiting on you.'
                                        : `${data.held.count} payment${data.held.count === 1 ? '' : 's'} ready to release when the loads deliver.`}
                                </p>

                                <div className='mt-9'>
                                    <MoneyRoute
                                        onBlue
                                        stage={data.held.count > 0 ? 2 : data.processing.count > 0 ? 1 : 0}
                                        payerLabel='Clearing'
                                        carrierLabel='Paid this month'
                                        notes={[tally(data.processing), tally(data.held), tally(data.released_this_month)]}
                                    />
                                </div>
                            </div>
                        </Panel>

                        <Panel title='Needs you'>
                            <ul className='m-0 flex list-none flex-col gap-1 p-0'>
                                <Todo
                                    count={data.awaiting_payment.count}
                                    label={data.awaiting_payment.count === 1 ? 'payment not paid yet' : 'payments not paid yet'}
                                    to='/dt-pay/transactions?status=draft'
                                />
                                <Todo
                                    count={data.open_disputes}
                                    label={data.open_disputes === 1 ? 'open dispute' : 'open disputes'}
                                    to='/dt-pay/transactions?status=disputed'
                                    tone='#B54708'
                                />
                                <Todo
                                    count={data.held.count}
                                    label={data.held.count === 1 ? 'payment to release' : 'payments to release'}
                                    to='/dt-pay/transactions?status=held'
                                    tone='#2953E4'
                                />
                            </ul>
                            <div className='mt-5 grid grid-cols-2 gap-4 border-t border-[#F2F4F7] pt-4'>
                                <Figure label='Paid out, all time' value={data.released_total.formatted} />
                                <Figure label='Fees paid' value={data.fees_paid.formatted} />
                            </div>
                        </Panel>
                    </div>

                    <Panel
                        title='Recent payments'
                        padded={false}
                        aside={data.recent.length > 0 && <Link to='/dt-pay/transactions' className='text-[13.5px] font-semibold text-[#2953E4]'>All payments</Link>}
                    >
                        {data.recent.length === 0 ? (
                            <Empty title='No payments yet' action={<Button onClick={() => navigate('/dt-pay/new')}>Pay a carrier</Button>}>
                                Pick one of your loads, or enter one by hand. The carrier is paid when you release the money.
                            </Empty>
                        ) : (
                            <PaymentRows rows={data.recent} />
                        )}
                    </Panel>
                </>
            )}
        </Page>
    );
}

const tally = ({ count, formatted }) => (count ? `${formatted}, ${count} payment${count === 1 ? '' : 's'}` : 'None');

function Todo({ count, label, to, tone = '#101828' }) {
    return (
        <li>
            <Link
                to={to}
                className={`flex items-center justify-between gap-3 rounded-[10px] px-3 py-2.5 transition-colors ${count ? 'hover:bg-[#F9FAFB]' : 'pointer-events-none'}`}
            >
                <span className='flex items-baseline gap-2.5'>
                    <Amount value={count} className='min-w-[22px] text-[20px] font-extrabold' style={{ color: count ? tone : '#D0D5DD' }} />
                    <span className={`text-[14px] ${count ? 'text-[#344054]' : 'text-[#98A2B3]'}`}>{label}</span>
                </span>
                {count > 0 && <span className='text-[#98A2B3]' aria-hidden='true'>›</span>}
            </Link>
        </li>
    );
}

function Figure({ label, value }) {
    return (
        <div>
            <p className='m-0 text-[12.5px] text-[#667085]'>{label}</p>
            <Amount value={value} className='mt-0.5 block text-[17px] font-bold text-[#101828]' />
        </div>
    );
}

export function PaymentRows({ rows }) {
    const navigate = useNavigate();

    return (
        <div className='overflow-x-auto'>
            <table className='w-full min-w-[760px] text-left text-[14px]'>
                <thead>
                    <tr className='border-y border-[#F2F4F7] text-[12.5px] font-medium text-[#667085]'>
                        <th className='px-6 py-3 font-medium'>Carrier</th>
                        <th className='px-4 py-3 font-medium'>Load</th>
                        <th className='px-4 py-3 font-medium'>Status</th>
                        <th className='px-4 py-3 text-right font-medium'>Carrier receives</th>
                        <th className='px-6 py-3 text-right font-medium'>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((p) => (
                        <tr
                            key={p.id}
                            onClick={() => navigate(`/dt-pay/transactions/view/${p.id}`)}
                            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/dt-pay/transactions/view/${p.id}`); }}
                            tabIndex={0}
                            className='cursor-pointer border-b border-[#F2F4F7] last:border-0 hover:bg-[#F9FAFB] focus:bg-[#F5F8FF] focus:outline-none'
                        >
                            <td className='px-6 py-4'>
                                <div className='font-semibold text-[#101828]'>{p.carrier.name || `DOT ${p.carrier.dot}`}</div>
                                <div className='mt-0.5 text-[12.5px] text-[#667085]'>{p.reference}, DOT {p.carrier.dot}</div>
                            </td>
                            <td className='px-4 py-4 text-[#344054]'>
                                <div>{p.load_number || '—'}</div>
                                {(p.origin || p.destination) && <div className='mt-0.5 text-[12.5px] text-[#667085]'>{p.origin || '?'} to {p.destination || '?'}</div>}
                            </td>
                            <td className='px-4 py-4'><StatusBadge status={p.status} onHold={p.on_hold} /></td>
                            <td className='px-4 py-4 text-right'><Amount value={p.amount.formatted} className='font-semibold text-[#101828]' /></td>
                            <td className='px-6 py-4 text-right text-[#667085]'>{date(p.created_at)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
