import React from 'react';
import MyLocationIcon from '@mui/icons-material/MyLocation';

/**
 * The driver's GPS trail, newest first.
 *
 * Every row is a button: clicking it drops the map above onto that exact
 * coordinate, which is the whole point of keeping the trail visible — a broker
 * asking "where was he at 13:32?" wants to see it, not read numbers.
 */
function LocationHistory({ location_history, onSelect, selectedId }) {
    const rows = location_history || [];

    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-[#E2E8F0] py-8 text-center text-sm font-medium text-[#94A3B8]">
                The driver app has not reported any positions for this load yet.
            </div>
        );
    }

    // Newest first: the current position is what gets looked at most.
    const ordered = [...rows].reverse();

    return (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                    {rows.length} position{rows.length === 1 ? '' : 's'} reported
                </span>
                <span className="text-[11px] font-medium text-[#94A3B8]">Click a row to locate it on the map</span>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-[#F8FAFC]">
                        <tr>
                            {['Time', 'Latitude', 'Longitude', 'Accuracy', ''].map((label) => (
                                <th
                                    key={label}
                                    className="border-b border-[#E2E8F0] px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-[#64748B]"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ordered.map((point, index) => {
                            const isSelected = selectedId != null && point.id === selectedId;
                            const isLatest = index === 0;

                            return (
                                <tr
                                    key={point.id ?? `${point.lat},${point.lng},${index}`}
                                    onClick={() => onSelect?.(point)}
                                    className={`cursor-pointer border-b border-[#F1F5F9] last:border-b-0 transition ${
                                        isSelected ? 'bg-[#EEF2FF]' : 'hover:bg-[#F8FAFC]'
                                    }`}
                                >
                                    <td className="px-4 py-2.5 align-middle">
                                        <span className="font-medium text-[#0F172A]">{point.date}</span>
                                        {isLatest && (
                                            <span className="ml-2 rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#15803D]">
                                                Latest
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 align-middle font-mono text-[12px] text-[#475569]">
                                        {Number(point.lat).toFixed(6)}
                                    </td>
                                    <td className="px-4 py-2.5 align-middle font-mono text-[12px] text-[#475569]">
                                        {Number(point.lng).toFixed(6)}
                                    </td>
                                    <td className="px-4 py-2.5 align-middle text-[12px] text-[#64748B]">
                                        {point.accuracy == null ? '—' : `±${Math.round(point.accuracy)} m`}
                                    </td>
                                    <td className="px-4 py-2.5 align-middle text-right">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB]">
                                            <MyLocationIcon sx={{ fontSize: 13 }} /> Locate
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default LocationHistory;
