import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { guestPay } from '../api';
import { date } from '../format';
import { DisputeModal } from '../PaymentDetail';
import { Breakdown, Button, Card, ErrorBanner, KeyValue, Loading, Modal, Notice, StatusBadge, Timeline } from '../ui';
import GuestShell from './GuestShell';

/* /guest-pay/track/:token — the guest's private page for their payment. */
export default function GuestTrack() {
    const { token } = useParams();
    const [p, setP] = useState(null);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [disputeOpen, setDisputeOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const load = useCallback(() => {
        Promise.all([guestPay.payment(token), guestPay.config()])
            .then(([r, cfg]) => { setError(''); setP(r.payment); setConfig(cfg); })
            .catch((e) => setError(e.message));
    }, [token]);

    useEffect(load, [load]);

    // A bank debit or 3-D Secure may still be settling: re-check while processing.
    useEffect(() => {
        if (p?.status !== 'processing') return undefined;
        const t = setInterval(() => guestPay.sync(token).then((r) => setP(r.payment)).catch(() => null), 15000);
        return () => clearInterval(t);
    }, [p?.status, token]);

    const release = async () => {
        setBusy(true);
        try {
            setP((await guestPay.release(token)).payment);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
            setConfirm(false);
        }
    };

    const copyLink = async () => {
        try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ }
    };

    if (!p) {
        return <GuestShell title='Your payment'><ErrorBanner onRetry={load}>{error}</ErrorBanner>{!error && <Loading />}</GuestShell>;
    }

    const title = {
        draft: 'Payment not completed',
        processing: 'Payment processing',
        funded: "Payment held — you're protected",
        released: 'Paid to the carrier',
        refunded: 'Refunded',
        failed: 'Payment failed',
        cancelled: 'Cancelled',
    }[p.status] || p.status_label;

    return (
        <GuestShell title={title} subtitle={`${p.reference} · ${p.carrier.name || `DOT ${p.carrier.dot}`}`} testMode={config && !config.livemode}>
            <ErrorBanner>{error}</ErrorBanner>

            <div className='flex flex-col gap-5'>
                <Notice tone='info'>
                    Keep this page's link — it is the only way back to your payment.{' '}
                    <button className='font-semibold underline' onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
                </Notice>

                {p.status === 'processing' && <Notice tone='warn'>{p.method_type === 'us_bank_account' ? 'Your bank payment is clearing (1–2 business days). This page updates by itself.' : 'Confirming your payment…'}</Notice>}
                {p.status === 'funded' && !p.open_dispute && <Notice tone='success'>Your money is held safely. Release it to the carrier once the load is delivered.</Notice>}
                {p.status === 'released' && <Notice tone='success'>Released {date(p.released_at, true)}.</Notice>}
                {p.open_dispute && <Notice tone='warn'>Dispute open: {p.open_dispute.reason_label}. The money stays held while it is reviewed.</Notice>}
                {p.status === 'funded' && !p.payout.ready && <Notice tone='warn'>The carrier still has to finish their payout setup with DollarTraq before the money can be sent.</Notice>}

                <Card title='Status' actions={<StatusBadge status={p.status} label={p.status_label} onHold={p.on_hold} />}>
                    <KeyValue items={[
                        ['Carrier', `${p.carrier.name || '—'} (DOT ${p.carrier.dot})`],
                        ['Load', p.load_number],
                        ['Route', p.origin || p.destination ? `${p.origin || '?'} → ${p.destination || '?'}` : null],
                        ['Paid with', p.method_label],
                    ]} />
                    <div className='mt-4 flex flex-wrap gap-2'>
                        {p.can.pay && <Link to={`/guest-pay/pay/${token}`}><Button>{p.status === 'failed' ? 'Try again' : 'Complete payment'}</Button></Link>}
                        {p.status === 'funded' && <Button variant='success' disabled={!p.can.release || !p.payout.ready} onClick={() => setConfirm(true)}>Release to carrier</Button>}
                        {p.can.dispute && <Button variant='secondary' onClick={() => setDisputeOpen(true)}>Report a problem</Button>}
                    </div>
                </Card>

                <Card title='Cost'><Breakdown b={p.breakdown} guest /></Card>
                <Card title='Timeline'><Timeline items={p.timeline} /></Card>
            </div>

            <Modal open={confirm} title='Release the payment?' onClose={() => setConfirm(false)}
                footer={<><Button variant='secondary' onClick={() => setConfirm(false)}>Cancel</Button><Button variant='success' loading={busy} onClick={release}>Release {p.amount.formatted}</Button></>}>
                <p className='m-0 text-[13.5px] text-[#344054]'>{p.amount.formatted} goes to {p.carrier.name || 'the carrier'} now. Only release once the load was delivered.</p>
            </Modal>

            <DisputeModal open={disputeOpen} onClose={() => setDisputeOpen(false)}
                onSubmit={async (fields) => { const r = await guestPay.dispute(token, fields); setP(r.payment); setDisputeOpen(false); }} />
        </GuestShell>
    );
}
