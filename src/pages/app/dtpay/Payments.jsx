import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dtpay } from './api';
import { STATUS_FILTERS } from './format';
import { Button, Empty, ErrorBanner, Loading, Page, Panel, inputClass } from './ui';
import { PaymentRows } from './Dashboard';

/* /dt-pay/transactions — every payment, filtered and searched. */
export default function Payments() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const status = params.get('status') || '';
    const q = params.get('q') || '';
    const from = params.get('from') || '';
    const to = params.get('to') || '';
    const page = Number(params.get('page') || 1);

    const [search, setSearch] = useState(q);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [testMode, setTestMode] = useState(false);

    useEffect(() => { dtpay.config().then((c) => setTestMode(!c.livemode)).catch(() => null); }, []);

    const set = (patch) => {
        const next = new URLSearchParams(params);
        Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        if (!('page' in patch)) next.delete('page');
        setParams(next);
    };

    const queryKey = [status, q, from, to, page].join('|');

    const load = useCallback(() => {
        dtpay.payments({ status, q, from, to, page, per_page: 20 })
            .then((r) => { setError(''); setResult({ ...r, key: [status, q, from, to, page].join('|') }); })
            .catch((e) => setError(e.message));
    }, [status, q, from, to, page]);

    const current = result?.key === queryKey ? result : null;

    useEffect(load, [load]);

    useEffect(() => {
        const t = setTimeout(() => { if (search !== q) set({ q: search }); }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <Page
            title='Payments'
            intro='Every payment your company has made through DT Pay.'
            back={{ to: '/dt-pay', label: 'DT Pay' }}
            testMode={testMode}
            actions={<Button onClick={() => navigate('/dt-pay/new')}>Pay a carrier</Button>}
        >
            <ErrorBanner onRetry={load}>{error}</ErrorBanner>

            <Panel padded={false}>
                <div className='flex flex-col gap-4 px-6 py-5'>
                    <div className='-mx-1 flex gap-1 overflow-x-auto pb-1'>
                        {STATUS_FILTERS.map((f) => (
                            <button
                                key={f.key || 'all'}
                                type='button'
                                onClick={() => set({ status: f.key })}
                                aria-pressed={status === f.key}
                                className={`shrink-0 rounded-[9px] px-3 py-1.5 text-[13.5px] font-semibold transition-colors ${status === f.key ? 'bg-[#EEF2FF] text-[#2953E4]' : 'text-[#667085] hover:bg-[#F9FAFB] hover:text-[#344054]'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_160px]'>
                        <input className={inputClass} placeholder='Search reference, load, carrier or DOT' value={search} onChange={(e) => setSearch(e.target.value)} aria-label='Search payments' />
                        <input type='date' className={inputClass} value={from} onChange={(e) => set({ from: e.target.value })} aria-label='Created from' />
                        <input type='date' className={inputClass} value={to} onChange={(e) => set({ to: e.target.value })} aria-label='Created to' />
                    </div>
                </div>

                {!current && !error && <Loading />}
                {current && current.data.length === 0 && (
                    <Empty title='No payments match'>Try another status or search.</Empty>
                )}
                {current && current.data.length > 0 && <PaymentRows rows={current.data} />}
            </Panel>

            {result && result.meta.last_page > 1 && (
                <div className='mt-4 flex items-center justify-between gap-3 text-[13px] text-[#475467]'>
                    <span>Page {result.meta.current_page} of {result.meta.last_page}, {result.meta.total} payments</span>
                    <div className='flex gap-2'>
                        <Button variant='secondary' size='sm' disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</Button>
                        <Button variant='secondary' size='sm' disabled={page >= result.meta.last_page} onClick={() => set({ page: String(page + 1) })}>Next</Button>
                    </div>
                </div>
            )}
        </Page>
    );
}
