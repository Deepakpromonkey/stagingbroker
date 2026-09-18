import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
    ShieldOutlined,
    CloseOutlined,
    MailOutlineOutlined,
    HourglassEmptyOutlined,
    PictureAsPdfOutlined,
    InsertDriveFileOutlined,
    DownloadOutlined
} from '@mui/icons-material';

import Skeleton from '@mui/material/Skeleton';

import { apiFetch, apiBlobUrl, apiDownload } from '../lib/api';

const PREFERRED_LIMIT_KEYS = [
    'COMBINED SINGLE LIMIT (Ea accident)',
    'EACH OCCURRENCE',
    'GENERAL AGGREGATE'
];

function pickHeadlineLimit(limits) {
    if (!limits || typeof limits !== 'object') {
        return null;
    }

    const preferred = PREFERRED_LIMIT_KEYS.find((key) => limits[key]);
    if (preferred) {
        return { label: preferred, amount: limits[preferred] };
    }

    const [label, amount] = Object.entries(limits)[0] || [];
    return label ? { label, amount } : null;
}

function extractCoverages(rows) {
    if (!Array.isArray(rows)) {
        return [];
    }

    for (const row of rows) {
        const coverages = row?.extracted_json?.data?.COVERAGES;
        if (Array.isArray(coverages) && coverages.length > 0) {
            return coverages;
        }
    }

    return [];
}

function CoiDocumentModal({ url, onClose }) {
    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[16px]'
            onClick={onClose}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                className='flex h-full w-full max-w-[900px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl'
            >
                <div className='flex items-center justify-between border-b border-[#e5e7eb] px-[16px] py-[12px]'>
                    <h3 className='text-[15px] font-[700] text-[#111827]'>
                        Certificate of Insurance
                    </h3>

                    <div className='flex items-center gap-[8px]'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='flex items-center justify-center rounded-[8px] p-[6px] text-[#6b7280] transition-colors hover:bg-[#f1f5f9] hover:text-[#111827]'
                        >
                            <CloseOutlined sx={{ fontSize: 18 }} />
                        </button>
                    </div>
                </div>

                <div className='flex-1 bg-[#f8fafc]'>
                    <iframe
                        src={url}
                        title='Certificate of Insurance'
                        className='h-full w-full border-0'
                    />
                </div>
            </div>
        </div>
    );
}

/*
 * How each request status reads on the card.
 *
 * `responded` is deliberately not called "responded": from the broker's side
 * the agency has answered but the answer is still being read, and showing
 * "Responded" next to a blank expiry date invites the question of where the
 * date went.
 */
const REQUEST_STATUS = {
    pending: {
        label: 'Pending',
        className: 'bg-[#fef3c7] text-[#92400e]'
    },
    responded: {
        label: 'Reading reply',
        className: 'bg-[#dbeafe] text-[#1e40af]'
    },
    success: {
        label: 'Received',
        className: 'bg-[#dcfce7] text-[#166534]'
    },
    awaiting: {
        label: 'Awaiting cert',
        className: 'bg-[#fef3c7] text-[#92400e]'
    },
    failed: {
        label: 'Failed',
        className: 'bg-[#fee2e2] text-[#991b1b]'
    },
    expired: {
        label: 'No response',
        className: 'bg-[#e2e8f0] text-[#475569]'
    }
};

// Statuses where the agency has been mailed and has not finished answering,
// so the raise button stays disabled rather than sending a duplicate.
// `awaiting` counts: the agency replied without a date and the certificate is
// still expected, so a second request would chase a conversation already open.
const OPEN_STATUSES = ['pending', 'responded', 'awaiting'];

function formatDate(value) {

    if (!value) {
        return 'NA';
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? value
        : parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
}

function formatDateTime(value) {

    if (!value) {
        return 'NA';
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
        ? value
        : parsed.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
}

/*
 * The request's path, as a rail down the left of the thread.
 *
 * A status chip says where a request stopped; this says how it got there and
 * what it is still waiting for, which is the difference between "chase the
 * agency again" and "leave it alone, the reply is being read".
 */
function StatePath({ steps }) {

    if (!Array.isArray(steps) || steps.length === 0) {
        return null;
    }

    // The request's current position: the last step actually reached.
    let currentIndex = -1;

    steps.forEach(function (step, index) {

        if (step.reached) {
            currentIndex = index;
        }
    });

    return (
        <ol className='mb-[16px] rounded-[10px] bg-[#f8fafc] px-[14px] py-[12px]'>

            {steps.map(function (step, index) {
                const isCurrent = index === currentIndex;
                const isLast = index === steps.length - 1;

                return (
                    <li key={step.state} className='flex gap-[10px]'>

                        {/*
                          * The rail. The dot marks the step and the line joins
                          * it to the next one, so an unreached tail reads as
                          * "not yet" rather than as a gap.
                          */}
                        <div className='flex flex-col items-center'>

                            <span
                                className={`mt-[4px] h-[9px] w-[9px] flex-shrink-0 rounded-full ${
                                    step.reached ? 'bg-[#0f57c8]' : 'bg-[#cbd5e1]'
                                }`}
                            />

                            {!isLast ? (
                                <span
                                    className={`w-[2px] flex-1 ${
                                        step.reached ? 'bg-[#bfdbfe]' : 'bg-[#e2e8f0]'
                                    }`}
                                />
                            ) : null}

                        </div>

                        <div className={isLast ? 'pb-[2px]' : 'pb-[12px]'}>

                            <p
                                className={`text-[12px] font-[700] ${
                                    step.reached ? 'text-[#111827]' : 'text-[#94a3b8]'
                                }`}
                            >
                                {step.label}

                                {isCurrent ? (
                                    <span className='ml-[6px] rounded-[999px] bg-[#dbeafe] px-[7px] py-[1px] text-[9px] font-[700] uppercase tracking-[0.06em] text-[#1e40af]'>
                                        Now
                                    </span>
                                ) : null}
                            </p>

                            {step.detail ? (
                                <p className='mt-[2px] break-words text-[11px] font-[500] text-[#475569]'>
                                    {step.detail}
                                </p>
                            ) : null}

                            {step.at ? (
                                <p className='mt-[2px] text-[11px] font-[500] text-[#94a3b8]'>
                                    {formatDateTime(step.at)}
                                </p>
                            ) : null}

                        </div>

                    </li>
                );
            })}

        </ol>
    );
}

/*
 * What each signal the model raises means to a broker.
 *
 * Kept as prose rather than the raw token: `certificate_disowned` is the most
 * serious thing a reply can say and it should not need decoding.
 */
const REPLY_SIGNALS = {
    policy_not_in_force: { label: 'Policy not in force', tone: 'bad' },
    cancellation_rescinded: { label: 'Cancellation withdrawn', tone: 'good' },
    awaiting_authorization: { label: 'Needs insured\u2019s approval', tone: 'wait' },
    renewal_pending: { label: 'Renewal not yet bound', tone: 'wait' },
    wrong_agency: { label: 'No longer this agency', tone: 'wait' },
    direct_writer: { label: 'Direct policy \u2014 agency cannot issue', tone: 'wait' },
    out_of_office: { label: 'Out of office', tone: 'wait' },
    asks_requirements: { label: 'Asking what we need', tone: 'wait' },
    certificate_disowned: { label: 'Agency did not issue this certificate', tone: 'bad' },
    limit_discrepancy: { label: 'Limit differs from the certificate', tone: 'bad' },
    insurer_changed: { label: 'Insurer changed', tone: 'wait' },
    filing_lag: { label: 'FMCSA filing behind', tone: 'wait' }
};

const SIGNAL_TONE = {
    bad: 'bg-[#fee2e2] text-[#991b1b]',
    wait: 'bg-[#fef3c7] text-[#92400e]',
    good: 'bg-[#dcfce7] text-[#166534]'
};

function money(value) {

    if (typeof value !== 'number' || Number.isNaN(value)) {
        return null;
    }

    return '$' + value.toLocaleString('en-US');
}

/*
 * The model's reading of one reply, beside the reply itself.
 *
 * A broker books loads on limits and exclusions as much as on the expiry date,
 * and those arrive as prose buried in the same mail - so what was read out of
 * it is shown next to it rather than left in the JSON.
 */
function ReplyReading({ reading }) {

    if (!reading) {
        return null;
    }

    const coverages = Array.isArray(reading.coverages) ? reading.coverages : [];
    const exclusions = Array.isArray(reading.exclusions) ? reading.exclusions : [];
    const subLimits = Array.isArray(reading.sub_limits) ? reading.sub_limits : [];
    const signals = Array.isArray(reading.signals) ? reading.signals : [];

    const hasBody = coverages.length || exclusions.length || subLimits.length
        || signals.length || reading.policy_number || reading.insurer || reading.holder_name;

    if (!hasBody) {
        return null;
    }

    return (
        <div className='mt-[8px] rounded-[8px] bg-[#f8fafc] p-[10px] ring-1 ring-[#e5e7eb]'>

            {signals.length ? (
                <div className='mb-[8px] flex flex-wrap gap-[5px]'>
                    {signals.map(function (signal) {
                        const known = REPLY_SIGNALS[signal];

                        return (
                            <span
                                key={signal}
                                className={`rounded-[999px] px-[8px] py-[2px] text-[10px] font-[700] ${
                                    SIGNAL_TONE[known?.tone] || 'bg-[#e2e8f0] text-[#475569]'
                                }`}
                            >
                                {known ? known.label : signal.replace(/_/g, ' ')}
                            </span>
                        );
                    })}
                </div>
            ) : null}

            {reading.summary ? (
                <p className='mb-[8px] text-[12px] font-[500] italic text-[#475569]'>
                    {reading.summary}
                </p>
            ) : null}

            {coverages.length ? (
                <table className='mb-[8px] w-full border-collapse text-[11.5px]'>
                    <tbody>
                        {coverages.map(function (coverage, index) {
                            return (
                                <tr key={`${coverage?.type || 'coverage'}-${index}`}>
                                    <td className='py-[2px] pr-[8px] font-[600] capitalize text-[#334155]'>
                                        {coverage?.type || 'Coverage'}
                                    </td>
                                    <td className='py-[2px] pr-[8px] text-right font-[700] tabular-nums text-[#111827]'>
                                        {money(coverage?.limit) || '\u2014'}
                                    </td>
                                    <td className='py-[2px] text-right text-[#64748b]'>
                                        {coverage?.expiry_date ? formatDate(coverage.expiry_date) : ''}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : null}

            {/*
              * Sub-limits sit above exclusions and carry the warning colour:
              * a $100,000 seafood sub-limit under a $250,000 cargo line is how
              * a load gets tendered under-insured on a certificate that reads
              * as perfectly good.
              */}
            {subLimits.length ? (
                <div className='mb-[8px] rounded-[6px] bg-[#fef3c7] px-[9px] py-[7px]'>

                    <p className='text-[10px] font-[700] uppercase tracking-[0.06em] text-[#92400e]'>
                        Commodity sub-limits
                    </p>

                    <ul className='mt-[3px] flex flex-col gap-[2px]'>
                        {subLimits.map(function (limit, index) {
                            return (
                                <li key={`${limit?.commodity || 'sub'}-${index}`} className='text-[11.5px] font-[600] text-[#7c2d12]'>
                                    {limit?.commodity}: {money(limit?.limit) || '\u2014'}
                                </li>
                            );
                        })}
                    </ul>

                </div>
            ) : null}

            {exclusions.length ? (
                <div className='mb-[8px]'>

                    <p className='text-[10px] font-[700] uppercase tracking-[0.06em] text-[#94a3b8]'>
                        Not covered
                    </p>

                    <ul className='mt-[3px] flex flex-col gap-[2px]'>
                        {exclusions.map(function (exclusion, index) {
                            return (
                                <li key={`exclusion-${index}`} className='text-[11.5px] font-[500] text-[#475569]'>
                                    &middot; {exclusion}
                                </li>
                            );
                        })}
                    </ul>

                </div>
            ) : null}

            <div className='flex flex-wrap gap-x-[14px] gap-y-[3px] text-[11px] text-[#64748b]'>
                {reading.policy_number ? <span>Policy <b className='font-[600] text-[#334155]'>{reading.policy_number}</b></span> : null}
                {reading.insurer ? <span>Insurer <b className='font-[600] text-[#334155]'>{reading.insurer}</b></span> : null}
                {reading.holder_name ? <span>Holder <b className='font-[600] text-[#334155]'>{reading.holder_name}</b></span> : null}
                {reading.alternate_email ? <span>Write instead to <b className='font-[600] text-[#334155]'>{reading.alternate_email}</b></span> : null}
            </div>

        </div>
    );
}

function formatBytes(bytes) {

    if (!bytes || bytes < 1024) {
        return `${bytes || 0} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/*
 * The files that came attached to one reply.
 *
 * The reading above this is the machine's account of a document; this is the
 * document. A broker about to book a load on an extracted date should be able
 * to open the certificate rather than take the reading's word for it, so it
 * opens in place instead of behind a download.
 *
 * The file sits behind the bearer token, which an <iframe src> cannot carry,
 * so it is fetched as a blob and handed over as an object URL - revoked when
 * the selection changes or the thread closes. The preview state carries the
 * path it belongs to, so a slow fetch for a file the broker has already
 * clicked past cannot render over the one they are looking at.
 */
function MessageAttachments({ attachments }) {

    const previewable = attachments.filter((file) => file.previewable);

    const [activeUuid, setActiveUuid] = useState(previewable[0]?.uuid || null);
    const [preview, setPreview] = useState(null);
    const [downloadError, setDownloadError] = useState(null);

    const active = attachments.find((file) => file.uuid === activeUuid) || null;
    const activePath = active?.path || null;

    useEffect(function () {

        if (!activePath) {
            return undefined;
        }

        let cancelled = false;
        let objectUrl = null;

        apiBlobUrl(activePath)
            .then(function (url) {

                objectUrl = url;

                if (cancelled) {
                    URL.revokeObjectURL(url);
                    return;
                }

                setPreview({ path: activePath, url, error: null });
            })
            .catch(function (err) {
                if (cancelled) return;
                setPreview({ path: activePath, url: null, error: err.message || 'Could not load the file.' });
            });

        return function () {
            cancelled = true;

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };

    }, [activePath]);

    if (!attachments.length) {
        return null;
    }

    const isPdf = (active?.content_type || '').toLowerCase() === 'application/pdf';

    // A result from a previous selection is not this file's, so it does not get
    // to render as though it were.
    const shown = preview && preview.path === activePath ? preview : null;

    return (
        <div className='mt-[8px]'>

            <p className='mb-[6px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8]'>
                {attachments.length === 1 ? 'Attached certificate' : `Attached (${attachments.length})`}
            </p>

            <div className='mb-[8px] flex flex-col gap-[5px]'>

                {attachments.map(function (file) {

                    const isActive = file.uuid === activeUuid;

                    return (
                        <div
                            key={file.uuid}
                            className={`flex items-center gap-[8px] rounded-[8px] border px-[9px] py-[7px] transition-colors ${
                                isActive ? 'border-[#93c5fd] bg-[#eff6ff]' : 'border-[#e5e7eb] bg-white'
                            }`}
                        >

                            {(file.content_type || '').toLowerCase() === 'application/pdf' ? (
                                <PictureAsPdfOutlined className='text-[#b91c1c]' sx={{ fontSize: 18 }} />
                            ) : (
                                <InsertDriveFileOutlined className='text-[#64748b]' sx={{ fontSize: 18 }} />
                            )}

                            <button
                                type='button'
                                disabled={!file.previewable}
                                onClick={() => setActiveUuid(file.uuid)}
                                className='min-w-0 flex-1 text-left disabled:cursor-default'
                            >
                                <span className='block truncate text-[12px] font-[600] text-[#111827]'>
                                    {file.filename}
                                </span>

                                <span className='block text-[10.5px] font-[500] text-[#94a3b8]'>
                                    {formatBytes(file.size_bytes)}
                                    {file.previewable ? (isActive ? ' \u00b7 showing below' : ' \u00b7 click to view') : ''}
                                </span>
                            </button>

                            <button
                                type='button'
                                title='Download'
                                onClick={() => {
                                    setDownloadError(null);

                                    // Unhandled otherwise: apiDownload rejects on
                                    // a file that has since been cleared off the
                                    // disk, and a click that silently does
                                    // nothing reads as a bug.
                                    apiDownload(file.path, file.filename).catch(
                                        (err) => setDownloadError(err.message || 'Could not download the file.')
                                    );
                                }}
                                className='flex items-center justify-center rounded-[6px] p-[5px] text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#111827]'
                            >
                                <DownloadOutlined sx={{ fontSize: 16 }} />
                            </button>

                        </div>
                    );
                })}

            </div>

            {downloadError ? (
                <p className='mb-[6px] text-[11px] font-[500] text-[#991b1b]'>{downloadError}</p>
            ) : null}

            {active ? (
                !shown ? (
                    <Skeleton variant='rounded' height={320} sx={{ borderRadius: '8px' }} />
                ) : shown.error ? (
                    <p className='text-[11px] font-[500] text-[#991b1b]'>{shown.error}</p>
                ) : shown.url ? (
                    isPdf ? (
                        <iframe
                            src={shown.url}
                            title={active.filename}
                            className='h-[380px] w-full rounded-[8px] ring-1 ring-[#e5e7eb]'
                        />
                    ) : (
                        <img
                            src={shown.url}
                            alt={active.filename}
                            className='max-h-[380px] w-full rounded-[8px] object-contain ring-1 ring-[#e5e7eb]'
                        />
                    )
                ) : null
            ) : null}

        </div>
    );
}

/*
 * One message in the thread.
 *
 * Outbound and inbound are told apart by which side of the card the accent
 * sits on rather than by a label, so a broker can count the replies at a
 * glance without reading any of them.
 */
function ThreadMessage({ message }) {
    const isOutbound = message.direction === 'outbound';

    return (
        <li
            className={`rounded-[10px] p-[12px] ring-1 ${
                isOutbound
                    ? 'bg-[#f8fafc] ring-[#e5e7eb]'
                    : 'bg-white ring-[#bfdbfe]'
            }`}
        >
            <div className='flex flex-wrap items-baseline justify-between gap-[6px]'>

                <p className='text-[12px] font-[700] text-[#111827]'>
                    {isOutbound ? 'Sent to agency' : 'Reply from agency'}
                </p>

                <p className='text-[11px] font-[500] text-[#94a3b8]'>
                    {formatDateTime(message.at)}
                </p>

            </div>

            <p className='mt-[3px] break-words text-[11px] font-[500] text-[#475569]'>
                {isOutbound
                    ? `To ${message.to_email || 'NA'}`
                    : `From ${message.from_name
                        ? `${message.from_name} <${message.from_email}>`
                        : message.from_email || 'NA'}`}
            </p>

            {message.subject ? (
                <p className='mt-[6px] break-words text-[12px] font-[600] text-[#334155]'>
                    {message.subject}
                </p>
            ) : null}

            {message.body_text ? (
                <pre className='mt-[8px] whitespace-pre-wrap break-words rounded-[8px] bg-white p-[10px] text-[12px] leading-[1.6] text-[#334155] ring-1 ring-[#e5e7eb]'>
                    {message.body_text}
                </pre>
            ) : isOutbound ? (
                /*
                 * The body is built from a template at send time and never
                 * stored, and the broker chooses the questions - so there is
                 * no single "standard request" to describe. The questions
                 * themselves are what to show.
                 */
                <div className='mt-[8px]'>

                    {Array.isArray(message.asks) && message.asks.length ? (
                        <ul className='flex flex-col gap-[3px]'>
                            {message.asks.map(function (ask, index) {
                                return (
                                    <li key={`ask-${index}`} className='text-[11.5px] font-[500] text-[#475569]'>
                                        &middot; {ask}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className='text-[11px] font-[500] text-[#94a3b8]'>
                            Request for current insurance details.
                        </p>
                    )}

                    {message.holder_name ? (
                        <p className='mt-[5px] text-[11.5px] font-[500] text-[#475569]'>
                            Holder given as <b className='font-[700] text-[#334155]'>{message.holder_name}</b>
                        </p>
                    ) : null}

                    {/*
                      * The broker's own question, set apart from the standard
                      * list: it is the one line an agency is most likely to
                      * answer specifically, so it should be findable later.
                      */}
                    {message.ask_note ? (
                        <p className='mt-[7px] rounded-[6px] bg-[#eff6ff] px-[9px] py-[6px] text-[11.5px] font-[600] text-[#1e40af]'>
                            {message.ask_note}
                        </p>
                    ) : null}

                </div>
            ) : (
                <p className='mt-[8px] text-[11px] font-[500] text-[#94a3b8]'>
                    The reply had no readable text.
                </p>
            )}

            {message.extracted_expiry_date ? (
                <div className='mt-[8px] rounded-[8px] bg-[#f0fdf4] px-[10px] py-[7px]'>

                    <p className='text-[10px] font-[700] uppercase tracking-[0.08em] text-[#15803d]'>
                        Expiry date read from this reply
                    </p>

                    <p className='mt-[2px] text-[14px] font-[800] text-[#166534]'>
                        {formatDate(message.extracted_expiry_date)}
                    </p>

                </div>
            ) : null}

            <MessageAttachments attachments={message.attachments || []} />

            <ReplyReading reading={message.extracted} />

            {/*
              * The machine's reading of the reply, folded away. A broker
              * acting on an extracted date should be able to check it against
              * the source, but it is not what they open the thread to see.
              */}
            {message.llm_response ? (
                <details className='mt-[8px]'>

                    <summary className='cursor-pointer text-[11px] font-[600] text-[#0f57c8]'>
                        How this was read
                    </summary>

                    <pre className='mt-[6px] whitespace-pre-wrap break-words rounded-[8px] bg-[#f8fafc] p-[10px] text-[11px] leading-[1.6] text-[#475569] ring-1 ring-[#e5e7eb]'>
                        {message.llm_response}
                    </pre>

                </details>
            ) : null}

        </li>
    );
}

/*
 * How the certificate compared to the FMCSA filing.
 *
 * Shown above the thread rather than inside it: it is a fact about the
 * request, not about any one reply, and it is the thing that decides whether
 * a broker can act on the date underneath it.
 */
const VERIFICATION = {
    matches: {
        label: 'Matches FMCSA',
        className: 'border-[#86efac] bg-[#f0fdf4] text-[#166534]'
    },
    filing_lag: {
        label: 'FMCSA filing behind',
        className: 'border-[#fcd34d] bg-[#fffbeb] text-[#92400e]'
    },
    insurer_mismatch: {
        label: 'Insurer does not match FMCSA',
        className: 'border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]'
    },
    pending_cancellation: {
        label: 'Cancellation pending at FMCSA',
        className: 'border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]'
    },
    not_checked: {
        label: 'Not checked against FMCSA',
        className: 'border-[#e2e8f0] bg-[#f8fafc] text-[#475569]'
    }
};

/*
 * Whether the certificate can be believed at all.
 *
 * Sits above the FMCSA comparison because it is the prior question: a
 * certificate the agency says it never issued does not need checking against
 * a filing. Deliberately the loudest thing in the modal - both sequences it
 * comes from are ones where every other check passes.
 */
function TrustBanner({ trust }) {

    if (!trust || !trust.verdict || trust.verdict === 'no_concerns') {
        return null;
    }

    const isStop = trust.verdict === 'do_not_rely';
    const flags = Array.isArray(trust.flags) ? trust.flags : [];

    return (
        <div
            className={`mb-[14px] rounded-[10px] border-l-[4px] px-[14px] py-[12px] ${
                isStop
                    ? 'border-[#dc2626] bg-[#fef2f2]'
                    : 'border-[#f59e0b] bg-[#fffbeb]'
            }`}
        >
            <p className={`text-[13px] font-[800] ${isStop ? 'text-[#991b1b]' : 'text-[#92400e]'}`}>
                {isStop ? 'Do not rely on this certificate' : 'Check this certificate before relying on it'}
            </p>

            <ul className='mt-[6px] flex flex-col gap-[3px]'>
                {flags.map(function (flag, index) {
                    return (
                        <li
                            key={flag?.code || `flag-${index}`}
                            className={`text-[12px] font-[500] ${isStop ? 'text-[#7f1d1d]' : 'text-[#7c2d12]'}`}
                        >
                            &middot; {flag?.message}
                        </li>
                    );
                })}
            </ul>

        </div>
    );
}

function VerificationBanner({ verification }) {

    if (!verification || !verification.verdict) {
        return null;
    }

    const shown = VERIFICATION[verification.verdict] || VERIFICATION.not_checked;

    return (
        <div className={`mb-[14px] rounded-[10px] border px-[14px] py-[11px] ${shown.className}`}>

            <p className='text-[12px] font-[800]'>
                {shown.label}
            </p>

            {verification.reason ? (
                <p className='mt-[3px] text-[12px] font-[500] opacity-90'>
                    {verification.reason}
                </p>
            ) : null}

            {/*
              * The two names side by side. A broker deciding whether to hold a
              * carrier wants to see the disagreement itself, not a verdict
              * about it.
              */}
            {verification.insurer_on_certificate || verification.insurer_on_file ? (
                <div className='mt-[8px] flex flex-wrap gap-x-[18px] gap-y-[3px] text-[11px] opacity-90'>
                    <span>Certificate: <b className='font-[700]'>{verification.insurer_on_certificate || 'NA'}</b></span>
                    <span>FMCSA: <b className='font-[700]'>{verification.insurer_on_file || 'NA'}</b></span>
                </div>
            ) : null}

            {verification.recheck_after ? (
                <p className='mt-[6px] text-[11px] font-[600]'>
                    Check again after {formatDate(verification.recheck_after)}
                </p>
            ) : null}

        </div>
    );
}

/*
 * What the broker is asking the agency for.
 *
 * A fixed list rather than free text for the questions themselves: each one
 * maps to something the reply is read for, and a question nothing can read
 * the answer to is not worth putting to a stranger. The note at the bottom is
 * where anything else goes.
 */
const ASK_OPTIONS = [
    { key: 'expiry', label: 'Policy expiry date' },
    { key: 'limits', label: 'Auto liability and cargo limits' },
    { key: 'schedule', label: 'Any Auto or Scheduled Autos \u2014 and the VINs if scheduled' },
    { key: 'exclusions', label: 'Exclusions, deductibles and commodity sub-limits' },
    { key: 'insurer', label: 'Insurer and policy number' },
    { key: 'holder', label: 'Certificate made out to our company, with MC and USDOT' }
];

function RaiseRequestModal({ isRaising, error, onRaise, onClose }) {
    const [asks, setAsks] = useState(ASK_OPTIONS.map((option) => option.key));
    const [note, setNote] = useState('');

    function toggle(key) {

        setAsks(function (current) {
            return current.includes(key)
                ? current.filter((item) => item !== key)
                : current.concat(key);
        });
    }

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[16px]'
            onClick={onClose}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                className='flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl'
            >
                <div className='flex items-center justify-between border-b border-[#e5e7eb] px-[16px] py-[12px]'>

                    <div>
                        <h3 className='text-[15px] font-[700] text-[#111827]'>
                            Ask the agency
                        </h3>
                        <p className='mt-[1px] text-[11px] font-[500] text-[#94a3b8]'>
                            Everything is asked by default
                        </p>
                    </div>

                    <button
                        type='button'
                        onClick={onClose}
                        className='flex items-center justify-center rounded-[8px] p-[6px] text-[#6b7280] transition-colors hover:bg-[#f1f5f9] hover:text-[#111827]'
                    >
                        <CloseOutlined sx={{ fontSize: 18 }} />
                    </button>
                </div>

                <div className='flex-1 overflow-y-auto px-[16px] py-[14px]'>

                    <ul className='flex flex-col gap-[2px]'>
                        {ASK_OPTIONS.map(function (option) {
                            return (
                                <li key={option.key}>
                                    <label className='flex cursor-pointer items-start gap-[9px] rounded-[8px] px-[8px] py-[7px] transition-colors hover:bg-[#f8fafc]'>

                                        <input
                                            type='checkbox'
                                            id={`ask-${option.key}`}
                                            checked={asks.includes(option.key)}
                                            onChange={() => toggle(option.key)}
                                            className='mt-[2px] h-[15px] w-[15px] flex-shrink-0 accent-[#0f57c8]'
                                        />

                                        <span className='text-[13px] font-[500] text-[#334155]'>
                                            {option.label}
                                        </span>

                                    </label>
                                </li>
                            );
                        })}
                    </ul>

                    {/*
                      * The six boxes are the questions the reply is read for.
                      * Anything outside them - a load-specific question, a
                      * named unit, a reference the agency wants quoted - goes
                      * here and is sent verbatim.
                      */}
                    <label
                        htmlFor='ask-note'
                        className='mt-[14px] block text-[12px] font-[700] text-[#334155]'
                    >
                        Ask something specific
                    </label>

                    <p className='mt-[2px] text-[11px] font-[500] text-[#94a3b8]'>
                        Sent word for word, under the list above.
                    </p>

                    <textarea
                        id='ask-note'
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder='Is VIN 1XKYDP9X7GJ483011 on the policy? We are tendering a $148,000 seafood load on Monday.'
                        className='mt-[4px] w-full rounded-[8px] border border-[#e5e7eb] p-[9px] text-[13px] text-[#334155] outline-none transition focus:border-[#0f57c8] focus:ring-2 focus:ring-[#dbeafe]'
                    />

                    {error ? (
                        <p className='mt-[10px] text-[12px] font-[500] text-[#991b1b]'>{error}</p>
                    ) : null}

                </div>

                <div className='border-t border-[#e5e7eb] px-[16px] py-[12px]'>
                    <button
                        type='button'
                        disabled={isRaising || (asks.length === 0 && !note.trim())}
                        onClick={() => onRaise(asks, note.trim())}
                        className='flex w-full items-center justify-center gap-[6px] rounded-[10px] bg-[#0f57c8] py-[12px] text-[13px] font-[700] text-white transition-all hover:bg-[#0c47a3] disabled:cursor-not-allowed disabled:opacity-50'
                    >
                        <MailOutlineOutlined sx={{ fontSize: 16 }} />
                        {isRaising ? 'Sending\u2026' : 'Send request'}
                    </button>
                </div>

            </div>
        </div>
    );
}

function InsuranceThreadModal({ detail, isLoading, error, onClose }) {
    const messages = Array.isArray(detail?.messages) ? detail.messages : [];

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-[16px]'
            onClick={onClose}
        >
            <div
                onClick={(event) => event.stopPropagation()}
                className='flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl'
            >
                <div className='flex items-center justify-between border-b border-[#e5e7eb] px-[16px] py-[12px]'>

                    <div>
                        <h3 className='text-[15px] font-[700] text-[#111827]'>
                            Insurance request
                        </h3>

                        {detail?.request?.recipient_email ? (
                            <p className='mt-[1px] break-words text-[11px] font-[500] text-[#94a3b8]'>
                                {detail.request.recipient_email}
                            </p>
                        ) : null}
                    </div>

                    <button
                        type='button'
                        onClick={onClose}
                        className='flex items-center justify-center rounded-[8px] p-[6px] text-[#6b7280] transition-colors hover:bg-[#f1f5f9] hover:text-[#111827]'
                    >
                        <CloseOutlined sx={{ fontSize: 18 }} />
                    </button>
                </div>

                <div className='flex-1 overflow-y-auto px-[16px] py-[14px]'>

                    {isLoading ? (
                        <Skeleton variant='rounded' height={220} sx={{ borderRadius: '10px' }} />
                    ) : error ? (
                        <p className='text-[13px] font-[500] text-[#991b1b]'>{error}</p>
                    ) : detail ? (
                        <>
                            <TrustBanner trust={detail.request?.trust} />

                            <VerificationBanner verification={detail.request?.verification} />

                            <StatePath steps={detail.state_path} />

                            <p className='mb-[6px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8]'>
                                Correspondence
                            </p>

                            <ul className='flex flex-col gap-[10px]'>
                                {messages.map(function (message, index) {
                                    return (
                                        <ThreadMessage
                                            key={message.uuid || `message-${index}`}
                                            message={message}
                                        />
                                    );
                                })}
                            </ul>
                        </>
                    ) : (
                        <p className='text-[13px] font-[500] text-[#94a3b8]'>
                            Nothing to show yet.
                        </p>
                    )}

                </div>
            </div>
        </div>
    );
}

function InsuranceCard(props) {
    const [coiDocument, setCoiDocument] = useState(null);
    const [isCoiModalOpen, setIsCoiModalOpen] = useState(false);
    const dotNumber = props.data?.dot_number;

    const insuranceFilings = Array.isArray(
        props.data?.insurance_filings
    )
        ? props.data.insurance_filings
        : [];

    const [ocrCoverages, setOcrCoverages] = useState([]);
    const [isLoadingOcr, setIsLoadingOcr] = useState(false);

    const [insuranceRequest, setInsuranceRequest] = useState(null);
    const [isRaising, setIsRaising] = useState(false);
    const [isAskOpen, setIsAskOpen] = useState(false);
    const [requestError, setRequestError] = useState(null);

    const [isResponseOpen, setIsResponseOpen] = useState(false);
    const [responseDetail, setResponseDetail] = useState(null);
    const [isLoadingResponse, setIsLoadingResponse] = useState(false);
    const [responseError, setResponseError] = useState(null);

    const carrierName = props.data?.company_name || props.data?.dba_name || null;
    const carrierMc = props.data?.authority?.docket_number || null;

    const requestStatus = insuranceRequest?.status || null;
    const isRequestOpen = OPEN_STATUSES.includes(requestStatus);

    // Read by the poll below, which must not re-subscribe on every status
    // change just to know what the status is.
    const statusRef = useRef(requestStatus);
    statusRef.current = requestStatus;

    useEffect(function () {

        if (!dotNumber) {
            setOcrCoverages([]);
            return;
        }

        let cancelled = false;
        setIsLoadingOcr(true);

        apiFetch('/ocr-data', {
            method: 'POST',
            body: JSON.stringify({ dot_number: dotNumber })
        })
            .then(function (result) {
                if (cancelled) return;
                setOcrCoverages(extractCoverages(result?.data));
                 setCoiDocument(result?.coiDocument || null);
            })
            .catch(function (err) {
                if (cancelled) return;

                // 404 is the documented "no OCR data for this DOT" response, not
                // a failure - fall back to the FMCSA filings below.
                if (err.status !== 404) {
                    console.error('InsuranceCard OCR fetch error:', err);
                }
                setOcrCoverages([]);
            })
            .finally(function () {
                if (!cancelled) {
                    setIsLoadingOcr(false);
                }
            });

        return function () {
            cancelled = true;
        };

    }, [dotNumber]);

    /*
     * The request already raised for this carrier, if any. Company-scoped on
     * the API side, so a teammate's request shows here too - which is the
     * point: two people opening the same profile must not mail the agency
     * twice.
     */
    useEffect(function () {

        if (!dotNumber) {
            setInsuranceRequest(null);
            return;
        }

        let cancelled = false;

        function load() {

            return apiFetch(`/carriers/${dotNumber}/insurance-request`)
                .then(function (result) {
                    if (cancelled) return null;
                    setInsuranceRequest(result?.data || null);
                    return result?.data || null;
                })
                .catch(function (err) {
                    if (cancelled) return null;
                    console.error('InsuranceCard request fetch error:', err);
                    return null;
                });
        }

        load();

        /*
         * Polled only while a reply is being read, which is a matter of
         * seconds. `pending` is not polled: an agency can take days, and a
         * timer running on every open carrier profile for that long buys
         * nothing the Track button does not already do on click.
         *
         * The status is read off a ref rather than out of state so this
         * interval does not have to be torn down and rebuilt on every status
         * change - and so the check itself stays outside React's rendering,
         * where a fetch has no business being.
         */
        const timer = setInterval(function () {

            if (statusRef.current === 'responded') {
                load();
            }

        }, 15000);

        return function () {
            cancelled = true;
            clearInterval(timer);
        };

    }, [dotNumber]);
const coiUrl = coiDocument?.document_url
    ? coiDocument.document_url.replace(
        's3://dollartraq/',
        'https://dollartraq.s3.us-east-2.amazonaws.com/'
      )
    : null;
    const coverageRows = useMemo(function () {

        return ocrCoverages.map(function (coverage, index) {
            const limit = pickHeadlineLimit(coverage?.LIMITS);

            return {
                key: coverage?.['POLICY NUMBER'] || `coverage-${index}`,
                title: coverage?.['TYPE OF INSURANCE'],
                policyNumber: coverage?.['POLICY NUMBER'],
                expires: coverage?.['POLICY EXP'],
                limitLabel: limit?.label,
                amount: limit?.amount
            };
        });

    }, [ocrCoverages]);

    function handleRaise(asks, note) {

        if (!dotNumber || isRaising || isRequestOpen) {
            return;
        }

        setIsRaising(true);
        setRequestError(null);

        apiFetch('/carrier-insurance-requests', {
            method: 'POST',
            body: JSON.stringify({
                dot_number: dotNumber,
                carrier_name: carrierName,
                carrier_mc: carrierMc,
                asks: asks,
                ask_note: note || null
            })
        })
            .then(function (result) {
                setInsuranceRequest(result?.data || null);
                setIsAskOpen(false);
            })
            .catch(function (err) {

                // 422 is the expected refusal - most often "the certificate on
                // file carries no agency email address" - and its message is
                // written for the broker, so it is shown rather than logged.
                setRequestError(err.message || 'Could not raise the request.');
            })
            .finally(function () {
                setIsRaising(false);
            });
    }

    function handleTrack() {

        if (!insuranceRequest) {
            return;
        }

        /*
         * Opened for every request, not only the answered ones. A request with
         * no reply yet is exactly the one a broker is most likely to be asking
         * about, and the thread answers "who was mailed, when, and how long
         * has it been" without them having to raise a second request to find
         * out.
         */
        setIsResponseOpen(true);
        setIsLoadingResponse(true);
        setResponseError(null);

        apiFetch(`/carrier-insurance-requests/${insuranceRequest.uuid}/thread`)
            .then(function (result) {
                setResponseDetail(result?.data || null);

                // The thread carries the request with it, so an status that
                // moved since the page loaded is picked up here rather than
                // waiting for the next poll.
                if (result?.data?.request) {
                    setInsuranceRequest(result.data.request);
                }
            })
            .catch(function (err) {
                setResponseError(err.message || 'Could not load the thread.');
            })
            .finally(function () {
                setIsLoadingResponse(false);
            });
    }

    function renderValue(value) {

        return (
            value !== null &&
            value !== undefined &&
            value !== ''
        )
            ? value
            : 'NA';
    }

    return (

        <div className='relative overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-[#e8f1ff] p-[16px] shadow-[0_2px_8px_rgba(16,24,40,0.04)] sm:p-[18px] xl:p-[20px]'>

            <div className='absolute right-0 top-0 h-[50px] w-[50px] bg-[#0f57c8] [clip-path:polygon(100%_0,0_0,100%_100%)]' />

            <div className='mb-[20px] flex items-center gap-[12px] xl:mb-[24px]'>

                <ShieldOutlined className='text-[#185abc] !text-[22px] xl:!text-[24px]' />

                <h3 className='text-[16px] font-[500] tracking-tight text-[#111827] sm:text-[17px] xl:text-[18px]'>
                    Insurance
                </h3>

            </div>

            <div className='space-y-[12px] max-h-[260px] overflow-y-auto pr-[4px]'>

                {isLoadingOcr && coverageRows.length === 0 && insuranceFilings.length === 0 ? (

                    [1, 2, 3].map(function (i) {
                        return (
                            <Skeleton
                                key={i}
                                variant='rounded'
                                height={54}
                                sx={{ borderRadius: '10px' }}
                            />
                        );
                    })

                ) : coverageRows.length > 0 ? (

                    coverageRows.map(function (row) {

                        return (

                            <div
                                key={row.key}
                                className='flex items-center justify-between gap-[14px] rounded-[10px] bg-white/80 px-[14px] py-[12px] backdrop-blur-sm sm:px-[16px] xl:px-[18px]'
                            >

                                <div className='min-w-0 flex-1'>

                                    <p className='truncate text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8] sm:text-[11px]'>
                                        {renderValue(row.title)}
                                    </p>

                                    <p className='mt-[3px] truncate text-[10px] font-[500] text-[#94a3b8]'>
                                        {renderValue(row.policyNumber)}
                                        {row.expires ? ` • exp ${row.expires}` : ''}
                                    </p>

                                </div>

                                <span className='shrink-0 text-right text-[15px] font-[800] text-[#111827] xl:text-[17px]'>
                                    ${renderValue(row.amount)}
                                </span>

                            </div>

                        );
                    })

                ) : (
                    insuranceFilings.length > 0
                        ? insuranceFilings.map(function (item, index) {

                            return (

                                <div
                                    key={item.id || index}
                                    className='flex items-center justify-between gap-[14px] rounded-[10px] bg-white/80 px-[14px] py-[12px] backdrop-blur-sm sm:px-[16px] xl:px-[18px]'
                                >

                                    <div className='min-w-0 flex-1'>

                                        <p className='truncate text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8] sm:text-[11px]'>
                                            {renderValue(item.ins_type_desc)}
                                        </p>


                                    </div>

                                    <span className='shrink-0 text-right text-[15px] font-[800] text-[#111827] xl:text-[17px]'>
                                        ${renderValue(item.min_cov_amount)}
                                    </span>

                                </div>

                            );
                        })

                        : (

                            <div className='flex items-center justify-center rounded-[10px] bg-white/70 py-[40px]'>

                                <p className='text-[13px] font-[500] text-[#94a3b8]'>
                                    No insurance filings available
                                </p>

                            </div>

                        )
                )}

            </div>

        <button
            type='button'
            disabled={!coiUrl}
            onClick={() => setIsCoiModalOpen(true)}
            className="mt-[18px] flex w-full items-center justify-center rounded-[10px] bg-white py-[14px] text-[14px] font-[700] text-[#334155] shadow-sm transition-all hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline xl:mt-[20px] xl:py-[16px] xl:text-[15px]"
        >
            View COI Document
        </button>

        {/*
          * Chasing the carrier's insurance agency for a current certificate.
          * Two buttons rather than one that changes label: raising and
          * tracking are different acts, and a broker looking at a pending
          * request needs to see at a glance that one is already out.
          */}
        <div className='mt-[10px] grid grid-cols-2 gap-[10px]'>

            <button
                type='button'
                disabled={!dotNumber || isRaising || isRequestOpen}
                onClick={() => setIsAskOpen(true)}
                title={
                    isRequestOpen
                        ? 'A request is already with this carrier\u2019s agency.'
                        : 'Email the agency for current insurance details.'
                }
                className='flex items-center justify-center gap-[6px] rounded-[10px] bg-[#0f57c8] py-[12px] text-[13px] font-[700] text-white shadow-sm transition-all hover:bg-[#0c47a3] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#0f57c8] xl:py-[14px] xl:text-[14px]'
            >
                <MailOutlineOutlined sx={{ fontSize: 16 }} />
                {isRaising ? 'Raising\u2026' : 'Raise request'}
            </button>

            <button
                type='button'
                disabled={!insuranceRequest}
                onClick={handleTrack}
                className='flex items-center justify-center gap-[6px] rounded-[10px] bg-white py-[12px] text-[13px] font-[700] text-[#334155] shadow-sm transition-all hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50 xl:py-[14px] xl:text-[14px]'
            >
                <HourglassEmptyOutlined sx={{ fontSize: 16 }} />
                Track
                {requestStatus ? (
                    <span
                        className={`rounded-[999px] px-[8px] py-[2px] text-[10px] font-[700] uppercase tracking-[0.04em] ${
                            (REQUEST_STATUS[requestStatus] || REQUEST_STATUS.failed).className
                        }`}
                    >
                        {(REQUEST_STATUS[requestStatus] || REQUEST_STATUS.failed).label}
                    </span>
                ) : null}
            </button>

        </div>

        {/* The answer, once there is one. */}
        {insuranceRequest?.insurance_expiry_date ? (
            <p className='mt-[8px] text-center text-[12px] font-[600] text-[#166534]'>
                Insurance expiry date &mdash; {formatDate(insuranceRequest.insurance_expiry_date)}
            </p>
        ) : null}

        {requestError || (requestStatus === 'failed' && insuranceRequest?.last_error) ? (
            <p className='mt-[8px] text-center text-[12px] font-[500] text-[#991b1b]'>
                {requestError || insuranceRequest.last_error}
            </p>
        ) : null}

        {isCoiModalOpen && coiUrl && (
            <CoiDocumentModal
                url={coiUrl}
                onClose={() => setIsCoiModalOpen(false)}
            />
        )}

        {isAskOpen && (
            <RaiseRequestModal
                isRaising={isRaising}
                error={requestError}
                onRaise={handleRaise}
                onClose={() => setIsAskOpen(false)}
            />
        )}

        {isResponseOpen && (
            <InsuranceThreadModal
                detail={responseDetail}
                isLoading={isLoadingResponse}
                error={responseError}
                onClose={() => setIsResponseOpen(false)}
            />
        )}

        </div>

    );
}

export default InsuranceCard;