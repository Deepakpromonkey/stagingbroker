import React, { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper();

const columns = [
    columnHelper.accessor('date', {
        header: 'Date',
        id: 'date',
        cell: (info) => <label>{info.getValue()}</label>,
    }),
    columnHelper.accessor('lat', {
        header: 'Latitude',
        id: 'lat',
        cell: (info) => <span>{info.getValue()}</span>,
    }),
    columnHelper.accessor('lng', {
        header: 'Longitude',
        id: 'lng',
        cell: (info) => <span>{info.getValue()}</span>,
    }),
];

function LocationHistory({ location_history }) {

    const data = useMemo(() => location_history || [], [location_history]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm border-collapse">
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} className="bg-gray-50">
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    className="text-left px-4 py-3 border-b border-gray-200 text-[11px] font-bold uppercase tracking-wide text-gray-500"
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.length === 0 && (
                        <tr>
                            <td colSpan={columns.length} className="text-center py-8 text-gray-400">
                                No location history available.
                            </td>
                        </tr>
                    )}

                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-4 py-3 align-middle">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default LocationHistory;