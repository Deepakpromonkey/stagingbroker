import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';

import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';

import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
    CloseOutlined,
    PictureAsPdfOutlined,
    InsertDriveFileOutlined,
    DownloadOutlined,
} from '@mui/icons-material';

import { Document, Page } from 'react-pdf';

import { apiFetch, apiBlobUrl, apiDownload } from '@/lib/api';
import { ensurePdfWorker, PDF_OPTIONS } from '@/lib/pdfWorker';

import { findHolderMasks } from '@/profileComponents/coiHolderMask';

const INSURANCE_REQUESTS_ENDPOINT = '/carrier-insurance-requests';
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const REQUEST_STATUS = {
    pending:   { label: 'Pending',       bg: '#FEF3C7', color: '#92400E', dot: '#D97706' },
    responded: { label: 'Reading reply', bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6' },
    success:   { label: 'Received',      bg: '#DCFCE7', color: '#166534', dot: '#22C55E' },
    awaiting:  { label: 'Awaiting cert', bg: '#FEF3C7', color: '#92400E', dot: '#D97706' },
    failed:    { label: 'Failed',        bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444' },
    expired:   { label: 'No response',   bg: '#E2E8F0', color: '#475569', dot: '#94A3B8' },
};

function normalizeRequestRow(row) {
    return {
        row_id: row.uuid,
        dot_number: row.dot_number,
        mc_number: row.carrier_mc,
        carrier_name: row.carrier_name,
        status: row.status ? String(row.status).toLowerCase() : null,
        status_label: row.status_label,
        raised_by: row.raised_by,
        recipient_email: row.recipient_email,
        insurance_expiry_date: row.insurance_expiry_date,
        sent_at: row.sent_at,
        responded_at: row.responded_at,
        response_uuid: row.response_uuid || null,
        last_error: row.last_error || null,
    };
}

function formatDate(value) {

    if (!value) {
        return 'NA';
    }

    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    const parsed = dateOnly
        ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
        : new Date(value);

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

const StatusBadge = ({ status, label }) => {
    const s = REQUEST_STATUS[status] || {
        label: label || status || '-',
        bg: '#F1F5F9',
        color: '#475569',
        dot: '#94A3B8',
    };

    return (
        <span
            className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-[10px] py-[3px] text-xs font-semibold"
            style={{ background: s.bg, color: s.color }}
        >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: s.dot }} />
            {s.label}
        </span>
    );
};

function CoiPage({ pageNumber, width }) {
    const [masks, setMasks] = useState(null);

    function handleLoad(page) {
        findHolderMasks(page)
            .then(setMasks)
            .catch(function (err) {
                console.error('CoiRequest holder mask error:', err);
                setMasks([]);
            });
    }

    return (
        <div
            className='relative mx-auto mb-[12px] bg-white shadow-sm'
            style={{ width, minHeight: masks ? undefined : Math.round(width * 1.294) }}
        >
            <div style={{ visibility: masks ? 'visible' : 'hidden' }}>
                <Page
                    pageNumber={pageNumber}
                    width={width}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    onLoadSuccess={handleLoad}
                />
            </div>

            {(masks || []).map((mask, index) => (
                <div
                    key={index}
                    className='absolute bg-white'
                    style={{
                        left: `${mask.left * 100}%`,
                        top: `${mask.top * 100}%`,
                        width: `${(mask.right - mask.left) * 100}%`,
                        height: `${(mask.bottom - mask.top) * 100}%`
                    }}
                />
            ))}

            {!masks ? (
                <div className='absolute inset-0'>
                    <Skeleton variant='rectangular' height='100%' />
                </div>
            ) : null}
        </div>
    );
}

function MaskedCertificate({ file, maxWidth = 860 }) {
    const bodyRef = useRef(null);
    const [numPages, setNumPages] = useState(0);
    const [width, setWidth] = useState(0);
    const [loadFailed, setLoadFailed] = useState(false);

    ensurePdfWorker();

    useEffect(function () {

        const body = bodyRef.current;
        if (!body) return undefined;

        const observer = new ResizeObserver(function ([entry]) {
            setWidth(Math.min(maxWidth, Math.floor(entry.contentRect.width) - 32));
        });

        observer.observe(body);

        return function () {
            observer.disconnect();
        };

    }, [maxWidth]);

    return (
        <div ref={bodyRef} className='h-full w-full'>
            {loadFailed ? (
                <p className='p-[16px] text-[13px] font-[500] text-[#991b1b]'>
                    The certificate could not be displayed.
                </p>
            ) : width > 0 ? (
                <Document
                    file={file}
                    options={PDF_OPTIONS}
                    onLoadSuccess={({ numPages: count }) => setNumPages(count)}
                    onLoadError={function (err) {
                        console.error('CoiRequest COI render error:', err);
                        setLoadFailed(true);
                    }}
                    loading={
                        <div className='p-[16px]'>
                            <Skeleton variant='rounded' height={480} sx={{ borderRadius: '8px' }} />
                        </div>
                    }
                    className='py-[16px]'
                >
                    {Array.from({ length: numPages }, (_, index) => (
                        <CoiPage
                            key={index + 1}
                            pageNumber={index + 1}
                            width={width}
                        />
                    ))}
                </Document>
            ) : null}
        </div>
    );
}
function StatePath({ steps }) {

    if (!Array.isArray(steps) || steps.length === 0) {
        return null;
    }

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

function hasReading(reading) {

    if (!reading) {
        return false;
    }

    return Boolean(
        reading.summary
        || reading.coverages?.length || reading.exclusions?.length
        || reading.sub_limits?.length || reading.signals?.length
        || reading.policy_number || reading.insurer || reading.holder_name
        || reading.alternate_email
    );
}

function ReplyReading({ reading }) {

    if (!hasReading(reading)) {
        return null;
    }

    const coverages = Array.isArray(reading.coverages) ? reading.coverages : [];
    const exclusions = Array.isArray(reading.exclusions) ? reading.exclusions : [];
    const subLimits = Array.isArray(reading.sub_limits) ? reading.sub_limits : [];
    const signals = Array.isArray(reading.signals) ? reading.signals : [];

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

    const shown = preview && preview.path === activePath ? preview : null;

    return (
        <div className='mt-[10px]'>

            <p className='mb-[6px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8]'>
                {attachments.length === 1 ? 'Attachment' : `Attachments (${attachments.length})`}
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
                                    {file.previewable ? (isActive ? ' · showing below' : ' · click to view') : ''}
                                </span>
                            </button>

                            <button
                                type='button'
                                title='Download'
                                onClick={() => {
                                    setDownloadError(null);

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
                    <Skeleton variant='rounded' height={360} sx={{ borderRadius: '8px' }} />
                ) : shown.error ? (
                    <p className='text-[11px] font-[500] text-[#991b1b]'>{shown.error}</p>
                ) : shown.url ? (
                    isPdf ? (
                        <div className='h-[420px] w-full overflow-auto rounded-[8px] bg-[#f8fafc] ring-1 ring-[#e5e7eb]'>
                            <MaskedCertificate file={shown.url} />
                        </div>
                    ) : (
                        <img
                            src={shown.url}
                            alt={active.filename}
                            className='max-h-[420px] w-full rounded-[8px] object-contain ring-1 ring-[#e5e7eb]'
                        />
                    )
                ) : null
            ) : null}

        </div>
    );
}

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

            <MessageAttachments attachments={Array.isArray(message.attachments) ? message.attachments : []} />

        </li>
    );
}

function ReplySummaries({ messages }) {

    const replies = messages
        .filter(function (message) {
            return message.direction !== 'outbound'
                && (message.extracted_expiry_date || hasReading(message.extracted));
        })
        .reverse();

    if (replies.length === 0) {
        return null;
    }

    return (
        <div className='mb-[16px]'>

            <p className='mb-[6px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8]'>
                Summary
            </p>

            <ul className='flex flex-col gap-[10px]'>
                {replies.map(function (message, index) {
                    return (
                        <li
                            key={message.uuid || `summary-${index}`}
                            className='rounded-[10px] bg-white p-[12px] ring-1 ring-[#bfdbfe]'
                        >
                            <div className='flex flex-wrap items-baseline justify-between gap-[6px]'>

                                <p className='text-[12px] font-[700] text-[#111827]'>
                                    Reply from agency
                                </p>

                                <p className='text-[11px] font-[500] text-[#94a3b8]'>
                                    {formatDateTime(message.at)}
                                </p>

                            </div>

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

                            <ReplyReading reading={message.extracted} />
                        </li>
                    );
                })}
            </ul>

        </div>
    );
}

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

function InsuranceThreadModal({ row, onClose }) {
    const [detail, setDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(function () {

        let cancelled = false;

        setDetail(null);
        setError(null);
        setIsLoading(true);

        apiFetch(`${INSURANCE_REQUESTS_ENDPOINT}/${row.row_id}/thread`)
            .then(function (result) {
                if (!cancelled) setDetail(result?.data || null);
            })
            .catch(function (err) {
                if (!cancelled) setError(err.message || 'Could not load the thread.');
            })
            .finally(function () {
                if (!cancelled) setIsLoading(false);
            });

        return function () {
            cancelled = true;
        };

    }, [row.row_id]);

    const messages = Array.isArray(detail?.messages) ? detail.messages : [];
    const recipientEmail = detail?.request?.recipient_email || row.recipient_email;

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

                        {recipientEmail ? (
                            <p className='mt-[1px] break-words text-[11px] font-[500] text-[#94a3b8]'>
                                {recipientEmail}
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
                            <ReplySummaries messages={messages} />

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

const columnHelper = createColumnHelper();

export default function CoiRequest() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
    const [selectedRow, setSelectedRow] = useState(null);

    const fetchRecords = useCallback(() => {
        setLoading(true);

        apiFetch(INSURANCE_REQUESTS_ENDPOINT)
            .then((res) => {
                const data = Array.isArray(res?.data) ? res.data : [];
                setRows(data.map(normalizeRequestRow));
            })
            .catch((err) => {
                console.error('Insurance requests fetch error:', err);
                setRows([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const columns = useMemo(
        () => [
            columnHelper.accessor('carrier_name', {
                header: 'Carrier',
                cell: (info) => (
                    <span className="text-sm font-bold text-slate-800">{info.getValue() || '-'}</span>
                ),
            }),
            columnHelper.display({
                id: 'mc_dot',
                header: 'MC / DOT',
                cell: (info) => {
                    const { mc_number, dot_number } = info.row.original;
                    return (
                        <span className="text-sm text-slate-700">
                            {mc_number || '-'} / {dot_number || '-'}
                        </span>
                    );
                },
            }),
            columnHelper.accessor('raised_by', {
                header: 'Raised By',
                cell: (info) => (
                    <span className="text-sm text-slate-700">{info.getValue() || '-'}</span>
                ),
            }),
            columnHelper.accessor('recipient_email', {
                header: 'Sent To',
                cell: (info) => (
                    <span className="text-sm text-slate-500">{info.getValue() || '-'}</span>
                ),
            }),
            columnHelper.accessor('status', {
                header: 'Status',
                cell: (info) => (
                    <StatusBadge status={info.getValue()} label={info.row.original.status_label} />
                ),
            }),
            columnHelper.accessor('insurance_expiry_date', {
                header: 'Expiry',
                cell: (info) => (
                    <span className="text-sm text-slate-500">
                        {info.getValue() ? formatDate(info.getValue()) : '-'}
                    </span>
                ),
            }),
            columnHelper.accessor('sent_at', {
                header: 'Sent',
                cell: (info) => (
                    <span className="whitespace-nowrap text-sm text-slate-500">
                        {info.getValue() ? formatDateTime(info.getValue()) : '-'}
                    </span>
                ),
            }),
            columnHelper.display({
                id: 'actions',
                header: () => <span className="block text-right">Actions</span>,
                cell: (info) => (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            /* RESPONSIVE: shorter padding/text on mobile & tablet; unchanged
                               (px-3.5 py-1.5 / text-xs) at lg (desktop) and up. */
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] sm:px-2.5 sm:py-1 sm:text-[11px] lg:px-3.5 lg:py-1.5 lg:text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            onClick={() => setSelectedRow(info.row.original)}
                        >
                            View
                        </button>
                    </div>
                ),
            }),
        ],
        []
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const total = rows.length;
    const { pageIndex, pageSize } = table.getState().pagination;
    const visibleRowCount = table.getRowModel().rows.length;
    const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
    const rangeEnd = total === 0 ? 0 : rangeStart + visibleRowCount - 1;

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">

            <div className="mb-6">
                <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">COI Requests</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                    Track certificate of insurance requests, renewals &amp; expiry dates across your carriers.
                </p>
            </div>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FormatListBulletedIcon sx={{ fontSize: 18 }} />
                    </span>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Records</p>
                        <p className="text-base font-bold text-slate-900">{total} Requests</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Display:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700 outline-none"
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                    <span className="text-sm text-slate-400">
                        {rangeStart}-{rangeEnd} of {total}
                    </span>
                    <IconButton
                        size="small"
                        disabled={!table.getCanPreviousPage()}
                        onClick={() => table.previousPage()}
                        sx={{ color: '#94a3b8' }}
                    >
                        <ChevronLeftIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                        size="small"
                        disabled={!table.getCanNextPage()}
                        onClick={() => table.nextPage()}
                        sx={{ color: '#94a3b8' }}
                    >
                        <ChevronRightIcon fontSize="small" />
                    </IconButton>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="border-b border-slate-100 bg-[#F1F4FB]">
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="whitespace-nowrap px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400"
                                        >
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <CircularProgress size={18} />
                                            Loading…
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && table.getRowModel().rows.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-slate-400">
                                        No insurance requests found.
                                    </td>
                                </tr>
                            )}

                            {!loading && table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.original.row_id}
                                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-6 py-4 align-top">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRow && (
                <InsuranceThreadModal
                    row={selectedRow}
                    onClose={() => setSelectedRow(null)}
                />
            )}

        </div>
    );
}