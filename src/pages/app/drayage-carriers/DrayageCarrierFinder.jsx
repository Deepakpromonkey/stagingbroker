import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Collapse from '@mui/material/Collapse';
import Checkbox from '@mui/material/Checkbox';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';

import CarrierTable, { MainSkeleton, Sk } from './CarrierTable';
import { buildMeta, buildSearchParams, isActive, friendlyError, fmtN, fmtM, humanize, YEAR_KEYS, getFields, getFacets, getStats, getPermissions, searchCarriers } from './carrierData';

const DEFAULT_OPEN = new Set(['company']);

function ThinScrollbarStyles() {
    return (
        <style>{`
            .thin-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
            .thin-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
            .thin-scroll::-webkit-scrollbar-track { background: transparent; }
            .thin-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 9999px; }
            .thin-scroll::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        `}</style>
    );
}

const fmtCount = (n) => (n > 999 ? (n / 1000).toFixed(1) + 'k' : n);

function TriRow({ filter, state, facets, onToggle }) {
    const s = state[filter.id] || {};
    const c = (facets && facets.booleans && facets.booleans[filter.k]) || {};
    const options = ['yes', 'no', 'unknown'];
    const label = { yes: 'Yes', no: 'No', unknown: '?' };
    const activeClass = { yes: 'bg-emerald-600 text-white', no: 'bg-slate-500 text-white', unknown: 'bg-slate-800 text-white' };
    return (
        <div className="flex items-center gap-2 py-1">
            <div className={'min-w-0 flex-1 truncate text-sm ' + (s.v ? 'font-semibold text-slate-900' : 'text-slate-600')} title={filter.label}>{filter.label}</div>
            <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-gray-200" role="group" aria-label={filter.label}>
                {options.map((opt, i) => {
                    const n = c[opt] || 0;
                    const active = s.v === opt;
                    return (
                        <button
                            key={opt}
                            type="button"
                            aria-pressed={active}
                            title={`${filter.label}: ${opt === 'unknown' ? 'not stated' : opt} — ${n} carriers`}
                            onClick={() => onToggle(filter, opt)}
                            className={
                                'whitespace-nowrap px-2 py-1.5 text-xs font-semibold transition-colors lg:py-1 ' +
                                (i < options.length - 1 ? 'border-r border-gray-200 ' : '') +
                                (active ? activeClass[opt] : 'bg-white text-gray-500 hover:bg-gray-50') +
                                (!n && !active ? ' opacity-40' : '')
                            }
                        >
                            {label[opt]} {fmtCount(n)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function HasRow({ filter, state, facets, onToggle }) {
    const s = state[filter.id] || {};
    const n = (facets && facets.presence && facets.presence[filter.k] && facets.presence[filter.k].present) || 0;
    return (
        <label className={'flex cursor-pointer items-center gap-2 py-1.5 text-sm lg:py-1 ' + (!n && !s.v ? 'opacity-40' : '')}>
            <Checkbox size="small" checked={!!s.v} onChange={() => onToggle(filter, 'yes')} sx={{ p: 0, color: '#cbd5e1', '&.Mui-checked': { color: '#2563eb' } }} />
            <span className={'min-w-0 flex-1 truncate ' + (s.v ? 'font-semibold text-slate-900' : 'text-slate-600')}>{filter.label}</span>
            <em className="text-xs not-italic text-gray-400">{fmtN(n)}</em>
        </label>
    );
}

function RangeInput({ value, placeholder, label, onCommit }) {
    const external = value == null ? '' : String(value);
    const [text, setText] = useState(external);
    useEffect(() => { setText(external); }, [external]);
    useEffect(() => {
        if (text === external) return undefined;
        const t = setTimeout(() => onCommit(text), 250);
        return () => clearTimeout(t);
    }, [text]);
    return (
        <input
            type="number"
            inputMode="numeric"
            placeholder={placeholder}
            aria-label={label}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-9 w-full min-w-0 rounded-md border border-gray-200 bg-gray-50 px-2 text-base text-slate-700 outline-none focus:border-blue-400 lg:h-8 lg:text-sm"
        />
    );
}

function RangeRow({ filter, allFacets, state, onSetPreset, onSetInput }) {
    const s = state[filter.id] || {};
    const b = allFacets && allFacets.bounds && allFacets.bounds[filter.k];
    const fm = filter.money ? fmtM : YEAR_KEYS.includes(filter.k) ? String : fmtN;
    const active = s.min != null || s.max != null;
    return (
        <div className="py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
                <span className={'min-w-0 ' + (active ? 'font-semibold text-slate-900' : 'text-slate-600')}>{filter.label}</span>
                <span className="shrink-0 text-xs text-gray-400" title={b ? `${fmtN(b.count)} carriers have a value` : ''}>{b && b.count ? `${fm(b.min)} – ${fm(b.max)}` : 'no data'}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
                <RangeInput value={s.min} placeholder={b && b.count ? fm(b.min) : 'Min'} label={`${filter.label} minimum`} onCommit={(v) => onSetInput(filter, 'min', v)} />
                <span className="text-gray-300">–</span>
                <RangeInput value={s.max} placeholder={b && b.count ? fm(b.max) : 'Max'} label={`${filter.label} maximum`} onCommit={(v) => onSetInput(filter, 'max', v)} />
            </div>
            {filter.presets && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {filter.presets.map((p, i) => {
                        const pactive = s.min === p[0] && s.max === p[1];
                        return (
                            <button
                                key={i}
                                type="button"
                                aria-pressed={pactive}
                                onClick={() => onSetPreset(filter, p)}
                                className={'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ' + (pactive ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50')}
                            >
                                {p[2]}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function MultiRow({ filter, allFacets, facets, state, onToggleValue, onSetMode }) {
    const s = state[filter.id] || { sel: new Set() };
    const [search, setSearch] = useState('');

    const liveList = (facets && facets.values && facets.values[filter.k]) || null;
    const counts = useMemo(() => Object.fromEntries((liveList || []).map((o) => [o.value, o.count])), [liveList]);
    const values = useMemo(() => {
        const base = (allFacets && allFacets.values && allFacets.values[filter.k]) || liveList || [];
        const seen = new Set(base.map((o) => o.value));
        const extra = [...(s.sel || [])].filter((v) => !seen.has(v)).map((v) => ({ value: v }));
        return [...base, ...extra].map((o) => o.value);
    }, [allFacets, liveList, filter.k, s.sel]);

    if (!values.length) return null;
    const filtered = search ? values.filter((v) => String(v).toLowerCase().includes(search.toLowerCase())) : values;
    const sorted = [...filtered].sort((a, b) => {
        const aSel = s.sel && s.sel.has(a) ? 1 : 0;
        const bSel = s.sel && s.sel.has(b) ? 1 : 0;
        return bSel - aSel || (counts[b] || 0) - (counts[a] || 0);
    });
    const active = s.sel && s.sel.size > 0;

    return (
        <div className="py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
                <span className={'min-w-0 ' + (active ? 'font-semibold text-slate-900' : 'text-slate-600')}>{filter.label}</span>
                {filter.list && (
                    <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-gray-200" role="group" aria-label="Match mode">
                        {['any', 'all'].map((m) => (
                            <button
                                key={m}
                                type="button"
                                aria-pressed={(m === 'all') === !!s.all}
                                onClick={() => onSetMode(filter, m)}
                                className={'px-2 py-1 text-[11px] font-semibold lg:py-0.5 ' + ((m === 'all') === !!s.all ? 'bg-slate-800 text-white' : 'bg-white text-gray-500')}
                            >
                                {m === 'any' ? 'Any' : 'All'}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {values.length > 10 && (
                <input
                    type="search"
                    placeholder={`Search ${values.length} values…`}
                    aria-label={`Search ${filter.label}`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mt-1.5 h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-base text-slate-700 outline-none focus:border-blue-400 lg:h-8 lg:text-sm"
                />
            )}
            <ul className="thin-scroll m-0 mt-1.5 max-h-[200px] list-none overflow-auto rounded-md border border-gray-100 p-0">
                {sorted.map((v) => {
                    const n = counts[v] || 0;
                    const checked = !!(s.sel && s.sel.has(v));
                    return (
                        <li key={v} className={!n && !checked ? 'opacity-40' : ''}>
                            <label className="flex cursor-pointer items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-gray-50 lg:py-1">
                                <Checkbox size="small" checked={checked} onChange={() => onToggleValue(filter, v)} sx={{ p: 0, color: '#cbd5e1', '&.Mui-checked': { color: '#2563eb' } }} />
                                <span className="min-w-0 flex-1 truncate text-slate-700" title={String(v)}>{v}</span>
                                <em className="text-xs not-italic text-gray-400">{fmtN(n)}</em>
                            </label>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function RecencyRow({ filter, state, onChange }) {
    const s = state[filter.id] || {};
    return (
        <div className="py-2">
            <div className={'mb-1.5 text-sm ' + (s.v ? 'font-semibold text-slate-900' : 'text-slate-600')}>{filter.label}</div>
            <select
                aria-label={filter.label}
                value={s.v || ''}
                onChange={(e) => onChange(filter, e.target.value || null)}
                className="h-9 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-base text-slate-700 outline-none focus:border-blue-400 lg:h-8 lg:text-sm"
            >
                <option value="">Any time</option>
                <option value="90">Last 3 months</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last 12 months</option>
                <option value="730">Last 24 months</option>
            </select>
        </div>
    );
}

function SidebarSkeleton() {
    return (
        <aside aria-busy="true" aria-label="Loading filters" className="hidden h-fit rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
            <div className="border-b border-gray-100 px-3.5 py-3"><Sk className="h-9 w-full" /></div>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 border-b border-gray-100 px-3.5 py-3.5"><Sk className="h-4 w-4" /><Sk className="h-4 flex-1" /><Sk className="h-4 w-6" /></div>
            ))}
        </aside>
    );
}

function FilterSidebar({ meta, allFacets, facets, loading, filterState, onFilterAction, onResetAll, mobileOpen, onCloseMobile }) {
    const [openGroups, setOpenGroups] = useState(DEFAULT_OPEN);
    const [findText, setFindText] = useState('');
    const live = facets || allFacets;

    useEffect(() => {
        if (!mobileOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [mobileOpen]);

    const toggleGroup = (id) =>
        setOpenGroups((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    const activeCountByGroup = useMemo(() => {
        const map = {};
        for (const f of meta.FILTERS) if (isActive(filterState[f.id], f)) map[f.g] = (map[f.g] || 0) + 1;
        return map;
    }, [filterState, meta.FILTERS]);

    const q = findText.trim().toLowerCase();

    return (
        <>
            <ThinScrollbarStyles />
            {mobileOpen && <div onClick={onCloseMobile} className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden" />}
            <aside
                aria-label="Filters"
                className={
                    'fixed inset-y-0 left-0 z-30 flex w-[320px] max-w-[88vw] flex-col rounded-none border-r border-gray-200 bg-white transition-transform duration-200 lg:sticky lg:top-5 lg:z-auto lg:h-fit lg:max-h-[calc(100vh-40px)] lg:w-full lg:max-w-none lg:translate-x-0 lg:rounded-xl lg:border lg:shadow-sm ' +
                    (mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
                }
            >
                <div className="flex items-center gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50/60 px-3.5 py-3">
                    <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-gray-200 bg-white px-2.5">
                        <svg className="mr-2 h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input type="search" placeholder="Find a filter…" aria-label="Find a filter" value={findText} onChange={(e) => setFindText(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base text-slate-700 outline-none placeholder-gray-400 lg:text-sm" />
                    </div>
                    <button type="button" onClick={onResetAll} className="shrink-0 text-xs font-bold text-blue-600 hover:text-blue-700">Reset</button>
                    <button type="button" onClick={onCloseMobile} aria-label="Close filters" className="shrink-0 p-1 text-gray-400 lg:hidden"><CloseIcon sx={{ fontSize: 20 }} /></button>
                </div>

                <div className={'thin-scroll min-h-0 flex-1 overflow-auto pb-6 transition-opacity ' + (loading ? 'opacity-60' : '')}>
                    {meta.groups.map((g) => {
                        const groupFilters = meta.FILTERS.filter((f) => f.g === g.id);
                        if (!groupFilters.length) return null;
                        const visibleFilters = q ? groupFilters.filter((f) => f.label.toLowerCase().includes(q)) : groupFilters;
                        if (!visibleFilters.length) return null;
                        const activeN = activeCountByGroup[g.id] || 0;
                        const isOpen = q ? true : openGroups.has(g.id);
                        const sections = new Set(groupFilters.map((f) => f.section));
                        let lastSection = null;

                        return (
                            <div key={g.id} className="border-b border-gray-100">
                                <div onClick={() => toggleGroup(g.id)} className="flex cursor-pointer select-none items-center gap-2.5 px-3.5 py-3">
                                    <ExpandMoreIcon sx={{ fontSize: 16, color: '#9ca3af', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }} />
                                    <h3 className="m-0 flex-1 text-sm font-bold tracking-wide text-slate-800">{g.t}</h3>
                                    {activeN > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">{activeN}</span>}
                                    <span className="text-xs text-gray-400">{groupFilters.length}</span>
                                </div>
                                <Collapse in={isOpen}>
                                    <div className="flex flex-col gap-0.5 px-3.5 pb-3.5 pt-0.5">
                                        {visibleFilters.map((f) => {
                                            const showSub = !q && sections.size > 1 && f.section && f.section !== lastSection;
                                            if (f.section) lastSection = f.section;
                                            let body = null;
                                            if (f.kind === 'tri') body = <TriRow filter={f} state={filterState} facets={live} onToggle={(filter, v) => onFilterAction({ type: 'tri', filter, value: v })} />;
                                            else if (f.kind === 'has') body = <HasRow filter={f} state={filterState} facets={live} onToggle={(filter, v) => onFilterAction({ type: 'tri', filter, value: v })} />;
                                            else if (f.kind === 'range') body = <RangeRow filter={f} allFacets={allFacets} state={filterState} onSetPreset={(filter, p) => onFilterAction({ type: 'rangePreset', filter, preset: p })} onSetInput={(filter, edge, value) => onFilterAction({ type: 'rangeInput', filter, edge, value })} />;
                                            else if (f.kind === 'multi') body = <MultiRow filter={f} allFacets={allFacets} facets={live} state={filterState} onToggleValue={(filter, v) => onFilterAction({ type: 'multiToggle', filter, value: v })} onSetMode={(filter, m) => onFilterAction({ type: 'multiMode', filter, mode: m })} />;
                                            else if (f.kind === 'recency') body = <RecencyRow filter={f} state={filterState} onChange={(filter, v) => onFilterAction({ type: 'recency', filter, value: v })} />;
                                            return (
                                                <React.Fragment key={f.id}>
                                                    {showSub && <div className="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">{humanize(f.section)}</div>}
                                                    {body}
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                </Collapse>
                            </div>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}

const RECORD_TYPES = [
    { value: 'all', label: 'All' },
    { value: 'full', label: 'Full profiles' },
    { value: 'listing', label: 'Listings only' },
];
const EMPTY_RESULT = { carriers: [], pagination: null, facets: null, summary: null, dataset: null, source: null };
const sameQuery = (a, b) => (a || '') === (b || '');

export default function DrayageCarrierFinder({ onViewDollarTraqProfile, onViewOnboarding }) {
    const [meta, setMeta] = useState(null);
    const [allFacets, setAllFacets] = useState(null);
    const [stats, setStats] = useState(null);
    const [perms, setPerms] = useState(null);
    const [bootError, setBootError] = useState(null);

    const [query, setQuery] = useState('');
    const [recordType, setRecordType] = useState('all');
    const [filterState, setFilterState] = useState({});
    const [sort, setSort] = useState(null);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(50);
    const [columns, setColumns] = useState([]);
    const [selectedKey, setSelectedKey] = useState(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [narrow, setNarrow] = useState(false);

    const [result, setResult] = useState(EMPTY_RESULT);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [dataVersion, setDataVersion] = useState(0);

    const searchRef = useRef(null);
    const reqId = useRef(0);
    const lastQ = useRef('');

    const can = useCallback((p) => (perms ? perms.includes(p) : p === 'view-carrier-directory'), [perms]);

    const loadBoot = useCallback(async () => {
        setBootError(null);
        try {
            const [fields, facets, st, p] = await Promise.all([getFields(), getFacets(), getStats(), getPermissions().catch(() => null)]);
            const m = buildMeta(fields);
            setMeta(m);
            setAllFacets(facets);
            setStats(st);
            setPerms(p);
            setColumns((prev) => (prev.length ? prev : m.defaultColumns));
        } catch (e) {
            setBootError(friendlyError(e));
        }
    }, []);
    useEffect(() => { loadBoot(); }, [loadBoot]);

    const handleDataChanged = useCallback(async () => {
        try {
            const [facets, st] = await Promise.all([getFacets(), getStats()]);
            setAllFacets(facets);
            setStats(st);
        } catch (e) {}
        setDataVersion((v) => v + 1);
    }, []);

    const requestFields = useMemo(() => {
        if (!meta) return null;
        const base = ['company_name', 'record_type', 'hq_city', 'hq_state'];
        const wanted = new Set([...base, ...columns]);
        const def = new Set(meta.cardFields.filter((k) => k !== 'carrier_key'));
        const same = wanted.size === def.size && [...wanted].every((k) => def.has(k));
        return same ? null : [...wanted];
    }, [meta, columns]);

    const params = useMemo(() => meta && buildSearchParams({ query, recordType, filterState, filters: meta.FILTERS, sort, page, perPage, fields: requestFields }), [meta, query, recordType, filterState, sort, page, perPage, requestFields]);
    const paramsKey = JSON.stringify(params || null);

    const runSearch = useCallback(async (p, delay) => {
        const id = ++reqId.current;
        setSearching(true);
        await new Promise((r) => setTimeout(r, delay));
        if (id !== reqId.current) return;
        try {
            const d = await searchCarriers(p);
            if (id !== reqId.current) return;
            setResult({ carriers: d.carriers || [], pagination: d.pagination, facets: d.facets, summary: d.summary, dataset: d.dataset, source: d.source });
            setSearchError(null);
        } catch (e) {
            if (id !== reqId.current) return;
            setSearchError(friendlyError(e));
        } finally {
            if (id === reqId.current) setSearching(false);
        }
    }, []);

    useEffect(() => {
        if (!params) return undefined;
        const typing = !sameQuery(lastQ.current, params.q);
        lastQ.current = params.q || '';
        runSearch(params, typing ? 800 : 150);
        return () => { reqId.current += 1; };
    }, [paramsKey, dataVersion]);

    useEffect(() => {
        const onKey = (e) => {
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            if (e.key === '/' && !/INPUT|SELECT|TEXTAREA/.test(tag)) { e.preventDefault(); searchRef.current?.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 639px)');
        const update = () => setNarrow(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const activeFilterCount = meta ? meta.FILTERS.filter((f) => isActive(filterState[f.id], f)).length : 0;

    const handleFilterAction = useCallback((action) => {
        setPage(0);
        setFilterState((prev) => {
            const next = { ...prev };
            const id = action.filter.id;
            const current = next[id] ? { ...next[id] } : {};
            switch (action.type) {
                case 'tri':
                    current.v = current.v === action.value ? null : action.value;
                    next[id] = current;
                    break;
                case 'rangePreset': {
                    const [min, max] = action.preset;
                    if (current.min === min && current.max === max) { current.min = null; current.max = null; } else { current.min = min; current.max = max; }
                    next[id] = current;
                    break;
                }
                case 'rangeInput':
                    current[action.edge] = action.value === '' ? null : +action.value;
                    next[id] = current;
                    break;
                case 'multiToggle': {
                    const sel = new Set(current.sel ? current.sel : []);
                    sel.has(action.value) ? sel.delete(action.value) : sel.add(action.value);
                    current.sel = sel;
                    next[id] = current;
                    break;
                }
                case 'multiMode':
                    current.all = action.mode === 'all';
                    if (!current.sel) current.sel = new Set();
                    next[id] = current;
                    break;
                case 'recency':
                    next[id] = { v: action.value };
                    break;
                default:
                    break;
            }
            return next;
        });
    }, []);

    const handleRemoveFilter = useCallback((filter) => { setPage(0); setFilterState((prev) => { const next = { ...prev }; delete next[filter.id]; return next; }); }, []);
    const handleClearAll = useCallback(() => { setPage(0); setFilterState({}); setQuery(''); setRecordType('all'); }, []);
    const changeQuery = (v) => { setPage(0); setQuery(v); };
    const changeRecordType = (v) => { setPage(0); setRecordType(v); };

    const handleSortChange = useCallback((key) => {
        if (!meta || !meta.FD[key] || !meta.FD[key].sortable) return;
        setPage(0);
        setSort((prev) => {
            const eff = prev || (query.trim() ? null : { k: 'completeness', d: -1 });
            if (eff && eff.k === key) return { k: key, d: -eff.d };
            return { k: key, d: ['num', 'money', 'date', 'bool'].includes(meta.FD[key].t) ? -1 : 1 };
        });
    }, [meta, query]);
    const effectiveSort = sort || (query.trim() ? null : { k: 'completeness', d: -1 });

    const buildExport = useCallback((rowScope, colScope) => {
        const all = rowScope === 'all';
        return buildSearchParams({
            query: all ? '' : query, recordType: all ? 'all' : recordType, filterState: all ? {} : filterState,
            filters: meta.FILTERS, sort, fields: colScope === 'vis' ? ['company_name', ...columns.filter((k) => k !== 'company_name')] : null, forExport: true,
        });
    }, [meta, query, recordType, filterState, sort, columns]);

    if (bootError) {
        return (
            <div className="p-6 text-slate-600 sm:p-10">
                <p className="mb-3 text-red-600">{bootError}</p>
                <button type="button" onClick={loadBoot} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Try again</button>
            </div>
        );
    }
    if (perms && !perms.includes('view-carrier-directory')) return <div className="p-6 text-slate-500 sm:p-10">You don't have access to the drayage directory.</div>;

    const totalAll = (stats && stats.totals && stats.totals.carriers) || (allFacets && allFacets.total) || 0;
    const booting = !meta || !allFacets;

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-3 py-4 sm:px-6 md:px-10 lg:px-14 lg:py-5">
            <div className="mb-4 sm:mb-5 lg:mb-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 sm:text-[32px] lg:text-[40px]">Drayage carrier finder</h1>
                        <p className="mt-1 text-sm leading-relaxed text-slate-500 lg:text-[15px]">{(stats && stats.source) || result.source || 'LoadMatch / Drayage.com directory'}</p>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
                        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 rounded-xl bg-white p-1.5 shadow-sm sm:w-auto sm:flex-1 lg:flex-none">
                                <div className="relative w-full min-w-0 sm:min-w-[240px] sm:flex-1 lg:w-[420px] lg:flex-none">
                                    <SearchIcon sx={{ fontSize: 18 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        ref={searchRef}
                                        value={query}
                                        onChange={(e) => changeQuery(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Escape') { if (query) changeQuery(''); else e.currentTarget.blur(); } }}
                                        placeholder={narrow ? 'Search carriers…' : 'Search name, SCAC, MC, USDOT, city, email…'}
                                        className="h-9 w-full rounded-lg bg-gray-100 pl-9 pr-3 text-base text-slate-800 placeholder-gray-400 outline-none lg:text-sm"
                                    />
                                </div>
                                <div className="flex w-full overflow-hidden rounded-lg border border-gray-200 sm:inline-flex sm:w-auto">
                                    {RECORD_TYPES.map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            onClick={() => changeRecordType(t.value)}
                                            className={'flex-1 whitespace-nowrap px-3 py-2 text-xs font-bold tracking-wide transition-colors sm:flex-none ' + (recordType === t.value ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-gray-50')}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                        </div>
                        <button type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-slate-700 sm:w-auto lg:hidden">
                            <TuneOutlinedIcon sx={{ fontSize: 18 }} />Filters
                            {activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{activeFilterCount}</span>}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                {booting ? (<><SidebarSkeleton /><MainSkeleton /></>) : (<>
                <FilterSidebar
                    loading={searching}
                    meta={meta}
                    allFacets={allFacets}
                    facets={result.facets}
                    filterState={filterState}
                    onFilterAction={handleFilterAction}
                    onResetAll={handleClearAll}
                    mobileOpen={mobileFiltersOpen}
                    onCloseMobile={() => setMobileFiltersOpen(false)}
                />

                <CarrierTable
                    meta={meta}
                    result={result}
                    loading={searching}
                    error={searchError}
                    onRetry={() => runSearch(params, 0)}
                    stats={stats}
                    totalAll={totalAll}
                    sort={effectiveSort}
                    onSortChange={handleSortChange}
                    columns={columns}
                    onColumnsChange={setColumns}
                    perPage={perPage}
                    onPageChange={setPage}
                    onPerPageChange={(n) => { setPage(0); setPerPage(n); }}
                    query={query}
                    recordType={recordType}
                    filterState={filterState}
                    onRemoveFilter={handleRemoveFilter}
                    onClearQuery={() => changeQuery('')}
                    onClearRecordType={() => changeRecordType('all')}
                    onClearAll={handleClearAll}
                    selectedKey={selectedKey}
                    onOpenCarrier={(r) => setSelectedKey(r.carrier_key)}
                    onCloseCarrier={() => setSelectedKey(null)}
                    activeFilterCount={activeFilterCount}
                    can={can}
                    buildExport={buildExport}
                    onDataChanged={handleDataChanged}
                    onViewDollarTraqProfile={onViewDollarTraqProfile}
                    onViewOnboarding={onViewOnboarding}
                />
                </>)}
            </div>
        </div>
    );
}