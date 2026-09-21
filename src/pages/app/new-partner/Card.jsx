import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    FileDownloadOutlined,
    Close,
    KeyboardArrowDown,
    Search as SearchIcon,
    FilterAltOutlined,
    MyLocationOutlined,
    VerifiedUserOutlined,
    HistoryOutlined,
    LocalShippingOutlined,
    GroupsOutlined,
    ShieldOutlined,
    HealthAndSafetyOutlined,
    BuildOutlined,
    Inventory2Outlined,
    TuneOutlined,
} from '@mui/icons-material';

import CarrierCard from '../../../components/CarrierCards';
import FindPartnerOverlay from '../../../components/FindPartnerOverlay';
import { apiFetch, apiDownload } from '../../../lib/api';


const ENTITY_TYPE_MAP = {
    'All Companies': 'Both',
    Brokers: 'Brokers',
    Carriers: 'Carriers',
    Shippers: 'Both',
};

function parseRadiusMiles(radiusLabel) {
    const match = /^(\d+)/.exec(radiusLabel || '');
    return match ? Number(match[1]) : undefined;
}

function buildFilterBody(filters) {
    const body = {};

    if (filters.type) body.entity_type = ENTITY_TYPE_MAP[filters.type] || 'Both';
    if (filters.location) body.location = filters.location;

    const radiusMiles = parseRadiusMiles(filters.radius);
    if (radiusMiles) body.radius_miles = radiusMiles;

    if (filters.authority) body.authority = [filters.authority];

    if (filters.authorityAgeMin) body.min_months = Number(filters.authorityAgeMin);
    if (filters.authorityAgeMax) body.max_months = Number(filters.authorityAgeMax);

    // operations combines the radio (Interstate/Intrastate) and the Hazmat
    // toggle, per the sample body's "operations": ["Interstate", "Hazmat"]
    const operations = [];
    if (filters.operation) operations.push(filters.operation);
    if (filters.hazmat) operations.push('Hazmat');
    if (operations.length) body.operations = operations;

    if (filters.fleetMin) body.min_fleet = Number(filters.fleetMin);
    if (filters.fleetMax) body.max_fleet = Number(filters.fleetMax);

    if (filters.minBIPD) body.min_bipd = Number(filters.minBIPD);

    if (filters.safety) body.safety_rating = [filters.safety];

    // The sample body only has a single "cargo" array — this UI splits it
    // into separate Equipment and Cargo sections, so both are merged here.
    const cargo = [...(filters.equipment || []), ...(filters.cargo || [])];
    if (cargo.length) body.cargo = cargo;

    return body;
}

async function searchCarriers(filters, { signal } = {}) {
    const body = { ...buildFilterBody(filters), per_page: 10 };

    const response = await apiFetch('/carrier/advanced-filter', {
        method: 'POST',
        body: JSON.stringify(body),
        signal,
    });

    return response?.data ?? response?.results ?? response ?? [];
}

async function exportCarriersCsv(filters) {
    const body = { ...buildFilterBody(filters), export_csv: true };
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    await apiDownload(
        '/carrier/advanced-filter',
        { method: 'POST', body: JSON.stringify(body) },
        `partners-${timestamp}.csv`
    );
}

const BRAND_PRIMARY = '#2953E4';
const BRAND_PRIMARY_DARK = '#1E3FB8';
const BRAND_PRIMARY_TINT = '#EEF2FF';
const BRAND_PRIMARY_BORDER = 'rgba(41,83,228,0.32)';

const INK = '#101828';
const SLATE = '#475569';
const MUTED = '#667085';
const FAINT = '#98A2B3';
const BORDER = '#E4E7EC';
const SURFACE = '#F9FAFB';
const PAGE_BG = '#F5F6F8';

const RED_TEXT = '#B42318';
const RED_TINT = '#FEECEB';
const RED_BORDER = 'rgba(220,38,38,0.36)';

const SECTION_THEMES = {
    radius: { tint: '#EEF4FF', border: 'rgba(37,99,235,0.16)', icon: '#2563EB' },
    authority: { tint: '#EFFCF3', border: 'rgba(21,146,76,0.18)', icon: '#15924C' },
    authorityAge: { tint: '#FFF8EC', border: 'rgba(217,119,6,0.18)', icon: '#B45309' },
    operation: { tint: '#F3F1FF', border: 'rgba(109,40,217,0.16)', icon: '#6D28D9' },
    fleet: { tint: '#EEFBFC', border: 'rgba(8,145,178,0.18)', icon: '#0E7490' },
    insurance: { tint: '#FDF0FA', border: 'rgba(190,24,150,0.16)', icon: '#BE1896' },
    safety: { tint: '#FEF2F2', border: 'rgba(220,38,38,0.16)', icon: '#DC2626' },
    equipment: { tint: '#F1F6FE', border: 'rgba(30,64,175,0.16)', icon: '#1E40AF' },
    cargo: { tint: '#F5FBEF', border: 'rgba(77,124,15,0.18)', icon: '#4D7C0F' },
};


const RADIUS_OPTIONS = ['5 Miles', '25 Miles', '100 Miles', '250 Miles'];
const AUTHORITY_OPTIONS = ['Carrier (Common)', 'Carrier (Contract)', 'Broker'];
const OPERATION_OPTIONS = ['Interstate', 'Intrastate'];
const SAFETY_OPTIONS = ['Satisfactory', 'Conditional', 'Unsatisfactory', 'None'];

const EQUIPMENT_OPTIONS = [
    'Dry Van', 'Reefer', 'Flatbed', 'Box Truck', 'Auto Carrier', 'Container',
    'Step Deck', 'Hopper Bottom', 'Lowboy', 'Oversized', 'Pneumatic',
    'Power Only', 'Sprinter Van', 'Tanker', 'Dump Trailer', 'Hot Shot'
];

const CARGO_OPTIONS = [
    'Agricultural/Farm Supplies', 'Beverages', 'Building Materials', 'Chemicals',
    'Coal/Coke', 'Commodities Dry Bulk', 'Construction', 'Drive/Tow Away',
    'Fresh Produce', 'Garbage/Refuse', 'General Freight', 'Grain/Feed/Hay',
    'Household Goods', 'Intermodal Containers', 'Livestock',
    'Logs/Poles/Beams/Lumber', 'Machinery/Large Objects', 'Meat',
    'Metal: sheets/coils/rolls', 'Mobile Homes', 'Motor Vehicles',
    'Oilfield Equipment', 'Other', 'Paper Products', 'Passengers',
    'Refrigerated Food', 'Water Well', 'U.S. Mail', 'Utilities'
];

function clampNonNegative(rawValue) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return '';
    const num = Number(rawValue);
    if (Number.isNaN(num)) return '';
    return String(Math.max(0, Math.trunc(num)));
}

function blockNegativeKeys(e) {
    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
        e.preventDefault();
    }
}


function SectionHeader({ label, open, onToggle, icon, theme }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-between"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
            <span className="flex items-center gap-[9px]">
                <span
                    className="flex items-center justify-center w-[26px] h-[26px] rounded-[8px] shrink-0"
                    style={{ background: '#ffffff', color: theme.icon, border: `1px solid ${theme.border}` }}
                >
                    {icon}
                </span>
                <span className="text-[11.5px] font-[800] tracking-[0.06em] uppercase" style={{ color: INK }}>
                    {label}
                </span>
            </span>
            <span
                className="flex items-center justify-center w-[20px] h-[20px] rounded-full transition-transform duration-200"
                style={{ color: theme.icon, background: '#ffffff', border: `1px solid ${theme.border}`, transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            >
                <KeyboardArrowDown sx={{ fontSize: 15 }} />
            </span>
        </button>
    );
}

function RadioRow({ name, label, checked, onChange, accent }) {
    return (
        <label className="flex items-center gap-[9px] py-[5px] cursor-pointer select-none">
            <span
                className="flex items-center justify-center w-[15px] h-[15px] rounded-full shrink-0 transition-colors duration-150"
                style={{ border: `1.5px solid ${checked ? accent : BORDER}`, background: '#fff' }}
            >
                {checked && <span className="w-[7px] h-[7px] rounded-full" style={{ background: accent }} />}
            </span>
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="sr-only"
            />
            <span className="text-[12.5px] font-[600]" style={{ color: checked ? INK : SLATE }}>{label}</span>
        </label>
    );
}

function CheckRow({ label, checked, onChange, accent }) {
    return (
        <label className="flex items-center gap-[9px] py-[5px] cursor-pointer select-none">
            <span
                className="flex items-center justify-center w-[15px] h-[15px] rounded-[5px] shrink-0 transition-colors duration-150"
                style={{ border: `1.5px solid ${checked ? accent : BORDER}`, background: checked ? accent : '#fff' }}
            >
                {checked && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.2 5.7L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </span>
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
            <span className="text-[12.5px] font-[600]" style={{ color: checked ? INK : SLATE }}>{label}</span>
        </label>
    );
}

function CircleCheckRow({ label, checked, onChange, accent }) {
    return (
        <label className="flex items-center gap-[9px] py-[5px] cursor-pointer select-none">
            <span
                className="flex items-center justify-center w-[15px] h-[15px] rounded-full shrink-0 transition-colors duration-150"
                style={{ border: `1.5px solid ${checked ? accent : BORDER}`, background: '#fff' }}
            >
                {checked && <span className="w-[7px] h-[7px] rounded-full" style={{ background: accent }} />}
            </span>
            <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
            <span className="text-[12.5px] font-[600]" style={{ color: checked ? INK : SLATE }}>{label}</span>
        </label>
    );
}

function ToggleSwitch({ checked, onChange, label, accent }) {
    return (
        <div className="flex items-center justify-between py-[4px]">
            <span className="text-[12.5px] font-[600]" style={{ color: SLATE }}>{label}</span>
            <button
                type="button"
                onClick={onChange}
                className="relative w-[36px] h-[20px] rounded-full transition-colors duration-200"
                style={{ background: checked ? accent : '#E4E7EC', border: `1px solid ${checked ? accent : BORDER}` }}
            >
                <span
                    className="absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all duration-200"
                    style={{ left: checked ? 18 : 2, background: checked ? '#fff' : '#98A2B3' }}
                />
            </button>
        </div>
    );
}

function RangeInputs({ minLabel = 'Min.', maxLabel = 'Max.', unit, minValue, maxValue, onMinChange, onMaxChange }) {
    const fieldStyle = { background: '#ffffff', border: `1px solid ${BORDER}`, color: INK };
    return (
        <div className="grid grid-cols-2 gap-[8px] mt-[4px]">
            <div>
                <div className="text-[9.5px] font-[700] tracking-[0.06em] uppercase mb-[4px]" style={{ color: FAINT }}>
                    {minLabel}{unit ? ` (${unit})` : ''}
                </div>
                <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={minValue}
                    onKeyDown={blockNegativeKeys}
                    onChange={(e) => onMinChange(clampNonNegative(e.target.value))}
                    className="w-full rounded-[9px] text-[12px] font-[600] px-[10px] py-[7px] outline-none"
                    style={fieldStyle}
                />
            </div>
            <div>
                <div className="text-[9.5px] font-[700] tracking-[0.06em] uppercase mb-[4px]" style={{ color: FAINT }}>
                    {maxLabel}{unit ? ` (${unit})` : ''}
                </div>
                <input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={maxValue}
                    onKeyDown={blockNegativeKeys}
                    onChange={(e) => onMaxChange(clampNonNegative(e.target.value))}
                    className="w-full rounded-[9px] text-[12px] font-[600] px-[10px] py-[7px] outline-none"
                    style={fieldStyle}
                />
            </div>
        </div>
    );
}

const DEFAULT_FILTERS = {
    location: '', type: '', radius: '25 Miles', authority: '',
    authorityAgeMin: '', authorityAgeMax: '', operation: '', hazmat: false,
    fleetMin: '', fleetMax: '', minBIPD: '', safety: '', equipment: [], cargo: []
};

function FilterPanel({ id, label, icon, open, onToggle, children }) {
    const theme = SECTION_THEMES[id] || SECTION_THEMES.radius;
    return (
        <div
            className="rounded-[14px] mb-[12px] transition-colors duration-150"
            style={{ background: theme.tint, border: `1px solid ${theme.border}` }}
        >
            <div className="px-[14px] py-[12px]">
                <SectionHeader label={label} open={open} onToggle={onToggle} icon={icon} theme={theme} />
                {open && <div className="mt-[10px]">{children}</div>}
            </div>
        </div>
    );
}

export default function NewPartnerPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [carriers, setCarriers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [shortlisted, setShortlisted] = useState([]);
    const [exporting, setExporting] = useState(false);

    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

    const DEFAULT_OPEN_SECTIONS = {
        radius: true, authority: true, authorityAge: true, operation: false,
        fleet: false, insurance: false, safety: false, equipment: false, cargo: false
    };
    const [openSections, setOpenSections] = useState(DEFAULT_OPEN_SECTIONS);
    const toggleSection = (key) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));

    const [filters, setFilters] = useState(DEFAULT_FILTERS);

    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
    const toggleFromList = (key, value) =>
        setFilters((f) => ({
            ...f,
            [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value]
        }));

    const setSingleSelect = (key, opt) =>
        setFilters((f) => ({ ...f, [key]: f[key] === opt ? '' : opt }));

    const [equipmentSearch, setEquipmentSearch] = useState('');
    const filteredEquipment = EQUIPMENT_OPTIONS.filter((e) =>
        e.toLowerCase().includes(equipmentSearch.toLowerCase())
    );

    const runSearch = useCallback(async (activeFilters, { signal } = {}) => {
        setLoading(true);
        setError(null);
        try {
            const results = await searchCarriers(activeFilters, { signal });
            setCarriers(results || []);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError(err.message || 'Something went wrong while searching.');
                setCarriers([]);
            }
        } finally {
            setLoading(false);
            setHasSearched(true);
        }
    }, []);

    const handleOverlaySearch = ({ type, location }) => {
        setOverlayOpen(false);
        const nextFilters = { ...filters, type, location };
        setFilters(nextFilters);
        runSearch(nextFilters);
    };

    useEffect(() => {
        const type = searchParams.get('type') || '';
        const location = searchParams.get('location') || '';

        if (!type && !location) return;

        const controller = new AbortController();

        const nextFilters = { ...DEFAULT_FILTERS, type, location };
        setFilters(nextFilters);
        setOpenSections(DEFAULT_OPEN_SECTIONS);
        runSearch(nextFilters, { signal: controller.signal });

        return () => controller.abort();
    }, [searchParams.toString()]);

    useEffect(() => {
        if (!hasSearched) return;
        const controller = new AbortController();
        runSearch(filters, { signal: controller.signal });
        return () => controller.abort();
    }, [
        filters.radius, filters.authority, filters.authorityAgeMin, filters.authorityAgeMax,
        filters.operation, filters.hazmat, filters.fleetMin, filters.fleetMax,
        filters.minBIPD, filters.safety, filters.equipment, filters.cargo
    ]);

    const handleRemove = (carrierId) => {
        setShortlisted((prev) => prev.filter((id) => id !== carrierId));
    };

    const handleDownload = async () => {
        if (!hasSearched || exporting || carriers.length === 0) return;
        setExporting(true);
        try {
            await exportCarriersCsv(filters);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setError(err.message || 'Something went wrong while exporting.');
            }
        } finally {
            setExporting(false);
        }
    };

    const activeFilterCount =
        (filters.type ? 1 : 0) +
        (filters.location ? 1 : 0) +
        (filters.authority ? 1 : 0) +
        (filters.authorityAgeMin || filters.authorityAgeMax ? 1 : 0) +
        (filters.operation ? 1 : 0) +
        (filters.hazmat ? 1 : 0) +
        (filters.fleetMin || filters.fleetMax ? 1 : 0) +
        (filters.minBIPD ? 1 : 0) +
        (filters.safety ? 1 : 0) +
        filters.equipment.length +
        filters.cargo.length;

    return (
        <div className="w-full min-h-screen" style={{ background: PAGE_BG }}>
            <div className="w-full px-[16px] sm:px-[24px] py-[16px] sm:py-[24px] flex flex-col sm:flex-row gap-[16px] sm:gap-[24px]">

                <div className="sm:hidden flex items-center justify-between gap-[10px]">
                    <button
                        type="button"
                        onClick={() => setMobileFiltersOpen((o) => !o)}
                        aria-expanded={mobileFiltersOpen}
                        className="flex items-center gap-[8px] rounded-full text-[12.5px] font-[700] px-[16px] py-[9px] transition-colors duration-150"
                        style={{
                            background: mobileFiltersOpen ? BRAND_PRIMARY : BRAND_PRIMARY_TINT,
                            border: `1px solid ${BRAND_PRIMARY_BORDER}`,
                            color: mobileFiltersOpen ? '#fff' : BRAND_PRIMARY_DARK,
                        }}
                    >
                        <TuneOutlined sx={{ fontSize: 16 }} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span
                                className="flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-full text-[10.5px] font-[800]"
                                style={{
                                    background: mobileFiltersOpen ? 'rgba(255,255,255,0.24)' : '#fff',
                                    color: mobileFiltersOpen ? '#fff' : BRAND_PRIMARY_DARK,
                                }}
                            >
                                {activeFilterCount}
                            </span>
                        )}
                        <KeyboardArrowDown
                            sx={{ fontSize: 16 }}
                            className="transition-transform duration-200"
                            style={{ transform: mobileFiltersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                    </button>

                    {hasSearched && !loading && (
                        <span
                            className="text-[11px] font-[800] px-[9px] py-[4px] rounded-full shrink-0"
                            style={{ color: BRAND_PRIMARY_DARK, background: BRAND_PRIMARY_TINT, border: `1px solid ${BRAND_PRIMARY_BORDER}` }}
                        >
                            {carriers.length} found
                        </span>
                    )}
                </div>

                <div
                    className={`${mobileFiltersOpen ? 'flex' : 'hidden'} sm:flex w-full sm:w-[280px] shrink-0 rounded-[18px] flex-col`}
                    style={{
                        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%)',
                        border: `1px solid ${BORDER}`,
                        boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 6px 16px rgba(16,24,40,0.05)'
                    }}
                >
                    <div className="px-[18px] pt-[18px] pb-[14px]" style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <div className="flex items-center gap-[10px]">
                            <button
                                type="button"
                                onClick={handleDownload}
                               disabled={!hasSearched || exporting || carriers.length === 0}
                                className="flex-1 flex items-center justify-center gap-[8px] rounded-full text-[12px] font-[700] py-[9px] transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: BRAND_PRIMARY_TINT, border: `1px solid ${BRAND_PRIMARY_BORDER}`, color: BRAND_PRIMARY_DARK }}
                            >
                                <FileDownloadOutlined sx={{ fontSize: 16 }} />
                                {exporting ? 'Preparing…' : 'Download'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setMobileFiltersOpen(false)}
                                aria-label="Close filters"
                                className="sm:hidden flex items-center justify-center w-[34px] h-[34px] rounded-full shrink-0"
                                style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: SLATE }}
                            >
                                <Close sx={{ fontSize: 17 }} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between mt-[16px] mb-[10px]">
                            <span className="flex items-center gap-[6px] text-[11.5px] font-[800] tracking-[0.09em] uppercase" style={{ color: INK }}>
                                <FilterAltOutlined sx={{ fontSize: 16 }} style={{ color: BRAND_PRIMARY }} />
                                Filters
                            </span>
                            {hasSearched && !loading && (
                                <span
                                    className="text-[11px] font-[800] px-[9px] py-[2px] rounded-full"
                                    style={{ color: BRAND_PRIMARY_DARK, background: BRAND_PRIMARY_TINT, border: `1px solid ${BRAND_PRIMARY_BORDER}` }}
                                >
                                    {carriers.length} found
                                </span>
                            )}
                        </div>

                        {(filters.type || filters.location) && (
                            <div className="flex flex-wrap gap-[7px]">
                                {filters.type && (
                                    <span
                                        className="flex items-center gap-[6px] text-[11px] font-[700] pl-[11px] pr-[7px] py-[5px] rounded-full"
                                        style={{ color: BRAND_PRIMARY_DARK, background: BRAND_PRIMARY_TINT, border: `1px solid ${BRAND_PRIMARY_BORDER}` }}
                                    >
                                        {filters.type}
                                        <Close sx={{ fontSize: 13 }} className="opacity-60 hover:opacity-100 cursor-pointer" onClick={() => setFilter('type', '')} />
                                    </span>
                                )}
                                {filters.location && (
                                    <span
                                        className="flex items-center gap-[6px] text-[11px] font-[700] pl-[11px] pr-[7px] py-[5px] rounded-full"
                                        style={{ color: BRAND_PRIMARY_DARK, background: BRAND_PRIMARY_TINT, border: `1px solid ${BRAND_PRIMARY_BORDER}` }}
                                    >
                                        {filters.location}
                                        <Close sx={{ fontSize: 13 }} className="opacity-60 hover:opacity-100 cursor-pointer" onClick={() => setFilter('location', '')} />
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="px-[14px] pt-[14px] pb-[18px] max-h-[70vh] sm:max-h-none overflow-y-auto sm:overflow-visible">

                        <FilterPanel id="radius" label="Radius" icon={<MyLocationOutlined sx={{ fontSize: 15 }} />} open={openSections.radius} onToggle={() => toggleSection('radius')}>
                            {RADIUS_OPTIONS.map((opt) => (
                                <RadioRow
                                    key={opt}
                                    name="radius"
                                    label={opt}
                                    checked={filters.radius === opt}
                                    onChange={() => setSingleSelect('radius', opt)}
                                    accent={SECTION_THEMES.radius.icon}
                                />
                            ))}
                        </FilterPanel>

                        <FilterPanel id="authority" label="Authority" icon={<VerifiedUserOutlined sx={{ fontSize: 15 }} />} open={openSections.authority} onToggle={() => toggleSection('authority')}>
                            {AUTHORITY_OPTIONS.map((opt) => (
                                <RadioRow
                                    key={opt}
                                    name="authority"
                                    label={opt}
                                    checked={filters.authority === opt}
                                    onChange={() => setSingleSelect('authority', opt)}
                                    accent={SECTION_THEMES.authority.icon}
                                />
                            ))}
                        </FilterPanel>

                        <FilterPanel id="authorityAge" label="Authority Age" icon={<HistoryOutlined sx={{ fontSize: 15 }} />} open={openSections.authorityAge} onToggle={() => toggleSection('authorityAge')}>
                            <RangeInputs
                                unit="months"
                                minValue={filters.authorityAgeMin}
                                maxValue={filters.authorityAgeMax}
                                onMinChange={(v) => setFilter('authorityAgeMin', v)}
                                onMaxChange={(v) => setFilter('authorityAgeMax', v)}
                            />
                        </FilterPanel>

                        <FilterPanel id="operation" label="Operation" icon={<LocalShippingOutlined sx={{ fontSize: 15 }} />} open={openSections.operation} onToggle={() => toggleSection('operation')}>
                            {OPERATION_OPTIONS.map((opt) => (
                                <RadioRow
                                    key={opt}
                                    name="operation"
                                    label={opt}
                                    checked={filters.operation === opt}
                                    onChange={() => setSingleSelect('operation', opt)}
                                    accent={SECTION_THEMES.operation.icon}
                                />
                            ))}
                            <div className="mt-[6px] pt-[10px]" style={{ borderTop: `1px solid ${SECTION_THEMES.operation.border}` }}>
                                <ToggleSwitch checked={filters.hazmat} onChange={() => setFilter('hazmat', !filters.hazmat)} label="Hazmat" accent={SECTION_THEMES.operation.icon} />
                            </div>
                        </FilterPanel>

                        <FilterPanel id="fleet" label="Fleet Size" icon={<GroupsOutlined sx={{ fontSize: 15 }} />} open={openSections.fleet} onToggle={() => toggleSection('fleet')}>
                            <RangeInputs
                                minLabel="Minimum"
                                maxLabel="Maximum"
                                minValue={filters.fleetMin}
                                maxValue={filters.fleetMax}
                                onMinChange={(v) => setFilter('fleetMin', v)}
                                onMaxChange={(v) => setFilter('fleetMax', v)}
                            />
                        </FilterPanel>

                        <FilterPanel id="insurance" label="Insurance" icon={<ShieldOutlined sx={{ fontSize: 15 }} />} open={openSections.insurance} onToggle={() => toggleSection('insurance')}>
                            <div className="text-[9.5px] font-[700] tracking-[0.06em] uppercase mb-[4px]" style={{ color: FAINT }}>
                                Minimum BIPD on file
                            </div>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={filters.minBIPD}
                                onKeyDown={blockNegativeKeys}
                                onChange={(e) => setFilter('minBIPD', clampNonNegative(e.target.value))}
                                className="w-full rounded-[9px] text-[12px] font-[600] px-[10px] py-[7px] outline-none"
                                style={{ background: '#ffffff', border: `1px solid ${BORDER}`, color: INK }}
                            />
                        </FilterPanel>

                        <FilterPanel id="safety" label="Safety Rating" icon={<HealthAndSafetyOutlined sx={{ fontSize: 15 }} />} open={openSections.safety} onToggle={() => toggleSection('safety')}>
                            {SAFETY_OPTIONS.map((opt) => (
                                <RadioRow
                                    key={opt}
                                    name="safety"
                                    label={opt}
                                    checked={filters.safety === opt}
                                    onChange={() => setSingleSelect('safety', opt)}
                                    accent={SECTION_THEMES.safety.icon}
                                />
                            ))}
                        </FilterPanel>

                        <FilterPanel id="equipment" label="Equipment" icon={<BuildOutlined sx={{ fontSize: 15 }} />} open={openSections.equipment} onToggle={() => toggleSection('equipment')}>
                            {filteredEquipment.map((opt) => (
                                <CircleCheckRow key={opt} label={opt} checked={filters.equipment.includes(opt)} onChange={() => toggleFromList('equipment', opt)} accent={SECTION_THEMES.equipment.icon} />
                            ))}
                            <div className="relative mt-[8px]">
                                <SearchIcon sx={{ fontSize: 14 }} className="absolute left-[10px] top-1/2 -translate-y-1/2" style={{ color: FAINT }} />
                                <input
                                    type="text"
                                    value={equipmentSearch}
                                    onChange={(e) => setEquipmentSearch(e.target.value)}
                                    placeholder="Can't find what you're looking for?"
                                    className="w-full rounded-[9px] text-[11.5px] font-[500] pl-[30px] pr-[10px] py-[7px] outline-none"
                                    style={{ background: '#ffffff', border: `1px solid ${BORDER}`, color: INK }}
                                />
                            </div>
                        </FilterPanel>

                        <FilterPanel id="cargo" label="Cargo Carried" icon={<Inventory2Outlined sx={{ fontSize: 15 }} />} open={openSections.cargo} onToggle={() => toggleSection('cargo')}>
                            {CARGO_OPTIONS.map((opt) => (
                                <CheckRow key={opt} label={opt} checked={filters.cargo.includes(opt)} onChange={() => toggleFromList('cargo', opt)} accent={SECTION_THEMES.cargo.icon} />
                            ))}
                        </FilterPanel>
                    </div>

                    <div className="sm:hidden px-[14px] pb-[16px]">
                        <button
                            type="button"
                            onClick={() => setMobileFiltersOpen(false)}
                            className="w-full rounded-full text-[12.5px] font-[700] py-[10px] transition-colors duration-150"
                            style={{ background: BRAND_PRIMARY, color: '#fff' }}
                        >
                            Show {hasSearched ? `${carriers.length} results` : 'results'}
                        </button>
                    </div>
                </div>

                {/* ---- Results ---- */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-[16px]">
                        <h1 className="text-[16px] sm:text-[20px] font-[800] m-0" style={{ color: INK }}>
                            {hasSearched ? `${carriers.length} partners found` : 'Find a new partner'}
                        </h1>
                        <button
                            type="button"
                            onClick={() => setOverlayOpen(true)}
                            className="text-[12px] sm:text-[12.5px] font-[700] rounded-full px-[14px] sm:px-[16px] py-[8px] sm:py-[9px] transition-colors duration-150 shrink-0"
                            style={{ background: BRAND_PRIMARY, color: '#fff' }}
                        >
                            New search
                        </button>
                    </div>

                    {loading && (
                        <div
                            className="w-full py-[60px] flex items-center justify-center text-[13px] font-[600] rounded-[16px] bg-white text-center px-[16px]"
                            style={{ color: MUTED, border: `1px solid ${BORDER}` }}
                        >
                            Searching…
                        </div>
                    )}

                    {!loading && error && (
                        <div
                            className="w-full py-[24px] px-[20px] rounded-[14px] text-[13px] font-[600]"
                            style={{ background: RED_TINT, border: `1px solid ${RED_BORDER}`, color: RED_TEXT }}
                        >
                            {error}
                        </div>
                    )}

                    {!loading && !error && hasSearched && carriers.length === 0 && (
                        <div
                            className="w-full py-[60px] flex items-center justify-center text-[13px] font-[600] rounded-[16px] bg-white text-center px-[16px]"
                            style={{ color: MUTED, border: `1px solid ${BORDER}` }}
                        >
                            No partners matched your search. Try widening your filters.
                        </div>
                    )}

                    {!loading && !error && !hasSearched && (
                        <div
                            className="w-full py-[60px] flex items-center justify-center text-[13px] font-[600] rounded-[16px] bg-white text-center px-[16px]"
                            style={{ color: MUTED, border: `1px solid ${BORDER}` }}
                        >
                            Run a search to see matching partners here.
                        </div>
                    )}

                    {!loading && !error && carriers.map((carrier) => (
                        <CarrierCard
                            key={carrier.row_id || carrier.carrier_id}
                            carrier={carrier}
                            onClick={(c) => navigate('/carriers/' + c.row_id)}
                            showRemove={shortlisted.includes(carrier.carrier_id)}
                            onRemove={handleRemove}
                            removeLabel="Remove from shortlist"
                        />
                    ))}
                </div>

            </div>

            <FindPartnerOverlay
                open={overlayOpen}
                onClose={() => setOverlayOpen(false)}
                onSearch={handleOverlaySearch}
            />
        </div>
    );
}