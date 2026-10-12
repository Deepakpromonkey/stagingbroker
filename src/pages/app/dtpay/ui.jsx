import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_STYLES, statusLabel, date } from './format';

/*
 * DT Pay building blocks, in the app's own tokens (taken from the Overview
 * dashboard): ink #1a1a1a, accent #185FA5, action blue #1d4ed8, the deep
 * blue panel #005EA4, white 16px cards on #e8e8e8, small caps labels and
 * the 11px uppercase table headers. Money is set in tabular figures so
 * columns of amounts line up.
 */

export const INK = '#1a1a1a';
export const ACCENT = '#185FA5';
export const ACTION = '#1d4ed8';
export const DEEP = '#005EA4';
export const GREEN = '#16a34a';

const money = { fontFeatureSettings: '"tnum" 1, "lnum" 1' };

/* The app's page header: a two-tone title ("DT Pay Overview"). */
export function Page({ title, accent, intro, back, actions, children, testMode, narrow = false }) {
    return (
        <div className={`mx-auto w-full px-4 pb-16 pt-5 sm:px-6 sm:pt-6 md:px-8 md:pt-8 ${narrow ? 'max-w-[900px]' : 'max-w-[1280px]'}`}>
            {back && (
                <Link to={back.to} className='mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#6b7280] no-underline hover:text-[#185FA5]'>
                    <span aria-hidden='true'>←</span> {back.label}
                </Link>
            )}
            <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0'>
                    <h1 className='m-0 text-[22px] font-normal tracking-[-0.5px] text-[#1a1a1a] sm:text-[26px] md:text-[32px]'>
                        {title}{accent && <> <strong className='font-bold text-[#185FA5]'>{accent}</strong></>}
                    </h1>
                    {intro && <p className='m-0 mt-1.5 text-sm text-[#71717a]'>{intro}</p>}
                </div>
                {actions && <div className='flex flex-wrap items-center gap-2.5'>{actions}</div>}
            </div>
            {testMode && <TestModeBanner />}
            {children}
        </div>
    );
}

export function TestModeBanner() {
    return (
        <div className='mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800'>
            <span className='h-2 w-2 shrink-0 rounded-full bg-amber-500' />
            <span><strong className='font-semibold'>Test mode.</strong> Use Stripe test cards (4242 4242 4242 4242). No real money moves.</span>
        </div>
    );
}

/* Small caps label, as the app uses over its cards and figures. */
export function Label({ children, className = '', light = false }) {
    return (
        <div className={`text-[10.5px] font-bold uppercase tracking-[1.2px] ${light ? 'text-white/65' : 'text-[#6b7280]'} ${className}`}>{children}</div>
    );
}

/* A white card. `tone="deep"` is the app's solid blue panel. */
export function Panel({ title, subtitle, aside, children, className = '', padded = true, tone }) {
    const deep = tone === 'deep';

    return (
        <section className={`rounded-2xl ${deep ? 'text-white' : 'border border-[#e8e8e8] bg-white'} ${className}`} style={deep ? { background: DEEP } : undefined}>
            {(title || aside) && (
                <header className={`flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6 ${padded ? '' : 'pb-4'}`}>
                    <div>
                        {title && <div className={`text-[11px] font-bold uppercase tracking-[1.6px] ${deep ? 'text-white/70' : 'text-[#404752]'}`}>{title}</div>}
                        {subtitle && <p className={`m-0 mt-1.5 text-xs ${deep ? 'text-white/70' : 'text-[#8a94a6]'}`}>{subtitle}</p>}
                    </div>
                    {aside}
                </header>
            )}
            <div className={padded ? 'px-5 pb-5 pt-4 sm:px-6 sm:pb-6' : ''}>{children}</div>
        </section>
    );
}

/* A section heading outside a card, like the dashboard's "Recent Activity". */
export function SectionTitle({ children, aside }) {
    return (
        <div className='mb-3.5 flex items-center justify-between gap-3'>
            <h2 className='m-0 text-base font-bold text-[#1a1a1a] sm:text-lg'>{children}</h2>
            {aside}
        </div>
    );
}

const BUTTON = {
    primary: 'bg-[#1d4ed8] text-white hover:bg-blue-700 border-transparent shadow-sm',
    secondary: 'bg-white text-[#334155] hover:bg-[#f8fafc] border-[#dbe4ee]',
    danger: 'bg-white text-[#b91c1c] hover:bg-red-50 border-red-200',
    release: 'bg-[#16a34a] text-white hover:bg-green-700 border-transparent shadow-sm',
    ghost: 'bg-transparent text-[#475569] hover:bg-[#f1f5f9] border-transparent',
    onDeep: 'bg-white text-[#005EA4] hover:bg-[#EFF6FF] border-transparent',
    subtle: 'bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0] border-transparent',
};

export function Button({ variant = 'primary', size = 'md', loading = false, disabled = false, children, className = '', type = 'button', ...rest }) {
    const sizes = { md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-[15px]', sm: 'px-3 py-1.5 text-[12.5px]' };

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-45 ${sizes[size]} ${BUTTON[variant]} ${className}`}
            {...rest}
        >
            {loading && <Spinner small />}
            {children}
        </button>
    );
}

export function Spinner({ small = false }) {
    return (
        <span
            className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none ${small ? 'h-[14px] w-[14px]' : 'h-[22px] w-[22px] text-[#185FA5]'}`}
            aria-label='Loading'
        />
    );
}

export function Loading({ label = 'Loading' }) {
    return (
        <div className='flex items-center justify-center gap-3 py-14 text-[13px] text-[#9ca3af]'>
            <Spinner /> {label}
        </div>
    );
}

export function ErrorBanner({ children, onRetry }) {
    if (!children) return null;

    return (
        <div role='alert' className='mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            <span>{children}</span>
            {onRetry && <button onClick={onRetry} className='shrink-0 cursor-pointer border-none bg-transparent font-semibold text-red-700 underline'>Try again</button>}
        </div>
    );
}

export function Notice({ tone = 'info', title, children }) {
    const tones = {
        info: 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]',
        warn: 'border-amber-200 bg-amber-50 text-amber-800',
        success: 'border-green-200 bg-green-50 text-green-800',
    };

    return (
        <div className={`rounded-xl border px-4 py-3 text-[13px] leading-[1.5] ${tones[tone]}`}>
            {title && <p className='m-0 font-semibold'>{title}</p>}
            {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
        </div>
    );
}

export function StatusBadge({ status, onHold, refundRequested = false, releaseRequested = false, large = false }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
    const size = large ? 'px-3 py-1 text-[12.5px]' : 'px-2.5 py-0.5 text-[11.5px]';

    return (
        <span className='inline-flex flex-wrap items-center gap-1.5'>
            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold ${size}`} style={{ color: s.color, background: s.bg, borderColor: s.border }}>
                <span className='h-[6px] w-[6px] rounded-full' style={{ background: s.color }} />
                {statusLabel(status)}
            </span>
            {onHold && <span className={`inline-flex items-center whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 font-semibold text-amber-700 ${size}`}>On hold</span>}
            {releaseRequested && <span className={`inline-flex items-center whitespace-nowrap rounded-full border border-[#99f6e4] bg-[#f0fdfa] font-semibold text-[#0f766e] ${size}`}>Release requested</span>}
            {refundRequested && <span className={`inline-flex items-center whitespace-nowrap rounded-full border border-red-200 bg-red-50 font-semibold text-red-700 ${size}`}>Refund requested</span>}
        </span>
    );
}

export function Amount({ value, className = '', style }) {
    return <span className={className} style={{ ...money, ...style }}>{value}</span>;
}

/* A headline figure: caps label, big tabular number, a short note. */
export function Figure({ label, value, note, big = false, light = false, tone }) {
    return (
        <div className='min-w-0'>
            <Label light={light}>{label}</Label>
            <Amount
                value={value}
                className={`mt-2 block whitespace-nowrap font-extrabold leading-none tracking-[-0.5px] ${big ? 'text-[26px] xl:text-[30px]' : 'text-[22px] sm:text-[24px]'}`}
                style={{ color: tone || (light ? '#fff' : '#0f172a') }}
            />
            {note && <div className={`mt-1.5 text-xs ${light ? 'text-white/70' : 'text-[#8a94a6]'}`}>{note}</div>}
        </div>
    );
}

export function Field({ label, hint, error, children, required }) {
    return (
        <label className='block'>
            <span className='mb-1.5 block text-[12.5px] font-semibold text-[#334155]'>
                {label}{required && <span className='text-red-600'> *</span>}
            </span>
            {children}
            {error ? <span className='mt-1.5 block text-xs text-red-600'>{error}</span>
                : hint && <span className='mt-1.5 block text-xs text-[#8a94a6]'>{hint}</span>}
        </label>
    );
}

export const inputClass = 'w-full rounded-xl border border-[#dbe4ee] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#185FA5] focus:ring-4 focus:ring-[#EFF6FF] disabled:bg-[#f8fafc] disabled:text-[#6b7280]';

export function Modal({ open, title, onClose, children, footer, width = 520 }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className='fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(11,42,69,0.55)] p-4' onClick={onClose}>
            <div role='dialog' aria-modal='true' className='max-h-[92vh] w-full overflow-auto rounded-2xl bg-white shadow-2xl' style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
                <div className='flex items-start justify-between gap-4 px-6 pt-5'>
                    <h3 className='m-0 text-[17px] font-bold text-[#1a1a1a]'>{title}</h3>
                    <button onClick={onClose} className='-mr-1 cursor-pointer rounded-lg border-none bg-transparent px-2 text-[22px] leading-none text-[#9ca3af] hover:text-[#334155]' aria-label='Close'>×</button>
                </div>
                <div className='px-6 py-4'>{children}</div>
                {footer && <div className='flex flex-wrap justify-end gap-2 border-t border-[#f1f5f9] px-6 py-4'>{footer}</div>}
            </div>
        </div>
    );
}

export function Empty({ title, children, action }) {
    return (
        <div className='flex flex-col items-center justify-center px-6 py-12 text-center'>
            <p className='m-0 text-[15px] font-bold text-[#1a1a1a]'>{title}</p>
            {children && <p className='m-0 mt-1.5 max-w-[420px] text-[13px] leading-6 text-[#8a94a6]'>{children}</p>}
            {action && <div className='mt-4'>{action}</div>}
        </div>
    );
}

/*
 * The app's table: white, 14px radius, 11px uppercase headers on #f9fafb,
 * rows that take a blue left edge on hover. `columns` are
 * { key, label, align, render(row) }.
 */
export function DataTable({ columns, rows, onRowClick, empty, loading, minWidth = 760 }) {
    return (
        <div className='overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white'>
            <div className='overflow-x-auto'>
                <table className='w-full border-collapse text-[13px]' style={{ minWidth }}>
                    <thead>
                        <tr>
                            {columns.map((c) => (
                                <th key={c.key} className={`whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-[11px] text-[11px] font-bold uppercase tracking-[0.6px] text-[#6b7280] ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={columns.length} className='px-3.5 py-10 text-center text-[13px] text-[#9ca3af]'>Loading</td></tr>}
                        {!loading && rows.length === 0 && <tr><td colSpan={columns.length}>{empty}</td></tr>}
                        {!loading && rows.map((row, i) => (
                            <tr
                                key={row.id ?? i}
                                tabIndex={onRowClick ? 0 : undefined}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row); } : undefined}
                                className={`border-l-[3px] border-l-transparent bg-white transition-colors ${onRowClick ? 'cursor-pointer hover:border-l-[#185FA5] hover:bg-[#f8fafc] focus:border-l-[#185FA5] focus:bg-[#f8fafc] focus:outline-none' : ''}`}
                            >
                                {columns.map((c) => (
                                    <td key={c.key} className={`px-3.5 py-3 align-middle text-[#1a1a1a] ${i < rows.length - 1 ? 'border-b border-[#f1f5f9]' : ''} ${c.align === 'right' ? 'text-right' : ''}`}>
                                        {c.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* Filter tabs with counts, underlined like a bank statement's. */
export function Tabs({ items, value, onChange, counts }) {
    return (
        <div className='-mx-1 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[#e5e7eb]'>
            {items.map((f) => {
                const active = value === f.key;
                const n = counts?.[f.key];

                return (
                    <button
                        key={f.key || 'all'}
                        type='button'
                        onClick={() => onChange(f.key)}
                        aria-pressed={active}
                        className={`-mb-px flex shrink-0 cursor-pointer items-center gap-1.5 border-x-0 border-t-0 border-b-2 bg-transparent px-3 pb-2.5 pt-1 text-[13px] font-semibold transition-colors ${active ? 'border-b-[#185FA5] text-[#185FA5]' : 'border-b-transparent text-[#6b7280] hover:text-[#1a1a1a]'}`}
                    >
                        {f.label}
                        {n !== undefined && (
                            <span className={`rounded-full px-1.5 py-px text-[11px] font-bold ${active ? 'bg-[#EFF6FF] text-[#185FA5]' : 'bg-[#f1f5f9] text-[#6b7280]'}`} style={money}>{n}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/*
 * The cost of a payment, set like a statement: line items, a rule, the
 * total. `b` is the API's breakdown (money objects).
 */
export function Breakdown({ b, guest = false, compact = false }) {
    if (!b) return null;

    const row = (label, value, strong) => (
        <div className={`flex items-baseline justify-between gap-4 ${compact ? 'py-1' : 'py-1.5'} text-[13px] ${strong ? 'font-semibold text-[#1a1a1a]' : 'text-[#64748B]'}`}>
            <span>{label}</span><Amount value={value} />
        </div>
    );

    const platformPct = b.platform_fee?.pct ?? b.platform_fee_pct;
    const cardPct = b.card_fee?.pct;

    return (
        <div>
            {row('Carrier receives', b.carrier_receives?.formatted ?? b.amount?.formatted, true)}
            {row(`${guest ? 'Pay-per-use fee' : 'DollarTraq fee'}${platformPct ? ` (${platformPct}%)` : ''}`, b.platform_fee?.formatted)}
            {Number(b.card_fee?.cents) > 0 && row(`Card surcharge${cardPct ? ` (${cardPct}%)` : ''}`, b.card_fee.formatted)}
            <div className='my-2 border-t border-dashed border-[#e5e7eb]' />
            <div className='flex items-baseline justify-between gap-4'>
                <span className='text-[13px] font-semibold text-[#1a1a1a]'>You pay</span>
                <Amount value={b.total?.formatted} className='text-[22px] font-extrabold tracking-[-0.5px] text-[#0f172a]' />
            </div>
        </div>
    );
}

export function Timeline({ items }) {
    if (!items?.length) return <p className='m-0 text-[13px] text-[#9ca3af]'>Nothing yet.</p>;

    const list = [...items].reverse();

    return (
        <ol className='m-0 list-none p-0'>
            {list.map((e, i) => (
                <li key={i} className='relative flex gap-3.5 pb-5 last:pb-0'>
                    {i < list.length - 1 && <span className='absolute left-[5px] top-[16px] h-[calc(100%-10px)] w-px bg-[#e5e7eb]' />}
                    <span className={`relative mt-[5px] h-[11px] w-[11px] shrink-0 rounded-full border-2 ${i === 0 ? 'border-[#185FA5] bg-[#185FA5]' : 'border-[#cbd5e1] bg-white'}`} />
                    <div className='flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4'>
                        <div className='min-w-0'>
                            <p className='m-0 text-[13px] font-semibold text-[#1a1a1a]'>{e.label}</p>
                            {e.detail && <p className='m-0 mt-0.5 text-xs text-[#64748B]'>{e.detail}</p>}
                        </div>
                        <p className='m-0 shrink-0 text-[11.5px] text-[#9ca3af]'>{date(e.at, true)}{e.actor === 'stripe' ? ', Stripe' : e.actor === 'guest' ? ', payer' : ''}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

/* Label and value pairs in a grid. */
export function Facts({ items, cols = 2 }) {
    return (
        <dl className={`m-0 grid grid-cols-1 gap-x-8 gap-y-4 ${cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            {items.filter(Boolean).map(([k, v]) => (
                <div key={k} className='min-w-0'>
                    <dt><Label>{k}</Label></dt>
                    <dd className='m-0 mt-1 break-words text-[13.5px] font-medium text-[#1a1a1a]'>{v || '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

/*
 * Where the money is: payer -> held by DollarTraq -> carrier. `stage`:
 * 0 not paid, 1 clearing, 2 held, 3 with the carrier; `stopped` marks a
 * payment that ended before the carrier (refunded / failed / cancelled).
 */
export function MoneyRoute({ stage, stopped, payerLabel = 'Your account', carrierLabel = 'Carrier', amount, light = false, notes = [] }) {
    const stops = [
        { label: payerLabel, note: notes[0] },
        { label: stage === 1 ? 'Clearing' : 'Held by DollarTraq', note: notes[1] },
        { label: carrierLabel, note: notes[2] },
    ];

    const at = stopped ? null : stage >= 3 ? 100 : stage >= 1 ? 50 : 0;
    const fill = at ?? 0;

    const line = light ? 'rgba(255,255,255,0.25)' : '#e5e7eb';
    const done = light ? '#FFFFFF' : stage >= 3 ? GREEN : ACCENT;
    const text = light ? '#FFFFFF' : INK;
    const sub = light ? 'rgba(255,255,255,0.7)' : '#8a94a6';

    return (
        <div className='w-full'>
            <div className='relative mx-[10px] h-[28px]'>
                <div className='absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full' style={{ background: line }} />
                <div className='absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-[width] duration-700 motion-reduce:transition-none' style={{ width: `${fill}%`, background: done }} />
                {[0, 50, 100].map((p) => {
                    const reached = !stopped && fill >= p;

                    return (
                        <span
                            key={p}
                            className='absolute top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]'
                            style={{ left: `${p}%`, borderColor: reached ? done : line, background: light ? (reached ? '#fff' : DEEP) : '#fff' }}
                            aria-hidden='true'
                        />
                    );
                })}
                {at !== null && amount && (
                    <span
                        className='absolute top-1/2 -translate-x-1/2 -translate-y-[155%] whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-bold'
                        style={{ left: `${at}%`, ...money, background: light ? '#fff' : (stage >= 3 ? GREEN : ACCENT), color: light ? DEEP : '#fff' }}
                    >
                        {amount}
                    </span>
                )}
            </div>
            <div className='mt-2 grid grid-cols-3 gap-2'>
                {stops.map((s, i) => (
                    <div key={i} className={i === 0 ? 'text-left' : i === 1 ? 'text-center' : 'text-right'}>
                        <p className='m-0 text-[12.5px] font-semibold' style={{ color: text }}>{s.label}</p>
                        {s.note && <p className='m-0 mt-0.5 text-[11.5px]' style={{ color: sub }}>{s.note}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
