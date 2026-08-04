import React, { useMemo, useState } from 'react';

import {Search, ChevronLeft, ChevronRight, LocalShipping, Timeline, Assessment, InfoOutlined, CheckCircle, ArrowUpward, ArrowDownward, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';


const SORT_FIELDS = [
    { value: 'type', label: 'Type' },
    { value: 'regState', label: 'Reg. State' },
    { value: 'plate', label: 'Plate' },
    { value: 'year', label: 'Year' },
    { value: 'make', label: 'Make' },
    { value: 'model', label: 'Model' },
    { value: 'vin', label: 'VIN' },
    { value: 'lastSeen', label: 'Last Seen' },
    { value: 'class', label: 'Class' },
];

function FleetDetails({ data }) {

    const fleet = data || {};

    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState('year');
    const [sortDirection, setSortDirection] = useState('desc');

    const [activePower, setActivePower] = useState('');
    const [activeTrailer, setActiveTrailer] = useState('');
    const [isSortOpen, setIsSortOpen] = useState(false);


    const [page, setPage] = useState(1);

    const rowsPerPage = 10;

    const cardThemes = {
        blue: {
            bg: 'bg-[#f4f7ff]',
            title: 'text-[#6d8cff]',
            value: 'text-[#111827]',
            iconBg: 'bg-[#dbe7ff]'
        },
        orange: {
            bg: 'bg-[#fff8f1]',
            title: 'text-[#f59e0b]',
            value: 'text-[#111827]',
            iconBg: 'bg-[#ffe7ba]'
        },
        purple: {
            bg: 'bg-[#faf5ff]',
            title: 'text-[#a855f7]',
            value: 'text-[#111827]',
            iconBg: 'bg-[#ead7ff]'
        },
        dark: {
            bg: 'bg-[#f8fafc]',
            title: 'text-[#475569]',
            value: 'text-[#111827]',
            iconBg: 'bg-[#e2e8f0]'
        },
        green: {
            bg: 'bg-[#f0fdf4]',
            title: 'text-[#10b981]',
            value: 'text-[#111827]',
            iconBg: 'bg-[#d1fae5]'
        }
    };

    const filteredTableData = useMemo(() => {

        const rawInspections = fleet?.inspections || [];

        const levelMapping = {
            1: 'Full',
            2: 'Walk-around',
            3: 'Driver-Only',
            4: 'Special Study',
            5: 'Terminal',
            6: 'Radioactive'
        };

        let rows = rawInspections.map((item) => {
            const currentLevelId = item.insp_level_id;
            const mappedClass = levelMapping[currentLevelId] || (currentLevelId ? `Level ${currentLevelId}` : '-');

            return {
                type:
    item.unit_type_desc?.toLowerCase() === 'truck tractor'
        ? 'Power Unit'
        : (item.unit_type_desc || '-'),
                vin: item.vin || item.vin2 || '-',
                plate: item.unit_license || item.unit_license2 || '-',
                class: mappedClass,
                desc: item.unit_type_desc2 || '-',
                year: item.insp_date || '-',
                make: item.unit_make || item.unit_make2 || '-',
                model: 'N/A',
                lastSeen: 'N/A',
                category: item.unit_type_desc || '' ,
                regState: item.report_state || '-',
                
            };
        });

        if (search) {
            const keyword = search.toLowerCase();

            rows = rows.filter((item) =>
                String(item.type).toLowerCase().includes(keyword) ||
                String(item.vin).toLowerCase().includes(keyword) ||
                String(item.plate).toLowerCase().includes(keyword) ||
                String(item.class).toLowerCase().includes(keyword) ||
                String(item.desc).toLowerCase().includes(keyword) ||
                String(item.year).toLowerCase().includes(keyword) ||
                String(item.make).toLowerCase().includes(keyword) ||
                String(item.model).toLowerCase().includes(keyword) ||
                String(item.lastSeen).toLowerCase().includes(keyword)
            );
        }

        rows = rows.filter((item) => {
            const powerMatched = !activePower || item.category === activePower;
            const trailerMatched = !activeTrailer || item.category === activeTrailer;

            return powerMatched && trailerMatched;      
        });

        rows.sort((a, b) => {

            const aValue = a[sortField] ?? '';
            const bValue = b[sortField] ?? '';

            if (sortField === 'year') {

                const aTime = new Date(aValue).getTime();
                const bTime = new Date(bValue).getTime();

                const aSafe = isNaN(aTime) ? 0 : aTime;
                const bSafe = isNaN(bTime) ? 0 : bTime;

                return sortDirection === 'asc'
                    ? aSafe - bSafe
                    : bSafe - aSafe;
            }

            const comparison = String(aValue).localeCompare(
                String(bValue),
                undefined,
                { numeric: true, sensitivity: 'base' }
            );

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return rows;

    }, [
        fleet,
        search,
        sortField,
        sortDirection,
        // activePower,
        // activeTrailer
    ]);

    const totalPages = Math.ceil(filteredTableData.length / rowsPerPage);

    const paginatedData = filteredTableData.slice(
        (page - 1) * rowsPerPage,
        page * rowsPerPage
    );

    return (
            <div className="rounded-[18px] border border-[#d9e1ee] bg-white overflow-hidden shadow-sm pb-[24px]">
            <div className="px-[28px] pt-[26px]">

                <div className="flex items-center gap-2 mt-2">
                    <div className="h-[7px] w-[7px] rounded-full bg-emerald-500" />
                    <h2 className="text-[14px] font-[800] tracking-[1px] text-[#0f172a] uppercase">
                        Fleet Details
                    </h2>
                </div>

                <p className="mt-1 text-[10px] text-[#45484c] leading-[18px] max-w-[900px]">
                    Fleet tractors and trailers identified through observations on the road.
                    Note: If the carrier has no recent observations, equipment may not be shown
                    even if power units are reported.
                </p>

                <div className="grid grid-cols-3 gap-[14px] mt-[24px]">
                    {(
                    fleet?.topCards || [
                        {
                            id: 1,
                            title: 'OBSERVED IN LAST 120 DAYS',
                            value: `${fleet?.observed_last_120_days?.percentage ?? 'NA'}%`,
                            type: 'blue'
                        },
                        {
                            id: 2,
                            title: 'AVG POWER AGE',
                            value: 'TBC',
                            unit: 'Years',
                            type: 'orange'
                        },
                        {
                            id: 3,
                            title: 'AVG TRAILER AGE',
                            value: 'TBC',
                            unit: 'Years',
                            type: 'purple'
                        },
                        // {
                        //     id: 4,
                        //     title: 'POWER CLASS 8',
                        //     value: 'NA',
                        //     subtitle: 'NA',
                        //     type: 'dark'
                        // },
                        // {
                        //     id: 5,
                        //     title: 'TRAILER MIX',
                        //     value: 'NA',
                        //     subtitle: 'NA',
                        //     type: 'green'
                        // }
                    ]
                ).map((card) => {
                        const theme = cardThemes[card.type] || cardThemes.blue;

                        return (
                            <div
                                key={card.id}
                                className={`rounded-[14px] border border-[#edf2f7] px-[18px] py-[18px] ${theme.bg}`}
                            >
                                <div className="flex items-start justify-between">
                                    <p className={`text-[9px] font-[800] tracking-[1px] uppercase ${theme.title}`}>
                                        {card.title}
                                    </p>
                                  <div className={`h-[30px] w-[30px] flex items-center justify-center`}>
                                        {card.type === 'blue' && (
                                            <div className="text-[#2563eb]">
                                                <Search sx={{ fontSize: 20 }} />
                                            </div>
                                        )}

                                        {card.type === 'orange' && (
                                            <div className="text-[#d97706]">
                                                <Timeline sx={{ fontSize: 20 }} />
                                            </div>
                                        )}

                                        {card.type === 'purple' && (
                                            <div className="text-[#9333ea]">
                                                <LocalShipping sx={{ fontSize: 20 }} />
                                            </div>
                                        )}

                                        {card.type === 'dark' && (
                                            <div className="text-[#64748b]">
                                                <Assessment sx={{ fontSize: 20 }} />
                                            </div>
                                        )}

                                        {card.type === 'green' && (
                                            <div className="text-[#059669]">
                                                <CheckCircle sx={{ fontSize: 20 }} />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-end gap-1 mt-[14px]">
                                    <h3 className={`text-[30px] leading-none font-[800] ${theme.value}`}>
                                        {card.value}
                                    </h3>
                                    {card.unit && (
                                        <span className="mb-[4px] text-[11px] text-[#64748b]">
                                            {card.unit}
                                        </span>
                                    )}
                                </div>

                                {card.subtitle && (
                                    <p className="mt-[10px] text-[11px] text-[#64748b]">
                                        {card.subtitle}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

            </div>

          <div className="mx-[28px] mt-[22px] rounded-[16px] border border-[#d9e1ee] p-[18px]">

    <div className="flex items-start justify-between gap-[20px]">

        <div className="flex-1">
            <p className="text-[9px] font-[800] tracking-[1px] text-[#94a3b8] uppercase mb-[8px]">
                Search
            </p>
            <div className="relative">
                <Search
                    className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#94a3b8]"
                    sx={{ fontSize: 18 }}
                />
                <input
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search VIN, Plate, Make, Model, Class..."
                    className="h-[42px] w-full rounded-[10px] border border-[#d9e1ee] bg-[#fbfcfe] pl-[42px] pr-[14px] text-[12px] outline-none"
                />
            </div>
        </div>

 <div className="w-[200px]">
    <div className="flex items-center justify-between mb-[8px]">
        <p className="text-[9px] font-[800] tracking-[1px] text-[#94a3b8] uppercase">
            Sort By
        </p>
        <button
            type="button"
            onClick={() => {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                setPage(1);
            }}
            className="flex items-center gap-[4px] text-[9px] font-[800] tracking-[1px] text-[#2563eb] uppercase hover:text-[#1d4ed8]"
        >
            {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            {sortDirection === 'asc' ? (
                <ArrowUpward sx={{ fontSize: 13 }} />
            ) : (
                <ArrowDownward sx={{ fontSize: 13 }} />
            )}
        </button>
    </div>

    <div className="relative">
        <select
            value={sortField}
            onFocus={() => setIsSortOpen(true)}
            onBlur={() => setIsSortOpen(false)}
            onChange={(e) => {
                setSortField(e.target.value);
                setPage(1);
                setIsSortOpen(false);
            }}
            className="h-[42px] w-full appearance-none rounded-[10px] border border-[#d9e1ee] bg-white px-[14px] pr-[38px] text-[12px] outline-none"
        >
            {SORT_FIELDS.map((item) => (
                <option key={item.value} value={item.value}>
                    {item.label}
                </option>
            ))}
        </select>

        {isSortOpen ? (
            <KeyboardArrowUp
                className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[#64748b]"
                sx={{ fontSize: 18 }}
            />
        ) : (
            <KeyboardArrowDown
                className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[#64748b]"
                sx={{ fontSize: 18 }}
            />
        )}
    </div>
</div>
    </div>

    <div className="mt-[18px] overflow-x-auto">
        <table className="w-full min-w-[1200px]">
            <thead className="bg-[#f8fafc] border-y border-[#e5edf6]">
                <tr>
                    {[
                        'Type',
                        'Reg. State',
                        'Plate',
                        'Year',
                        'Make',
                        'Model',
                        'VIN',
                        'Last Seen',
                        'Class',
                    ].map((head) => (
                        <th
                            key={head}
                            className="px-[18px] py-[14px] text-left text-[9px] font-[800] tracking-[1px] text-[#94a3b8] uppercase whitespace-nowrap"
                        >
                            {head}
                        </th>
                    ))}
                </tr>
            </thead>

            <tbody>
                {paginatedData && paginatedData.length > 0 ? (
                    paginatedData.map((row, index) => (
                        <tr
                            key={index}
                            className="border-b border-[#eef2f7] hover:bg-[#fafcff]"
                        >
                            <td className="px-[18px] py-[14px] text-[11px] text-[#475569] whitespace-nowrap">
                                {row.type}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] text-[#64748b] whitespace-nowrap">
                                {row.regState}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] text-[#64748b] whitespace-nowrap">
                                {row.plate}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] text-[#64748b] whitespace-nowrap">
                                {row.years}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] text-[#475569] whitespace-nowrap">
                                {row.make}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] text-[#475569] whitespace-nowrap">
                                {row.model}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] font-[700] text-[#2563eb] whitespace-nowrap">
                                {row.vin}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] text-[#94a3b8] whitespace-nowrap">
                                 {row.year}
                            </td>
                            <td className="px-[18px] py-[14px] text-[11px] text-[#111827] whitespace-nowrap">
                                {row.class}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td
                            colSpan="9"
                            className="px-[18px] py-[40px] text-center text-[12px] font-[600] text-[#94a3b8]"
                        >
                            No fleet records found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>

    <div className="flex items-center justify-end gap-[18px] px-[28px] py-[8px]">
        <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
            className={`${page === 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            <ChevronLeft sx={{ fontSize: 18 }} />
        </button>

        <span className="text-[11px] font-[700] text-[#64748b]">
            {page}
        </span>
        <span className="text-[11px] text-[#94a3b8]">/</span>
        <span className="text-[11px] text-[#94a3b8]">
            {totalPages || 1}
        </span>

        <button
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((prev) => prev + 1)}
            className={`${page === totalPages || totalPages === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
            <ChevronRight sx={{ fontSize: 18 }} />
        </button>
    </div>
</div>

        </div>
    );
}

export default FleetDetails;