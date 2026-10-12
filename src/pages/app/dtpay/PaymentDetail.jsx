import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { dtpay } from './api';
import { DISPUTE_REASONS, date, methodName, routeStage, routeStopped } from './format';
import { PayoutStatus } from './parts';
import { Amount, Breakdown, Button, ErrorBanner, Facts, Field, Label, Loading, Modal, MoneyRoute, Notice, Page, Panel, StatusBadge, Timeline, inputClass } from './ui';

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
        can.hold && <Button key='hold' variant='secondary' size='sm' loading={busy === 'hold'} onClick={() => run('hold', () => dtpay.hold(p.id, true), 'Payment put on hold.')}>Put on hold</Button>,
        can.unhold && <Button key='unhold' variant='secondary' size='sm' loading={busy === 'hold'} onClick={() => run('hold', () => dtpay.hold(p.id, false), 'Hold removed.')}>Remove hold</Button>,
        can.dispute && <Button key='dispute' variant='secondary' size='sm' onClick={() => setDisputeOpen(true)}>Raise a dispute</Button>,
        ['processing', 'failed'].includes(p.status) && <Button key='sync' variant='secondary' size='sm' loading={busy === 'sync'} onClick={() => run('sync', () => dtpay.sync(p.id))}>Check status</Button>,
        can.refund && <Button key='refund' variant='danger' size='sm' onClick={() => setConfirm('refund')}>Request refund</Button>,
        can.withdraw_refund && <Button key='withdraw' variant='secondary' size='sm' loading={busy === 'withdraw'} onClick={() => run('withdraw', () => dtpay.withdrawRefund(p.id), 'Refund request withdrawn.')}>Withdraw refund request</Button>,
        can.withdraw_release && <Button key='withdraw-release' variant='secondary' size='sm' loading={busy === 'withdraw-release'} onClick={() => run('withdraw-release', () => dtpay.withdrawRelease(p.id), 'Release request withdrawn.')}>Withdraw release request</Button>,
        can.cancel && <Button key='cancel' variant='danger' size='sm' onClick={() => setConfirm('cancel')}>Cancel payment</Button>,
    ].filter(Boolean);

    const next = nextStep(p, carrier);
    const primary = can.pay
        ? <Button onClick={() => navigate(`/dt-pay/new?pay=${p.id}`)}>{p.status === 'failed' ? 'Pay again' : `Pay ${p.total.formatted}`}</Button>
        : p.status === 'funded'
            ? (p.release_requested ? null : <Button variant='release' disabled={!can.release} onClick={() => setConfirm('release')} title={can.release ? undefined : next[1]}>Request release</Button>)
            : null;

    return (
        <Page
            title='Payment'
            accent={p.reference}
            intro={`${carrier}${route ? `, ${route}` : ''}`}
            back={{ to: '/dt-pay/transactions', label: 'Payments' }}
            testMode={config && !config.livemode}
            actions={(secondary.length > 0 || primary) && <>{secondary}{primary}</>}
        >
            <ErrorBanner>{error}</ErrorBanner>
            {notice && <div className='mb-4'><Notice tone='success'>{notice}</Notice></div>}

            <RequestBanner p={p} carrier={carrier} />

            <section className='mb-5 rounded-2xl border border-[#e8e8e8] bg-white'>
                <div className='flex flex-col gap-5 px-5 pt-6 sm:px-7 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                        <Label>{p.status === 'released' ? 'Paid to carrier' : 'Carrier receives'}</Label>
                        <div className='mt-2 flex flex-wrap items-center gap-3'>
                            <Amount value={p.amount.formatted} className='text-[34px] font-extrabold leading-none tracking-[-0.5px] text-[#0f172a] sm:text-[40px]' />
                            <StatusBadge status={p.status} onHold={p.on_hold} refundRequested={p.refund_requested} releaseRequested={p.release_requested} large />
                        </div>
                    </div>
                    <div className={`max-w-[440px] rounded-xl border px-4 py-3 ${next[2] === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-[#BFDBFE] bg-[#EFF6FF]'}`}>
                        <p className={`m-0 text-[13px] font-semibold ${next[2] === 'warn' ? 'text-amber-900' : 'text-[#1E40AF]'}`}>{next[0]}</p>
                        <p className={`m-0 mt-0.5 text-[12.5px] leading-[1.5] ${next[2] === 'warn' ? 'text-amber-800' : 'text-[#1E40AF]/85'}`}>{next[1]}</p>
                    </div>
                </div>

                <dl className='m-0 mt-6 grid grid-cols-2 gap-y-4 border-y border-[#f1f5f9] px-5 py-4 sm:px-7 lg:grid-cols-5 lg:divide-x lg:divide-[#f1f5f9]'>
                    <Stat label='Carrier' value={carrier} sub={`DOT ${p.carrier.dot}`} first />
                    <Stat label='Load' value={p.load_number || '—'} sub={p.origin || p.destination ? `${p.origin || '?'} to ${p.destination || '?'}` : null} />
                    <Stat label='You paid' value={<Amount value={p.total.formatted} />} sub={p.method_label || 'Not paid yet'} />
                    <Stat label='Created' value={date(p.created_at)} sub={p.source === 'shipment' ? 'From one of your loads' : p.source === 'manual' ? 'Entered by hand' : 'Guest Pay'} />
                    <Stat label={p.released_at ? 'Released' : 'Funded'} value={date(p.released_at || p.funded_at)} sub={p.released_at ? 'Money with the carrier' : p.funded_at ? 'Held by DollarTraq' : 'Not yet'} />
                </dl>

                <div className='px-5 pb-6 pt-9 sm:px-7'>
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
            </section>

            <div className='grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]'>
                <div className='flex flex-col gap-5'>
                    <Panel title='Activity'><Timeline items={p.timeline} /></Panel>
                    <Disputes p={p} onChange={setP} setError={setError} />
                    <Panel title='Load details'>
                        <Facts items={[
                            ['DOT / MC', `${p.carrier.dot}${p.carrier.mc ? ` / ${p.carrier.mc}` : ''}`],
                            ['Pickup', p.pickup_date ? date(p.pickup_date) : null],
                            ['Delivery', p.delivery_date ? date(p.delivery_date) : null],
                            ['Paid with', p.method_label ? `${p.method_label}, ${methodName(p.method_type).toLowerCase()}` : null],
                            p.memo ? ['Note', p.memo] : null,
                        ]} />
                    </Panel>
                </div>

                <div className='flex flex-col gap-5'>
                    <Panel title='Cost'><Breakdown b={p.breakdown} /></Panel>
                    <Documents p={p} canUpload={can.pod} onUploaded={setP} setError={setError} />
                    {!['released', 'refunded', 'cancelled'].includes(p.status) && <PayoutStatus key={p.carrier.dot} dot={p.carrier.dot} name={p.carrier.name} />}
                </div>
            </div>

            <ReleaseModal open={confirm === 'release'} p={p} carrier={carrier} busy={busy === 'release'} onClose={() => setConfirm(null)}
                onConfirm={(note) => run('release', () => dtpay.release(p.id, note), `Release requested. DollarTraq will check the load and send ${p.amount.formatted} to ${carrier}.`)} />

            <RefundModal open={confirm === 'refund'} p={p} busy={busy === 'refund'} onClose={() => setConfirm(null)}
                onConfirm={(reason) => run('refund', () => dtpay.refund(p.id, reason), 'Refund requested. DollarTraq will review it, and the money stays held until they decide.')} />

            <Modal
                open={confirm === 'cancel'}
                title='Cancel this payment?'
                onClose={() => setConfirm(null)}
                footer={<>
                    <Button variant='secondary' onClick={() => setConfirm(null)}>Keep it</Button>
                    <Button variant='danger' loading={busy === 'cancel'} onClick={() => run('cancel', () => dtpay.cancel(p.id), 'Payment cancelled.')}>Cancel payment</Button>
                </>}
            >
                <p className='m-0 text-[14px] text-[#334155]'>Nothing has been charged yet. The payment will be closed.</p>
            </Modal>

            <DisputeModal open={disputeOpen} onClose={() => setDisputeOpen(false)}
                onSubmit={async (fields) => { const r = await dtpay.dispute(p.id, fields); setP(r.payment); setDisputeOpen(false); setNotice('Dispute opened. The money stays held until it is resolved.'); }} />
        </Page>
    );
}

/* What happens next with this payment: [title, text, tone]. */
function nextStep(p, carrier) {
    const can = p.can;

    if (p.refund_requested) return ['Release paused', 'Waiting for DollarTraq to decide on your refund request.', 'warn'];
    if (p.release_requested) return ['DollarTraq is releasing', `DollarTraq checks the load, then sends ${p.amount.formatted} to ${carrier}.`, 'info'];
    if (p.open_dispute) return [`Dispute open: ${p.open_dispute.reason_label}`, 'The money stays held until the dispute is resolved.', 'warn'];
    if (p.status === 'failed') return ['The payment did not go through', `${p.failure_reason || 'It was declined.'} Try another method.`, 'warn'];
    if (can.pay) return ['Not paid yet', 'Pay to hold the money for the carrier.', 'info'];

    if (p.status === 'funded') {
        if (can.release) return ['Ready when the load delivers', `Once it is delivered, ask DollarTraq to release ${p.amount.formatted} to ${carrier}. Attaching the POD speeds it up.`, 'info'];
        if (can.release_blocked_reason) return ['Release is waiting', can.release_blocked_reason, 'warn'];
        return ['Release needs an admin', 'Your role cannot ask for this release.', 'warn'];
    }

    return {
        processing: ['Funds on the way', p.method_type === 'us_bank_account' ? 'Bank payments clear in 1 to 2 business days. You can ask for release once they arrive.' : 'Confirming the card payment.', 'info'],
        releasing: ['Releasing', 'Sending the money to the carrier.', 'info'],
        released: ['Paid', `${carrier} has the money. Nothing left to do.`, 'info'],
        refunded: ['Refunded', 'The money went back to you. The carrier was not paid.', 'info'],
        refunding: ['Refunding', 'Returning the money to you.', 'info'],
        cancelled: ['Cancelled', 'This payment was closed before anything was charged.', 'info'],
    }[p.status] || [p.status, '', 'info'];
}

function Stat({ label, value, sub, first = false }) {
    return (
        <div className={`min-w-0 pr-4 ${first ? '' : 'lg:pl-5'}`}>
            <dt><Label>{label}</Label></dt>
            <dd className='m-0 mt-1.5 truncate text-[14px] font-semibold text-[#1a1a1a]'>{value}</dd>
            {sub && <dd className='m-0 mt-0.5 truncate text-[11.5px] text-[#8a94a6]'>{sub}</dd>}
        </div>
    );
}

function RefundModal({ open, p, busy, onClose, onConfirm }) {
    const [reason, setReason] = useState('');
    const ok = reason.trim().length >= 5;

    return (
        <Modal
            open={open}
            title='Request a refund'
            onClose={onClose}
            footer={<>
                <Button variant='secondary' onClick={onClose}>Cancel</Button>
                <Button variant='danger' loading={busy} disabled={!ok} onClick={() => onConfirm(reason.trim())}>Send request</Button>
            </>}
        >
            <p className='m-0 mb-4 text-[13.5px] leading-6 text-[#334155]'>
                DollarTraq reviews every refund. If approved, {p.total.formatted} goes back to {p.method_label || 'the original payment method'} and the carrier is not paid.
                Until DollarTraq decides, the money stays held and cannot be released.
            </p>
            <Field label='Why do you need a refund?' required hint='DollarTraq reads this before deciding.'>
                <textarea rows={3} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder='For example: the shipper cancelled the load before pickup.' maxLength={500} />
            </Field>
        </Modal>
    );
}

function ReleaseModal({ open, p, carrier, busy, onClose, onConfirm }) {
    const [note, setNote] = useState('');

    return (
        <Modal
            open={open}
            title={`Ask DollarTraq to pay ${carrier}?`}
            onClose={onClose}
            footer={<>
                <Button variant='secondary' onClick={onClose}>Not yet</Button>
                <Button variant='release' loading={busy} onClick={() => onConfirm(note.trim())}>Request release of {p.amount.formatted}</Button>
            </>}
        >
            <p className='m-0 mb-4 text-[13.5px] leading-6 text-[#334155]'>
                DollarTraq checks the load and then sends {p.amount.formatted} to {carrier}'s bank. Ask only once the load was delivered.
                {p.documents.pod ? '' : ' No proof of delivery is attached yet: adding one speeds up the check.'}
            </p>
            <Field label='Note for DollarTraq (optional)'>
                <textarea rows={2} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder='For example: delivered Oct 14, signed POD attached.' maxLength={500} />
            </Field>
        </Modal>
    );
}

/* Where the broker's release or refund request stands: the open one, else the latest decision. */
function RequestBanner({ p, carrier }) {
    const candidates = [p.release_request, p.refund_request].filter((r) => r && r.status !== 'withdrawn');
    const r = candidates.find((x) => ['pending', 'approving'].includes(x.status))
        || candidates.sort((a, b) => String(b.decided_at || b.created_at).localeCompare(String(a.decided_at || a.created_at)))[0];

    if (!r) return null;

    const release = r.type === 'release';
    const what = release ? `release ${p.amount.formatted} to ${carrier}` : `refund ${p.total.formatted}`;
    const tone = {
        pending: ['border-[#BFDBFE] bg-[#EFF6FF]', 'text-[#1E40AF]', release ? 'Release requested' : 'Refund requested', `DollarTraq is reviewing your request to ${what}. Asked ${date(r.created_at, true)}.`],
        approving: ['border-[#BFDBFE] bg-[#EFF6FF]', 'text-[#1E40AF]', 'Approved', 'DollarTraq approved it and the money is moving.'],
        approved: ['border-green-200 bg-green-50', 'text-green-900', release ? 'Released by DollarTraq' : 'Refund approved by DollarTraq', release ? `Approved ${date(r.decided_at, true)}. ${carrier} has been paid.` : `Approved ${date(r.decided_at, true)}. The money reaches your account in 5 to 10 business days.`],
        rejected: ['border-red-200 bg-red-50', 'text-red-900', release ? 'Release declined by DollarTraq' : 'Refund declined by DollarTraq', `Declined ${date(r.decided_at, true)}. The money is still held.`],
    }[r.status];

    if (!tone) return null;

    return (
        <div className={`mb-5 rounded-2xl border px-5 py-4 ${tone[0]}`}>
            <p className={`m-0 text-[14px] font-bold ${tone[1]}`}>{tone[2]}</p>
            <p className={`m-0 mt-1 text-[13px] ${tone[1]}`}>{tone[3]}</p>
            {(r.reason || r.decision_note) && (
                <div className={`mt-3 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2 ${tone[1]}`}>
                    {r.reason && <div><Label>{release ? 'Your note' : 'Your reason'}</Label><p className='m-0 mt-1'>{r.reason}</p></div>}
                    {r.decision_note && <div><Label>DollarTraq's note</Label><p className='m-0 mt-1'>{r.decision_note}</p></div>}
                </div>
            )}
        </div>
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
                <p className='m-0 text-[12px] text-[#6b7280]'>The money stays held while the dispute is open.</p>
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
        <div className='flex items-center justify-between gap-3 border-b border-[#f1f5f9] py-3 last:border-0'>
            <span className='text-[13.5px] text-[#1a1a1a]'>{label}</span>
            {has ? <Button variant='ghost' onClick={() => dtpay.download(p.id, kind, name).catch((e) => setError(e.message))}>Download</Button>
                : <span className='text-[12.5px] text-[#9ca3af]'>Not attached</span>}
        </div>
    );

    return (
        <Panel
            title='Documents'
            aside={canUpload && (
                <label className={`inline-flex cursor-pointer items-center rounded-[8px] border border-[#dbe4ee] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#334155] hover:bg-[#F9FAFB] ${busy ? 'opacity-50' : ''}`}>
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
                <div key={d.id} className='border-b border-[#f1f5f9] pb-4 last:border-0 last:pb-0'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                        <p className='m-0 text-[14px] font-semibold text-[#1a1a1a]'>{d.reason_label}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${d.status === 'open' ? 'bg-[#FFFAEB] text-[#B54708]' : 'bg-[#ECFDF3] text-[#067647]'}`}>{d.status === 'open' ? 'Open' : 'Resolved'}</span>
                    </div>
                    <p className='m-0 mt-1 text-[13px] text-[#475569]'>{d.details}</p>
                    <p className='m-0 mt-1 text-[12px] text-[#9ca3af]'>Raised {date(d.created_at, true)} by {d.raised_by}{d.evidence_count ? `, ${d.evidence_count} file${d.evidence_count > 1 ? 's' : ''}` : ''}</p>
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
