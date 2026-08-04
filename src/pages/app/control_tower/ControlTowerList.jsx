import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CircularProgress from '@mui/material/CircularProgress';

import {
    useReactTable,
    getCoreRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';

import { apiFetch } from '../../../lib/api';

const PER_PAGE = 10;
const LIST_ENDPOINT = '/shipment/control_tower';
const INIT_ENDPOINT = '/shipment/listing/init';

const columnHelper = createColumnHelper();

const SORTABLE_COLUMNS = {
    shipment_number: 'Shipment Number',
    shippment_carrier: 'Carrier',
    tracking_method: 'Method',
    tracking_cc: 'Country Code',
    tracking_start_at: 'Tracking Start At',
    tracking_timezone: 'Timezone',
};

function SortableHeader({ label, sortKey, sorting, onSortChange }) {
    const isActive = sorting.id === sortKey;
    const direction = isActive ? sorting.desc : null; 

    const handleClick = () => {
        if (!isActive) {
            onSortChange({ id: sortKey, desc: false });
        } else if (direction === false) {
            onSortChange({ id: sortKey, desc: true });
        } else {
            onSortChange({ id: null, desc: false });
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-1 uppercase tracking-wide text-[11px] font-bold text-gray-500 hover:text-gray-700"
        >
            {label}
            {isActive ? (
                direction ? (
                    <ArrowDownwardIcon sx={{ fontSize: 13 }} className="text-blue-600" />
                ) : (
                    <ArrowUpwardIcon sx={{ fontSize: 13 }} className="text-blue-600" />
                )
            ) : (
                <UnfoldMoreIcon sx={{ fontSize: 13 }} className="text-gray-300" />
            )}
        </button>
    );
}

function ControlTowerList() {

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dropdown filter options, loaded once from the init endpoint
    const [shipmentCarriers, setShipmentCarriers] = useState([]);
    const [trackingMethods, setTrackingMethods] = useState([]);
    const [countryCodes, setCountryCodes] = useState([]);
    const [timezones, setTimezones] = useState([]);

    // Pagination
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(PER_PAGE);

    // Sorting
    const [sorting, setSorting] = useState({ id: 'tracking_start_at', desc: true });

    // Filters
    const [search, setSearch] = useState('');
    const [carrierFilter, setCarrierFilter] = useState('');
    const [methodFilter, setMethodFilter] = useState('');
    const [countryFilter, setCountryFilter] = useState('');
    const [timezoneFilter, setTimezoneFilter] = useState('');

    const fetchInit = useCallback(() => {
        apiFetch(INIT_ENDPOINT, { method: 'POST' })
            .then((data) => {
                if (data?.status) {
                    setShipmentCarriers(data.shipment_carriers || []);
                    setTrackingMethods(data.tracking_methods || []);
                    setCountryCodes(data.country_codes || []);
                    setTimezones(data.timezones || []);
                }
            })
            .catch((err) => console.error('Control tower init error:', err));
    }, []);

    const fetchRows = useCallback(() => {
        setLoading(true);

        apiFetch(LIST_ENDPOINT)
            .then((res) => {
                const data = Array.isArray(res?.data) ? res.data : [];
                setRows(data);
            })
            .catch((err) => {
                console.error('Control tower list fetch error:', err);
                setRows([]);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchInit();
        fetchRows();
    }, [fetchInit, fetchRows]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();

        return rows.filter((row) => {
            if (carrierFilter && row.shippment_carrier !== carrierFilter) return false;
            if (methodFilter && row.tracking_method !== methodFilter) return false;
            if (countryFilter && row.tracking_cc !== countryFilter) return false;
            if (timezoneFilter && row.tracking_timezone !== timezoneFilter) return false;
            if (!term) return true;
            return String(row.shipment_number ?? '').toLowerCase().includes(term);
        });
    }, [rows, search, carrierFilter, methodFilter, countryFilter, timezoneFilter]);

    const sortedRows = useMemo(() => {
        if (!sorting.id) return filteredRows;

        return [...filteredRows].sort((a, b) => {
            const left = a[sorting.id];
            const right = b[sorting.id];

            if (left == null && right == null) return 0;
            if (left == null) return 1;
            if (right == null) return -1;

            const comparison =
                typeof left === 'number' && typeof right === 'number'
                    ? left - right
                    : String(left).localeCompare(String(right));

            return sorting.desc ? -comparison : comparison;
        });
    }, [filteredRows, sorting]);

    const total = sortedRows.length;

    const data = useMemo(
        () => sortedRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
        [sortedRows, pageIndex, pageSize]
    );

    // Reset to page 1 whenever a filter/search/sort changes
    useEffect(() => {
        setPageIndex(0);
    }, [search, carrierFilter, methodFilter, countryFilter, timezoneFilter, sorting]);

    const columns = useMemo(() => ([
        columnHelper.accessor('shipment_number', {
            header: 'Shipment Number',
            id: 'shipment_number',
            cell: (info) => (
                <span className="text-[#003178] font-bold">{info.getValue()}</span>
            ),
        }),
        columnHelper.accessor('shippment_carrier', {
            header: 'Carrier',
            id: 'shippment_carrier',
            cell: (info) => <span className="font-bold">{info.getValue()}</span>,
        }),
        columnHelper.accessor('tracking_method', {
            header: 'Method',
            id: 'tracking_method',
        }),
        columnHelper.accessor('tracking_cc', {
            header: 'Country Code',
            id: 'tracking_cc',
        }),
        columnHelper.accessor('tracking_start_at', {
            header: 'Tracking Start At',
            id: 'tracking_start_at',
        }),
        columnHelper.accessor('tracking_timezone', {
            header: 'Timezone',
            id: 'tracking_timezone',
        }),
        columnHelper.display({
            id: 'actions',
            header: '',
            cell: (info) => (
                <div className="hoverable-action">
                    <div className="align-start">
                        <Link
                            to={`/shipment/${info.row.original.row_id}`}
                            className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-[#1e40af] px-2.5 py-2 hover:underline"
                        >
                            View
                            <ArrowForwardIcon sx={{ fontSize: '12px', transform: 'scale(0.75, 0.9)' }} />
                        </Link>
                    </div>
                </div>
            ),
        }),
    ]), []);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
    const rangeEnd = Math.min(total, (pageIndex + 1) * pageSize);

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">

            <div className="mb-8">
                <h1 className="text-[32px] font-semibold tracking-tight text-slate-900">Action Centre</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                    Enter carrier details to activate live telemetry and predictive delivery windows.
                </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

                {/* Filter bar */}
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 h-9 w-56">
                        <svg className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search shipment number…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
                        />
                    </div>

                    <select
                        value={carrierFilter}
                        onChange={(e) => setCarrierFilter(e.target.value)}
                        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
                    >
                        <option value="">All carriers</option>
                        {shipmentCarriers.map((c) => (
                            <option key={c.key} value={c.key}>{c.value}</option>
                        ))}
                    </select>

                    <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
                    >
                        <option value="">All methods</option>
                        {trackingMethods.map((m) => (
                            <option key={m.key} value={m.key}>{m.value}</option>
                        ))}
                    </select>

                    <select
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
                    >
                        <option value="">All countries</option>
                        {countryCodes.map((c) => (
                            <option key={c.key} value={c.key}>{c.value}</option>
                        ))}
                    </select>

                    <select
                        value={timezoneFilter}
                        onChange={(e) => setTimezoneFilter(e.target.value)}
                        className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none"
                    >
                        <option value="">All timezones</option>
                        {timezones.map((t) => (
                            <option key={t.key} value={t.key}>{t.value}</option>
                        ))}
                    </select>

                    <span className="ml-auto text-xs text-gray-400">
                        {rangeStart}-{rangeEnd} of {total}
                    </span>
                </div>

                <table className="w-full text-sm border-collapse">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    const colId = header.column.id;
                                    const isSortable = Object.prototype.hasOwnProperty.call(SORTABLE_COLUMNS, colId);

                                    return (
                                        <th
                                            key={header.id}
                                            className="text-left bg-gray-50 border-b border-gray-200 px-4 py-3 whitespace-nowrap"
                                        >
                                            {isSortable ? (
                                                <SortableHeader
                                                    label={SORTABLE_COLUMNS[colId]}
                                                    sortKey={colId}
                                                    sorting={sorting}
                                                    onSortChange={setSorting}
                                                />
                                            ) : (
                                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </span>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-10 text-gray-400">
                                    <div className="flex items-center justify-center gap-2">
                                        <CircularProgress size={18} />
                                        Loading…
                                    </div>
                                </td>
                            </tr>
                        )}

                        {!loading && data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-10 text-gray-400">
                                    No shipments found.
                                </td>
                            </tr>
                        )}

                        {!loading && table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="px-4 py-3 align-middle">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination footer */}
                <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100">
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPageIndex(0);
                        }}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-700 outline-none"
                    >
                        {[10, 25, 50, 100].map((size) => (
                            <option key={size} value={size}>{size} / page</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        disabled={pageIndex === 0}
                        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                        className="p-1.5 rounded-md text-gray-400 disabled:opacity-40 hover:bg-gray-100"
                    >
                        <ChevronLeftIcon fontSize="small" />
                    </button>
                    <button
                        type="button"
                        disabled={pageIndex + 1 >= pageCount}
                        onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                        className="p-1.5 rounded-md text-gray-400 disabled:opacity-40 hover:bg-gray-100"
                    >
                        <ChevronRightIcon fontSize="small" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ControlTowerList;