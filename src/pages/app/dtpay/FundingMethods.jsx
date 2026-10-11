import { useCallback, useEffect, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { dtpay } from './api';
import { stripeFor } from './stripe';
import { Button, ErrorBanner, Loading, Modal, Notice, Page } from './ui';

/* /dt-pay/funding-controls — the company's saved cards and bank accounts. */
export default function FundingMethods() {
    const [config, setConfig] = useState(null);
    const [methods, setMethods] = useState(null);
    const [error, setError] = useState('');
    const [adding, setAdding] = useState(null);       // 'card' | 'us_bank_account'
    const [removing, setRemoving] = useState(null);
    const [notice, setNotice] = useState('');

    const load = useCallback(() => {
        Promise.all([dtpay.config(), dtpay.methods()])
            .then(([cfg, m]) => { setError(''); setConfig(cfg); setMethods(m.methods); })
            .catch((e) => setError(e.message));
    }, []);

    useEffect(load, [load]);

    const remove = async (id) => {
        setRemoving(id);
        try {
            await dtpay.removeMethod(id);
            setMethods((list) => list.filter((m) => m.id !== id));
        } catch (e) {
            setError(e.message);
        } finally {
            setRemoving(null);
        }
    };

    const banks = methods?.filter((m) => m.type === 'us_bank_account') || [];
    const cards = methods?.filter((m) => m.type === 'card') || [];

    return (
        <Page
            title='Funding methods'
            intro='How your company funds carrier payments. Bank accounts have no fee. Cards add a 2.9% surcharge but fund at once.'
            back={{ to: '/dt-pay', label: 'DT Pay' }}
            testMode={config && !config.livemode}
        >
            <ErrorBanner onRetry={load}>{error}</ErrorBanner>
            {notice && <div className='mb-4'><Notice tone='success'>{notice}</Notice></div>}
            {!methods && !error && <Loading />}

            {methods && (
                <div className='flex flex-col gap-8'>
                    <MethodGroup
                        title='Bank accounts'
                        note='No fee. Clears in 1 to 2 business days.'
                        items={banks}
                        removing={removing}
                        onRemove={remove}
                        addLabel='Add bank account'
                        addNote='The cheapest way to pay carriers.'
                        onAdd={() => setAdding('us_bank_account')}
                        canAdd={!!config?.configured}
                    />
                    <MethodGroup
                        title='Cards'
                        note='2.9% surcharge. Funds the moment you pay.'
                        items={cards}
                        removing={removing}
                        onRemove={remove}
                        addLabel='Add card'
                        addNote='For payments that cannot wait for a bank transfer.'
                        onAdd={() => setAdding('card')}
                        canAdd={!!config?.configured}
                    />
                </div>
            )}

            {adding && config && (
                <AddMethodModal
                    type={adding}
                    publishableKey={config.publishable_key}
                    onClose={() => setAdding(null)}
                    onSaved={(message) => { setAdding(null); setNotice(message); load(); }}
                />
            )}
        </Page>
    );
}

function MethodGroup({ title, note, items, removing, onRemove, addLabel, addNote, onAdd, canAdd }) {
    return (
        <section>
            <div className='mb-3 flex items-baseline gap-3'>
                <h2 className='m-0 text-[17px] font-bold text-[#101828]'>{title}</h2>
                <p className='m-0 text-[13.5px] text-[#667085]'>{note}</p>
            </div>
            <ul className='m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3'>
                {items.map((m) => (
                    <li key={m.id}><Instrument m={m} removing={removing === m.id} onRemove={() => onRemove(m.id)} /></li>
                ))}
                <li>
                    <button
                        type='button'
                        onClick={onAdd}
                        disabled={!canAdd}
                        className='flex h-full min-h-[148px] w-full flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-[#D0D5DD] bg-white/60 px-5 text-center transition-colors hover:border-[#2953E4] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        <span className='flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#EEF2FF] text-[20px] leading-none text-[#2953E4]' aria-hidden='true'>+</span>
                        <span className='mt-2 text-[14px] font-semibold text-[#101828]'>{addLabel}</span>
                        {items.length === 0 && <span className='mt-0.5 text-[12.5px] text-[#667085]'>{addNote}</span>}
                    </button>
                </li>
            </ul>
        </section>
    );
}

/* A saved card or bank account, drawn as the thing itself. */
function Instrument({ m, removing, onRemove }) {
    const bank = m.type === 'us_bank_account';

    return (
        <div
            className={`relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[16px] p-5 ${bank ? 'border border-[#E9EAEC] bg-white' : 'text-white'}`}
            style={bank ? { boxShadow: '0 1px 2px rgba(16,24,40,0.04)' } : { background: 'linear-gradient(150deg, #1D2939 0%, #101828 100%)', boxShadow: '0 8px 20px rgba(16,24,40,0.18)' }}
        >
            <div className='flex items-start justify-between gap-3'>
                <span className={`text-[13px] font-bold ${bank ? 'text-[#067647]' : 'text-white/90'}`}>{bank ? (m.bank || 'Bank account') : (m.brand ? m.brand[0].toUpperCase() + m.brand.slice(1) : 'Card')}</span>
                <button
                    type='button'
                    onClick={onRemove}
                    disabled={removing}
                    className={`rounded-[8px] px-2 py-1 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${bank ? 'text-[#667085] hover:bg-[#FEF3F2] hover:text-[#B42318]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                >
                    {removing ? 'Removing' : 'Remove'}
                </button>
            </div>
            <div>
                <p className={`m-0 text-[19px] font-semibold tracking-[0.08em] ${bank ? 'text-[#101828]' : 'text-white'}`} style={{ fontFeatureSettings: '"tnum" 1' }}>
                    <span aria-hidden='true'>{bank ? '••••' : '•••• ••••'} </span>{m.last4}
                </p>
                <p className={`m-0 mt-1 text-[12.5px] ${bank ? 'text-[#667085]' : 'text-white/65'}`}>
                    {bank ? 'Verified bank account' : `Expires ${m.exp || '—'}`}
                </p>
            </div>
        </div>
    );
}

export function AddMethodModal({ type, publishableKey, onClose, onSaved }) {
    const [secret, setSecret] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        dtpay.setupIntent(type).then((r) => setSecret(r.client_secret)).catch((e) => setError(e.message));
    }, [type]);

    return (
        <Modal open title={type === 'card' ? 'Add a card' : 'Add a bank account'} onClose={onClose}>
            <ErrorBanner>{error}</ErrorBanner>
            {!secret && !error && <Loading label='Opening the secure form' />}
            {secret && (
                <Elements stripe={stripeFor(publishableKey)} options={{ clientSecret: secret, appearance: { theme: 'stripe', variables: { colorPrimary: '#2953E4', colorText: '#101828', borderRadius: '10px' } } }}>
                    <SetupForm type={type} onSaved={onSaved} onCancel={onClose} />
                </Elements>
            )}
        </Modal>
    );
}

function SetupForm({ type, onSaved, onCancel }) {
    const stripe = useStripe();
    const elements = useElements();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setBusy(true);
        setError('');

        const { error: err, setupIntent } = await stripe.confirmSetup({
            elements,
            redirect: 'if_required',
            confirmParams: { return_url: window.location.href },
        });

        setBusy(false);

        if (err) {
            setError(err.message);
            return;
        }

        if (setupIntent?.status === 'requires_action' && setupIntent.next_action?.type === 'verify_with_microdeposits') {
            onSaved('Bank account added. Stripe will send two small deposits in 1 to 2 business days. Confirm them from the link in your email to finish verifying.');
            return;
        }

        onSaved(type === 'card' ? 'Card saved.' : 'Bank account saved.');
    };

    return (
        <form onSubmit={submit}>
            <PaymentElement options={{ layout: 'tabs' }} />
            <ErrorBanner>{error}</ErrorBanner>
            <p className='mt-3 text-[12px] text-[#667085]'>
                Secured by Stripe. {type === 'us_bank_account' ? 'By saving, you authorise DollarTraq to debit this account for payments you approve.' : 'Card details never reach DollarTraq servers.'}
            </p>
            <div className='mt-4 flex justify-end gap-2'>
                <Button variant='secondary' onClick={onCancel}>Cancel</Button>
                <Button type='submit' loading={busy} disabled={!stripe}>Save</Button>
            </div>
        </form>
    );
}
