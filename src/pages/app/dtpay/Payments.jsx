import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dtpay } from './api';
import { STATUS_FILTERS } from './format';
import { Button, Card, Empty, ErrorBanner, Loading, Page, inputClass } from './ui';
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
            subtitle='Every DT Pay payment your company has made.'
            back={{ to: '/dt-pay', label: 'DT Pay' }}
            testMode={testMode}
            actions={<Button onClick={() => navigate('/dt-pay/new')}>New payment</Button>}
        >
            <div className='mb-4 flex flex-wrap gap-2'>
                {STATUS_FILTERS.map((f) => (
                    <button
                        key={f.key || 'all'}
                        onClick={() => set({ status: f.key })}
                        className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${status === f.key ? 'border-[#175CD3] bg-[#175CD3] text-white' : 'border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px_170px]'>
                <input className={inputClass} placeholder='Search reference, load #, carrier or DOT' value={search} onChange={(e) => setSearch(e.target.value)} />
                <input type='date' className={inputClass} value={from} onChange={(e) => set({ from: e.target.value })} aria-label='From date' />
                <input type='date' className={inputClass} value={to} onChange={(e) => set({ to: e.target.value })} aria-label='To date' />
            </div>

            <ErrorBanner onRetry={load}>{error}</ErrorBanner>

            <Card padded={false}>
                {!current && !error && <Loading />}
                {current && current.data.length === 0 && (
                    <Empty title='No payments match'>Try another status or search.</Empty>
                )}
                {current && current.data.length > 0 && <PaymentRows rows={current.data} />}
            </Card>

            {result && result.meta.last_page > 1 && (
                <div className='mt-4 flex items-center justify-between text-[13px] text-[#475467]'>
                    <span>Page {result.meta.current_page} of {result.meta.last_page} · {result.meta.total} payments</span>
                    <div className='flex gap-2'>
                        <Button variant='secondary' disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</Button>
                        <Button variant='secondary' disabled={page >= result.meta.last_page} onClick={() => set({ page: String(page + 1) })}>Next</Button>
                    </div>
                </div>
            )}
        </Page>
    );
}
