import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { guestPay } from '../api';
import { parseAmount } from '../format';
import { stripeFor } from '../stripe';
import { CarrierPicker } from '../parts';
import { Breakdown, Button, Card, ErrorBanner, Field, Loading, inputClass } from '../ui';
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
            subtitle='No account needed. Funds are held until you confirm delivery.'
            testMode={config && !config.livemode}
        >
            <ErrorBanner>{error}</ErrorBanner>
            {!config && !error && <Loading />}
            {config && !config.configured && <ErrorBanner>Guest Pay is not available right now.</ErrorBanner>}
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
            <div className='mb-5 flex justify-center gap-2'>
                {tabs.map((t, i) => (
                    <span key={t} className={`rounded-full px-3 py-1 text-[12px] font-semibold ${i + 1 < step ? 'bg-[#ECFDF3] text-[#067647]' : i + 1 === step ? 'bg-[#175CD3] text-white' : 'bg-[#F2F4F7] text-[#98A2B3]'}`}>
                        {i + 1 < step ? '✓ ' : ''}{t}
                    </span>
                ))}
            </div>

            <Card>
                <ErrorBanner>{error}</ErrorBanner>

                {step === 1 && (
                    <>
                        <CarrierPicker value={carrier} onChange={setCarrier} search={guestPay.carriers} />
                        <div className='mt-6 flex justify-end'><Button disabled={!carrier?.dot} onClick={() => setStep(2)}>Continue</Button></div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div className='sm:col-span-2'>
                                <Field label='Amount the carrier receives' required hint={`A ${config.fees.platform_pct}% pay-per-use fee is added on top${' '}(cards add ${config.fees.card_pct}%).`}>
                                    <div className='relative'>
                                        <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-[#667085]'>$</span>
                                        <input className={`${inputClass} pl-7`} inputMode='decimal' value={load.amount} onChange={setL('amount')} placeholder='0.00' />
                                    </div>
                                </Field>
                            </div>
                            <Field label='Load / BOL #'><input className={inputClass} value={load.load_number} onChange={setL('load_number')} /></Field>
                            <Field label='Rate confirmation' hint='Optional · PDF or image'><input type='file' accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' className={inputClass} onChange={setL('rate_confirmation')} /></Field>
                            <Field label='Origin'><input className={inputClass} value={load.origin} onChange={setL('origin')} placeholder='City, ST' /></Field>
                            <Field label='Destination'><input className={inputClass} value={load.destination} onChange={setL('destination')} placeholder='City, ST' /></Field>
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
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
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
            </Card>
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
            <Card title={`${payment.carrier.name || 'Carrier'} · DOT ${payment.carrier.dot}`} subtitle={payment.load_number ? `Load ${payment.load_number}` : undefined}>
                <Breakdown b={payment.breakdown} guest />
            </Card>

            <Card title='How do you want to pay?'>
                <div className='mb-4 grid grid-cols-2 gap-2'>
                    {[['us_bank_account', 'Bank (ACH)', 'No extra fee'], ['card', 'Card', `+${config.fees.card_pct}%`]].map(([key, label, sub]) => (
                        <button key={key} onClick={() => setType(key)}
                            className={`rounded-[10px] border px-4 py-3 text-left ${type === key ? 'border-[#175CD3] bg-[#EFF8FF]' : 'border-[#EAECF0] hover:bg-[#F9FAFB]'}`}>
                            <span className='block text-[14px] font-semibold text-[#101828]'>{label}</span>
                            <span className='block text-[12px] text-[#667085]'>{sub}</span>
                        </button>
                    ))}
                </div>

                <ErrorBanner>{error}</ErrorBanner>
                {!secret && !error && <Loading label='Opening secure payment form…' />}
                {secret && (
                    <Elements key={secret} stripe={stripeFor(config.publishable_key)} options={{ clientSecret: secret, appearance: { theme: 'stripe' } }}>
                        <PayForm token={token} total={payment.breakdown.total.formatted} onDone={() => navigate(`/guest-pay/track/${token}`)} />
                    </Elements>
                )}
            </Card>
        </div>
    );
}

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
            <Button type='submit' className='mt-4 w-full' loading={busy} disabled={!stripe}>Pay {total}</Button>
        </form>
    );
}
