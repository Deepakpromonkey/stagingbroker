import { useEffect, useState } from 'react';
import { dtpay } from './api';
import { Button, Card, Field, Notice, Spinner, inputClass } from './ui';

/*
 * Pick the carrier being paid: search the carrier directory by DOT or the
 * start of the legal name, or type the details in when it is not listed.
 * `search` is the API call (broker or guest).
 */
export function CarrierPicker({ value, onChange, search }) {
    const [q, setQ] = useState('');
    const [found, setFound] = useState({ q: '', data: [] });
    const [manual, setManual] = useState(false);
    const term = q.trim();
    const searching = !manual && term.length >= 2;

    useEffect(() => {
        if (!searching) return undefined;

        const t = setTimeout(() => {
            search(term).then((r) => setFound({ q: term, data: r.data || [] })).catch(() => setFound({ q: term, data: [] }));
        }, 300);

        return () => clearTimeout(t);
    }, [term, searching, search]);

    const results = searching && found.q === term ? found.data : [];
    const loading = searching && found.q !== term;

    if (value?.dot && !manual) {
        return (
            <Field label='Carrier' required>
                <div className='flex items-center justify-between gap-3 rounded-[10px] border border-[#B2DDFF] bg-[#EFF8FF] px-4 py-3'>
                    <div>
                        <p className='m-0 text-[14px] font-semibold text-[#101828]'>{value.name || 'Carrier'}</p>
                        <p className='m-0 text-[12.5px] text-[#475467]'>DOT {value.dot}{value.mc ? ` · MC ${value.mc}` : ''}{value.location ? ` · ${value.location}` : ''}</p>
                    </div>
                    <Button variant='ghost' onClick={() => { onChange(null); setQ(''); }}>Change</Button>
                </div>
            </Field>
        );
    }

    if (manual) {
        const v = value || { dot: '', name: '', mc: '' };
        const set = (k) => (e) => onChange({ ...v, [k]: k === 'dot' ? e.target.value.replace(/\D/g, '') : e.target.value });

        return (
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                <Field label='Carrier DOT #' required><input className={inputClass} value={v.dot} onChange={set('dot')} inputMode='numeric' /></Field>
                <Field label='Carrier name'><input className={inputClass} value={v.name} onChange={set('name')} /></Field>
                <Field label='MC #'><input className={inputClass} value={v.mc} onChange={set('mc')} /></Field>
                <button type='button' className='text-left text-[12.5px] font-semibold text-[#175CD3] sm:col-span-3' onClick={() => { setManual(false); onChange(null); }}>
                    ← Search the carrier directory instead
                </button>
            </div>
        );
    }

    return (
        <Field label='Carrier' required hint='Search by DOT number or the start of the company name.'>
            <div className='relative'>
                <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder='e.g. 3577340 or Powell Distributing' />
                {loading && <span className='absolute right-3 top-1/2 -translate-y-1/2'><Spinner small /></span>}
            </div>
            {results.length > 0 && (
                <ul className='m-0 mt-2 max-h-[260px] list-none overflow-auto rounded-[10px] border border-[#EAECF0] p-0'>
                    {results.map((c) => (
                        <li key={c.dot}>
                            <button type='button' onClick={() => onChange(c)} className='w-full border-b border-[#F2F4F7] px-4 py-2.5 text-left last:border-0 hover:bg-[#F9FAFB]'>
                                <span className='block text-[13.5px] font-semibold text-[#101828]'>{c.name}{c.dba ? ` (${c.dba})` : ''}</span>
                                <span className='block text-[12px] text-[#667085]'>DOT {c.dot}{c.mc ? ` · MC ${c.mc}` : ''}{c.location ? ` · ${c.location}` : ''}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {searching && !loading && results.length === 0 && (
                <p className='m-0 mt-2 text-[12.5px] text-[#667085]'>No carrier found.</p>
            )}
            <button type='button' className='mt-2 text-[12.5px] font-semibold text-[#175CD3]' onClick={() => { setManual(true); onChange({ dot: /^\d+$/.test(q.trim()) ? q.trim() : '', name: /^\d+$/.test(q.trim()) ? '' : q.trim(), mc: '' }); }}>
                Not listed? Enter the carrier manually
            </button>
        </Field>
    );
}

/*
 * Can the carrier be paid out yet? If not, create the Stripe-hosted setup
 * link for the broker to send them.
 */
export function PayoutStatus({ dot, name, compact = false }) {
    const [state, setState] = useState(null);
    const [link, setLink] = useState('');
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const load = () => dtpay.carrierPayout(dot).then(setState).catch((e) => setError(e.message));

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, []);

    const makeLink = async () => {
        setBusy(true);
        setError('');
        try {
            setLink((await dtpay.carrierPayoutLink(dot, { email: email || undefined, name })).url);
            load();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    const copy = async () => {
        try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
    };

    const body = (
        <>
            {!state && !error && <p className='m-0 flex items-center gap-2 text-[13px] text-[#667085]'><Spinner small /> Checking the carrier…</p>}
            {error && <p className='m-0 text-[13px] text-[#B42318]'>{error}</p>}
            {state?.ready && <Notice tone='success'>{name || 'The carrier'} can receive payouts. Release sends the money straight to their bank.</Notice>}
            {state && !state.ready && (
                <div>
                    <Notice tone='warn'>
                        {state.started ? 'The carrier started payout setup but has not finished it.' : 'The carrier has not set up payouts with DollarTraq yet.'}
                        {' '}You can fund now; release needs their setup finished.
                    </Notice>
                    {!link ? (
                        <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                            <input className={inputClass} type='email' placeholder='Carrier email (optional)' value={email} onChange={(e) => setEmail(e.target.value)} />
                            <Button variant='secondary' loading={busy} onClick={makeLink} className='shrink-0'>Get setup link</Button>
                        </div>
                    ) : (
                        <div className='mt-3'>
                            <p className='m-0 mb-1 text-[12.5px] text-[#475467]'>Send this link to the carrier. It opens Stripe's secure payout setup.</p>
                            <div className='flex gap-2'>
                                <input readOnly className={inputClass} value={link} onFocus={(e) => e.target.select()} />
                                <Button variant='secondary' onClick={copy} className='shrink-0'>{copied ? 'Copied' : 'Copy'}</Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return compact ? body : <Card title='Carrier payouts'>{body}</Card>;
}
