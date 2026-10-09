import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import Checkbox from '@mui/material/Checkbox';
import Radio from '@mui/material/Radio';
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import {
    fmtN, fmtM, isActive, chipLabel, humanize, YEAR_KEYS, friendlyError,
    exportCarriers, getCarrier, getScores, sendInvite, lookupCarrier,
    uploadImport, listImports, getImport, listDatasets, activateDataset, deleteDataset,
} from './carrierData';

const PAGE_SIZES = [25, 50, 100, 250, 500];
const PINNED_COLUMN = 'company_name';
const LINK = 'text-blue-600 hover:underline';
const BTN = 'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-gray-50 sm:flex-none';
const PAPER_FIT = { m: { xs: 2, sm: 4 }, width: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 64px)' } };
const PAD_X = { xs: 2, sm: 3 };
const PAGER_BTN_SX = { color: '#334155', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }, '&.Mui-disabled': { color: '#cbd5e1', borderColor: '#f1f5f9' } };
const isFull = (r) => r.record_type === 'Full profile';
const pctFmt = (v) => (v == null ? '–' : Math.round(v) + '%');

export const Sk = ({ className = '' }) => <div className={'animate-pulse rounded bg-gray-200/80 ' + className} />;

export function HeaderSkeleton() {
    return (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm sm:p-5" aria-busy="true">
            <div className="flex flex-wrap items-end gap-4 lg:gap-6">
                <div><Sk className="h-10 w-32" /><Sk className="mt-2.5 h-3 w-64 max-w-full" /></div>
                <div className="grid w-full grid-cols-3 gap-x-4 gap-y-3 pb-1 sm:flex sm:w-auto sm:flex-wrap lg:gap-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => <div key={i}><Sk className="h-5 w-12" /><Sk className="mt-2 h-3 w-16" /></div>)}
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton({ cols = 7, rows = 12, bare = false }) {
    return (
        <div className={bare ? '' : 'min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white'} aria-busy="true" aria-label="Loading carriers">
            <div className="flex gap-4 overflow-hidden border-b border-gray-200 bg-gray-50 px-2.5 py-3">
                {Array.from({ length: cols }).map((_, i) => <Sk key={i} className={'h-3 shrink-0 ' + (i === 0 ? 'w-40' : 'w-20')} />)}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex items-center gap-4 overflow-hidden border-b border-gray-100 px-2.5 py-3">
                    {Array.from({ length: cols }).map((_, i) => (
                        i === 0 ? <div key={i} className="w-40 shrink-0"><Sk className="h-4 w-36" /><Sk className="mt-1.5 h-3 w-24" /></div> : <Sk key={i} className="h-4 w-20 shrink-0" />
                    ))}
                </div>
            ))}
        </div>
    );
}

export function MainSkeleton() {
    return (
        <main className="flex min-h-0 min-w-0 flex-col">
            <HeaderSkeleton />
            <div className="mb-3 flex flex-wrap items-center gap-2.5"><Sk className="h-3 w-full sm:w-52" /><div className="hidden flex-1 sm:block" /><Sk className="h-9 flex-1 sm:w-20 sm:flex-none" /><Sk className="h-9 flex-1 sm:w-24 sm:flex-none" /><Sk className="h-9 flex-1 sm:w-24 sm:flex-none" /></div>
            <TableSkeleton />
        </main>
    );
}

const ListSk = () => <div className="grid gap-2" aria-busy="true">{[0, 1, 2].map((i) => <Sk key={i} className="h-14 w-full" />)}</div>;


function Chip({ children, onClose }) {
    return (
        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1.5 text-xs text-slate-600 sm:max-w-[360px]">
            <span className="truncate">{children}</span>
            <button type="button" onClick={onClose} aria-label="Remove" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-slate-400 hover:text-slate-600">
                <CloseIcon sx={{ fontSize: 12 }} />
            </button>
        </span>
    );
}

function ResultsHeader({ loading, meta, result, totalAll, query, recordType, filterState, onRemoveFilter, onClearQuery, onClearRecordType, onClearAll }) {
    const total = result.pagination ? result.pagination.total : 0;
    const sm = result.summary || {};
    const yes = sm.pct_yes_of_stated || {};
    const pct = totalAll ? (100 * total) / totalAll : 0;
    const pctLabel = total && pct < 1 ? '<1%' : Math.round(pct) + '%';
    const mc = sm.median_cargo_insurance;
    const recFacet = result.facets && result.facets.values && result.facets.values.record_type;
    const fullCount = recordType === 'full' ? total : recordType === 'listing' ? 0 : recFacet ? (recFacet.find((o) => o.value === 'full') || {}).count : null;
    const stats = [
        [sm.median_drivers_approx == null ? '–' : fmtN(Math.round(sm.median_drivers_approx)), 'Median drivers'],
        [mc == null ? '–' : '$' + (mc >= 1e6 ? (mc / 1e6).toFixed(1) + 'M' : Math.round(mc / 1000) + 'k'), 'Median cargo insurance'],
        [pctFmt(yes.hazmat), 'Hazmat'],
        [pctFmt(yes.reefer_drayage), 'Reefer'],
        [pctFmt(yes.twic), 'TWIC'],
        [pctFmt(yes.private_chassis), 'Private chassis'],
    ];
    const activeFilters = meta.FILTERS.filter((f) => isActive(filterState[f.id], f));
    const hasChips = query.trim() || recordType !== 'all' || activeFilters.length > 0;

    return (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-end gap-4 lg:gap-6">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2.5">
                        {loading ? <Sk className="h-10 w-28" /> : <span className="text-[34px] font-bold leading-none tracking-tight text-slate-900 sm:text-[40px]">{fmtN(total)}</span>}
                        {loading ? <Sk className="h-7 w-24 rounded-full" /> : <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">{pctLabel} of total</span>}
                    </div>
                    <div className="mt-1.5 text-xs text-slate-500">
                        {loading ? <Sk className="h-3 w-72 max-w-full" /> : <>carriers match{fullCount != null && <>, <b className="font-semibold text-slate-900">{fmtN(fullCount)}</b> with full profiles</>}, out of {fmtN(totalAll)} total.</>}
                    </div>
                </div>
                <div className="grid w-full grid-cols-3 gap-x-4 gap-y-3 pb-1 sm:flex sm:w-auto sm:flex-wrap lg:gap-6">
                    {stats.map(([b, label]) => (
                        <div key={label} className="flex min-w-0 flex-col">
                            {loading ? <Sk className="h-5 w-12" /> : <b className="text-xl font-bold leading-none tracking-tight text-slate-900">{b}</b>}
                            <span className="mt-1 text-xs text-slate-500">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
            {hasChips && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
                    {query.trim() && <Chip onClose={onClearQuery}>Search: <b>{query.trim()}</b></Chip>}
                    {recordType !== 'all' && <Chip onClose={onClearRecordType}>Records: <b>{recordType === 'full' ? 'Full profiles' : 'Listings only'}</b></Chip>}
                    {activeFilters.map((f) => <Chip key={f.id} onClose={() => onRemoveFilter(f)}>{chipLabel(f, filterState[f.id])}</Chip>)}
                    <button type="button" onClick={onClearAll} className="px-1.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700">Clear all</button>
                </div>
            )}
        </div>
    );
}

function ColumnPicker({ meta, columns, onChange }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(columns);
    useEffect(() => { if (open) setDraft(columns); }, [open]);
    const toggle = (key) => setDraft((d) => (d.includes(key) ? d.filter((k) => k !== key) : [...d, key]));
    const apply = () => {
        const same = draft.length === columns.length && draft.every((k) => columns.includes(k));
        if (!same) onChange(draft);
        setOpen(false);
    };
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={BTN}><ViewColumnOutlinedIcon sx={{ fontSize: 17 }} />Columns</button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '14px', maxHeight: '80vh', ...PAPER_FIT } }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, px: PAD_X }}>
                    <span className="text-base font-bold text-slate-900">Choose columns</span>
                    <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#94a3b8' }}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: PAD_X, py: 2.5 }}>
                    {meta.groups.map((g) => {
                        const fields = meta.F.filter((f) => f.g === g.id);
                        if (!fields.length) return null;
                        return (
                            <div key={g.id} className="mb-4">
                                <div className="mb-1.5 text-sm font-bold text-slate-800">{g.t}</div>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 min-[420px]:grid-cols-2 sm:gap-y-0.5">
                                    {fields.map((f) => (
                                        <label key={f.k} className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <Checkbox size="small" disabled={f.k === PINNED_COLUMN} checked={f.k === PINNED_COLUMN || draft.includes(f.k)} onChange={() => toggle(f.k)} sx={{ p: 0, color: '#cbd5e1', '&.Mui-checked': { color: '#2563eb' } }} />
                                            {f.l}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </DialogContent>
                <DialogActions sx={{ px: PAD_X, py: 2 }}>
                    <button type="button" onClick={() => setDraft(meta.defaultColumns)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Defaults</button>
                    <button type="button" onClick={() => setDraft(meta.F.map((f) => f.k).filter((k) => k !== PINNED_COLUMN))} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Show all</button>
                    <div className="flex-1" />
                    <button type="button" onClick={apply} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700">Done</button>
                </DialogActions>
            </Dialog>
        </>
    );
}

function cellContent(key, row, FD) {
    const field = FD[key];
    const v = row[key];
    if (v == null || (Array.isArray(v) && !v.length)) return field && field.t === 'bool' ? <span className="text-gray-300">·</span> : '';
    if (Array.isArray(v)) {
        return (
            <>
                {v.slice(0, 3).map((x) => <span key={x} className="mr-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">{x}</span>)}
                {v.length > 3 && <span className="inline-block rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-400">+{v.length - 3}</span>}
            </>
        );
    }
    if (typeof v === 'boolean') {
        return v ? <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Yes</span> : <span className="text-xs font-semibold text-gray-400">No</span>;
    }
    switch (field ? field.t : 'text') {
        case 'money': return fmtM(v);
        case 'num': return YEAR_KEYS.includes(key) ? String(v) : fmtN(v);
        default: return String(v);
    }
}

function DataInfo({ stats, meta }) {
    const [open, setOpen] = useState(false);
    const coverage = useMemo(() => {
        if (!open || !stats || !stats.field_coverage) return [];
        return Object.entries(stats.field_coverage).map(([k, pct]) => [(meta.FD[k] && meta.FD[k].l) || humanize(k), pct]).sort((a, b) => b[1] - a[1]);
    }, [open, stats, meta]);
    const t = (stats && stats.totals) || {};
    return (
        <>
            <button type="button" onClick={() => setOpen(true)} className={BTN}><InfoOutlinedIcon sx={{ fontSize: 17 }} />Data</button>
            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '14px', maxHeight: '80vh', ...PAPER_FIT } }}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, px: PAD_X }}>
                    <span className="text-base font-bold text-slate-900">About this data</span>
                    <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#94a3b8' }}><CloseIcon fontSize="small" /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ px: PAD_X, py: 2.5 }}>
                    {!stats ? (
                        <div className="grid gap-3" aria-busy="true"><Sk className="h-4 w-40" /><Sk className="h-16 w-full" /><Sk className="h-3 w-56" />{Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-5 w-full" />)}</div>
                    ) : (
                        <>
                            <div className="mb-1.5 text-sm font-bold text-slate-800">What's in here</div>
                            <p className="m-0 mb-4 text-sm leading-relaxed text-slate-600">
                                <b className="font-semibold text-slate-900">{fmtN(t.carriers)}</b> carriers across {fmtN((stats.metros || []).length)} metros;{' '}
                                <b className="font-semibold text-slate-900">{fmtN(t.full_profiles)}</b> have a full profile and {fmtN(t.listings)} are directory listings (name, metro, city, state only).
                                Yes/No filters also have a "?" option for carriers whose profile doesn't mention that item.
                            </p>

                            <div className="mb-1.5 text-sm font-bold text-slate-800">Field coverage (all carriers)</div>
                            <table className="w-full border-collapse text-sm">
                                <tbody>
                                    {coverage.map(([label, pct]) => (
                                        <tr key={label}>
                                            <td className="border-b border-gray-100 px-1 py-1.5 text-slate-600">{label}</td>
                                            <td className="w-[30%] border-b border-gray-100 px-1 py-1.5 sm:w-[40%]">
                                                <div className="relative h-1.5 min-w-[50px] rounded-full bg-blue-50 sm:min-w-[80px]"><i className="absolute inset-y-0 left-0 rounded-full bg-blue-600" style={{ width: Math.min(100, pct).toFixed(1) + '%' }} /></div>
                                            </td>
                                            <td className="border-b border-gray-100 px-1 py-1.5 text-right text-slate-500">{Math.round(pct)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

function ExportDialog({ open, onClose, total, totalAll, visibleCount, buildExport, onToast }) {
    const [rowScope, setRowScope] = useState('view');
    const [colScope, setColScope] = useState('all');
    const [busy, setBusy] = useState(false);
    const count = rowScope === 'all' ? totalAll : total;

    const run = async () => {
        setBusy(true);
        try {
            await exportCarriers(buildExport(rowScope, colScope));
            onToast('Export downloaded');
            onClose();
        } catch (e) {
            onToast(friendlyError(e));
        } finally {
            setBusy(false);
        }
    };
    const radioSx = { p: '4px', color: '#cbd5e1', '&.Mui-checked': { color: '#2563eb' } };
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '14px', ...PAPER_FIT } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1.5, px: PAD_X }}>
                <span className="text-base font-bold text-slate-900">Export carriers</span>
                <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ px: PAD_X, py: 2.5 }}>
                <div className="mb-1.5 text-sm font-bold text-slate-800">Rows</div>
                {[['view', `Matching carriers (${fmtN(total)})`], ['all', `Every carrier (${fmtN(totalAll)})`]].map(([val, label]) => (
                    <label key={val} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600"><Radio size="small" checked={rowScope === val} onChange={() => setRowScope(val)} sx={radioSx} />{label}</label>
                ))}
                <div className="mb-1.5 mt-3.5 text-sm font-bold text-slate-800">Columns</div>
                {[['all', 'All fields'], ['vis', `Visible columns (${visibleCount})`]].map(([val, label]) => (
                    <label key={val} className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600"><Radio size="small" checked={colScope === val} onChange={() => setColScope(val)} sx={radioSx} />{label}</label>
                ))}
                {count > 10000 && <p className="m-0 mt-3 text-xs font-semibold text-amber-700">Exports are limited to 10,000 rows. Narrow the filters first.</p>}
                <p className="m-0 mt-3.5 text-xs text-slate-500">CSV, UTF-8, opens directly in Excel. Limit: 5 exports per minute.</p>
            </DialogContent>
            <DialogActions sx={{ px: PAD_X, py: 2.5 }}>
                <button type="button" disabled={busy || count > 10000} onClick={run} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    <FileDownloadOutlinedIcon sx={{ fontSize: 17 }} />{busy ? 'Preparing…' : 'Download CSV'}
                </button>
            </DialogActions>
        </Dialog>
    );
}

const SECTIONS = [
    ['identity', 'Company'], ['location', 'Location'], ['coverage', 'Coverage'], ['authority', 'Authority'], ['insurance', 'Insurance'],
    ['compliance', 'Compliance'], ['drayage', 'Drayage services'], ['special_cargo', 'Special cargo & services'], ['fleet', 'Drivers & power units'],
    ['equipment', 'Chassis & trailers'], ['contact', 'Contact'], ['profile_dates', 'Profile dates'],
];

function formatValue(key, value, FD) {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
    if (Array.isArray(value)) return value.join(', ');
    const t = FD[key] && FD[key].t;
    if (t === 'money') return fmtM(value);
    if (t === 'num') return YEAR_KEYS.includes(key) ? String(value) : fmtN(value);
    if (key === 'website') return <a href={/^https?:/.test(value) ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className={LINK}>{value}</a>;
    if (key === 'pricing_email' || key === 'dispatch_email') return <a href={`mailto:${value}`} className={LINK}>{value}</a>;
    return String(value);
}

function InviteDialog({ open, onClose, actions, name, onDone, onToast }) {
    const [opt, setOpt] = useState('fmcsa');
    const [busy, setBusy] = useState(false);
    const inv = actions && actions.invite;
    if (!inv) return null;
    const send = async () => {
        setBusy(true);
        try {
            const res = await sendInvite(inv.endpoint, opt === 'alternate' ? inv.alternate_body : inv.body);
            onToast(res.message || 'Invitation sent');
            onClose();
            onDone();
        } catch (e) {
            onToast(e.message || "Couldn't send the invitation.");
        } finally {
            setBusy(false);
        }
    };
    const radioSx = { p: '4px', color: '#cbd5e1', '&.Mui-checked': { color: '#2563eb' } };
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '14px', ...PAPER_FIT } }}>
            <DialogTitle sx={{ pb: 1, px: PAD_X }}><span className="break-words text-base font-bold text-slate-900">Invite {name} to onboard</span></DialogTitle>
            <DialogContent sx={{ px: PAD_X }}>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-700"><Radio size="small" checked={opt === 'fmcsa'} onChange={() => setOpt('fmcsa')} sx={radioSx} />Email the address on the carrier's FMCSA record</label>
                {inv.alternate_body && (
                    <label className="flex cursor-pointer items-start gap-1.5 text-sm text-slate-700">
                        <Radio size="small" checked={opt === 'alternate'} onChange={() => setOpt('alternate')} sx={{ ...radioSx, mt: '-2px' }} />
                        <span className="min-w-0 break-words">Use the directory dispatch email ({inv.alternate_body.email})<small className="block text-xs text-slate-400">The carrier's FMCSA address must approve this address first.</small></span>
                    </label>
                )}
            </DialogContent>
            <DialogActions sx={{ px: PAD_X, py: 2 }}>
                <button type="button" onClick={onClose} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="button" disabled={busy} onClick={send} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">{busy ? 'Sending…' : 'Send invitation'}</button>
            </DialogActions>
        </Dialog>
    );
}

/* ====================== REDESIGNED SINGLE PROFILE VIEW ====================== */


const initials = (name) => (name || '?').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

function scoreTone(score) {
    if (score == null) return 'mid';
    return score >= 75 ? 'good' : score >= 50 ? 'mid' : 'low';
}
const TONE = {
    good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    mid: 'border-amber-200 bg-amber-50 text-amber-700',
    low: 'border-red-200 bg-red-50 text-red-700',
};

function TrustBadge({ ts, score }) {
    if (!ts) return null;
    const value = ts.status === 'ready' ? ts.score : score;
    if (value == null) {
        return (
            <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
                <span className="text-sm font-medium text-slate-500">Calculating trust score…</span>
            </div>
        );
    }
    return (
        <div className={'flex items-center gap-3 rounded-xl border px-4 py-2 ' + TONE[scoreTone(value)]}>
            <span className="text-2xl font-bold leading-none tracking-tight">{value}</span>
            <span className="text-xs font-semibold leading-tight">Trust score</span>
        </div>
    );
}

function CopyId({ label, value }) {
    const [done, setDone] = useState(false);
    const copy = (e) => {
        e.stopPropagation();
        try { navigator.clipboard.writeText(String(value)); setDone(true); setTimeout(() => setDone(false), 1200); } catch (err) {}
    };
    return (
        <button type="button" onClick={copy} title={`Copy ${label}`} className="group inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm hover:border-blue-300 hover:bg-blue-50/40">
            <span className="font-medium text-slate-400">{label}</span>
            <span className="font-bold tabular-nums text-slate-800">{value}</span>
            {done && <span className="text-[11px] font-semibold text-emerald-600">Copied</span>}
        </button>
    );
}

function QuickLink({ href, icon: Icon, children, external }) {
    return (
        <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="inline-flex max-w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-blue-300 hover:text-blue-700">
            {Icon && <Icon sx={{ fontSize: 16 }} className="shrink-0 text-blue-500" />}<span className="truncate">{children}</span>
        </a>
    );
}

function Card({ title, count, children }) {
    return (
        <section className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3.5">
                <span className="h-4 w-1 rounded-full bg-blue-600" />
                <h3 className="m-0 text-sm font-bold text-slate-900">{title}</h3>
                {count != null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{count}</span>}
            </div>
            <div className="px-5 py-4">{children}</div>
        </section>
    );
}

function KV({ rows }) {
    const isLong = (v) => typeof v === 'string' && v.length > 60;
    const short = rows.filter(([, v]) => !isLong(v));
    const long = rows.filter(([, v]) => isLong(v));
    return (
        <div className="grid gap-4">
            {!!short.length && (
                <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {short.map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-lg bg-slate-50/70 px-3 py-2">
                            <dt className="text-[13px] font-medium text-slate-600">{label}</dt>
                            <dd className="m-0 mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {long.map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50/70 px-4 py-3">
                    <div className="text-[13px] font-medium text-slate-600">{label}</div>
                    <p className="m-0 mt-1.5 whitespace-pre-line break-words text-sm font-semibold leading-relaxed text-slate-900">{value}</p>
                </div>
            ))}
        </div>
    );
}

function BoolChips({ bools, FD }) {
    const order = (v) => (v === true ? 0 : v === false ? 1 : 2);
    const sorted = [...bools].sort((a, b) => order(a[1]) - order(b[1]));
    return (
        <div className="flex flex-wrap gap-2">
            {sorted.map(([k, v]) => {
                const label = (FD[k] && FD[k].l) || humanize(k);
                if (v === true) return <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800"><i className="h-1.5 w-1.5 rounded-full bg-emerald-600" />{label}</span>;
                if (v === false) return <span key={k} className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-slate-500">{label}: No</span>;
                return <span key={k} className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-slate-400" title="Not stated in the carrier's profile">{label}: not stated</span>;
            })}
        </div>
    );
}

function ProfileSection({ id, title, kv, bools, FD }) {
    const hasBools = bools.some(([, v]) => v != null);
    return (
        <Card title={title}>
            {!!kv.length && <KV rows={kv} />}
            {hasBools && <div className={kv.length ? 'mt-5 border-t border-gray-100 pt-4' : ''}><BoolChips bools={bools} FD={FD} /></div>}
        </Card>
    );
}

function Highlights({ items }) {
    if (!items.length) return null;
    return (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-gray-200 bg-white px-4 py-3.5 shadow-sm">
                    <div className="text-xl font-bold leading-tight tracking-tight text-slate-900">{value}</div>
                    <div className="mt-1 text-xs text-slate-500">{label}</div>
                </div>
            ))}
        </div>
    );
}

function RelatedRecords({ id, currentKey, onSwitch }) {
    const param = id.scac ? { scac: id.scac } : id.mc ? { mc: id.mc } : id.usdot ? { usdot: id.usdot } : null;
    const pk = param ? JSON.stringify(param) : '';
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!pk) return undefined;
        let stop = false;
        setData(null); setFailed(false);
        lookupCarrier(JSON.parse(pk)).then((r) => { if (!stop) setData(r); }).catch(() => { if (!stop) setFailed(true); });
        return () => { stop = true; };
    }, [pk]);
    if (!pk || failed) return null;
    if (!data) return <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5" aria-busy="true"><Sk className="mb-3 h-4 w-40" /><Sk className="mb-2 h-10 w-full" /><Sk className="h-10 w-full" /></div>;
    const others = (data.carriers || []).filter((c) => c.carrier_key !== currentKey);
    if (!others.length) return null;
    return (
        <Card title="Other directory records" count={others.length}>
            <ul className="m-0 grid list-none gap-2 p-0">
                {others.map((c) => (
                    <li key={c.carrier_key}>
                        <button type="button" onClick={() => onSwitch(c.carrier_key)} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3.5 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/40">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-900">{c.company_name}</span>
                                <small className="block truncate text-xs text-slate-400">{[(c.metros || []).join(', '), [c.hq_city, c.hq_state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</small>
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-blue-600">View</span>
                        </button>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function CarrierDrawer({ carrierKey, meta, canInvite, onClose, onToast, onSwitch, onViewDollarTraqProfile, onViewOnboarding }) {
    const FD = meta.FD;
    const [d, setD] = useState(null);
    const [err, setErr] = useState(null);
    const [score, setScore] = useState(null);
    const [inviteOpen, setInviteOpen] = useState(false);

    const load = useCallback(async () => {
        setErr(null);
        try { setD(await getCarrier(carrierKey, 'trust_score,onboarding')); } catch (e) { setErr(friendlyError(e)); }
    }, [carrierKey]);

    useEffect(() => {
        if (!carrierKey) return;
        setD(null); setScore(null);
        load();
    }, [carrierKey, load]);

    useEffect(() => {
        const dot = d && d.carrier && d.carrier.authority && d.carrier.authority.usdot;
        if (!d || !d.trust_score || d.trust_score.status !== 'pending' || !dot) return undefined;
        let stop = false;
        let tries = 0;
        let timer;
        const tick = async () => {
            if (stop) return;
            tries += 1;
            try {
                const r = await getScores([dot]);
                const v = r && r.scores ? r.scores[dot] : null;
                if (v != null) { setScore(v); return; }
            } catch (e) {}
            if (tries < 15) timer = setTimeout(tick, 4000);
        };
        timer = setTimeout(tick, 3000);
        return () => { stop = true; clearTimeout(timer); };
    }, [d]);

    if (!carrierKey) return null;
    const c = d && d.carrier;

    const sections = c
        ? SECTIONS.map(([sid, title]) => {
            const sec = c[sid] || {};
            const entries = Object.entries(sec).filter(([k]) => !(sid === 'identity' && k === 'company_name'));
            const bools = entries.filter(([k]) => FD[k] && FD[k].t === 'bool');
            const kv = entries.filter(([k]) => !(FD[k] && FD[k].t === 'bool')).map(([k, v]) => { const f = formatValue(k, v, FD); return f == null ? null : [(FD[k] && FD[k].l) || humanize(k), f]; }).filter(Boolean);
            if (!kv.length && !bools.some(([, v]) => v != null)) return null;
            return { id: sid, title, kv, bools };
        }).filter(Boolean)
        : [];

    const highlights = c
        ? [...Object.entries(c.fleet || {}), ...Object.entries(c.insurance || {})]
            .filter(([k, v]) => v != null && v !== '' && FD[k] && (FD[k].t === 'num' || FD[k].t === 'money') && !YEAR_KEYS.includes(k))
            .slice(0, 4)
            .map(([k, v]) => [FD[k].l, FD[k].t === 'money' ? fmtM(v) : fmtN(v)])
        : [];

    const id = c ? { ...c.identity, ...c.location, ...c.authority, ...c.contact } : {};
    const address = [id.street, [id.hq_city, id.hq_state, id.hq_zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const names = [id.legal_name && id.legal_name !== id.company_name ? id.legal_name : null, id.alt_name ? `aka ${id.alt_name}` : null].filter(Boolean).join(' · ');
    const ids = [['SCAC', id.scac], ['MC', id.mc], ['USDOT', id.usdot], ['FIRMS', id.firms_code]].filter(([, v]) => v);
    const email = (id.emails || [])[0];
    const website = id.website ? (/^https?:/.test(id.website) ? id.website : `https://${id.website}`) : null;

    const ts = d && d.trust_score;
    const actions = d && d.actions;
    const ob = d && d.onboarding;
    const full = c && (!c.meta || c.meta.record_type === 'Full profile');
    const showInvite = actions && actions.next_action === 'invite' && canInvite;
    const showDtProfile = actions && actions.next_action === 'invite' && actions.profile && onViewDollarTraqProfile;
    const showOnboarding = actions && actions.next_action === 'view_onboarding' && ob;
    const unavailable = actions && actions.next_action === 'unavailable';
    const hasActionRow = c && (ts || showInvite || showDtProfile || showOnboarding || unavailable);

    return (
        <Drawer anchor="right" open onClose={onClose} sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 700 }, maxWidth: '100vw', boxSizing: 'border-box', bgcolor: '#f1f5f9' } }}>
            <header className="relative border-b border-gray-200 bg-gradient-to-b from-blue-50/70 to-white px-5 pb-5 pt-5 sm:px-7">
                <IconButton onClick={onClose} aria-label="Close" sx={{ position: 'absolute', top: 10, right: 10, color: '#94a3b8' }}><CloseIcon fontSize="small" /></IconButton>

                <div className="flex items-start gap-4 pr-8">
                    {c
                        ? <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-xl font-bold tracking-tight text-white shadow-md">{initials(id.company_name)}</div>
                        : <Sk className="h-16 w-16 shrink-0 rounded-2xl" />}
                    <div className="min-w-0 flex-1">
                        <h2 className="m-0 break-words text-2xl font-bold leading-tight tracking-tight text-slate-900">{id.company_name || (err ? 'Carrier' : <Sk className="h-8 w-64 max-w-full" />)}</h2>
                        {names && <div className="mt-1 break-words text-sm text-slate-500">{names}</div>}
                        {address && (
                            <div className="mt-1.5 break-words text-sm text-slate-500">{address}</div>
                        )}
                        {c && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <span className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + (full ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-slate-500')}>{full ? 'Full profile' : 'Directory listing'}</span>
                                {d.in_dollartraq && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">In DollarTraq</span>}
                            </div>
                        )}
                    </div>
                </div>

                {!!ids.length && <div className="mt-5 flex flex-wrap gap-2">{ids.map(([label, val]) => <CopyId key={label} label={label} value={val} />)}</div>}

                {c && (id.phone || email || website) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {id.phone && <QuickLink href={`tel:${id.phone}`} icon={PhoneOutlinedIcon}>{id.phone}</QuickLink>}
                        {email && <QuickLink href={`mailto:${email}`} icon={EmailOutlinedIcon}>{email}</QuickLink>}
                        {website && <QuickLink href={website} icon={LanguageIcon} external>{String(id.website).replace(/^https?:\/\//, '').replace(/\/$/, '')}</QuickLink>}
                    </div>
                )}

                {hasActionRow && (
                    <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-gray-200/70 pt-4">
                        <TrustBadge ts={ts} score={score} />
                        <div className="hidden flex-1 sm:block" />
                        {showOnboarding && (
                            <>
                                <span className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700">Onboarding: {ob.stage_label}{ob.steps_total ? ` (${ob.steps_completed}/${ob.steps_total})` : ''}</span>
                                {onViewOnboarding && <button type="button" onClick={() => onViewOnboarding(ob)} className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-gray-50">Open onboarding list</button>}
                            </>
                        )}
                        {showDtProfile && <button type="button" onClick={() => onViewDollarTraqProfile(actions.profile.dot_number)} className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-gray-50">View DollarTraq profile</button>}
                        {showInvite && <button type="button" onClick={() => setInviteOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700">Invite to onboard</button>}
                        {unavailable && <span className="cursor-help rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-slate-400" title={actions.reason || ''}>Invite unavailable</span>}
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-auto px-4 py-5 sm:px-7">
                {err && (
                    <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                        <span className="min-w-0 flex-1 break-words">{err}</span>
                        <button type="button" onClick={load} className="text-xs font-bold hover:underline">Retry</button>
                    </div>
                )}

                {!err && !d && (
                    <div aria-busy="true">
                        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Sk key={i} className="h-16 w-full rounded-2xl" />)}</div>
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
                                <Sk className="mb-4 h-5 w-36" />
                                <div className="grid grid-cols-2 gap-4">{[0, 1, 2, 3].map((j) => <div key={j}><Sk className="mb-1.5 h-3 w-20" /><Sk className="h-4 w-32" /></div>)}</div>
                            </div>
                        ))}
                    </div>
                )}

                {c && (
                    <>
                        <Highlights items={highlights} />
                        {sections.map((s) => <ProfileSection key={s.id} {...s} FD={FD} />)}
                        <RelatedRecords id={id} currentKey={carrierKey} onSwitch={onSwitch} />
                        {!full && <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-xs text-slate-500">This is a directory listing, so only basic details are available.</p>}
                    </>
                )}
            </div>

            <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} actions={actions} name={id.company_name || 'carrier'} onDone={load} onToast={onToast} />
        </Drawer>
    );
}

/* ====================== END REDESIGNED PROFILE VIEW ====================== */

function SortableTh({ field, sorted, dir, onClick, numeric, pinned }) {
    const can = field.sortable;
    return (
        <th
            onClick={can ? onClick : undefined}
            className={'sticky top-0 whitespace-nowrap border-b border-gray-200 bg-gray-50 px-2.5 py-2.5 select-none ' + (can ? 'cursor-pointer ' : '') + (pinned ? 'left-0 z-[3] ' : 'z-[2] ') + (numeric ? 'text-right' : 'text-left')}
        >
            <span className={'inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide ' + (sorted ? 'text-slate-700' : 'text-gray-500' + (can ? ' hover:text-gray-700' : ''))}>
                {field.l}
                {can && (sorted
                    ? (dir > 0 ? <ArrowUpwardIcon sx={{ fontSize: 13 }} className="text-blue-600" /> : <ArrowDownwardIcon sx={{ fontSize: 13 }} className="text-blue-600" />)
                    : <UnfoldMoreIcon sx={{ fontSize: 13 }} className="text-gray-300" />)}
            </span>
        </th>
    );
}

function TableGrid({ meta, rows, pagination, loading, error, sort, onSortChange, columns, perPage, onPageChange, onPerPageChange, onOpenCarrier }) {
    const { FD, F } = meta;
    const total = pagination ? pagination.total : 0;
    const current = pagination ? pagination.current_page : 1;
    const lastPage = pagination ? Math.max(1, pagination.last_page) : 1;
    const startIdx = (current - 1) * perPage;
    // First load: nothing fetched yet and no error -> still loading, not a failure.
    const showSkeleton = loading || (!pagination && !error);

    const columnDefs = useMemo(() => F.map((f) => ({
        id: f.k, accessorKey: f.k, header: f.l, enableSorting: f.sortable,
        meta: { numeric: f.t === 'num' || f.t === 'money' },
        cell: ({ row }) => cellContent(f.k, row.original, FD),
    })), [F, FD]);

    const allKeys = useMemo(() => F.map((f) => f.k), [F]);
    const visibleKeys = useMemo(() => [PINNED_COLUMN, ...columns.filter((k) => FD[k] && k !== PINNED_COLUMN)], [columns, FD]);
    const columnVisibility = useMemo(() => { const s = new Set(visibleKeys); return Object.fromEntries(allKeys.map((k) => [k, s.has(k)])); }, [visibleKeys, allKeys]);
    const columnOrder = useMemo(() => [...visibleKeys, ...allKeys.filter((k) => !visibleKeys.includes(k))], [visibleKeys, allKeys]);
    const columnPinning = useMemo(() => ({ left: [PINNED_COLUMN] }), []);
    const sorting = useMemo(() => (sort ? [{ id: sort.k, desc: sort.d < 0 }] : []), [sort]);

    const table = useReactTable({
        data: rows, columns: columnDefs, getCoreRowModel: getCoreRowModel(),
        manualSorting: true, manualPagination: true,
        state: { sorting, columnVisibility, columnOrder, columnPinning },
    });
    const tableRows = table.getRowModel().rows;
    const visibleColumnCount = table.getVisibleLeafColumns().length;

    const scrollRef = useRef(null);
    const rowVirtualizer = useVirtualizer({ count: tableRows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 44, overscan: 12, measureElement: (el) => el.getBoundingClientRect().height });
    const virtualRows = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualRows.length ? virtualRows[0].start : 0;
    const paddingBottom = virtualRows.length ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

    useEffect(() => {
        if (loading) return;
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: 0, left: 0 });
        rowVirtualizer.scrollToOffset(0);
        if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, [rows, loading]);

    return (
        <>
            <div ref={scrollRef} className="max-h-[70vh] min-h-0 flex-1 scroll-mt-4 overflow-auto rounded-xl border border-gray-200 bg-white lg:max-h-none">
                {showSkeleton ? (
                    <TableSkeleton bare cols={Math.min(8, columns.length + 1)} rows={Math.min(perPage, 14)} />
                ) : !pagination ? (
                    <div className="px-5 py-14 text-center text-slate-500">Couldn't load carriers. Use Retry above.</div>
                ) : !rows.length ? (
                    <div className="px-5 py-14 text-center text-slate-500"><b className="mb-1 block text-slate-900">No carriers match these filters</b>Remove a filter chip above, or reset to start over.</div>
                ) : (
                    <table className="w-max min-w-full border-collapse text-sm">
                        <thead>
                            {table.getHeaderGroups().map((hg) => (
                                <tr key={hg.id}>
                                    {hg.headers.map((h) => {
                                        const hid = h.column.id;
                                        return <SortableTh key={h.id} field={FD[hid]} sorted={!!sort && sort.k === hid} dir={sort ? sort.d : 1} numeric={!!h.column.columnDef.meta?.numeric} pinned={h.column.getIsPinned() === 'left'} onClick={() => onSortChange(hid)} />;
                                    })}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {paddingTop > 0 && <tr aria-hidden="true"><td colSpan={visibleColumnCount} style={{ height: paddingTop, padding: 0, border: 0 }} /></tr>}
                            {virtualRows.map((vr) => {
                                const row = tableRows[vr.index];
                                const r = row.original;
                                return (
                                    <tr
                                        key={r.carrier_key || row.id}
                                        data-index={vr.index}
                                        ref={rowVirtualizer.measureElement}
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter') onOpenCarrier(r); }}
                                        onClick={() => onOpenCarrier(r)}
                                        className="group cursor-pointer outline-none hover:bg-gray-50 focus-visible:bg-gray-50"
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const k = cell.column.id;
                                            const numeric = !!cell.column.columnDef.meta?.numeric;
                                            if (cell.column.getIsPinned() === 'left') {
                                                const sub = [r.hq_city && r.hq_state ? `${r.hq_city}, ${r.hq_state}` : r.hq_state, !isFull(r) ? 'listing only' : null].filter(Boolean).join(' · ');
                                                return (
                                                    <td key={cell.id} className="sticky left-0 z-[1] max-w-[150px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 bg-white px-2.5 py-2 font-semibold text-slate-900 group-hover:bg-gray-50 group-focus-visible:bg-gray-50 sm:max-w-[300px]" title={r[k]}>
                                                        {r[k] || ''}
                                                        {sub && <small className="block overflow-hidden text-ellipsis text-xs font-normal text-gray-400">{sub}</small>}
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td key={cell.id} className={'max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-gray-100 px-2.5 py-2 text-slate-700 sm:max-w-[280px] ' + (numeric ? 'text-right' : 'text-left')}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            {paddingBottom > 0 && <tr aria-hidden="true"><td colSpan={visibleColumnCount} style={{ height: paddingBottom, padding: 0, border: 0 }} /></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            {showSkeleton && <div className="flex items-center gap-3 pt-3" aria-busy="true"><Sk className="h-4 w-32 sm:w-44" /><div className="flex-1" /><Sk className="h-8 w-24" /><Sk className="hidden h-4 w-24 sm:block" /></div>}
            {!showSkeleton && !!rows.length && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-500 sm:justify-start">
                    <span className="w-full sm:w-auto">Showing {fmtN(startIdx + 1)}–{fmtN(startIdx + rows.length)} of {fmtN(total)}</span>
                    <div className="hidden flex-1 sm:block" />
                    <select value={perPage} onChange={(e) => onPerPageChange(+e.target.value)} className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-base font-semibold text-slate-700 outline-none lg:h-8 lg:text-sm">
                        {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} / page</option>)}
                    </select>
                    <IconButton size="small" disabled={current <= 1} onClick={() => onPageChange(current - 2)} sx={PAGER_BTN_SX}><ChevronLeftIcon fontSize="small" /></IconButton>
                    <span>Page {current} of {lastPage}</span>
                    <IconButton size="small" disabled={current >= lastPage} onClick={() => onPageChange(current)} sx={PAGER_BTN_SX}><ChevronRightIcon fontSize="small" /></IconButton>
                </div>
            )}
        </>
    );
}

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '–');
const ABTN = 'rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-50';
const STATUS_STYLE = { queued: 'bg-slate-100 text-slate-600', processing: 'bg-amber-50 text-amber-700', completed: 'bg-emerald-50 text-emerald-700', failed: 'bg-red-50 text-red-700' };

const StatusPill = ({ status }) => <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + (STATUS_STYLE[status] || STATUS_STYLE.queued)}>{status}</span>;

function ImportReport({ imp }) {
    const rep = imp.report || {};
    const rows = rep.rows || {};
    const rejected = rep.rejected_rows || [];
    const samples = (rep.warnings && rep.warnings.samples) || [];
    const hdr = rep.headers || {};
    return (
        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-2">
                <b className="break-all text-slate-900">{imp.source_filename}</b><StatusPill status={imp.status} />
                <span className="text-xs text-slate-400">{imp.created_by ? `by ${imp.created_by.name} · ` : ''}{when(imp.created_at)}</span>
            </div>
            {imp.status === 'failed' && (
                <p className="m-0 mt-2 text-red-700">{imp.error} <span className="text-slate-500">The previous data stays live.</span></p>
            )}
            {imp.status === 'completed' && <p className="m-0 mt-2 text-emerald-700">The new data is live{imp.activated ? '' : ' (not activated)'}.</p>}
            {rows.read != null && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {[['Read', rows.read], ['Imported', rows.imported], ['Merged', rows.merged], ['Rejected', rows.rejected]].map(([l, v]) => (
                        <span key={l}><b className="text-slate-900">{fmtN(v)}</b> <span className="text-slate-500">{l}</span></span>
                    ))}
                </div>
            )}
            {((hdr.missing || []).length > 0 || (hdr.unknown || []).length > 0) && (
                <p className="m-0 mt-2 break-words text-xs text-slate-600">
                    {(hdr.missing || []).length > 0 && <>Missing columns: {hdr.missing.join(', ')}. </>}
                    {(hdr.unknown || []).length > 0 && <>Unknown columns (ignored): {hdr.unknown.join(', ')}.</>}
                </p>
            )}
            {rejected.length > 0 && (
                <div className="mt-2">
                    <div className="text-xs font-bold text-slate-800">Rejected rows{rep.rejected_rows_truncated ? ' (first ones)' : ''}</div>
                    <ul className="m-0 mt-1 max-h-40 list-none overflow-auto p-0 text-xs text-slate-600">
                        {rejected.slice(0, 50).map((r) => <li key={r.row}>Row {r.row}: {r.reason}</li>)}
                    </ul>
                </div>
            )}
            {samples.length > 0 && (
                <div className="mt-2">
                    <div className="text-xs font-bold text-slate-800">Warnings ({fmtN(rep.warnings.count)})</div>
                    <ul className="m-0 mt-1 max-h-40 list-none overflow-auto p-0 text-xs text-slate-600">
                        {samples.slice(0, 50).map((w, i) => <li key={i}>Row {w.row} · {w.field}: {w.message}{w.value != null ? ` (${w.value})` : ''}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
}

function UploadTab({ onDataChanged, onToast, onUploaded }) {
    const [file, setFile] = useState(null);
    const [busy, setBusy] = useState(false);
    const [imp, setImp] = useState(null);
    const timer = useRef(null);
    const alive = useRef(true);

    useEffect(() => () => { alive.current = false; clearTimeout(timer.current); }, []);

    const poll = useCallback((id) => {
        timer.current = setTimeout(async () => {
            try {
                const cur = await getImport(id);
                if (!alive.current) return;
                setImp(cur);
                if (cur.status === 'completed') { onToast('Import completed. New data is live.'); onDataChanged(); onUploaded(); return; }
                if (cur.status === 'failed') { onToast('Import failed. Previous data stays live.'); onUploaded(); return; }
            } catch (e) {}
            if (alive.current) poll(id);
        }, 5000);
    }, [onDataChanged, onToast, onUploaded]);

    const start = async () => {
        if (!file) return;
        setBusy(true);
        setImp(null);
        try {
            const res = await uploadImport(file);
            setImp(res.import || { import_id: res.import_id, status: res.status, source_filename: file.name });
            poll(res.import_id);
        } catch (e) {
            onToast(e.message || 'Upload failed.');
            setBusy(false);
        }
    };
    const running = imp && (imp.status === 'queued' || imp.status === 'processing');
    useEffect(() => { if (imp && !running) setBusy(false); }, [imp, running]);

    return (
        <div>
            <p className="m-0 mb-3 text-sm text-slate-600">Upload a directory file (.csv, .json or .jsonl, UTF-8, up to 50 MB). The import runs in the background; if it fails, nothing changes and the current data stays live.</p>
            <div className="flex flex-wrap items-center gap-2">
                <input type="file" accept=".csv,.json,.jsonl" onChange={(e) => setFile(e.target.files[0] || null)} className="w-full min-w-0 text-sm sm:w-auto" />
                <button type="button" disabled={!file || busy} onClick={start} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? 'Importing…' : 'Upload'}</button>
            </div>
            {running && <p className="mt-3 text-sm text-amber-700">Import {imp.status}… checking every 5 seconds.</p>}
            {imp && !running && imp.report && <ImportReport imp={imp} />}
        </div>
    );
}

function ImportsTab({ refreshKey }) {
    const [list, setList] = useState(null);
    const [open, setOpen] = useState(null);
    const [err, setErr] = useState(null);
    useEffect(() => { listImports().then(setList).catch((e) => setErr(e.message)); }, [refreshKey]);
    const show = async (id) => { try { setOpen(await getImport(id)); } catch (e) { setErr(e.message); } };
    if (err) return <div className="text-sm text-red-600">{err}</div>;
    if (!list) return <ListSk />;
    if (!list.length) return <div className="text-sm text-slate-500">No imports yet.</div>;
    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead><tr className="text-left text-[11px] uppercase tracking-wide text-gray-400"><th className="py-1">File</th><th>Status</th><th>Rows</th><th>Started</th></tr></thead>
                    <tbody>
                        {list.map((i) => (
                            <tr key={i.import_id} onClick={() => show(i.import_id)} className="cursor-pointer border-t border-gray-100 hover:bg-gray-50">
                                <td className="py-1.5 text-slate-800">{i.source_filename}</td>
                                <td><StatusPill status={i.status} /></td>
                                <td className="text-slate-500">{i.report && i.report.rows ? `${fmtN(i.report.rows.imported)} / ${fmtN(i.report.rows.read)}` : '–'}</td>
                                <td className="text-xs text-slate-500">{when(i.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {open && <ImportReport imp={open} />}
        </>
    );
}

function DatasetsTab({ onDataChanged, onToast, refreshKey }) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const load = useCallback(() => listDatasets().then(setData).catch((e) => setErr(e.message)), []);
    useEffect(() => { load(); }, [load, refreshKey]);

    const activate = async (d) => {
        if (!window.confirm(`Make "${d.source_filename}" (${when(d.created_at)}) the live dataset for everyone?`)) return;
        setBusyId(d.dataset_id);
        try { await activateDataset(d.dataset_id); onToast('Dataset activated.'); await load(); onDataChanged(); } catch (e) { onToast(e.message); } finally { setBusyId(null); }
    };
    const remove = async (d) => {
        if (!window.confirm(`Delete "${d.source_filename}" (${when(d.created_at)})? This cannot be undone.`)) return;
        setBusyId(d.dataset_id);
        try { await deleteDataset(d.dataset_id); onToast('Dataset deleted.'); await load(); } catch (e) { onToast(e.message); } finally { setBusyId(null); }
    };

    if (err) return <div className="text-sm text-red-600">{err}</div>;
    if (!data) return <ListSk />;
    return (
        <>
            <p className="m-0 mb-3 text-xs text-slate-500">Keeps the last {data.retention} versions; older ones are removed automatically after each import.</p>
            <ul className="m-0 grid list-none gap-2 p-0">
                {(data.datasets || []).map((d) => (
                    <li key={d.dataset_id} className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 p-3 text-sm">
                        <div className="min-w-0 flex-1 basis-full sm:basis-0">
                            <div className="truncate font-semibold text-slate-900">{d.source_filename} {d.is_current && <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Live</span>}</div>
                            <div className="text-xs text-slate-500">{fmtN(d.counts && d.counts.total)} carriers ({fmtN(d.counts && d.counts.full_profiles)} full) · {when(d.created_at)}{d.created_by ? ` · ${d.created_by.name}` : ''}</div>
                        </div>
                        {!d.is_current && <button type="button" disabled={busyId === d.dataset_id} onClick={() => activate(d)} className={ABTN}>Make live</button>}
                        {!d.is_current && <button type="button" disabled={busyId === d.dataset_id} onClick={() => remove(d)} className={ABTN + ' text-red-600'}>Delete</button>}
                    </li>
                ))}
            </ul>
        </>
    );
}

function AdminPanel({ open, onClose, onDataChanged }) {
    const [tab, setTab] = useState('upload');
    const [toast, setToast] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: '14px', maxHeight: '85vh', ...PAPER_FIT } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, px: PAD_X }}>
                <span className="text-base font-bold text-slate-900">Manage drayage data</span>
                <IconButton size="small" onClick={onClose} sx={{ color: '#94a3b8' }}><CloseIcon fontSize="small" /></IconButton>
            </DialogTitle>
            <div className="flex overflow-x-auto border-b border-gray-100 px-3">
                {[['upload', 'Upload'], ['imports', 'Import history'], ['datasets', 'Datasets']].map(([k, l]) => (
                    <div key={k} onClick={() => setTab(k)} className={'cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ' + (tab === k ? 'border-blue-600 text-slate-900' : 'border-transparent text-slate-400')}>{l}</div>
                ))}
            </div>
            <DialogContent sx={{ px: PAD_X, py: 2.5 }}>
                {tab === 'upload' && <UploadTab onDataChanged={onDataChanged} onToast={setToast} onUploaded={bump} />}
                {tab === 'imports' && <ImportsTab refreshKey={refreshKey} />}
                {tab === 'datasets' && <DatasetsTab onDataChanged={onDataChanged} onToast={setToast} refreshKey={refreshKey} />}
            </DialogContent>
            <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast('')} message={toast} />
        </Dialog>
    );
}

export default function CarrierTable({
    meta, result, loading, error, onRetry, stats, totalAll, sort, onSortChange, columns, onColumnsChange,
    perPage, onPageChange, onPerPageChange, query, recordType, filterState, onRemoveFilter, onClearQuery, onClearRecordType, onClearAll,
    selectedKey, onOpenCarrier, onCloseCarrier, activeFilterCount, can, buildExport, onDataChanged, onViewDollarTraqProfile, onViewOnboarding,
}) {
    const [exportOpen, setExportOpen] = useState(false);
    const [adminOpen, setAdminOpen] = useState(false);
    const [toast, setToast] = useState('');
    const sortLabel = sort ? ((meta.FD[sort.k] && meta.FD[sort.k].l.toLowerCase()) || sort.k) : 'relevance';

    return (
        <main className="flex min-h-0 min-w-0 flex-col">
            <ResultsHeader loading={loading || !result.pagination} meta={meta} result={result} totalAll={totalAll} query={query} recordType={recordType} filterState={filterState} onRemoveFilter={onRemoveFilter} onClearQuery={onClearQuery} onClearRecordType={onClearRecordType} onClearAll={onClearAll} />

            {error && (
                <div className="mb-3 flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                    <span className="min-w-0 flex-1 break-words">{error}</span>
                    <button type="button" onClick={onRetry} className="text-xs font-bold hover:underline">Retry</button>
                </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2.5">
                <span className="w-full text-xs text-slate-500 sm:w-auto">{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active · sorted by {sortLabel}</span>
                <div className="hidden flex-1 sm:block" />
                {can('manage-drayage-directory') && <button type="button" onClick={() => setAdminOpen(true)} className={BTN}><SettingsOutlinedIcon sx={{ fontSize: 17 }} />Manage data</button>}
                <DataInfo stats={stats} meta={meta} />
                <ColumnPicker meta={meta} columns={columns} onChange={onColumnsChange} />
                {can('export-drayage-directory') && (
                    <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none">
                        <FileDownloadOutlinedIcon sx={{ fontSize: 17 }} />Export
                    </button>
                )}
            </div>

            <TableGrid meta={meta} rows={result.carriers} pagination={result.pagination} loading={loading} error={error} sort={sort} onSortChange={onSortChange} columns={columns} perPage={perPage} onPageChange={onPageChange} onPerPageChange={onPerPageChange} onOpenCarrier={onOpenCarrier} />

            <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} total={result.pagination ? result.pagination.total : 0} totalAll={totalAll} visibleCount={columns.length + 1} buildExport={buildExport} onToast={setToast} />
            <CarrierDrawer carrierKey={selectedKey} meta={meta} canInvite={can('send-invitation-approved-carriers')} onClose={onCloseCarrier} onToast={setToast} onSwitch={(k) => onOpenCarrier({ carrier_key: k })} onViewDollarTraqProfile={onViewDollarTraqProfile} onViewOnboarding={onViewOnboarding} />
            {can('manage-drayage-directory') && <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} onDataChanged={onDataChanged} />}
            <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast('')} message={toast} />
        </main>
    );
}