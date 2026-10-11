import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dtpay } from './api';
import { DISPUTE_REASONS, date, methodName } from './format';
import { PayoutStatus } from './parts';
import { Breakdown, Button, Card, ErrorBanner, Field, KeyValue, Loading, Modal, Notice, Page, StatusBadge, Timeline, inputClass } from './ui';

/* /dt-pay/transactions/view/:id — one payment, and everything that can be done to it. */
export default function PaymentDetail() {
    const { transaction_id: id } = useParams();
    const navigate = useNavigate();

    const [p, setP] = useState(null);
    const [config, setConfig] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState('');
    const [confirm, setConfirm] = useState(null);       // 'release' | 'refund' | 'cancel'
    const [disputeOpen, setDisputeOpen] = useState(false);
    const [notice, setNotice] = useState('');

    const load = useCallback(() => {
        Promise.all([dtpay.payment(id), dtpay.config()])
            .then(([r, cfg]) => { setError(''); setP(r.payment); setConfig(cfg); })
            .catch((e) => setError(e.message));
    }, [id]);

    useEffect(load, [load]);

    const run = async (key, action, message) => {
        setBusy(key);
        setError('');
        setNotice('');
        try {
            const r = await action();
            if (r?.payment) setP(r.payment);
            if (message) setNotice(message);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy('');
            setConfirm(null);
        }
    };

    if (!p) {
        return (
            <Page title='Payment' back={{ to: '/dt-pay/transactions', label: 'Payments' }}>
                <ErrorBanner onRetry={load}>{error}</ErrorBanner>
                {!error && <Loading />}
            </Page>
        );
    }

    const can = p.can;
    const held = ['processing', 'funded'].includes(p.status);

    return (
        <Page
            title={p.reference}
            subtitle={`${p.carrier.name || 'Carrier'} · DOT ${p.carrier.dot}`}
            back={{ to: '/dt-pay/transactions', label: 'Payments' }}
            testMode={config && !config.livemode}
            actions={<StatusBadge status={p.status} label={p.status_label} onHold={p.on_hold} />}
        >
            <ErrorBanner>{error}</ErrorBanner>
            {notice && <div className='mb-4'><Notice tone='success'>{notice}</Notice></div>}
            {p.status === 'failed' && <div className='mb-4'><Notice tone='warn'>The payment did not go through: {p.failure_reason || 'declined'}. You can pay again with another method.</Notice></div>}
            {p.status === 'processing' && <div className='mb-4'><Notice tone='info'>{p.method_type === 'us_bank_account' ? 'Your bank debit is clearing (1–2 business days). It can be released once the funds arrive.' : 'The payment is being confirmed.'}</Notice></div>}
            {p.status === 'released' && <div className='mb-4'><Notice tone='success'>Released {date(p.released_at, true)}. {p.amount.formatted} was sent to {p.carrier.name || 'the carrier'}.</Notice></div>}
            {p.open_dispute && <div className='mb-4'><Notice tone='warn'>Open dispute: {p.open_dispute.reason_label}. Release is blocked until it is resolved.</Notice></div>}

            <div className='grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]'>
                <div className='flex flex-col gap-5'>
                    <Card title='Details'>
                        <KeyValue items={[
                            ['Carrier', `${p.carrier.name || '—'}`],
                            ['DOT / MC', `${p.carrier.dot}${p.carrier.mc ? ` / ${p.carrier.mc}` : ''}`],
                            ['Load', p.load_number],
                            ['Route', p.origin || p.destination ? `${p.origin || '?'} → ${p.destination || '?'}` : null],
                            ['Pickup', p.pickup_date ? date(p.pickup_date) : null],
                            ['Delivery', p.delivery_date ? date(p.delivery_date) : null],
                            ['Paid with', p.method_label ? `${p.method_label} (${methodName(p.method_type)})` : null],
                            ['Source', p.source === 'shipment' ? 'From a load' : p.source === 'manual' ? 'Entered manually' : 'Guest Pay'],
                            ['Created', date(p.created_at, true)],
                            ['Funded', p.funded_at ? date(p.funded_at, true) : null],
                            p.memo ? ['Note', p.memo] : null,
                        ]} />
                    </Card>

                    <Card title='Cost'><Breakdown b={p.breakdown} /></Card>

                    <Documents p={p} canUpload={can.pod} onUploaded={setP} setError={setError} />

                    <Disputes p={p} canResolve={can.dispute !== undefined} onChange={setP} setError={setError} />

                    <Card title='Timeline'><Timeline items={p.timeline} /></Card>
                </div>

                <div className='flex flex-col gap-5'>
                    <Card title='Actions'>
                        <div className='flex flex-col gap-2'>
                            {can.pay && <Button onClick={() => navigate(`/dt-pay/new?pay=${p.id}`)}>{p.status === 'failed' ? 'Pay again' : 'Pay now'}</Button>}
                            {p.status === 'funded' && (
                                <Button variant='success' disabled={!can.release} onClick={() => setConfirm('release')}>Release {p.amount.formatted} to carrier</Button>
                            )}
                            {p.status === 'funded' && !can.release && (can.release_blocked_reason
                                ? <p className='m-0 text-[12px] text-[#B54708]'>Release blocked: {can.release_blocked_reason}</p>
                                : <p className='m-0 text-[12px] text-[#667085]'>Your role cannot release this payment.</p>)}
                            {can.hold && <Button variant='secondary' loading={busy === 'hold'} onClick={() => run('hold', () => dtpay.hold(p.id, true), 'Payment put on hold.')}>Put on hold</Button>}
                            {can.unhold && <Button variant='secondary' loading={busy === 'hold'} onClick={() => run('hold', () => dtpay.hold(p.id, false), 'Hold removed.')}>Remove hold</Button>}
                            {can.dispute && <Button variant='secondary' onClick={() => setDisputeOpen(true)}>Raise a dispute</Button>}
                            {can.refund && <Button variant='danger' onClick={() => setConfirm('refund')}>Refund {p.total.formatted}</Button>}
                            {can.cancel && <Button variant='danger' onClick={() => setConfirm('cancel')}>Cancel payment</Button>}
                            {['processing', 'failed'].includes(p.status) && (
                                <Button variant='ghost' loading={busy === 'sync'} onClick={() => run('sync', () => dtpay.sync(p.id))}>Refresh status</Button>
                            )}
                            {!can.pay && !held && !['funded'].includes(p.status) && <p className='m-0 text-[12.5px] text-[#667085]'>No actions left on this payment.</p>}
                        </div>
                    </Card>

                    {!['released', 'refunded', 'cancelled'].includes(p.status) && <PayoutStatus key={p.carrier.dot} dot={p.carrier.dot} name={p.carrier.name} />}
                </div>
            </div>

            <Modal
                open={confirm === 'release'}
                title='Release payment to the carrier?'
                onClose={() => setConfirm(null)}
                footer={<>
                    <Button variant='secondary' onClick={() => setConfirm(null)}>Cancel</Button>
                    <Button variant='success' loading={busy === 'release'} onClick={() => run('release', () => dtpay.release(p.id), 'Released to the carrier.')}>Release {p.amount.formatted}</Button>
                </>}
            >
                <p className='m-0 text-[13.5px] text-[#344054]'>
                    {p.amount.formatted} goes to {p.carrier.name || `DOT ${p.carrier.dot}`} now. This cannot be undone from DollarTraq — make sure the load was delivered{p.documents.pod ? '' : ' (no POD is attached yet)'}.
                </p>
            </Modal>

            <RefundModal open={confirm === 'refund'} p={p} busy={busy === 'refund'} onClose={() => setConfirm(null)}
                onConfirm={(reason) => run('refund', () => dtpay.refund(p.id, reason), 'Refunded. It reaches your account in 5–10 business days.')} />

            <Modal
                open={confirm === 'cancel'}
                title='Cancel this payment?'
                onClose={() => setConfirm(null)}
                footer={<>
                    <Button variant='secondary' onClick={() => setConfirm(null)}>Keep it</Button>
                    <Button variant='danger' loading={busy === 'cancel'} onClick={() => run('cancel', () => dtpay.cancel(p.id), 'Payment cancelled.')}>Cancel payment</Button>
                </>}
            >
                <p className='m-0 text-[13.5px] text-[#344054]'>Nothing has been charged. The payment will be closed.</p>
            </Modal>

            <DisputeModal open={disputeOpen} onClose={() => setDisputeOpen(false)}
                onSubmit={async (fields) => { const r = await dtpay.dispute(p.id, fields); setP(r.payment); setDisputeOpen(false); setNotice('Dispute opened. Release is blocked until it is resolved.'); }} />
        </Page>
    );
}

function RefundModal({ open, p, busy, onClose, onConfirm }) {
    const [reason, setReason] = useState('');

    return (
        <Modal
            open={open}
            title='Refund this payment?'
            onClose={onClose}
            footer={<>
                <Button variant='secondary' onClick={onClose}>Cancel</Button>
                <Button variant='danger' loading={busy} onClick={() => onConfirm(reason)}>Refund {p.total.formatted}</Button>
            </>}
        >
            <p className='mb-3 mt-0 text-[13.5px] text-[#344054]'>The full {p.total.formatted} goes back to {p.method_label || 'the original payment method'}. The carrier will not be paid.</p>
            <Field label='Reason (optional)'><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </Modal>
    );
}

export function DisputeModal({ open, onClose, onSubmit }) {
    const [reason, setReason] = useState('not_delivered');
    const [details, setDetails] = useState('');
    const [files, setFiles] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        setBusy(true);
        setError('');
        try {
            await onSubmit({ reason, details, evidence: files });
            setDetails('');
            setFiles([]);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            title='Raise a dispute'
            onClose={onClose}
            footer={<>
                <Button variant='secondary' onClick={onClose}>Cancel</Button>
                <Button loading={busy} disabled={details.trim().length < 10} onClick={submit}>Open dispute</Button>
            </>}
        >
            <ErrorBanner>{error}</ErrorBanner>
            <div className='flex flex-col gap-4'>
                <Field label='What went wrong?' required>
                    <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                        {DISPUTE_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                </Field>
                <Field label='Details' required hint='At least 10 characters.'>
                    <textarea rows={4} className={inputClass} value={details} onChange={(e) => setDetails(e.target.value)} />
                </Field>
                <Field label='Evidence' hint='Up to 5 files · PDF or images · 10 MB each'>
                    <input type='file' multiple accept='.pdf,.jpg,.jpeg,.png' className={inputClass} onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
                </Field>
                <p className='m-0 text-[12px] text-[#667085]'>The money stays held while the dispute is open.</p>
            </div>
        </Modal>
    );
}

function Documents({ p, canUpload, onUploaded, setError }) {
    const [busy, setBusy] = useState(false);

    const upload = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setBusy(true);
        try {
            onUploaded((await dtpay.pod(p.id, file)).payment);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const row = (label, has, kind, name) => (
        <div className='flex items-center justify-between gap-3 border-b border-[#F2F4F7] py-3 last:border-0'>
            <span className='text-[13.5px] text-[#101828]'>{label}</span>
            {has ? <Button variant='ghost' onClick={() => dtpay.download(p.id, kind, name).catch((e) => setError(e.message))}>Download</Button>
                : <span className='text-[12.5px] text-[#98A2B3]'>Not attached</span>}
        </div>
    );

    return (
        <Card
            title='Documents'
            actions={canUpload && (
                <label className={`inline-flex cursor-pointer items-center rounded-[8px] border border-[#D0D5DD] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] ${busy ? 'opacity-50' : ''}`}>
                    {busy ? 'Uploading…' : p.documents.pod ? 'Replace POD' : 'Upload POD'}
                    <input type='file' accept='.pdf,.jpg,.jpeg,.png' className='hidden' onChange={upload} disabled={busy} />
                </label>
            )}
        >
            {row('Rate confirmation', p.documents.rate_confirmation, 'rate-confirmation', `${p.reference}-rate-confirmation`)}
            {row('Proof of delivery (POD)', p.documents.pod, 'pod', `${p.reference}-pod`)}
        </Card>
    );
}

function Disputes({ p, onChange, setError }) {
    const [resolution, setResolution] = useState('');
    const [busy, setBusy] = useState(false);

    if (!p.disputes?.length) return null;

    const resolve = async () => {
        setBusy(true);
        try {
            onChange((await dtpay.resolveDispute(p.id, p.open_dispute.id, resolution)).payment);
            setResolution('');
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card title='Disputes'>
            {p.disputes.map((d) => (
                <div key={d.id} className='border-b border-[#F2F4F7] pb-4 last:border-0 last:pb-0'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                        <p className='m-0 text-[14px] font-semibold text-[#101828]'>{d.reason_label}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${d.status === 'open' ? 'bg-[#FFFAEB] text-[#B54708]' : 'bg-[#ECFDF3] text-[#067647]'}`}>{d.status === 'open' ? 'Open' : 'Resolved'}</span>
                    </div>
                    <p className='m-0 mt-1 text-[13px] text-[#475467]'>{d.details}</p>
                    <p className='m-0 mt-1 text-[12px] text-[#98A2B3]'>Raised {date(d.created_at, true)} by {d.raised_by}{d.evidence_count ? ` · ${d.evidence_count} file${d.evidence_count > 1 ? 's' : ''}` : ''}</p>
                    {d.evidence_count > 0 && (
                        <div className='mt-2 flex flex-wrap gap-2'>
                            {Array.from({ length: d.evidence_count }).map((_, i) => (
                                <Button key={i} variant='ghost' onClick={() => dtpay.download(p.id, 'evidence', `${p.reference}-evidence-${i + 1}`, `?dispute=${d.id}&index=${i}`).catch((e) => setError(e.message))}>
                                    Evidence {i + 1}
                                </Button>
                            ))}
                        </div>
                    )}
                    {d.resolution && <p className='m-0 mt-2 text-[13px] text-[#067647]'>Resolution: {d.resolution}</p>}
                    {d.status === 'open' && (
                        <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                            <input className={inputClass} placeholder='How was it resolved?' value={resolution} onChange={(e) => setResolution(e.target.value)} />
                            <Button variant='secondary' className='shrink-0' loading={busy} disabled={resolution.trim().length < 3} onClick={resolve}>Mark resolved</Button>
                        </div>
                    )}
                </div>
            ))}
        </Card>
    );
}
