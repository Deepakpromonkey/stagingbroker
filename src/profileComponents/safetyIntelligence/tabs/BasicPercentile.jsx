import {
    VERDICT_STYLES,
    TICKS,
    PERCENTILE_FOOTNOTE,
    basicView,
    ordinal,
    formatMeasure,
    verdictCopy,
} from './basicPercentileModel';

/** Right-aligned status on a BASIC selector card: verdict dot + ≈percentile. */
export function StatusCluster({ view, onDark }) {
    if (!view) return null;

    const style = VERDICT_STYLES[view.verdict] || VERDICT_STYLES.not_ranked;

    let text = '—';

    if (view.verdict !== 'not_ranked') {
        text = Number(view.measure || 0) > 0 && view.percentile_est !== null
            ? `≈${ordinal(view.percentile_est)}`
            : 'No violations';
    }

    return (
        <span
            className={`inline-flex items-center gap-[5px] text-[10.5px] font-[800] ${onDark ? 'text-white' : 'text-slate-600'}`}
            title={verdictCopy(view)}
        >
            <span
                className='inline-block h-[8px] w-[8px] rounded-full'
                style={{ background: style.color, boxShadow: onDark ? '0 0 0 2px rgba(255,255,255,0.6)' : 'none' }}
            />
            {text}
        </span>
    );
}

/** Verdict chip: colour from the verdict, never the card. */
export function VerdictChip({ view }) {
    const style = VERDICT_STYLES[view.verdict] || VERDICT_STYLES.not_ranked;

    return (
        <span
            className='inline-flex items-center rounded-full px-[10px] py-[3px] text-[11px] font-[800]'
            style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
        >
            {verdictCopy(view)}
        </span>
    );
}

/** The percentile gauge: zones, cut ticks, FMCSA threshold flag, carrier pin. */
export function PercentileGauge({ view }) {
    const t = view.threshold_pct;
    const pct = view.percentile_est ?? 0;
    const pinColor = (VERDICT_STYLES[view.verdict] || VERDICT_STYLES.clear).color;

    return (
        <div className='w-full px-[6px] pt-[34px] pb-[40px]'>
            <div className='relative h-[12px] w-full rounded-full overflow-hidden'>
                <div className='absolute inset-y-0 left-0' style={{ width: '50%', background: '#bbf7d0' }} />
                <div className='absolute inset-y-0' style={{ left: '50%', width: `${t - 50}%`, background: '#fde68a' }} />
                <div className='absolute inset-y-0 right-0' style={{ left: `${t}%`, background: '#fecaca' }} />
            </div>

            <div className='relative w-full'>
                {/* threshold flag */}
                <div className='absolute' style={{ left: `${t}%`, top: '-46px', transform: 'translateX(-50%)' }}>
                    <span className='whitespace-nowrap rounded-[6px] bg-[#7f1d1d] px-[6px] py-[2px] text-[10px] font-[900] text-white'>
                        FMCSA {ordinal(t)}
                    </span>
                    <div className='mx-auto h-[22px] w-[2px] bg-[#7f1d1d]' />
                </div>

                {/* carrier pin, labelled where it sits (kept inside the track at the ends) */}
                <div className='absolute' style={{ left: `${Math.min(99, Math.max(0, pct))}%`, top: '-20px', transform: 'translateX(-50%)' }}>
                    <div className='mx-auto h-[16px] w-[16px] rounded-full border-[3px] border-white' style={{ background: pinColor, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
                </div>
                <div
                    className='absolute whitespace-nowrap rounded-[6px] bg-white px-[6px] py-[1px] text-[12px] font-[800]'
                    style={{
                        left: `${Math.min(92, Math.max(8, pct))}%`,
                        top: '40px',
                        transform: 'translateX(-50%)',
                        color: pinColor,
                        border: `1px solid ${pinColor}`,
                    }}
                >
                    {formatMeasure(view.measure)} · ≈{ordinal(pct)}
                </div>

                {/* ticks with this group's cut values */}
                {TICKS.map((p) => (
                    <div key={p} className='absolute text-center' style={{ left: `${p}%`, top: '2px', transform: 'translateX(-50%)' }}>
                        <div className='mx-auto h-[6px] w-[1px] bg-slate-400' />
                        <div className={`whitespace-nowrap text-[9.5px] ${p === t ? 'font-[900] text-[#7f1d1d]' : 'font-[700] text-slate-500'}`}>
                            {ordinal(p)}
                        </div>
                        <div className='whitespace-nowrap text-[9.5px] font-[600] text-slate-400'>
                            {formatMeasure(view.cuts?.[p])}
                        </div>
                    </div>
                ))}
            </div>

            <div className='h-[44px]' />
        </div>
    );
}

/** In place of the gauge when FMCSA would assign no percentile. */
export function NotRankedPanel({ view }) {
    return (
        <div className='w-full rounded-[12px] border border-dashed border-slate-300 bg-slate-50 px-[16px] py-[14px]'>
            <div className='mb-[10px] h-[10px] w-full rounded-full border border-dashed border-slate-300' />
            <p className='m-0 text-[12.5px] font-[700] text-slate-600'>
                No percentile — FMCSA assigns peer ranks after {view.floor} {view.events_label}; this carrier has {view.events}.
            </p>
            <p className='m-0 mt-[4px] text-[11.5px] text-slate-500'>
                Score abstains on this BASIC — no flag fired, no points added. Thin history itself is handled by INSP-02.
            </p>
        </div>
    );
}

/** Peer group caption under the gauge, with the benchmark edition. */
export function GroupCaption({ view, basicLabel, vintage }) {
    if (!view || view.verdict === 'not_ranked') return null;

    return (
        <div className='flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500'>
            <span>
                Peer group {view.peer_group} · {view.peer_group_label}
                {view.group_n ? ` · ranked among ${Number(view.group_n).toLocaleString()} carriers with ${basicLabel} violations` : ''}
            </span>
            {vintage && <span className='font-[700] text-slate-400'>Benchmark {vintage}</span>}
        </div>
    );
}

/** "Safety Policy Guide": this carrier's group cut rows for all five BASICs. */
export function PolicyGuideModal({ open, onClose, smsMeasures, metrics, vintage }) {
    if (!open) return null;

    return (
        <div className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4' onClick={onClose}>
            <div
                className='w-full max-w-[760px] max-h-[90vh] overflow-auto rounded-[16px] bg-white shadow-xl'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4'>
                    <div>
                        <p className='m-0 text-[15px] font-[900] text-[#001b3d]'>Safety Policy Guide</p>
                        <p className='m-0 mt-1 text-[12px] text-slate-500'>
                            The lines this carrier is judged against: its FMCSA safety-event peer group in each BASIC,
                            and that group's percentile cut-points. A BASIC flags at or above its threshold.
                        </p>
                    </div>
                    <button onClick={onClose} className='text-[13px] font-[800] text-slate-400 hover:text-slate-700'>Close</button>
                </div>

                <div className='overflow-x-auto px-5 py-4'>
                    <table className='w-full min-w-[620px] text-[12px]'>
                        <thead>
                            <tr className='text-left text-slate-400'>
                                <th className='py-2 pr-3 font-[800]'>BASIC</th>
                                <th className='py-2 pr-3 font-[800]'>Peer group</th>
                                {TICKS.map((p) => <th key={p} className='py-2 pr-3 text-right font-[800]'>{ordinal(p)}</th>)}
                                <th className='py-2 text-right font-[800]'>Threshold</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metrics.map((m) => {
                                const view = basicView(smsMeasures, m.key);

                                if (!view) return null;

                                return (
                                    <tr key={m.key} className='border-t border-slate-100'>
                                        <td className='py-2 pr-3 font-[800] text-[#0f172a]'>{m.label}</td>
                                        <td className='py-2 pr-3 text-slate-600'>
                                            {view.verdict === 'not_ranked'
                                                ? `Not ranked (${view.events} of ${view.floor} ${view.events_label})`
                                                : `${view.peer_group} · ${view.peer_group_label}`}
                                        </td>
                                        {TICKS.map((p) => (
                                            <td
                                                key={p}
                                                className={`py-2 pr-3 text-right ${p === view.threshold_pct ? 'font-[900] text-[#7f1d1d]' : 'text-slate-600'}`}
                                            >
                                                {view.cuts ? formatMeasure(view.cuts[p]) : '—'}
                                            </td>
                                        ))}
                                        <td className='py-2 text-right font-[800] text-[#7f1d1d]'>{ordinal(view.threshold_pct)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className='mt-3 mb-0 text-[11px] text-slate-400'>
                        {PERCENTILE_FOOTNOTE}{vintage ? ` Benchmark ${vintage}.` : ''}
                    </p>
                </div>
            </div>
        </div>
    );
}
