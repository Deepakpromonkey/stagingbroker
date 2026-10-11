import { useCallback, useEffect, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { dtpay } from './api';
import { stripeFor } from './stripe';
import { Button, Card, Empty, ErrorBanner, Loading, Modal, Notice, Page } from './ui';

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
            subtitle='How your company pays carriers. Bank (ACH) has no extra fee; cards add a 2.9% surcharge.'
            back={{ to: '/dt-pay', label: 'DT Pay' }}
            testMode={config && !config.livemode}
            actions={<>
                <Button variant='secondary' onClick={() => setAdding('card')} disabled={!config?.configured}>Add card</Button>
                <Button onClick={() => setAdding('us_bank_account')} disabled={!config?.configured}>Add bank account</Button>
            </>}
        >
            <ErrorBanner onRetry={load}>{error}</ErrorBanner>
            {notice && <div className='mb-4'><Notice tone='success'>{notice}</Notice></div>}
            {!methods && !error && <Loading />}

            {methods && (
                <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
                    <MethodList title='Bank accounts (ACH)' subtitle='No fee · clears in 1–2 business days' items={banks} removing={removing} onRemove={remove}
                        empty={<Empty title='No bank account' action={<Button onClick={() => setAdding('us_bank_account')}>Add bank account</Button>}>The cheapest way to fund payments.</Empty>} />
                    <MethodList title='Cards' subtitle='2.9% surcharge · funds at once' items={cards} removing={removing} onRemove={remove}
                        empty={<Empty title='No card' action={<Button variant='secondary' onClick={() => setAdding('card')}>Add card</Button>}>For payments that cannot wait for ACH.</Empty>} />
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

function MethodList({ title, subtitle, items, removing, onRemove, empty }) {
    return (
        <Card title={title} subtitle={subtitle} padded={false}>
            {items.length === 0 ? empty : (
                <ul className='m-0 list-none p-0'>
                    {items.map((m) => (
                        <li key={m.id} className='flex items-center justify-between gap-3 border-b border-[#F2F4F7] px-5 py-3.5 last:border-0'>
                            <div>
                                <p className='m-0 text-[14px] font-semibold text-[#101828]'>{m.label}</p>
                                <p className='m-0 text-[12px] text-[#667085]'>{m.type === 'card' ? `Expires ${m.exp || '—'}` : 'Verified bank account'}</p>
                            </div>
                            <Button variant='ghost' loading={removing === m.id} onClick={() => onRemove(m.id)}>Remove</Button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
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
            {!secret && !error && <Loading label='Opening secure form…' />}
            {secret && (
                <Elements stripe={stripeFor(publishableKey)} options={{ clientSecret: secret, appearance: { theme: 'stripe' } }}>
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
            onSaved('Bank account added. Stripe will send two small deposits in 1–2 business days; confirm them from the link in your email to finish verifying.');
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
