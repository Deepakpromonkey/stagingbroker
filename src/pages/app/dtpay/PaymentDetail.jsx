import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dtpay } from './api';
import { DISPUTE_REASONS, date, methodName, routeStage, routeStopped } from './format';
import { PayoutStatus } from './parts';
import { Amount, Breakdown, Button, ErrorBanner, Facts, Field, Loading, Modal, MoneyRoute, Notice, Page, Panel, StatusBadge, Timeline, inputClass } from './ui';

/* /dt-pay/transactions/view/:id — one payment, built around where its money is. */
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
    const carrier = p.carrier.name || `DOT ${p.carrier.dot}`;
    const route = [p.load_number, p.origin || p.destination ? `${p.origin || '?'} to ${p.destination || '?'}` : null].filter(Boolean).join(', ');
    const at = (type) => p.timeline.find((e) => e.type === type)?.at;

    const secondary = [
        can.hold && <Button key='hold' variant='secondary' loading={busy === 'hold'} onClick={() => run('hold', () => dtpay.hold(p.id, true), 'Payment put on hold.')}>Put on hold</Button>,
        can.unhold && <Button key='unhold' variant='secondary' loading={busy === 'hold'} onClick={() => run('hold', () => dtpay.hold(p.id, false), 'Hold removed.')}>Remove hold</Button>,
        can.dispute && <Button key='dispute' variant='secondary' onClick={() => setDisputeOpen(true)}>Raise a dispute</Button>,
        ['processing', 'failed'].includes(p.status) && <Button key='sync' variant='secondary' loading={busy === 'sync'} onClick={() => run('sync', () => dtpay.sync(p.id))}>Check status</Button>,
        can.refund && <Button key='refund' variant='danger' onClick={() => setConfirm('refund')}>Refund {p.total.formatted}</Button>,
        can.cancel && <Button key='cancel' variant='danger' onClick={() => setConfirm('cancel')}>Cancel payment</Button>,
    ].filter(Boolean);

    return (
        <Page
            title={carrier}
            intro={`${p.reference}${route ? ` for ${route}` : ''}`}
            back={{ to: '/dt-pay/transactions', label: 'Payments' }}
            testMode={config && !config.livemode}
            actions={<StatusBadge status={p.status} onHold={p.on_hold} large />}
        >
            <ErrorBanner>{error}</ErrorBanner>
            {notice && <div className='mb-5'><Notice tone='success'>{notice}</Notice></div>}

            {/* Where the money is, and the one thing to do next. */}
            <Panel padded={false} className='mb-6'>
                <div className='grid grid-cols-1 gap-8 px-7 py-7 lg:grid-cols-[1fr_300px] lg:items-center'>
                    <div>
                        <p className='m-0 text-[14px] text-[#667085]'>{p.status === 'released' ? `Paid to ${carrier}` : `For ${carrier}`}</p>
                        <Amount value={p.amount.formatted} className='mt-1 block text-[40px] font-extrabold leading-none tracking-[-0.03em] text-[#101828]' />
                        <div className='mt-9'>
                            <MoneyRoute
                                stage={routeStage(p.status)}
                                stopped={routeStopped(p.status)}
                                carrierLabel={carrier}
                                amount={p.amount.formatted}
                                notes={[
                                    at('pay_attempt') ? `Paid ${date(at('pay_attempt'))}` : 'Not paid yet',
                                    p.funded_at ? `Since ${date(p.funded_at)}` : p.status === 'processing' ? 'Funds on the way' : null,
                                    p.released_at ? date(p.released_at) : null,
                                ]}
                            />
                        </div>
                    </div>

                    <NextStep p={p} carrier={carrier} onPay={() => navigate(`/dt-pay/new?pay=${p.id}`)} onRelease={() => setConfirm('release')} />
                </div>
            </Panel>

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]'>
                <div className='flex flex-col gap-6'>
                    <Panel title='Load and carrier'>
                        <Facts items={[
                            ['Carrier', carrier],
                            ['DOT / MC', `${p.carrier.dot}${p.carrier.mc ? ` / ${p.carrier.mc}` : ''}`],
                            ['Load', p.load_number],
                            ['Route', p.origin || p.destination ? `${p.origin || '?'} to ${p.destination || '?'}` : null],
                            ['Pickup', p.pickup_date ? date(p.pickup_date) : null],
                            ['Delivery', p.delivery_date ? date(p.delivery_date) : null],
                            ['Paid with', p.method_label ? `${p.method_label}, ${methodName(p.method_type).toLowerCase()}` : null],
                            ['Started from', p.source === 'shipment' ? 'One of your loads' : p.source === 'manual' ? 'Entered by hand' : 'Guest Pay'],
                            p.memo ? ['Note', p.memo] : null,
                        ]} />
                    </Panel>

                    <Documents p={p} canUpload={can.pod} onUploaded={setP} setError={setError} />
                    <Disputes p={p} onChange={setP} setError={setError} />

                    <Panel title='History'><Timeline items={p.timeline} /></Panel>
                </div>

                <div className='flex flex-col gap-6'>
                    <Panel title='Cost'><Breakdown b={p.breakdown} /></Panel>

                    {!['released', 'refunded', 'cancelled'].includes(p.status) && <PayoutStatus key={p.carrier.dot} dot={p.carrier.dot} name={p.carrier.name} />}

                    {secondary.length > 0 && (
                        <Panel title='More actions'>
                            <div className='flex flex-col gap-2'>{secondary}</div>
                        </Panel>
                    )}
                </div>
            </div>

            <Modal
                open={confirm === 'release'}
                title={`Pay ${p.amount.formatted} to ${carrier}?`}
                onClose={() => setConfirm(null)}
                footer={<>
                    <Button variant='secondary' onClick={() => setConfirm(null)}>Not yet</Button>
                    <Button variant='release' loading={busy === 'release'} onClick={() => run('release', () => dtpay.release(p.id), `Released. ${p.amount.formatted} is on its way to ${carrier}.`)}>Release {p.amount.formatted}</Button>
                </>}
            >
                <p className='m-0 text-[14px] leading-6 text-[#344054]'>
                    The money leaves DollarTraq and goes to the carrier's bank. This can't be undone here, so release only after the load was delivered{p.documents.pod ? '.' : '. No proof of delivery is attached yet.'}
                </p>
            </Modal>

            <RefundModal open={confirm === 'refund'} p={p} busy={busy === 'refund'} onClose={() => setConfirm(null)}
                onConfirm={(reason) => run('refund', () => dtpay.refund(p.id, reason), 'Refunded. The money reaches your account in 5 to 10 business days.')} />

            <Modal
                open={confirm === 'cancel'}
                title='Cancel this payment?'
                onClose={() => setConfirm(null)}
                footer={<>
                    <Button variant='secondary' onClick={() => setConfirm(null)}>Keep it</Button>
                    <Button variant='danger' loading={busy === 'cancel'} onClick={() => run('cancel', () => dtpay.cancel(p.id), 'Payment cancelled.')}>Cancel payment</Button>
                </>}
            >
                <p className='m-0 text-[14px] text-[#344054]'>Nothing has been charged yet. The payment will be closed.</p>
            </Modal>

            <DisputeModal open={disputeOpen} onClose={() => setDisputeOpen(false)}
                onSubmit={async (fields) => { const r = await dtpay.dispute(p.id, fields); setP(r.payment); setDisputeOpen(false); setNotice('Dispute opened. The money stays held until it is resolved.'); }} />
        </Page>
    );
}

/* The one thing to do next with this payment, or why there is nothing to do. */
function NextStep({ p, carrier, onPay, onRelease }) {
    const can = p.can;

    const box = (children) => <div className='rounded-[14px] bg-[#F9FAFB] p-5'>{children}</div>;

    if (can.pay) {
        return box(<>
            <p className='m-0 text-[14px] font-semibold text-[#101828]'>{p.status === 'failed' ? 'The payment did not go through' : 'Not paid yet'}</p>
            <p className='m-0 mt-1 text-[13.5px] leading-[1.5] text-[#475467]'>{p.status === 'failed' ? (p.failure_reason || 'It was declined.') + ' Try another method.' : 'Fund it to hold the money for the carrier.'}</p>
            <Button className='mt-4 w-full' onClick={onPay}>{p.status === 'failed' ? 'Pay again' : `Pay ${p.total.formatted}`}</Button>
        </>);
    }

    if (p.status === 'funded') {
        return box(<>
            <p className='m-0 text-[14px] font-semibold text-[#101828]'>Ready when the load delivers</p>
            <p className='m-0 mt-1 text-[13.5px] leading-[1.5] text-[#475467]'>
                {can.release
                    ? `Release sends ${p.amount.formatted} to ${carrier}.`
                    : can.release_blocked_reason
                        ? `Release is waiting: ${can.release_blocked_reason.charAt(0).toLowerCase()}${can.release_blocked_reason.slice(1)}`
                        : 'Your role cannot release this payment. Ask an admin.'}
            </p>
            <Button variant='release' size='lg' className='mt-4 w-full' disabled={!can.release} onClick={onRelease}>Release to carrier</Button>
        </>);
    }

    const copy = {
        processing: ['Funds on the way', p.method_type === 'us_bank_account' ? 'Bank payments clear in 1 to 2 business days. You can release once they arrive.' : 'Confirming the card payment.'],
        releasing: ['Releasing', 'Sending the money to the carrier.'],
        released: ['Paid', `${carrier} has the money. Nothing left to do.`],
        refunded: ['Refunded', 'The money went back to you. The carrier was not paid.'],
        refunding: ['Refunding', 'Returning the money to you.'],
        cancelled: ['Cancelled', 'This payment was closed before anything was charged.'],
    }[p.status] || [p.status, ''];

    return box(<>
        <p className='m-0 text-[14px] font-semibold text-[#101828]'>{copy[0]}</p>
        <p className='m-0 mt-1 text-[13.5px] leading-[1.5] text-[#475467]'>{copy[1]}</p>
        {p.open_dispute && <p className='m-0 mt-2 text-[13px] font-semibold text-[#B54708]'>Dispute open: {p.open_dispute.reason_label}</p>}
    </>);
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
                <Field label='Evidence' hint='Up to 5 PDFs or images, 10 MB each'>
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
        <Panel
            title='Documents'
            aside={canUpload && (
                <label className={`inline-flex cursor-pointer items-center rounded-[8px] border border-[#D0D5DD] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] ${busy ? 'opacity-50' : ''}`}>
                    {busy ? 'Uploading' : p.documents.pod ? 'Replace POD' : 'Upload POD'}
                    <input type='file' accept='.pdf,.jpg,.jpeg,.png' className='hidden' onChange={upload} disabled={busy} />
                </label>
            )}
        >
            {row('Rate confirmation', p.documents.rate_confirmation, 'rate-confirmation', `${p.reference}-rate-confirmation`)}
            {row('Proof of delivery (POD)', p.documents.pod, 'pod', `${p.reference}-pod`)}
        </Panel>
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
        <Panel title='Disputes'>
            {p.disputes.map((d) => (
                <div key={d.id} className='border-b border-[#F2F4F7] pb-4 last:border-0 last:pb-0'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                        <p className='m-0 text-[14px] font-semibold text-[#101828]'>{d.reason_label}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${d.status === 'open' ? 'bg-[#FFFAEB] text-[#B54708]' : 'bg-[#ECFDF3] text-[#067647]'}`}>{d.status === 'open' ? 'Open' : 'Resolved'}</span>
                    </div>
                    <p className='m-0 mt-1 text-[13px] text-[#475467]'>{d.details}</p>
                    <p className='m-0 mt-1 text-[12px] text-[#98A2B3]'>Raised {date(d.created_at, true)} by {d.raised_by}{d.evidence_count ? `, ${d.evidence_count} file${d.evidence_count > 1 ? 's' : ''}` : ''}</p>
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
        </Panel>
    );
}
