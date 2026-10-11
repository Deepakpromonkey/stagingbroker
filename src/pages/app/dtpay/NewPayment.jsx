import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dtpay } from './api';
import { date, parseAmount, usd } from './format';
import { stripeFor } from './stripe';
import { AddMethodModal } from './FundingMethods';
import { Breakdown, Button, Card, Empty, ErrorBanner, Field, Loading, Notice, Page, inputClass } from './ui';
import { CarrierPicker, PayoutStatus } from './parts';

/*
 * /dt-pay/new — three steps: what is being paid for, how much and with
 * what, then review and pay. ?pay=<id> resumes paying an unpaid payment;
 * ?mode=manual opens straight on manual entry.
 */
export default function NewPayment() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const resumeId = params.get('pay');

    const [config, setConfig] = useState(null);
    const [step, setStep] = useState(1);
    const [mode, setMode] = useState(params.get('mode') === 'manual' ? 'manual' : 'shipment');
    const [existing, setExisting] = useState(null);     // a resumed payment
    const [shipment, setShipment] = useState(null);
    const [manual, setManual] = useState({ carrier: null, load_number: '', origin: '', destination: '', pickup_date: '', delivery_date: '', memo: '', rate_confirmation: null });
    const [amount, setAmount] = useState('');
    const [methodId, setMethodId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => { dtpay.config().then(setConfig).catch((e) => setError(e.message)); }, []);

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

    const step1Done = existing || (mode === 'shipment' ? !!shipment : !!manual.carrier?.dot);
    const amountValue = parseAmount(amount);
    const amountOk = existing || (amountValue >= (config?.limits?.min ?? 1) && amountValue <= (config?.limits?.max ?? 250000));

    return (
        <Page
            title={existing ? `Pay ${existing.reference}` : 'New payment'}
            subtitle='The carrier receives the full load amount. Your money is held until you release it.'
            back={{ to: existing ? `/dt-pay/transactions/view/${existing.id}` : '/dt-pay', label: existing ? existing.reference : 'DT Pay' }}
            testMode={config && !config.livemode}
        >
            <Steps step={step} />
            <ErrorBanner>{error}</ErrorBanner>
            {config && !config.configured && <div className='mb-4'><Notice tone='warn'>DT Pay is not configured on this server yet.</Notice></div>}

            {step === 1 && !existing && (
                <StepWhat
                    mode={mode} setMode={setMode}
                    shipment={shipment} setShipment={setShipment}
                    manual={manual} setManual={setManual}
                    onNext={() => setStep(2)} canNext={step1Done}
                />
            )}

            {step === 2 && (
                <StepAmount
                    config={config}
                    carrier={carrier}
                    amount={amount} setAmount={setAmount} locked={!!existing}
                    methodId={methodId} setMethodId={setMethodId}
                    onBack={existing ? null : () => setStep(1)}
                    onNext={() => setStep(3)}
                    canNext={amountOk && !!methodId}
                />
            )}

            {step === 3 && (
                <StepReview
                    config={config}
                    existing={existing}
                    mode={mode} shipment={shipment} manual={manual}
                    carrier={carrier}
                    amount={existing ? existing.amount.cents / 100 : amountValue}
                    methodId={methodId}
                    onBack={() => setStep(2)}
                    onDone={(id) => navigate(`/dt-pay/transactions/view/${id}`)}
                />
            )}
        </Page>
    );
}

function Steps({ step }) {
    const labels = ['What you are paying for', 'Amount & funding', 'Review & pay'];

    return (
        <ol className='mb-6 flex flex-wrap items-center gap-2 p-0'>
            {labels.map((l, i) => {
                const n = i + 1;
                const state = n < step ? 'done' : n === step ? 'now' : 'next';

                return (
                    <li key={l} className='flex items-center gap-2'>
                        <span className={`flex h-[24px] w-[24px] items-center justify-center rounded-full text-[12px] font-bold ${state === 'next' ? 'bg-[#F2F4F7] text-[#98A2B3]' : 'bg-[#175CD3] text-white'}`}>
                            {state === 'done' ? '✓' : n}
                        </span>
                        <span className={`text-[13px] font-semibold ${state === 'next' ? 'text-[#98A2B3]' : 'text-[#101828]'}`}>{l}</span>
                        {n < labels.length && <span className='mx-1 h-px w-6 bg-[#EAECF0]' />}
                    </li>
                );
            })}
        </ol>
    );
}

/* ---------------------------------------------------------------- step 1 */

function StepWhat({ mode, setMode, shipment, setShipment, manual, setManual, onNext, canNext }) {
    return (
        <Card>
            <div className='mb-5 inline-flex rounded-[10px] border border-[#EAECF0] bg-[#F9FAFB] p-1'>
                {[['shipment', 'From my loads'], ['manual', 'Enter manually']].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setMode(key)}
                        className={`rounded-[8px] px-4 py-1.5 text-[13px] font-semibold ${mode === key ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085]'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {mode === 'shipment'
                ? <ShipmentPicker value={shipment} onChange={setShipment} />
                : <ManualLoad value={manual} onChange={setManual} />}

            <div className='mt-6 flex justify-end'>
                <Button onClick={onNext} disabled={!canNext}>Continue</Button>
            </div>
        </Card>
    );
}

function ShipmentPicker({ value, onChange }) {
    const [q, setQ] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const t = setTimeout(() => {
            setError('');
            dtpay.shipments({ q, per_page: 25 }).then(setResult).catch((e) => setError(e.message));
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    return (
        <div>
            <input className={`${inputClass} mb-3`} placeholder='Search shipment #, PRO #, carrier or DOT' value={q} onChange={(e) => setQ(e.target.value)} />
            <ErrorBanner>{error}</ErrorBanner>
            {!result && !error && <Loading />}
            {result && result.data.length === 0 && (
                <Empty title='No loads to pay'>Only loads with a carrier assigned that have not been paid yet appear here. You can enter a load manually instead.</Empty>
            )}
            {result && result.data.length > 0 && (
                <ul className='m-0 max-h-[420px] list-none overflow-auto rounded-[10px] border border-[#EAECF0] p-0'>
                    {result.data.map((s) => {
                        const selected = value?.id === s.id;

                        return (
                            <li key={s.id}>
                                <button
                                    onClick={() => onChange(s)}
                                    className={`flex w-full items-center justify-between gap-3 border-b border-[#F2F4F7] px-4 py-3 text-left last:border-0 ${selected ? 'bg-[#EFF8FF]' : 'hover:bg-[#F9FAFB]'}`}
                                >
                                    <div className='min-w-0'>
                                        <p className='m-0 text-[14px] font-semibold text-[#101828]'>{s.shipment_no}{s.pro_number ? ` · PRO ${s.pro_number}` : ''}</p>
                                        <p className='m-0 text-[12.5px] text-[#667085]'>{s.carrier.name || 'Carrier'} · DOT {s.carrier.dot}</p>
                                        <p className='m-0 text-[12px] text-[#98A2B3]'>{s.origin || '?'} → {s.destination || '?'}{s.delivery_date ? ` · delivery ${date(s.delivery_date)}` : ''}</p>
                                    </div>
                                    <span className={`h-[18px] w-[18px] shrink-0 rounded-full border-2 ${selected ? 'border-[#175CD3] bg-[#175CD3]' : 'border-[#D0D5DD]'}`} />
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
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='sm:col-span-2'>
                <CarrierPicker value={value.carrier} onChange={(carrier) => onChange({ ...value, carrier })} search={dtpay.carriers} />
            </div>
            <Field label='Load / reference #'><input className={inputClass} value={value.load_number} onChange={set('load_number')} placeholder='e.g. LD-5521' /></Field>
            <Field label='Rate confirmation' hint='PDF, image or Word, up to 10 MB'>
                <input type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' className={inputClass} onChange={set('rate_confirmation')} />
            </Field>
            <Field label='Origin'><input className={inputClass} value={value.origin} onChange={set('origin')} placeholder='City, ST' /></Field>
            <Field label='Destination'><input className={inputClass} value={value.destination} onChange={set('destination')} placeholder='City, ST' /></Field>
            <Field label='Pickup date'><input type='date' className={inputClass} value={value.pickup_date} onChange={set('pickup_date')} /></Field>
            <Field label='Delivery date'><input type='date' className={inputClass} value={value.delivery_date} onChange={set('delivery_date')} /></Field>
            <div className='sm:col-span-2'>
                <Field label='Note'><textarea rows={2} className={inputClass} value={value.memo} onChange={set('memo')} placeholder='Optional' /></Field>
            </div>
        </div>
    );
}

/* ---------------------------------------------------------------- step 2 */

function StepAmount({ config, carrier, amount, setAmount, locked, methodId, setMethodId, onBack, onNext, canNext }) {
    const [methods, setMethods] = useState(null);
    const [adding, setAdding] = useState(null);
    const [error, setError] = useState('');

    const loadMethods = useCallback(() => {
        dtpay.methods().then((r) => {
            setMethods(r.methods);
            if (!methodId && r.methods.length) setMethodId((r.methods.find((m) => m.type === 'us_bank_account') || r.methods[0]).id);
        }).catch((e) => setError(e.message));
    }, [methodId, setMethodId]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(loadMethods, []);

    const method = methods?.find((m) => m.id === methodId);
    const quote = useQuote(parseAmount(amount), method?.type);

    return (
        <div className='grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]'>
            <Card title='Amount & funding'>
                <Field label='Load amount (what the carrier receives)' required>
                    <div className='relative'>
                        <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#667085]'>$</span>
                        <input className={`${inputClass} pl-7`} inputMode='decimal' value={amount} disabled={locked} onChange={(e) => setAmount(e.target.value)} placeholder='0.00' />
                    </div>
                </Field>

                <div className='mt-5'>
                    <p className='mb-2 text-[12.5px] font-semibold text-[#344054]'>Pay with</p>
                    <ErrorBanner>{error}</ErrorBanner>
                    {!methods && !error && <Loading />}
                    {methods && methods.length === 0 && (
                        <Notice tone='warn'>No funding method yet. Add a bank account (no fee) or a card (2.9% surcharge).</Notice>
                    )}
                    {methods && methods.length > 0 && (
                        <div className='flex flex-col gap-2'>
                            {methods.map((m) => (
                                <label key={m.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border px-4 py-3 ${methodId === m.id ? 'border-[#175CD3] bg-[#EFF8FF]' : 'border-[#EAECF0] hover:bg-[#F9FAFB]'}`}>
                                    <span className='flex items-center gap-3'>
                                        <input type='radio' name='method' checked={methodId === m.id} onChange={() => setMethodId(m.id)} />
                                        <span>
                                            <span className='block text-[14px] font-semibold text-[#101828]'>{m.label}</span>
                                            <span className='block text-[12px] text-[#667085]'>{m.type === 'card' ? 'Card · 2.9% surcharge · funds at once' : 'Bank (ACH) · no fee · 1–2 business days'}</span>
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}
                    <div className='mt-3 flex gap-2'>
                        <Button variant='secondary' onClick={() => setAdding('us_bank_account')} disabled={!config?.configured}>Add bank account</Button>
                        <Button variant='ghost' onClick={() => setAdding('card')} disabled={!config?.configured}>Add card</Button>
                    </div>
                </div>

                <div className='mt-6 flex justify-between'>
                    {onBack ? <Button variant='secondary' onClick={onBack}>Back</Button> : <span />}
                    <Button onClick={onNext} disabled={!canNext}>Review</Button>
                </div>
            </Card>

            <div className='flex flex-col gap-5'>
                <Card title='Cost'>
                    {quote ? <Breakdown b={quote} /> : <p className='m-0 text-[13px] text-[#667085]'>Enter an amount and choose how to pay.</p>}
                </Card>
                {carrier?.dot && <PayoutStatus key={carrier.dot} dot={carrier.dot} name={carrier.name} />}
            </div>

            {adding && config && (
                <AddMethodModal type={adding} publishableKey={config.publishable_key} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); setMethods(null); loadMethods(); }} />
            )}
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

    // A quote for other inputs is not shown.
    return usable && quote?.key === key ? quote : null;
}

/* ---------------------------------------------------------------- step 3 */

function StepReview({ config, existing, mode, shipment, manual, carrier, amount, methodId, onBack, onDone }) {
    const [methods, setMethods] = useState(null);
    const [agree, setAgree] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { dtpay.methods().then((r) => setMethods(r.methods)).catch((e) => setError(e.message)); }, []);

    const method = methods?.find((m) => m.id === methodId);
    const quote = useQuote(amount, method?.type);
    const isAch = method?.type === 'us_bank_account';

    const details = useMemo(() => {
        if (existing) return { load: existing.load_number, route: [existing.origin, existing.destination] };
        if (mode === 'shipment') return { load: shipment?.pro_number || shipment?.shipment_no, route: [shipment?.origin, shipment?.destination] };
        return { load: manual.load_number, route: [manual.origin, manual.destination] };
    }, [existing, mode, shipment, manual]);

    const submit = async () => {
        setBusy(true);
        setError('');

        let paymentId = existing?.id;

        try {
            if (!paymentId) {
                const fields = mode === 'shipment'
                    ? { source: 'shipment', shipment_id: shipment.id, amount }
                    : {
                        source: 'manual', amount,
                        carrier_dot: manual.carrier.dot, carrier_name: manual.carrier.name, carrier_mc: manual.carrier.mc,
                        load_number: manual.load_number, origin: manual.origin, destination: manual.destination,
                        pickup_date: manual.pickup_date, delivery_date: manual.delivery_date, memo: manual.memo,
                        rate_confirmation: manual.rate_confirmation,
                    };

                paymentId = (await dtpay.create(fields)).payment.id;
            }

            const result = await dtpay.pay(paymentId, methodId);

            if (result.client_secret) {
                // Card asks for 3-D Secure: finish it in the browser, then read the outcome back.
                const stripe = await stripeFor(config.publishable_key);
                const { error: err } = await stripe.handleNextAction({ clientSecret: result.client_secret });
                await dtpay.sync(paymentId);
                if (err) throw new Error(err.message);
            }

            onDone(paymentId);
        } catch (e) {
            setBusy(false);
            setError(e.message);

            // The payment exists even when paying failed: show it, so it can be retried.
            if (paymentId && !existing) setTimeout(() => onDone(paymentId), 1800);
        }
    };

    return (
        <div className='grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]'>
            <Card title='Review'>
                <dl className='m-0 grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <Item k='Carrier' v={`${carrier?.name || '—'} · DOT ${carrier?.dot}`} />
                    <Item k='Load' v={details.load || '—'} />
                    <Item k='Route' v={details.route.some(Boolean) ? `${details.route[0] || '?'} → ${details.route[1] || '?'}` : '—'} />
                    <Item k='Pay with' v={method?.label || '—'} />
                    <Item k='Carrier receives' v={usd(Math.round(amount * 100))} />
                    <Item k='When' v={isAch ? 'Debit clears in 1–2 business days, then held' : 'Charged now, then held'} />
                </dl>

                <div className='mt-5'>
                    <Notice tone='info'>
                        The money is held by DollarTraq and paid to the carrier only when you release it — after delivery and POD. Until then you can hold it, dispute it, or refund it.
                    </Notice>
                </div>

                {isAch && (
                    <label className='mt-4 flex items-start gap-2 text-[13px] text-[#344054]'>
                        <input type='checkbox' className='mt-1' checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                        <span>I authorise DollarTraq to debit {method.label} for {quote?.total?.formatted || 'the total shown'} for this payment.</span>
                    </label>
                )}

                <ErrorBanner>{error}</ErrorBanner>

                <div className='mt-6 flex justify-between'>
                    <Button variant='secondary' onClick={onBack} disabled={busy}>Back</Button>
                    <Button onClick={submit} loading={busy} disabled={!quote || (isAch && !agree)}>
                        Pay {quote?.total?.formatted || ''}
                    </Button>
                </div>
            </Card>

            <Card title='Cost'>{quote ? <Breakdown b={quote} /> : <Loading />}</Card>
        </div>
    );
}

function Item({ k, v }) {
    return (
        <div>
            <dt className='text-[12px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]'>{k}</dt>
            <dd className='m-0 mt-0.5 text-[14px] text-[#101828]'>{v}</dd>
        </div>
    );
}
