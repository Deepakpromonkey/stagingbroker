import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_STYLES, statusLabel, date } from './format';

/*
 * DT Pay building blocks, in DollarTraq's own language: Inter, ink #101828,
 * brand blue #2953E4, white panels on the app's warm background. Money is
 * set in tabular figures so columns of amounts line up.
 */

export const INK = '#101828';
export const BLUE = '#2953E4';

const money = { fontFeatureSettings: '"tnum" 1, "lnum" 1' };

export function Page({ title, intro, back, actions, children, testMode, narrow = false }) {
    return (
        <div className={`mx-auto w-full px-4 pb-16 pt-6 sm:px-8 sm:pt-8 ${narrow ? 'max-w-[880px]' : 'max-w-[1200px]'}`}>
            {back && (
                <Link to={back.to} className='mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#475467] hover:text-[#2953E4]'>
                    <span aria-hidden='true'>←</span> {back.label}
                </Link>
            )}
            <div className='mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
                <div className='min-w-0'>
                    <h1 className='m-0 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-[32px]' style={{ color: INK }}>{title}</h1>
                    {intro && <p className='m-0 mt-2 max-w-[640px] text-[14.5px] leading-6 text-[#475467]'>{intro}</p>}
                </div>
                {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
            </div>
            {testMode && <TestModeBanner />}
            {children}
        </div>
    );
}

export function TestModeBanner() {
    return (
        <div className='mb-6 flex items-center gap-3 rounded-[12px] border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3 text-[13px] text-[#93370D]'>
            <span className='h-[8px] w-[8px] shrink-0 rounded-full bg-[#F79009]' />
            <span><strong className='font-semibold'>Test mode.</strong> Payments use Stripe test cards (4242 4242 4242 4242) and move no real money.</span>
        </div>
    );
}

/* A white panel. `tone="blue"` is the app's solid brand panel. */
export function Panel({ title, subtitle, aside, children, className = '', padded = true, tone }) {
    const blue = tone === 'blue';

    return (
        <section
            className={`rounded-[18px] ${blue ? 'text-white' : 'border border-[#E9EAEC] bg-white'} ${className}`}
            style={blue ? { background: `linear-gradient(160deg, ${BLUE} 0%, #1E3FB8 100%)`, boxShadow: '0 12px 32px rgba(41,83,228,0.22)' } : { boxShadow: '0 1px 2px rgba(16,24,40,0.04)' }}
        >
            {(title || aside) && (
                <header className={`flex flex-wrap items-center justify-between gap-3 px-6 pt-5 ${padded ? '' : 'pb-4'}`}>
                    <div>
                        {title && <h2 className='m-0 text-[16px] font-bold tracking-[-0.01em]' style={{ color: blue ? '#fff' : INK }}>{title}</h2>}
                        {subtitle && <p className='m-0 mt-0.5 text-[13px] text-[#667085]'>{subtitle}</p>}
                    </div>
                    {aside}
                </header>
            )}
            <div className={padded ? 'px-6 pb-6 pt-4' : ''}>{children}</div>
        </section>
    );
}

const BUTTON = {
    primary: 'bg-[#2953E4] text-white hover:bg-[#1E3FB8] border-transparent shadow-[0_1px_2px_rgba(16,24,40,0.08)]',
    secondary: 'bg-white text-[#344054] hover:bg-[#F9FAFB] border-[#D0D5DD]',
    danger: 'bg-white text-[#B42318] hover:bg-[#FEF3F2] border-[#FDA29B]',
    release: 'bg-[#079455] text-white hover:bg-[#067647] border-transparent shadow-[0_1px_2px_rgba(16,24,40,0.08)]',
    ghost: 'bg-transparent text-[#475467] hover:bg-[#F2F4F7] border-transparent',
    onBlue: 'bg-white text-[#1E3FB8] hover:bg-[#EEF2FF] border-transparent',
};

export function Button({ variant = 'primary', size = 'md', loading = false, disabled = false, children, className = '', type = 'button', ...rest }) {
    const sizes = { md: 'px-4 py-2.5 text-[14px]', lg: 'px-5 py-3.5 text-[15px]', sm: 'px-3 py-1.5 text-[13px]' };

    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#C7D7FE] disabled:cursor-not-allowed disabled:opacity-45 ${sizes[size]} ${BUTTON[variant]} ${className}`}
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
            className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none ${small ? 'h-[14px] w-[14px]' : 'h-[22px] w-[22px] text-[#2953E4]'}`}
            aria-label='Loading'
        />
    );
}

export function Loading({ label = 'Loading' }) {
    return (
        <div className='flex items-center justify-center gap-3 py-16 text-[13.5px] text-[#667085]'>
            <Spinner /> {label}…
        </div>
    );
}

export function ErrorBanner({ children, onRetry }) {
    if (!children) return null;

    return (
        <div role='alert' className='mb-5 flex items-start justify-between gap-3 rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-[13.5px] text-[#B42318]'>
            <span>{children}</span>
            {onRetry && <button onClick={onRetry} className='shrink-0 font-semibold underline'>Try again</button>}
        </div>
    );
}

export function Notice({ tone = 'info', title, children }) {
    const tones = {
        info: 'border-[#C7D7FE] bg-[#EEF4FF] text-[#2D3E8C]',
        warn: 'border-[#FEDF89] bg-[#FFFAEB] text-[#93370D]',
        success: 'border-[#ABEFC6] bg-[#ECFDF3] text-[#05603A]',
    };

    return (
        <div className={`rounded-[12px] border px-4 py-3 text-[13.5px] leading-[1.5] ${tones[tone]}`}>
            {title && <p className='m-0 font-semibold'>{title}</p>}
            {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
        </div>
    );
}

export function StatusBadge({ status, onHold, large = false }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.draft;

    return (
        <span className='inline-flex flex-wrap items-center gap-1.5'>
            <span
                className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${large ? 'px-3 py-1 text-[13px]' : 'px-2.5 py-0.5 text-[12px]'}`}
                style={{ color: s.color, background: s.bg, borderColor: s.border }}
            >
                <span className='h-[6px] w-[6px] rounded-full' style={{ background: s.color }} />
                {statusLabel(status)}
            </span>
            {onHold && (
                <span className={`inline-flex items-center rounded-full border border-[#FEDF89] bg-[#FFFAEB] font-semibold text-[#B54708] ${large ? 'px-3 py-1 text-[13px]' : 'px-2.5 py-0.5 text-[12px]'}`}>
                    On hold
                </span>
            )}
        </span>
    );
}

export function Amount({ value, className = '', style }) {
    return <span className={className} style={{ ...money, ...style }}>{value}</span>;
}

export function Field({ label, hint, error, children, required }) {
    return (
        <label className='block'>
            <span className='mb-1.5 block text-[13px] font-semibold text-[#344054]'>
                {label}{required && <span className='text-[#D92D20]'> *</span>}
            </span>
            {children}
            {error ? <span className='mt-1.5 block text-[12.5px] text-[#D92D20]'>{error}</span>
                : hint && <span className='mt-1.5 block text-[12.5px] text-[#667085]'>{hint}</span>}
        </label>
    );
}

export const inputClass = 'w-full rounded-[10px] border border-[#D0D5DD] bg-white px-3.5 py-2.5 text-[14.5px] text-[#101828] outline-none transition placeholder:text-[#98A2B3] focus:border-[#84A9FF] focus:ring-4 focus:ring-[#E0EAFF] disabled:bg-[#F9FAFB] disabled:text-[#667085]';

export function Modal({ open, title, onClose, children, footer, width = 520 }) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className='fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(16,24,40,0.55)] p-4' onClick={onClose}>
            <div role='dialog' aria-modal='true' className='max-h-[92vh] w-full overflow-auto rounded-[18px] bg-white shadow-[0_24px_48px_rgba(16,24,40,0.18)]' style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
                <div className='flex items-start justify-between gap-4 px-6 pt-5'>
                    <h3 className='m-0 text-[18px] font-bold tracking-[-0.01em]' style={{ color: INK }}>{title}</h3>
                    <button onClick={onClose} className='-mr-1 rounded-[8px] px-2 text-[22px] leading-none text-[#98A2B3] hover:text-[#344054]' aria-label='Close'>×</button>
                </div>
                <div className='px-6 py-4'>{children}</div>
                {footer && <div className='flex flex-wrap justify-end gap-2 border-t border-[#F2F4F7] px-6 py-4'>{footer}</div>}
            </div>
        </div>
    );
}

export function Empty({ title, children, action }) {
    return (
        <div className='flex flex-col items-center justify-center px-6 py-14 text-center'>
            <p className='m-0 text-[16px] font-bold' style={{ color: INK }}>{title}</p>
            {children && <p className='m-0 mt-1.5 max-w-[420px] text-[14px] leading-6 text-[#667085]'>{children}</p>}
            {action && <div className='mt-5'>{action}</div>}
        </div>
    );
}

/*
 * The cost of a payment, set like the bottom of a rate confirmation: line
 * items, a rule, the total. `b` is the API's breakdown (money objects).
 */
export function Breakdown({ b, guest = false, compact = false }) {
    if (!b) return null;

    const row = (label, value, tone) => (
        <div className={`flex items-baseline justify-between gap-4 ${compact ? 'py-1' : 'py-1.5'} text-[14px] ${tone || 'text-[#475467]'}`}>
            <span>{label}</span><Amount value={value} />
        </div>
    );

    const platformPct = b.platform_fee?.pct ?? b.platform_fee_pct;
    const cardPct = b.card_fee?.pct;

    return (
        <div>
            {row('Carrier receives', b.carrier_receives?.formatted ?? b.amount?.formatted, 'text-[#101828] font-semibold')}
            {row(`${guest ? 'Pay-per-use fee' : 'DollarTraq fee'}${platformPct ? ` (${platformPct}%)` : ''}`, b.platform_fee?.formatted)}
            {Number(b.card_fee?.cents) > 0 && row(`Card surcharge${cardPct ? ` (${cardPct}%)` : ''}`, b.card_fee.formatted)}
            <div className='my-2 border-t border-[#EAECF0]' />
            <div className='flex items-baseline justify-between gap-4'>
                <span className='text-[14px] font-semibold text-[#101828]'>You pay</span>
                <Amount value={b.total?.formatted} className='text-[22px] font-extrabold tracking-[-0.01em] text-[#101828]' />
            </div>
        </div>
    );
}

export function Timeline({ items }) {
    if (!items?.length) return <p className='m-0 text-[13.5px] text-[#667085]'>Nothing yet.</p>;

    const list = [...items].reverse();

    return (
        <ol className='m-0 list-none p-0'>
            {list.map((e, i) => (
                <li key={i} className='relative flex gap-3.5 pb-5 last:pb-0'>
                    {i < list.length - 1 && <span className='absolute left-[5px] top-[16px] h-[calc(100%-10px)] w-px bg-[#E4E7EC]' />}
                    <span className={`relative mt-[5px] h-[11px] w-[11px] shrink-0 rounded-full border-2 ${i === 0 ? 'border-[#2953E4] bg-[#2953E4]' : 'border-[#D0D5DD] bg-white'}`} />
                    <div className='min-w-0'>
                        <p className='m-0 text-[14px] font-semibold text-[#101828]'>{e.label}</p>
                        {e.detail && <p className='m-0 mt-0.5 text-[13px] text-[#475467]'>{e.detail}</p>}
                        <p className='m-0 mt-0.5 text-[12px] text-[#98A2B3]'>{date(e.at, true)}{e.actor === 'stripe' ? ' by Stripe' : e.actor === 'guest' ? ' by the payer' : ''}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export function Facts({ items }) {
    return (
        <dl className='m-0 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2'>
            {items.filter(Boolean).map(([k, v]) => (
                <div key={k}>
                    <dt className='text-[12.5px] font-medium text-[#667085]'>{k}</dt>
                    <dd className='m-0 mt-0.5 text-[14.5px] text-[#101828]'>{v || '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

/*
 * Where the money is: payer -> held by DollarTraq -> carrier. The one
 * signature element of DT Pay - every payment's page is built around it.
 * `stage`: 0 not paid, 1 clearing, 2 held, 3 with the carrier; `stopped`
 * marks a payment that ended before the carrier (refunded / failed /
 * cancelled).
 */
export function MoneyRoute({ stage, stopped, payerLabel = 'Your account', carrierLabel = 'Carrier', amount, onBlue = false, notes = [] }) {
    const stops = [
        { label: payerLabel, note: notes[0] },
        { label: stage === 1 ? 'Clearing' : 'Held by DollarTraq', note: notes[1] },
        { label: carrierLabel, note: notes[2] },
    ];

    // Where the marker sits on the line: 0%, 50% or 100%.
    const at = stopped ? null : stage >= 3 ? 100 : stage >= 1 ? 50 : 0;
    const fill = at ?? 0;

    const line = onBlue ? 'rgba(255,255,255,0.28)' : '#E4E7EC';
    const done = onBlue ? '#FFFFFF' : stage >= 3 ? '#079455' : BLUE;
    const text = onBlue ? '#FFFFFF' : INK;
    const sub = onBlue ? 'rgba(255,255,255,0.72)' : '#667085';

    return (
        <div className='w-full'>
            <div className='relative mx-[10px] h-[28px]'>
                <div className='absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full' style={{ background: line }} />
                <div className='absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-[width] duration-700 motion-reduce:transition-none' style={{ width: `${fill}%`, background: done }} />
                {[0, 50, 100].map((p, i) => {
                    const reached = !stopped && fill >= p;

                    return (
                        <span
                            key={p}
                            className='absolute top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]'
                            style={{ left: `${p}%`, borderColor: reached ? done : line, background: onBlue ? (reached ? '#fff' : '#2546C8') : '#fff' }}
                            aria-hidden='true'
                            data-stop={i}
                        />
                    );
                })}
                {at !== null && amount && (
                    <span
                        className='absolute top-1/2 -translate-x-1/2 -translate-y-[155%] whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold transition-[left] duration-700 motion-reduce:transition-none'
                        style={{ left: `${at}%`, ...money, background: onBlue ? '#fff' : (stage >= 3 ? '#079455' : BLUE), color: onBlue ? '#1E3FB8' : '#fff' }}
                    >
                        {amount}
                    </span>
                )}
            </div>
            <div className='mt-2 grid grid-cols-3 gap-2'>
                {stops.map((s, i) => (
                    <div key={i} className={i === 0 ? 'text-left' : i === 1 ? 'text-center' : 'text-right'}>
                        <p className='m-0 text-[13px] font-semibold' style={{ color: text }}>{s.label}</p>
                        {s.note && <p className='m-0 mt-0.5 text-[12px]' style={{ color: sub }}>{s.note}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
