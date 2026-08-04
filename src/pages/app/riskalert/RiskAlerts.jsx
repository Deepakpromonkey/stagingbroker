import React, { useEffect, useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const SeverityBadge = ({ label }) => {

    const map = {
        High:   { bg: '#FEE2E2', color: '#B91C1C', dot: '#EF4444' },
        Medium: { bg: '#FEF3C7', color: '#92400E', dot: '#D97706' },
        Low:    { bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
    };

    const s = map[label] || map['Low'];

    return (
        <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            px: '10px',
            py: '3px',
            borderRadius: '999px',
            background: s.bg,
            fontSize: '12px',
            fontWeight: 600,
            color: s.color,
            whiteSpace: 'nowrap',
        }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
            {label}
        </Box>
    );
};

const SUMMARY_CARDS = [
    {
        key: 'authority_revoked',
        icon: <WarningAmberIcon sx={{ fontSize: 18 }} />,
        count: 1,
        label: 'authority revoked',
        sub: 'Vega Hauling — auto-blocked from booking',
        bg: '#FEF2F2',
        border: '#FECACA',
        iconColor: '#EF4444',
        textColor: '#B91C1C',
    },
    {
        key: 'coi_expirations',
        icon: <ShieldOutlinedIcon sx={{ fontSize: 18 }} />,
        count: 4,
        label: 'COI expirations',
        sub: 'Within 7 days · renewals in progress',
        bg: '#FFFBEB',
        border: '#FDE68A',
        iconColor: '#D97706',
        textColor: '#92400E',
    },
    {
        key: 'double_broker',
        icon: <DeviceHubIcon sx={{ fontSize: 18 }} />,
        count: 1,
        label: 'double-broker pattern',
        sub: 'MC 998812 · pending review',
        bg: '#FFFBEB',
        border: '#FDE68A',
        iconColor: '#D97706',
        textColor: '#92400E',
    },
];

const DUMMY_ALERTS = [
    {
        row_id: '1',
        severity: 'High',
        type: 'Authority revoked',
        carrier_load: 'Vega Hauling Inc',
        detected_by: 'Sentinel · FMCSA',
        added_on_formatted: '8 min ago',
    },
    {
        row_id: '2',
        severity: 'High',
        type: 'Off-route & silent',
        carrier_load: 'SH000025',
        detected_by: 'Tracker · Samsara',
        added_on_formatted: '22 min ago',
    },
    {
        row_id: '3',
        severity: 'Medium',
        type: 'Double-broker pattern',
        carrier_load: 'MC 998812',
        detected_by: 'Graph',
        added_on_formatted: '31 min ago',
    },
    {
        row_id: '4',
        severity: 'Medium',
        type: 'COI expiring',
        carrier_load: 'Anza Freight',
        detected_by: 'Insurer',
        added_on_formatted: '1 hr ago',
    },
    {
        row_id: '5',
        severity: 'Low',
        type: 'License mismatch',
        carrier_load: 'BlueStar Transport',
        detected_by: 'Sentinel · FMCSA',
        added_on_formatted: '2 hr ago',
    },
    {
        row_id: '6',
        severity: 'Low',
        type: 'COI expiring',
        carrier_load: 'Ridgeline Freight',
        detected_by: 'Insurer',
        added_on_formatted: '3 hr ago',
    },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const columnHelper = createColumnHelper();

export default function RiskAlerts() {

    const [accountToken, setAccountToken] = useState(false);
    const [user, setUser] = useState(false);

    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });

    useEffect(() => {
        const token = localStorage.getItem(import.meta.env.VITE_ACCOUNT_TOKEN);
        const storedUser = localStorage.getItem(import.meta.env.VITE_ACCOUNT_USER);

        if (token) {
            setAccountToken(token);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const columns = useMemo(
        () => [
            columnHelper.accessor('severity', {
                header: 'Severity',
                cell: (info) => <SeverityBadge label={info.getValue()} />,
            }),
            columnHelper.accessor('type', {
                header: 'Type',
                cell: (info) => (
                    <span className="text-sm font-bold text-slate-800">{info.getValue()}</span>
                ),
            }),
            columnHelper.accessor('carrier_load', {
                header: 'Carrier / Load',
                cell: (info) => (
                    <span className="text-sm text-slate-700">{info.getValue()}</span>
                ),
            }),
            columnHelper.accessor('detected_by', {
                header: 'Detected By',
                cell: (info) => (
                    <span className="text-sm text-slate-500 ">{info.getValue()}</span>
                ),
            }),
            columnHelper.accessor('added_on_formatted', {
                header: 'When',
                cell: (info) => (
                    <span className="text-sm text-slate-500">{info.getValue()}</span>
                ),
            }),
            columnHelper.display({
                id: 'actions',
                header: () => <span className="block text-right">Actions</span>,
                cell: () => (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                            onClick={() => {
                                // wire resolve API call here
                            }}
                        >
                            Resolve
                        </button>
                    </div>
                ),
            }),
        ],
        []
    );

    const table = useReactTable({
        data: DUMMY_ALERTS,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const total = DUMMY_ALERTS.length;
    const { pageIndex, pageSize } = table.getState().pagination;
    const visibleRowCount = table.getRowModel().rows.length;
    const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
    const rangeEnd = total === 0 ? 0 : rangeStart + visibleRowCount - 1;

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14 ">

            <div className="mb-6">
                <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">Risk &amp; Alerts</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                    Continuous monitoring across authority, insurance, fraud patterns &amp; in-transit anomalies.
                </p>
            </div>

            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
                mb: 3,
            }}>
                {SUMMARY_CARDS.map(card => (
                    <Box key={card.key} sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        px: 2.5,
                        py: 2,
                        borderRadius: '14px',
                        background: card.bg,
                        border: `1px solid ${card.border}`,
                    }}>
                        <Box sx={{ color: card.iconColor, mt: '2px', display: 'flex' }}>
                            {card.icon}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: card.textColor }}>
                                {card.count} {card.label}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: card.textColor, opacity: 0.8, mt: 0.25 }}>
                                {card.sub}
                            </Typography>
                        </Box>
                    </Box>
                ))}
            </Box>

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FormatListBulletedIcon sx={{ fontSize: 18 }} />
                    </span>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total Records</p>
                        <p className="text-base font-bold text-slate-900">{total} Active</p>
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
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-10 text-center text-sm text-slate-400">
                                        No alerts found.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}