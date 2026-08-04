import React, { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    createColumnHelper,
    flexRender,
} from '@tanstack/react-table';

const columnHelper = createColumnHelper();

function stripHtml(value) {
    if (!value) return '';
    return String(value).replace(/<[^>]*>/g, '').trim();
}

function toTitleCase(value) {
    if (!value) return '';
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// The shipment object doesn't carry a top-level tracking timezone —
// fall back to the first stop's start_timezone as the best available proxy.
function getTrackingTimezone(shipment) {
    if (!shipment || !shipment.stops || shipment.stops.length === 0) return '';
    const sorted = [...shipment.stops].sort((a, b) => a.stop_number - b.stop_number);
    return sorted[0]?.start_timezone || '';
}

const FIELDS = [
    { key: 'shipment_no', label: 'Shipment Number' },
    { key: 'tracking_number', label: 'Tracking Full Number' },
    { key: '__tracking_timezone', label: 'Tracking Timezone' },
    { key: 'email_updates_to', label: 'Email Updates To' },
    { key: 'carrier_name', label: 'Carrier' },
    { key: '__tracking_method', label: 'Tracking Method' },
    { key: 'notes', label: 'Notes' },
];

const columns = [
    columnHelper.accessor('label', {
        header: 'Field',
        id: 'label',
        cell: (info) => <strong>{info.getValue()}</strong>,
    }),
    columnHelper.accessor('value', {
        header: 'Value',
        id: 'value',
        cell: (info) => <label>{info.getValue() || '—'}</label>,
    }),
];

function ShipmentDetails({ shipment }) {

    const data = useMemo(() => {
       const getValue = (item) => {
    if (item.key === "__tracking_timezone") {
        return getTrackingTimezone(shipment);
    }

    if (item.key === "__tracking_method") {
        return toTitleCase(shipment?.tracking_method);
    }

    if (item.key === "email_updates_to") {
        const emails = shipment?.email_updates_to;

        if (Array.isArray(emails)) {
            return emails.join(", ");
        }

        if (typeof emails === "string") {
            try {
                const parsed = JSON.parse(emails);
                return Array.isArray(parsed) ? parsed.join(", ") : emails;
            } catch {
                return emails;
            }
        }

        return "";
    }

    return stripHtml(shipment ? shipment[item.key] : "");
};

        return FIELDS.map((item) => ({
            label: item.label,
            value: getValue(item),
        }));
    }, [shipment]);

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <tbody>
                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                <td
                                    key={cell.id}
                                    className={
                                        cell.column.id === 'label'
                                            ? 'w-[200px] align-top px-4 py-3 border-b border-gray-100'
                                            : 'align-top px-4 py-3 border-b border-gray-100'
                                    }
                                >
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

export default ShipmentDetails;