import React, { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper();

// The API doesn't return a per-stop status field yet, so this is inferred
// from the shipment's overall status: delivered -> every stop is done,
// in_transit -> every stop except the last is done, otherwise pending.
function getStopStatus(stop) {
    if (stop.progress?.completed_at) return 'Completed';
    if (stop.progress?.arrived_at) return 'In Progress';
    return 'Pending';
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
        const styles = {
            Completed: 'bg-[#DCFCE7] text-[#15803D]',
            'In Progress': 'bg-[#EEF2FF] text-[#3730A3]',
            Pending: 'bg-[#F1F5F9] text-[#64748B]',
        };
        return (
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status === 'Completed' ? 'bg-[#15803D]' : status === 'In Progress' ? 'bg-[#3730A3]' : 'bg-[#64748B]'}`} />
                {status}
            </span>
        );
    },
}),
    ]), [shipment, sortedStops.length]);

    const table = useReactTable({
        data: sortedStops,
        columns,
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
                                {columns.map((col) => (
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