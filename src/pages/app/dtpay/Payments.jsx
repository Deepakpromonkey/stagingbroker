import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dtpay } from './api';
import { STATUS_FILTERS } from './format';
import { Button, Empty, ErrorBanner, Page, Tabs, inputClass } from './ui';
import PaymentsTable from './PaymentsTable';

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
            title='DT Pay'
            accent='Payments'
            intro='Every payment your company has made through DT Pay.'
            back={{ to: '/dt-pay', label: 'Overview' }}
            testMode={testMode}
            actions={<Button onClick={() => navigate('/dt-pay/new')}>Pay a carrier</Button>}
        >
            <ErrorBanner onRetry={load}>{error}</ErrorBanner>

            <div className='mb-4'>
                <Tabs items={STATUS_FILTERS} value={status} onChange={(key) => set({ status: key })} counts={result?.counts} />
            </div>

            <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px_170px]'>
                <input className={inputClass} placeholder='Search reference, load, carrier or DOT' value={search} onChange={(e) => setSearch(e.target.value)} aria-label='Search payments' />
                <input type='date' className={inputClass} value={from} onChange={(e) => set({ from: e.target.value })} aria-label='Created from' />
                <input type='date' className={inputClass} value={to} onChange={(e) => set({ to: e.target.value })} aria-label='Created to' />
            </div>

            <PaymentsTable
                rows={current?.data}
                loading={!current && !error}
                empty={<Empty title='No payments match'>Try another status or search.</Empty>}
            />

            {result && (
                <div className='mt-4 flex items-center justify-between gap-3 text-xs text-[#6b7280]'>
                    <span>{result.meta.total} payment{result.meta.total === 1 ? '' : 's'}{result.meta.last_page > 1 ? `, page ${result.meta.current_page} of ${result.meta.last_page}` : ''}</span>
                    {result.meta.last_page > 1 && (
                        <div className='flex gap-2'>
                            <Button variant='secondary' size='sm' disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>Previous</Button>
                            <Button variant='secondary' size='sm' disabled={page >= result.meta.last_page} onClick={() => set({ page: String(page + 1) })}>Next</Button>
                        </div>
                    )}
                </div>
            )}
        </Page>
    );
}
