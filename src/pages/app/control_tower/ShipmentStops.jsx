import React, { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper();

/*
| A stop's status comes from what the driver actually did at it.
|
| This used to be inferred from `shipment.status`, which cannot work: nothing
| ever moves a shipment off 'draft' — the driver app computes an Active/Past
| label for its own screens but never writes the column back — so every stop
| reported "Pending" forever. The driver app does record each arrival, code
| check and completion in shipment_stop_progress, and the API returns that as
| `stop.progress`, so the answer is read from there instead.
*/
function getStopStatus(stop) {
    const progress = stop?.progress;

    if (progress?.completed_at) {
        return {
            label: 'Completed',
            at: progress.completed_at,
            dot: 'bg-[#15803D]',
            pill: 'bg-[#DCFCE7] text-[#15803D]',
        };
    }

    if (progress?.otp_verified_at) {
        return {
            label: 'Verified',
            at: progress.otp_verified_at,
            dot: 'bg-[#2563EB]',
            pill: 'bg-[#DBEAFE] text-[#1D4ED8]',
        };
    }

    if (progress?.arrived_at) {
        return {
            label: 'Arrived',
            at: progress.arrived_at,
            dot: 'bg-[#B45309]',
            pill: 'bg-[#FEF3C7] text-[#B45309]',
        };
    }

    return {
        label: 'Pending',
        at: null,
        dot: 'bg-[#94A3B8]',
        pill: 'bg-[#F1F5F9] text-[#475569]',
    };
}

/*
| The code the stop's contact gives the driver on arrival. Shown to the broker
| so they can pass it on when the contact cannot be reached; the driver app
| records the moment it was entered as otp_verified_at.
*/
function StopOtp({ stop }) {
    const [copied, setCopied] = useState(false);

    if (!stop.requires_otp) {
        return <span className="text-sm text-[#94A3B8]">—</span>;
    }

    const verifiedAt = stop.otp_verified_at || stop.progress?.otp_verified_at;

    const copy = () => {
        if (!stop.otp_code || !navigator.clipboard) return;
        navigator.clipboard.writeText(String(stop.otp_code));
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="flex flex-col gap-1">
            {stop.otp_code ? (
                <button
                    type="button"
                    onClick={copy}
                    title="Click to copy"
                    className="w-fit rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 font-mono text-sm font-bold tracking-[0.2em] text-[#0F172A] hover:border-[#2563EB] hover:text-[#2563EB]"
                >
                    {copied ? 'Copied!' : stop.otp_code}
                </button>
            ) : (
                <span className="text-sm text-[#94A3B8]">Not generated</span>
            )}
            <span className={`text-[11px] font-medium ${verifiedAt ? 'text-[#15803D]' : 'text-[#94A3B8]'}`}>
                {verifiedAt ? `Verified ${verifiedAt}` : 'Not verified yet'}
            </span>
        </div>
    );
}

function ShipmentStops({ shipment }) {

    const sortedStops = useMemo(() => {
        if (!shipment?.stops?.length) return [];
        return [...shipment.stops].sort((a, b) => a.stop_number - b.stop_number);
    }, [shipment]);

    const columns = useMemo(() => ([
        columnHelper.display({
            id: 'stop',
            header: 'Stop',
            cell: (info) => (
                <span className="font-extrabold text-[#0F172A]">
                    {String(info.row.original.stop_number ?? info.row.index + 1).padStart(2, '0')}
                </span>
            ),
        }),
        columnHelper.display({
            id: 'location',
            header: 'Location',
            cell: (info) => {
                const stop = info.row.original;
                return (
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[#0F172A]">
                            {stop.stop_name || '—'}
                        </span>
                        <span className="text-xs text-[#64748B]">
                            {stop.address}
                            {stop.address_2 ? `, ${stop.address_2}` : ''}
                        </span>
                        <span className="text-xs text-[#94A3B8]">
                            {[stop.city, stop.state, stop.zipcode].filter(Boolean).join(', ')}
                        </span>
                    </div>
                );
            },
        }),
        columnHelper.display({
            id: 'schedule',
            header: 'Schedule',
            cell: (info) => {
                const stop = info.row.original;
                return (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#0F172A]">
                            {stop.start_date || '—'}
                        </span>
                        {stop.start_time && (
                            <span className="text-xs text-[#64748B]">
                                {stop.start_time}
                                {stop.start_timezone ? ` (${stop.start_timezone})` : ''}
                            </span>
                        )}
                        {/* The arrival window's end — Pickup has none, so it stays hidden there. */}
                        {stop.end_date && (
                            <span className="mt-1 text-xs text-[#94A3B8]">
                                until {stop.end_date}
                                {stop.end_time ? ` ${stop.end_time}` : ''}
                                {stop.end_timezone ? ` (${stop.end_timezone})` : ''}
                            </span>
                        )}
                    </div>
                );
            },
        }),
        columnHelper.display({
            id: 'activity',
            header: 'Activity',
            cell: (info) => {
                const stop = info.row.original;
                return (
                    <div className="text-sm text-[#64748B]">
                        <span
                            className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${
                                stop.stop_type === 'Pickup'
                                    ? 'bg-[#EFF6FF] text-[#2563EB]'
                                    : 'bg-[#FDF4FF] text-[#A21CAF]'
                            }`}
                        >
                            {stop.stop_type || '—'}
                        </span>
                        {stop.comment_to_driver && (
                            <div className="text-xs text-[#64748B] mt-1.5 max-w-xs">
                                {stop.comment_to_driver}
                            </div>
                        )}
                    </div>
                );
            },
        }),
        columnHelper.display({
            id: 'status',
            header: 'Status',
            cell: (info) => {
                const status = getStopStatus(info.row.original);

                return (
                    <div className="flex flex-col gap-1">
                        <span
                            className={`inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${status.pill}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                        </span>
                        {status.at && (
                            <span className="text-[11px] text-[#94A3B8] font-medium">{status.at}</span>
                        )}
                    </div>
                );
            },
        }),
    ]), []);

    // The OTP column only appears on loads where a stop asks for one.
    const hasOtp = sortedStops.some((stop) => stop.requires_otp);

    const visibleColumns = useMemo(() => {
        if (!hasOtp) return columns;

        const otpColumn = columnHelper.display({
            id: 'otp',
            header: 'OTP',
            cell: (info) => <StopOtp stop={info.row.original} />,
        });

        // Just before Status, which it explains.
        return [...columns.slice(0, -1), otpColumn, columns[columns.length - 1]];
    }, [columns, hasOtp]);

    const table = useReactTable({
        data: sortedStops,
        columns: visibleColumns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] sm:min-w-0 border-collapse">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="bg-[#F8FAFC]">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="text-left px-3 sm:px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-[#64748B] border-b border-[#F1F5F9] whitespace-nowrap"
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {sortedStops.length === 0 ? (
                            <tr className="bg-white">
                                {visibleColumns.map((col) => (
                                    <td key={col.id} className="px-3 sm:px-4 py-6 text-sm text-[#64748B]">—</td>
                                ))}
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className={index % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-3 sm:px-4 py-4 align-top">
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
    );
}

export default ShipmentStops;