import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dtpay } from './api';
import { date, parseAmount, usd } from './format';
import { stripeFor } from './stripe';
import { AddMethodModal } from './FundingMethods';
import { Amount, Breakdown, Button, Empty, ErrorBanner, Field, Loading, Notice, Page, Panel, inputClass } from './ui';
import { CarrierPicker, PayoutStatus } from './parts';

/*
 * /dt-pay/new — what you are paying for, then how much and with what, then
 * pay. The payment order on the right fills in as you go and holds the Pay
 * button at the end. ?pay=<id> resumes paying an unpaid payment; ?mode=manual
 * opens on entering a load by hand.
 */
export default function NewPayment() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const resumeId = params.get('pay');

    const [config, setConfig] = useState(null);
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState(params.get('mode') === 'manual' ? 'manual' : 'shipment');
    const [existing, setExisting] = useState(null);
    const [shipment, setShipment] = useState(null);
    const [manual, setManual] = useState({ carrier: null, load_number: '', origin: '', destination: '', pickup_date: '', delivery_date: '', memo: '', rate_confirmation: null });
    const [amount, setAmount] = useState('');
    const [methods, setMethods] = useState(null);
    const [methodId, setMethodId] = useState('');
    const [adding, setAdding] = useState(null);
    const [agree, setAgree] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { dtpay.config().then(setConfig).catch((e) => setError(e.message)); }, []);

    const loadMethods = useCallback((selectNewest = false) => {
        dtpay.methods().then((r) => {
            setMethods(r.methods);
            setMethodId((current) => {
                if (selectNewest && r.methods.length) return r.methods[r.methods.length - 1].id;
                if (current && r.methods.some((m) => m.id === current)) return current;
                return (r.methods.find((m) => m.type === 'us_bank_account') || r.methods[0])?.id || '';
            });
        }).catch((e) => setError(e.message));
    }, []);

    useEffect(() => { loadMethods(); }, [loadMethods]);

    useEffect(() => {
        if (!resumeId) return;
        dtpay.payment(resumeId).then(({ payment }) => {
            if (!payment.can.pay) { navigate(`/dt-pay/transactions/view/${payment.id}`, { replace: true }); return; }
            setExisting(payment);
            setAmount(String(payment.amount.cents / 100));
            setStep(2);
        }).catch((e) => setError(e.message));
    }, [resumeId, navigate]);

    const carrier = existing ? existing.carrier : mode === 'shipment' ? shipment?.carrier : manual.carrier;
    const load = useMemo(() => {
        if (existing) return { number: existing.load_number, from: existing.origin, to: existing.destination };
        if (mode === 'shipment') return shipment ? { number: shipment.pro_number || shipment.shipment_no, from: shipment.origin, to: shipment.destination } : null;
        return manual.carrier ? { number: manual.load_number, from: manual.origin, to: manual.destination } : null;
    }, [existing, mode, shipment, manual]);

    const amountValue = existing ? existing.amount.cents / 100 : parseAmount(amount);
    const method = methods?.find((m) => m.id === methodId);
    const quote = useQuote(amountValue, method?.type);

    const step1Done = !!existing || (mode === 'shipment' ? !!shipment : !!manual.carrier?.dot);
    const amountOk = !!existing || (amountValue >= (config?.limits?.min ?? 1) && amountValue <= (config?.limits?.max ?? 250000));
    const isAch = method?.type === 'us_bank_account';
    const canPay = step === 3 && !!quote && (!isAch || agree);

    const pay = async () => {
        setBusy(true);
        setError('');

        let paymentId = existing?.id;

        try {
            if (!paymentId) {
                const fields = mode === 'shipment'
                    ? { source: 'shipment', shipment_id: shipment.id, amount: amountValue }
                    : {
                        source: 'manual', amount: amountValue,
                        carrier_dot: manual.carrier.dot, carrier_name: manual.carrier.name, carrier_mc: manual.carrier.mc,
                        load_number: manual.load_number, origin: manual.origin, destination: manual.destination,
                        pickup_date: manual.pickup_date, delivery_date: manual.delivery_date, memo: manual.memo,
                        rate_confirmation: manual.rate_confirmation,
                    };

                paymentId = (await dtpay.create(fields)).payment.id;
            }

            const result = await dtpay.pay(paymentId, methodId);

            if (result.client_secret) {
                // The card asks for 3-D Secure: finish it here, then read the outcome back.
                const stripe = await stripeFor(config.publishable_key);
                const { error: err } = await stripe.handleNextAction({ clientSecret: result.client_secret });
                await dtpay.sync(paymentId);
                if (err) throw new Error(err.message);
            }

            navigate(`/dt-pay/transactions/view/${paymentId}`);
        } catch (e) {
            setBusy(false);
            setError(e.message);
            // The payment exists even when paying failed: open it, so it can be paid again.
            if (paymentId && !existing) setTimeout(() => navigate(`/dt-pay/transactions/view/${paymentId}`), 1800);
        }
    };

    return (
        <Page
            title={existing ? 'Pay' : 'Pay a'}
            accent={existing ? existing.reference : 'carrier'}
            intro='The carrier receives the full amount. Your money is held by DollarTraq until you release it.'
            back={{ to: existing ? `/dt-pay/transactions/view/${existing.id}` : '/dt-pay', label: existing ? existing.reference : 'Overview' }}
            testMode={config && !config.livemode}
        >
            <ErrorBanner>{error}</ErrorBanner>
            {config && !config.configured && <div className='mb-5'><Notice tone='warn'>DT Pay is not set up on this server yet.</Notice></div>}

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start'>
                <div className='min-w-0'>
                    <Steps step={step} existing={!!existing} onJump={(n) => setStep(n)} />

                    {step === 1 && !existing && (
                        <Panel>
                            <Segmented value={mode} onChange={setMode} options={[['shipment', 'One of my loads'], ['manual', 'Enter a load by hand']]} />
                            <div className='mt-6'>
                                {mode === 'shipment'
                                    ? <ShipmentPicker value={shipment} onChange={setShipment} />
                                    : <ManualLoad value={manual} onChange={setManual} />}
                            </div>
                            <div className='mt-7 flex justify-end'>
                                <Button onClick={() => setStep(2)} disabled={!step1Done}>Continue</Button>
                            </div>
                        </Panel>
                    )}

                    {step === 2 && (
                        <div className='flex flex-col gap-6'>
                            <Panel title='How much'>
                                <Field label='Amount the carrier receives' required>
                                    <div className='relative max-w-[320px]'>
                                        <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-semibold text-[#6b7280]'>$</span>
                                        <input
                                            className={`${inputClass} py-3 pl-9 text-[20px] font-bold`}
                                            style={{ fontFeatureSettings: '"tnum" 1' }}
                                            inputMode='decimal'
                                            value={amount}
                                            disabled={!!existing}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder='0.00'
                                            autoFocus={!existing}
                                        />
                                    </div>
                                </Field>
                            </Panel>

                            <Panel title='Pay with' subtitle='Bank transfers have no fee. Cards add a 2.9% surcharge.'>
                                {!methods && <Loading />}
                                {methods && methods.length === 0 && (
                                    <Notice tone='warn' title='No funding method yet'>Add a bank account (no fee) or a card to pay.</Notice>
                                )}
                                {methods && methods.length > 0 && (
                                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                                        {methods.map((m) => (
                                            <MethodTile key={m.id} m={m} selected={methodId === m.id} onSelect={() => { setMethodId(m.id); setAgree(false); }} />
                                        ))}
                                    </div>
                                )}
                                <div className='mt-4 flex flex-wrap gap-2'>
                                    <Button variant='secondary' size='sm' onClick={() => setAdding('us_bank_account')} disabled={!config?.configured}>Add bank account</Button>
                                    <Button variant='ghost' size='sm' onClick={() => setAdding('card')} disabled={!config?.configured}>Add card</Button>
                                </div>
                            </Panel>

                            {carrier?.dot && <PayoutStatus key={carrier.dot} dot={carrier.dot} name={carrier.name} />}

                            <div className='flex justify-between'>
                                {existing ? <span /> : <Button variant='secondary' onClick={() => setStep(1)}>Back</Button>}
                                <Button onClick={() => setStep(3)} disabled={!amountOk || !methodId}>Review</Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <Panel title='Before you pay'>
                            <ul className='m-0 flex list-none flex-col gap-3 p-0 text-[14px] leading-6 text-[#334155]'>
                                <li className='flex gap-3'><Dot />{isAch ? `Your bank is debited ${quote?.total?.formatted || ''}. It clears in 1 to 2 business days.` : `Your card is charged ${quote?.total?.formatted || ''} now.`}</li>
                                <li className='flex gap-3'><Dot />DollarTraq holds the money. The carrier is not paid until you release it.</li>
                                <li className='flex gap-3'><Dot />Until then you can put it on hold, raise a dispute, or refund it.</li>
                            </ul>

                            {isAch && (
                                <label className='mt-5 flex items-start gap-3 rounded-[12px] border border-[#e5e7eb] bg-[#F9FAFB] px-4 py-3 text-[13.5px] leading-[1.5] text-[#334155]'>
                                    <input type='checkbox' className='mt-[3px] h-[16px] w-[16px] accent-[#185FA5]' checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                                    <span>I authorise DollarTraq to debit {method.label} for {quote?.total?.formatted || 'the total'} for this payment.</span>
                                </label>
                            )}

                            <div className='mt-6'>
                                <Button variant='secondary' onClick={() => setStep(2)} disabled={busy}>Back</Button>
                            </div>
                        </Panel>
                    )}
                </div>

                <PaymentOrder
                    carrier={carrier}
                    load={load}
                    amount={amountValue}
                    method={method}
                    quote={quote}
                    step={step}
                    canPay={canPay}
                    busy={busy}
                    onPay={pay}
                />
            </div>

            {adding && config && (
                <AddMethodModal type={adding} publishableKey={config.publishable_key} onClose={() => setAdding(null)}
                    onSaved={() => { setAdding(null); loadMethods(true); }} />
            )}
        </Page>
    );
}

function Dot() {
    return <span className='mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#185FA5]' aria-hidden='true' />;
}

/* The order, filled in as you go: a payment receipt in waiting. */
function PaymentOrder({ carrier, load, amount, method, quote, step, canPay, busy, onPay }) {
    const line = (label, value, placeholder) => (
        <div className='flex items-baseline justify-between gap-4 py-2'>
            <span className='shrink-0 text-[13px] text-[#6b7280]'>{label}</span>
            <span className={`truncate text-right text-[14px] ${value ? 'font-medium text-[#1a1a1a]' : 'text-[#9ca3af]'}`}>{value || placeholder}</span>
        </div>
    );

    return (
        <aside className='lg:sticky lg:top-6'>
            <div className='overflow-hidden rounded-2xl border border-[#e8e8e8] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]'>
                <div className='h-[4px] bg-[#005EA4]' />
                <div className='px-6 pb-6 pt-5'>
                    <div className='text-[11px] font-bold uppercase tracking-[1.6px] text-[#404752]'>Payment order</div>

                    <div className='mt-3 divide-y divide-dashed divide-[#e5e7eb]'>
                        {line('Carrier', carrier?.dot ? (carrier.name || `DOT ${carrier.dot}`) : null, 'Choose a carrier')}
                        {line('DOT', carrier?.dot, '—')}
                        {line('Load', load?.number, '—')}
                        {line('Route', load && (load.from || load.to) ? `${load.from || '?'} to ${load.to || '?'}` : null, '—')}
                        {line('Pay with', method?.label, step >= 2 ? 'Choose a method' : '—')}
                    </div>

                    <div className='mt-4 rounded-xl bg-[#F9FAFB] px-4 py-4'>
                        {quote ? <Breakdown b={quote} compact /> : (
                            <div className='flex items-baseline justify-between'>
                                <span className='text-[14px] text-[#6b7280]'>Carrier receives</span>
                                <Amount value={amount > 0 ? usd(Math.round(amount * 100)) : '$0.00'} className='text-[22px] font-extrabold text-[#1a1a1a]' />
                            </div>
                        )}
                    </div>

                    {step === 3 && (
                        <Button size='lg' className='mt-5 w-full' disabled={!canPay} loading={busy} onClick={onPay}>
                            Pay {quote?.total?.formatted || ''}
                        </Button>
                    )}
                    <p className='m-0 mt-4 text-center text-[12px] text-[#9ca3af]'>Processed securely by Stripe</p>
                </div>
            </div>
        </aside>
    );
}

function Steps({ step, existing, onJump }) {
    const labels = existing ? ['How much', 'Pay'] : ['What you are paying for', 'How much', 'Pay'];
    const current = existing ? step - 1 : step;

    return (
        <ol className='m-0 mb-5 flex list-none flex-wrap items-center gap-x-2 gap-y-2 p-0'>
            {labels.map((l, i) => {
                const n = i + 1;
                const state = n < current ? 'done' : n === current ? 'now' : 'next';
                const target = existing ? n + 1 : n;

                return (
                    <li key={l} className='flex items-center gap-2'>
                        <button
                            type='button'
                            disabled={state !== 'done'}
                            onClick={() => onJump(target)}
                            className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13.5px] font-semibold ${state === 'now' ? 'bg-white text-[#1a1a1a] shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : state === 'done' ? 'text-[#185FA5] hover:bg-white' : 'text-[#9ca3af]'}`}
                        >
                            <span className={`flex h-[24px] w-[24px] items-center justify-center rounded-full text-[12px] ${state === 'next' ? 'bg-[#f1f5f9] text-[#9ca3af]' : 'bg-[#185FA5] text-white'}`}>{state === 'done' ? '✓' : n}</span>
                            {l}
                        </button>
                        {n < labels.length && <span className='h-px w-5 bg-[#dbe4ee]' aria-hidden='true' />}
                    </li>
                );
            })}
        </ol>
    );
}

function Segmented({ value, onChange, options }) {
    return (
        <div className='inline-flex rounded-[12px] bg-[#f1f5f9] p-1'>
            {options.map(([key, label]) => (
                <button
                    key={key}
                    type='button'
                    onClick={() => onChange(key)}
                    className={`rounded-[9px] px-4 py-2 text-[13.5px] font-semibold transition-colors ${value === key ? 'bg-white text-[#1a1a1a] shadow-[0_1px_2px_rgba(16,24,40,0.1)]' : 'text-[#6b7280] hover:text-[#334155]'}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

export function MethodTile({ m, selected, onSelect }) {
    const bank = m.type === 'us_bank_account';

    return (
        <button
            type='button'
            onClick={onSelect}
            className={`flex items-center gap-3.5 rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${selected ? 'border-[#185FA5] bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-white hover:border-[#dbe4ee]'}`}
        >
            <span className={`flex h-[40px] w-[52px] shrink-0 items-center justify-center rounded-[8px] text-[11px] font-extrabold tracking-[0.02em] ${bank ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#1a1a1a] text-white'}`}>
                {bank ? 'BANK' : (m.brand || 'CARD').slice(0, 4)}
            </span>
            <span className='min-w-0'>
                <span className='block truncate text-[14.5px] font-semibold text-[#1a1a1a]'>{bank ? (m.bank || 'Bank account') : `Card ending ${m.last4}`}</span>
                <span className='block text-[12.5px] text-[#6b7280]'>{bank ? `Account ending ${m.last4}, no fee` : `Expires ${m.exp || '—'}, 2.9% surcharge`}</span>
            </span>
        </button>
    );
}

function ShipmentPicker({ value, onChange }) {
    const [q, setQ] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const t = setTimeout(() => {
            dtpay.shipments({ q, per_page: 25 }).then((r) => { setError(''); setResult(r); }).catch((e) => setError(e.message));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    return (
        <div>
            <input className={`${inputClass} mb-4`} placeholder='Search by shipment #, PRO #, carrier or DOT' value={q} onChange={(e) => setQ(e.target.value)} />
            <ErrorBanner>{error}</ErrorBanner>
            {!result && !error && <Loading />}
            {result && result.data.length === 0 && (
                <Empty title='No loads to pay'>Loads appear here once a carrier is assigned, until they are paid. You can enter a load by hand instead.</Empty>
            )}
            {result && result.data.length > 0 && (
                <ul className='m-0 grid max-h-[460px] list-none grid-cols-1 gap-2 overflow-auto p-0'>
                    {result.data.map((s) => {
                        const selected = value?.id === s.id;

                        return (
                            <li key={s.id}>
                                <button
                                    type='button'
                                    onClick={() => onChange(s)}
                                    className={`flex w-full items-center justify-between gap-4 rounded-xl border-2 px-4 py-3.5 text-left transition-colors ${selected ? 'border-[#185FA5] bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-white hover:border-[#dbe4ee]'}`}
                                >
                                    <div className='min-w-0'>
                                        <p className='m-0 text-[14.5px] font-semibold text-[#1a1a1a]'>{s.origin || '?'} to {s.destination || '?'}</p>
                                        <p className='m-0 mt-0.5 text-[13px] text-[#475569]'>{s.carrier.name || 'Carrier'}, DOT {s.carrier.dot}</p>
                                        <p className='m-0 mt-0.5 text-[12.5px] text-[#9ca3af]'>{s.shipment_no}{s.pro_number ? `, PRO ${s.pro_number}` : ''}{s.delivery_date ? `, delivers ${date(s.delivery_date)}` : ''}</p>
                                    </div>
                                    <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-[#185FA5] bg-[#185FA5] text-white' : 'border-[#dbe4ee]'}`}>
                                        {selected && <span className='text-[12px] leading-none'>✓</span>}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function ManualLoad({ value, onChange }) {
    const set = (k) => (e) => onChange({ ...value, [k]: e.target.type === 'file' ? e.target.files?.[0] || null : e.target.value });

    return (
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
            <div className='sm:col-span-2'>
                <CarrierPicker value={value.carrier} onChange={(carrier) => onChange({ ...value, carrier })} search={dtpay.carriers} />
            </div>
            <Field label='Load or reference number'><input className={inputClass} value={value.load_number} onChange={set('load_number')} placeholder='LD-5521' /></Field>
            <Field label='Rate confirmation' hint='PDF, image or Word document, up to 10 MB'>
                <input type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' className={`${inputClass} py-2 file:mr-3 file:rounded-[8px] file:border-0 file:bg-[#f1f5f9] file:px-3 file:py-1 file:text-[13px] file:font-semibold file:text-[#334155]`} onChange={set('rate_confirmation')} />
            </Field>
            <Field label='Picked up in'><input className={inputClass} value={value.origin} onChange={set('origin')} placeholder='Dallas, TX' /></Field>
            <Field label='Delivered to'><input className={inputClass} value={value.destination} onChange={set('destination')} placeholder='Memphis, TN' /></Field>
            <Field label='Pickup date'><input type='date' className={inputClass} value={value.pickup_date} onChange={set('pickup_date')} /></Field>
            <Field label='Delivery date'><input type='date' className={inputClass} value={value.delivery_date} onChange={set('delivery_date')} /></Field>
            <div className='sm:col-span-2'>
                <Field label='Note for your records'><textarea rows={2} className={inputClass} value={value.memo} onChange={set('memo')} /></Field>
            </div>
        </div>
    );
}

function useQuote(amount, methodType) {
    const [quote, setQuote] = useState(null);
    const usable = !!methodType && amount > 0;
    const key = `${amount}|${methodType}`;

    useEffect(() => {
        if (!usable) return undefined;

        const t = setTimeout(() => {
            dtpay.quote(amount, methodType).then((q) => setQuote({ ...q, key })).catch(() => setQuote(null));
        }, 250);

        return () => clearTimeout(t);
    }, [amount, methodType, usable, key]);

    return usable && quote?.key === key ? quote : null;
}
