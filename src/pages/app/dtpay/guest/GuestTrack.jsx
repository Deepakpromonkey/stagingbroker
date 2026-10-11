import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { guestPay } from '../api';
import { date, routeStage, routeStopped } from '../format';
import { DisputeModal } from '../PaymentDetail';
import { Amount, Breakdown, Button, ErrorBanner, Facts, Loading, Modal, MoneyRoute, Panel, StatusBadge, Timeline } from '../ui';
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

    const carrier = p.carrier.name || `DOT ${p.carrier.dot}`;
    const title = {
        draft: 'Payment not completed',
        processing: 'Your payment is clearing',
        funded: 'Your money is held',
        released: 'Paid to the carrier',
        refunded: 'Refunded',
        failed: 'Payment failed',
        cancelled: 'Cancelled',
    }[p.status] || p.status_label;

    const next = p.open_dispute
        ? `Dispute open: ${p.open_dispute.reason_label}. The money stays held while it is reviewed.`
        : {
            draft: 'Finish paying to send the money to DollarTraq.',
            processing: p.method_type === 'us_bank_account' ? 'Bank payments take 1 to 2 business days to clear. This page updates by itself.' : 'Confirming your payment with your bank.',
            funded: p.payout.ready
                ? `Release it to ${carrier} once the load is delivered.`
                : `${carrier} still has to finish their payout setup with DollarTraq before the money can be sent.`,
            released: `Released ${date(p.released_at, true)}.`,
            failed: 'The payment did not go through. You can try again.',
        }[p.status];

    return (
        <GuestShell title={title} subtitle={`${p.reference} for ${carrier}`} testMode={config && !config.livemode} wide>
            <ErrorBanner>{error}</ErrorBanner>

            <div className='mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#C7D7FE] bg-[#EEF4FF] px-4 py-3 text-[13.5px] text-[#2D3E8C]'>
                <span>Keep this page's link. It is the only way back to your payment.</span>
                <Button variant='secondary' size='sm' onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</Button>
            </div>

            <Panel padded={false} className='mb-6'>
                <div className='grid grid-cols-1 gap-8 px-7 py-7 lg:grid-cols-[1fr_300px] lg:items-center'>
                    <div>
                        <div className='flex flex-wrap items-center gap-3'>
                            <Amount value={p.amount.formatted} className='text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#101828]' />
                            <StatusBadge status={p.status} onHold={p.on_hold} large />
                        </div>
                        <div className='mt-9'>
                            <MoneyRoute
                                stage={routeStage(p.status)}
                                stopped={routeStopped(p.status)}
                                payerLabel='You'
                                carrierLabel={carrier}
                                amount={p.amount.formatted}
                            />
                        </div>
                    </div>

                    <div className='rounded-[14px] bg-[#F9FAFB] p-5'>
                        <p className='m-0 text-[14px] leading-6 text-[#344054]'>{next || 'Nothing to do.'}</p>
                        <div className='mt-4 flex flex-col gap-2'>
                            {p.can.pay && <Link to={`/guest-pay/pay/${token}`}><Button className='w-full'>{p.status === 'failed' ? 'Try again' : 'Finish paying'}</Button></Link>}
                            {p.status === 'funded' && <Button variant='release' className='w-full' disabled={!p.can.release || !p.payout.ready} onClick={() => setConfirm(true)}>Release {p.amount.formatted}</Button>}
                            {p.can.dispute && <Button variant='ghost' className='w-full' onClick={() => setDisputeOpen(true)}>Report a problem</Button>}
                        </div>
                    </div>
                </div>
            </Panel>

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]'>
                <div className='flex flex-col gap-6'>
                    <Panel title='Load and carrier'>
                        <Facts items={[
                            ['Carrier', carrier],
                            ['DOT', p.carrier.dot],
                            ['Load', p.load_number],
                            ['Route', p.origin || p.destination ? `${p.origin || '?'} to ${p.destination || '?'}` : null],
                            ['Paid with', p.method_label],
                        ]} />
                    </Panel>
                    <Panel title='History'><Timeline items={p.timeline} /></Panel>
                </div>
                <Panel title='Cost' className='self-start'><Breakdown b={p.breakdown} guest /></Panel>
            </div>

            <Modal open={confirm} title={`Pay ${p.amount.formatted} to ${carrier}?`} onClose={() => setConfirm(false)}
                footer={<><Button variant='secondary' onClick={() => setConfirm(false)}>Not yet</Button><Button variant='release' loading={busy} onClick={release}>Release {p.amount.formatted}</Button></>}>
                <p className='m-0 text-[14px] leading-6 text-[#344054]'>The money leaves DollarTraq and goes to the carrier's bank. Release only after the load was delivered.</p>
            </Modal>

            <DisputeModal open={disputeOpen} onClose={() => setDisputeOpen(false)}
                onSubmit={async (fields) => { const r = await guestPay.dispute(token, fields); setP(r.payment); setDisputeOpen(false); }} />
        </GuestShell>
    );
}
