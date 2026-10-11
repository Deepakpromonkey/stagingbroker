import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_STYLES, date } from './format';

/* Building blocks for the DT Pay screens. */

const INK = '#101828';

export function Page({ title, subtitle, back, actions, children, testMode }) {
    return (
        <div className='min-h-screen bg-[#F8FAFC]'>
            <div className='mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8'>
                {testMode && <TestModeBanner />}
                <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                    <div className='min-w-0'>
                        {back && (
                            <Link to={back.to} className='mb-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#475467] hover:text-[#175CD3]'>
                                ← {back.label}
                            </Link>
                        )}
                        <h1 className='m-0 text-[22px] font-extrabold tracking-[-0.01em]' style={{ color: INK }}>{title}</h1>
                        {subtitle && <p className='m-0 mt-1 text-[13px] text-[#667085]'>{subtitle}</p>}
                    </div>
                    {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
                </div>
                {children}
            </div>
        </div>
    );
}

export function TestModeBanner() {
    return (
        <div className='mb-4 rounded-[10px] border border-[#FEDF89] bg-[#FFFAEB] px-4 py-2 text-[12.5px] font-semibold text-[#B54708]'>
            Test mode — no real money moves. Use Stripe test cards (4242 4242 4242 4242) and test bank accounts.
        </div>
    );
}

export function Card({ title, subtitle, actions, children, className = '', padded = true }) {
    return (
        <section className={`rounded-[14px] border border-[#EAECF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${className}`}>
            {(title || actions) && (
                <div className='flex flex-wrap items-start justify-between gap-2 border-b border-[#F2F4F7] px-5 py-4'>
                    <div>
                        {title && <h2 className='m-0 text-[15px] font-bold' style={{ color: INK }}>{title}</h2>}
                        {subtitle && <p className='m-0 mt-0.5 text-[12.5px] text-[#667085]'>{subtitle}</p>}
                    </div>
                    {actions}
                </div>
            )}
            <div className={padded ? 'p-5' : ''}>{children}</div>
        </section>
    );
}

const BUTTON = {
    primary: 'bg-[#175CD3] text-white hover:bg-[#1849A9] border-transparent',
    secondary: 'bg-white text-[#344054] hover:bg-[#F9FAFB] border-[#D0D5DD]',
    danger: 'bg-white text-[#B42318] hover:bg-[#FEF3F2] border-[#FDA29B]',
    success: 'bg-[#079455] text-white hover:bg-[#067647] border-transparent',
    ghost: 'bg-transparent text-[#475467] hover:bg-[#F2F4F7] border-transparent',
};

export function Button({ variant = 'primary', loading = false, disabled = false, children, className = '', type = 'button', ...rest }) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-[8px] border px-4 py-2 text-[13.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON[variant]} ${className}`}
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
            className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${small ? 'h-[14px] w-[14px]' : 'h-[22px] w-[22px] text-[#175CD3]'}`}
            aria-label='Loading'
        />
    );
}

export function Loading({ label = 'Loading…' }) {
    return (
        <div className='flex items-center justify-center gap-3 py-16 text-[13px] text-[#667085]'>
            <Spinner /> {label}
        </div>
    );
}

export function ErrorBanner({ children, onRetry }) {
    if (!children) return null;

    return (
        <div className='mb-4 flex items-start justify-between gap-3 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-[13px] text-[#B42318]'>
            <span>{children}</span>
            {onRetry && <button onClick={onRetry} className='shrink-0 font-semibold underline'>Retry</button>}
        </div>
    );
}

export function Notice({ tone = 'info', children }) {
    const tones = {
        info: 'border-[#B2DDFF] bg-[#EFF8FF] text-[#175CD3]',
        warn: 'border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]',
        success: 'border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]',
    };

    return <div className={`rounded-[10px] border px-4 py-3 text-[13px] ${tones[tone]}`}>{children}</div>;
}

export function StatusBadge({ status, label, onHold }) {
    const s = STATUS_STYLES[status] || STATUS_STYLES.draft;

    return (
        <span className='inline-flex flex-wrap items-center gap-1.5'>
            <span className='inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold' style={{ color: s.color, background: s.bg, borderColor: s.border }}>
                {label || status}
            </span>
            {onHold && (
                <span className='inline-flex items-center rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#B54708]'>
                    On hold
                </span>
            )}
        </span>
    );
}

export function Stat({ label, value, sub, tone }) {
    return (
        <div className='rounded-[14px] border border-[#EAECF0] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]'>
            <p className='m-0 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#667085]'>{label}</p>
            <p className='m-0 mt-1.5 text-[24px] font-extrabold tracking-[-0.01em]' style={{ color: tone || INK }}>{value}</p>
            {sub && <p className='m-0 mt-0.5 text-[12px] text-[#667085]'>{sub}</p>}
        </div>
    );
}

export function Field({ label, hint, error, children, required }) {
    return (
        <label className='block'>
            <span className='mb-1.5 block text-[12.5px] font-semibold text-[#344054]'>
                {label}{required && <span className='text-[#D92D20]'> *</span>}
            </span>
            {children}
            {error ? <span className='mt-1 block text-[12px] text-[#D92D20]'>{error}</span>
                : hint && <span className='mt-1 block text-[12px] text-[#667085]'>{hint}</span>}
        </label>
    );
}

export const inputClass = 'w-full rounded-[8px] border border-[#D0D5DD] bg-white px-3 py-2 text-[14px] text-[#101828] outline-none transition focus:border-[#84ADFF] focus:ring-4 focus:ring-[#D1E0FF] disabled:bg-[#F9FAFB]';

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
            <div className='max-h-[92vh] w-full overflow-auto rounded-[16px] bg-white shadow-xl' style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()}>
                <div className='flex items-start justify-between gap-4 border-b border-[#F2F4F7] px-5 py-4'>
                    <h3 className='m-0 text-[16px] font-bold' style={{ color: INK }}>{title}</h3>
                    <button onClick={onClose} className='text-[20px] leading-none text-[#98A2B3] hover:text-[#344054]' aria-label='Close'>×</button>
                </div>
                <div className='px-5 py-4'>{children}</div>
                {footer && <div className='flex flex-wrap justify-end gap-2 border-t border-[#F2F4F7] px-5 py-3'>{footer}</div>}
            </div>
        </div>
    );
}

export function Empty({ title, children, action }) {
    return (
        <div className='flex flex-col items-center justify-center px-6 py-14 text-center'>
            <p className='m-0 text-[15px] font-bold' style={{ color: INK }}>{title}</p>
            {children && <p className='m-0 mt-1 max-w-[420px] text-[13px] text-[#667085]'>{children}</p>}
            {action && <div className='mt-4'>{action}</div>}
        </div>
    );
}

/** Load amount, fees and total. `b` is the API's breakdown (money objects). */
export function Breakdown({ b, guest = false }) {
    if (!b) return null;

    const row = (label, value, strong) => (
        <div className={`flex items-center justify-between py-1.5 text-[13.5px] ${strong ? 'font-bold text-[#101828]' : 'text-[#475467]'}`}>
            <span>{label}</span><span>{value}</span>
        </div>
    );

    return (
        <div>
            {row('Load amount (carrier receives)', b.amount?.formatted ?? b.carrier_receives?.formatted)}
            {row(`${guest ? 'Pay-per-use' : 'Platform'} fee${b.platform_fee?.pct ?? b.platform_fee_pct ? ` (${b.platform_fee?.pct ?? b.platform_fee_pct}%)` : ''}`, b.platform_fee?.formatted)}
            {Number(b.card_fee?.cents) > 0 && row(`Card fee${b.card_fee?.pct ? ` (${b.card_fee.pct}%)` : ''}`, b.card_fee.formatted)}
            <div className='my-1 border-t border-dashed border-[#EAECF0]' />
            {row('Total charged', b.total?.formatted, true)}
        </div>
    );
}

export function Timeline({ items }) {
    if (!items?.length) return <p className='m-0 text-[13px] text-[#667085]'>Nothing yet.</p>;

    return (
        <ol className='m-0 list-none p-0'>
            {[...items].reverse().map((e, i) => (
                <li key={i} className='relative flex gap-3 pb-4 last:pb-0'>
                    <span className='mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full bg-[#175CD3]' />
                    <div className='min-w-0'>
                        <p className='m-0 text-[13.5px] font-semibold text-[#101828]'>{e.label}</p>
                        {e.detail && <p className='m-0 mt-0.5 text-[12.5px] text-[#475467]'>{e.detail}</p>}
                        <p className='m-0 mt-0.5 text-[11.5px] text-[#98A2B3]'>{date(e.at, true)} · {e.actor}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}

export function KeyValue({ items }) {
    return (
        <dl className='m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2'>
            {items.filter(Boolean).map(([k, v]) => (
                <div key={k}>
                    <dt className='text-[12px] font-semibold uppercase tracking-[0.04em] text-[#98A2B3]'>{k}</dt>
                    <dd className='m-0 mt-0.5 text-[14px] text-[#101828]'>{v || '—'}</dd>
                </div>
            ))}
        </dl>
    );
}
