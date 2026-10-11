import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { guestPay } from '../api';
import { parseAmount } from '../format';
import { stripeFor } from '../stripe';
import { CarrierPicker } from '../parts';
import { Breakdown, Button, ErrorBanner, Field, Loading, Panel, inputClass } from '../ui';
import GuestShell from './GuestShell';

/*
 * /guest-pay            carrier -> load -> you  (creates the payment)
 * /guest-pay/pay/:token pay through Stripe's Payment Element
 */
export default function GuestPay() {
    const { token } = useParams();
    const [config, setConfig] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => { guestPay.config().then(setConfig).catch((e) => setError(e.message)); }, []);

    return (
        <GuestShell
            title={token ? 'Pay the carrier' : 'Pay a carrier'}
            subtitle='No account needed. DollarTraq holds your money until the load is delivered and you release it to the carrier.'
            testMode={config && !config.livemode}
        >
            <ErrorBanner>{error}</ErrorBanner>
            {!config && !error && <Loading />}
            {config && !config.configured && <ErrorBanner>Guest Pay is not available right now. Try again later.</ErrorBanner>}
            {config?.configured && (token ? <PayStep token={token} config={config} /> : <Details config={config} />)}
        </GuestShell>
    );
}

function Details({ config }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [carrier, setCarrier] = useState(null);
    const [load, setLoad] = useState({ amount: '', load_number: '', origin: '', destination: '', pickup_date: '', delivery_date: '', memo: '', rate_confirmation: null });
    const [you, setYou] = useState({ payer_name: '', payer_company: '', payer_email: '', payer_phone: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const amount = parseAmount(load.amount);
    const amountOk = amount >= config.limits.min && amount <= config.limits.max;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(you.payer_email);

    const setL = (k) => (e) => setLoad({ ...load, [k]: e.target.type === 'file' ? e.target.files?.[0] || null : e.target.value });
    const setY = (k) => (e) => setYou({ ...you, [k]: e.target.value });

    const create = async () => {
        setBusy(true);
        setError('');
        try {
            const r = await guestPay.create({
                carrier_dot: carrier.dot, carrier_name: carrier.name, carrier_mc: carrier.mc,
                ...load, amount, ...you,
            });
            navigate(`/guest-pay/pay/${r.token}`);
        } catch (e) {
            setError(e.message);
            setBusy(false);
        }
    };

    const tabs = ['Carrier', 'Load', 'You', 'Pay'];

    return (
        <>
            <ol className='m-0 mb-5 flex list-none flex-wrap items-center gap-x-2 gap-y-2 p-0'>
                {tabs.map((t, i) => {
                    const n = i + 1;
                    const state = n < step ? 'done' : n === step ? 'now' : 'next';

                    return (
                        <li key={t} className='flex items-center gap-2'>
                            <span className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[13.5px] font-semibold ${state === 'now' ? 'bg-white text-[#1a1a1a] shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : state === 'done' ? 'text-[#185FA5]' : 'text-[#9ca3af]'}`}>
                                <span className={`flex h-[24px] w-[24px] items-center justify-center rounded-full text-[12px] ${state === 'next' ? 'bg-[#f1f5f9] text-[#9ca3af]' : 'bg-[#185FA5] text-white'}`}>{state === 'done' ? '✓' : n}</span>
                                {t}
                            </span>
                            {n < tabs.length && <span className='h-px w-4 bg-[#dbe4ee]' aria-hidden='true' />}
                        </li>
                    );
                })}
            </ol>

            <Panel>
                <ErrorBanner>{error}</ErrorBanner>

                {step === 1 && (
                    <>
                        <CarrierPicker value={carrier} onChange={setCarrier} search={guestPay.carriers} />
                        <div className='mt-6 flex justify-end'><Button disabled={!carrier?.dot} onClick={() => setStep(2)}>Continue</Button></div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                            <div className='sm:col-span-2'>
                                <Field label='Amount the carrier receives' required hint={`A ${config.fees.platform_pct}% fee is added on top. Cards add ${config.fees.card_pct}%.`}>
                                    <div className='relative max-w-[280px]'>
                                        <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[18px] font-semibold text-[#6b7280]'>$</span>
                                        <input className={`${inputClass} py-3 pl-9 text-[20px] font-bold`} style={{ fontFeatureSettings: '"tnum" 1' }} inputMode='decimal' value={load.amount} onChange={setL('amount')} placeholder='0.00' />
                                    </div>
                                </Field>
                            </div>
                            <Field label='Load or BOL number'><input className={inputClass} value={load.load_number} onChange={setL('load_number')} /></Field>
                            <Field label='Rate confirmation' hint='Optional. PDF, image or Word document.'><input type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' className={`${inputClass} py-2 file:mr-3 file:rounded-[8px] file:border-0 file:bg-[#f1f5f9] file:px-3 file:py-1 file:text-[13px] file:font-semibold file:text-[#334155]`} onChange={setL('rate_confirmation')} /></Field>
                            <Field label='Picked up in'><input className={inputClass} value={load.origin} onChange={setL('origin')} placeholder='City, ST' /></Field>
                            <Field label='Delivered to'><input className={inputClass} value={load.destination} onChange={setL('destination')} placeholder='City, ST' /></Field>
                            <Field label='Pickup date'><input type='date' className={inputClass} value={load.pickup_date} onChange={setL('pickup_date')} /></Field>
                            <Field label='Delivery date'><input type='date' className={inputClass} value={load.delivery_date} onChange={setL('delivery_date')} /></Field>
                        </div>
                        <div className='mt-6 flex justify-between'>
                            <Button variant='secondary' onClick={() => setStep(1)}>Back</Button>
                            <Button disabled={!amountOk} onClick={() => setStep(3)}>Continue</Button>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
                            <Field label='Your name' required><input className={inputClass} value={you.payer_name} onChange={setY('payer_name')} /></Field>
                            <Field label='Company'><input className={inputClass} value={you.payer_company} onChange={setY('payer_company')} /></Field>
                            <Field label='Email' required hint='Your receipt and tracking link go here.'><input type='email' className={inputClass} value={you.payer_email} onChange={setY('payer_email')} /></Field>
                            <Field label='Phone'><input className={inputClass} value={you.payer_phone} onChange={setY('payer_phone')} /></Field>
                        </div>
                        <div className='mt-6 flex justify-between'>
                            <Button variant='secondary' onClick={() => setStep(2)}>Back</Button>
                            <Button loading={busy} disabled={!you.payer_name.trim() || !emailOk} onClick={create}>Continue to payment</Button>
                        </div>
                    </>
                )}
            </Panel>
        </>
    );
}

function PayStep({ token, config }) {
    const navigate = useNavigate();
    const [payment, setPayment] = useState(null);
    const [type, setType] = useState('us_bank_account');
    const [intent, setIntent] = useState({ type: '', secret: '' });
    const [error, setError] = useState('');

    useEffect(() => {
        guestPay.payment(token).then(({ payment: p }) => {
            if (!p.can.pay) navigate(`/guest-pay/track/${token}`, { replace: true });
            else setPayment(p);
        }).catch((e) => setError(e.message));
    }, [token, navigate]);

    useEffect(() => {
        if (!payment) return;
        guestPay.intent(token, type).then((r) => { setIntent({ type, secret: r.client_secret }); setPayment(r.payment); }).catch((e) => setError(e.message));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, payment?.id]);

    const secret = intent.type === type ? intent.secret : '';

    if (!payment) return <><ErrorBanner>{error}</ErrorBanner>{!error && <Loading />}</>;

    return (
        <div className='flex flex-col gap-5'>
            <Panel>
                <div className='flex flex-wrap items-baseline justify-between gap-3'>
                    <div className='min-w-0'>
                        <p className='m-0 text-[13px] text-[#6b7280]'>Paying</p>
                        <p className='m-0 mt-0.5 text-[17px] font-bold text-[#1a1a1a]'>{payment.carrier.name || 'Carrier'}</p>
                        <p className='m-0 mt-0.5 text-[13px] text-[#6b7280]'>DOT {payment.carrier.dot}{payment.load_number ? `, load ${payment.load_number}` : ''}</p>
                    </div>
                </div>
                <div className='mt-4 rounded-xl bg-[#F9FAFB] px-4 py-4'>
                    <Breakdown b={payment.breakdown} guest compact />
                </div>
            </Panel>

            <Panel title='Pay with'>
                <div className='mb-5 grid grid-cols-2 gap-3'>
                    {[['us_bank_account', 'Bank account', 'No extra fee'], ['card', 'Card', `${config.fees.card_pct}% surcharge`]].map(([key, label, sub]) => (
                        <button key={key} type='button' onClick={() => setType(key)} aria-pressed={type === key}
                            className={`rounded-xl border-2 px-4 py-3 text-left transition-colors ${type === key ? 'border-[#185FA5] bg-[#EFF6FF]' : 'border-[#e5e7eb] bg-white hover:border-[#dbe4ee]'}`}>
                            <span className='block text-[14.5px] font-semibold text-[#1a1a1a]'>{label}</span>
                            <span className='block text-[12.5px] text-[#6b7280]'>{sub}</span>
                        </button>
                    ))}
                </div>

                <ErrorBanner>{error}</ErrorBanner>
                {!secret && !error && <Loading label='Opening the secure payment form' />}
                {secret && (
                    <Elements key={secret} stripe={stripeFor(config.publishable_key)} options={{ clientSecret: secret, appearance: STRIPE_APPEARANCE }}>
                        <PayForm token={token} total={payment.breakdown.total.formatted} onDone={() => navigate(`/guest-pay/track/${token}`)} />
                    </Elements>
                )}
            </Panel>
        </div>
    );
}

const STRIPE_APPEARANCE = {
    theme: 'stripe',
    variables: { colorPrimary: '#185FA5', colorText: '#1a1a1a', borderRadius: '10px', fontFamily: 'Inter, system-ui, sans-serif' },
};

function PayForm({ token, total, onDone }) {
    const stripe = useStripe();
    const elements = useElements();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setBusy(true);
        setError('');

        const { error: err } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
            confirmParams: { return_url: `${window.location.origin}/guest-pay/track/${token}` },
        });

        if (err) {
            setBusy(false);
            setError(err.message);
            return;
        }

        await guestPay.sync(token).catch(() => null);
        onDone();
    };

    return (
        <form onSubmit={submit}>
            <PaymentElement />
            <ErrorBanner>{error}</ErrorBanner>
            <Button type='submit' size='lg' className='mt-5 w-full' loading={busy} disabled={!stripe}>Pay {total}</Button>
        </form>
    );
}
