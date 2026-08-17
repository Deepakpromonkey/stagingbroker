import React, { useMemo, useState } from "react";

import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Bar,
    Area,
} from "recharts";

import {
    Search,
    ChevronLeft,
    ChevronRight,
    LocationOnOutlined,
} from "@mui/icons-material";

const ITEMS_PER_PAGE = 3;

function Crashes({ data }) {

    const crashes = data || {};

    const [search, setSearch] = useState('');
    const [severityFilter, setSeverityFilter] = useState('ALL');
    const [activeRange, setActiveRange] = useState('12M');
    const [hazmatOnly, setHazmatOnly] = useState(false);
    const [page, setPage] = useState(1);


    const chartData =
        crashes?.chartTabs?.[activeRange] || [];


    const filteredRows = useMemo(() => {

        let rows = crashes?.crash_details || [];

if (search) {

    rows = rows.filter(item =>

        item.location
            ?.toLowerCase()
            .includes(search.toLowerCase())

        ||

        item.crash_event_seq_id_desc
            ?.toLowerCase()
            .includes(search.toLowerCase())

        ||

        item.report_date
            ?.toLowerCase()
            .includes(search.toLowerCase())
    );
}

        if (severityFilter !== 'ALL') {
            rows = rows.filter(
                item =>
                    item.severity?.toUpperCase() === severityFilter
            );
        }

        if (hazmatOnly) {
            rows = rows.filter(item => item.hazmat === 'Y');
        }

        return rows;

    }, [crashes, search, severityFilter, hazmatOnly]);

    const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE);

    const rows = filteredRows.slice(
        (page - 1) * ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
    );

    const getCardStyles = type => {

        switch (type) {

            case 'stable':
                return {
                    line: 'bg-[#f59e0b]',
                    badge: 'bg-emerald-50 text-emerald-700',
                    footer: 'text-[#f59e0b]',
                };

            case 'neutral':
                return {
                    line: 'bg-[#f59e0b]',
                    badge: 'bg-slate-100 text-slate-700',
                    footer: 'text-[#f59e0b]',
                };

            case 'clean':
                return {
                    line: 'bg-red-500',
                    badge: 'bg-red-50 text-red-600',
                    footer: 'text-red-500',
                };

            case 'risk':
                return {
                    line: 'bg-emerald-600',
                    badge: 'bg-emerald-50 text-emerald-700',
                    footer: 'text-emerald-700',
                };

            default:
                return {
                    line: 'bg-[#2563eb]',
                    badge: 'bg-slate-100 text-slate-700',
                    footer: 'text-slate-700',
                };
        }
    };

    const getSeverityStyles = severity => {

        switch (severity?.toUpperCase()) {

            case 'FATAL':
                return 'bg-red-50 text-red-600';

            case 'INJURY':
                return 'bg-orange-50 text-orange-600';

            case 'TOW-AWAY':
                return 'bg-amber-50 text-amber-700';

            default:
                return 'bg-slate-100 text-slate-500';
        }
    };

    return (
        <div className="px-[16px] sm:px-[20px] lg:px-[26px] py-[18px] sm:py-[22px] lg:py-[26px] bg-white">

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-6 lg:mb-9">

                {!crashes?.summaryCards || crashes.summaryCards.length === 0 ? (
                    <div className="col-span-2 lg:col-span-4 bg-white border border-[#e7edf5] rounded-[20px] py-10 text-center text-[13px] font-[500] text-[#64748b]">
                        No summary snapshot data available.
                    </div>
                ) : (
                    crashes.summaryCards.map(card => {

                        const styles = getCardStyles(card.type);

                        return (
                            <div
                                key={card.id}
                                className="bg-white border border-[#e7edf5] rounded-[16px] sm:rounded-[18px] lg:rounded-[20px] px-4 sm:px-5 lg:px-7 py-4 sm:py-5 lg:py-6"
                            >

                                <div className="flex items-start justify-between">

                                    <div className="min-w-0">
                                        <p className="text-[9px] sm:text-[9.5px] lg:text-[10px] tracking-[1px] lg:tracking-[1.3px] font-[800] text-[#64748b] uppercase truncate">
                                            {card.title}
                                        </p>

                                        <div className="flex items-end gap-2 mt-2 flex-wrap">

                                            <h2 className="text-[22px] sm:text-[26px] lg:text-[30px] mb-3 lg:mb-5 mt-3 lg:mt-5 leading-none font-[800] text-[#0f172a]">
                                                {card.value}
                                            </h2>

                                            {card.badge && (
                                                <span className={`h-[20px] lg:h-[22px] px-2 rounded-full flex items-center text-[9px] lg:text-[10px] font-[800] whitespace-nowrap ${styles.badge}`}>
                                                    {card.badge}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 lg:mt-5 h-[3px] rounded-full overflow-hidden bg-[#e2e8f0]">
                                    <div className={`h-full w-[58%] ${styles.line}`} />
                                </div>

                                <div className="mt-3 lg:mt-4 flex items-center justify-between gap-2">
                                    <span className="text-[9px] lg:text-[10px] font-[700] text-[#94a3b8] uppercase truncate">
                                        {card.footer}
                                    </span>

                                    <span className={`text-[9px] lg:text-[10px] font-[800] whitespace-nowrap ${styles.footer}`}>
                                        {card.footerValue}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="bg-white border border-[#e7edf5] rounded-[18px] lg:rounded-[22px] px-4 sm:px-5 lg:px-7 py-5 sm:py-6 lg:py-7 mb-6 lg:mb-8">

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5 lg:mb-6">

                    <div>
                        <h3 className="text-[16px] sm:text-[17.5px] lg:text-[19px] font-[800] text-[#0f172a]">
                            Incident Velocity & Severity
                        </h3>

                        <p className="text-[11.5px] lg:text-[12px] text-[#64748b] mt-1">
                            Advanced tracking of crash count (bars) vs weighted rate (line)
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">

                        {/* LEGENDS */}

                        <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-5 bg-white border border-[#e2e8f0] rounded-[14px] px-3 sm:px-4 py-2 overflow-x-auto">

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="h-[10px] w-[10px] rounded-full bg-[#dbe4f3] shrink-0" />
                                <span className="text-[11px] lg:text-[12px] text-[#475569] whitespace-nowrap">
                                    Count
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="h-[3px] w-[14px] rounded-full bg-[#2563eb] shrink-0" />
                                <span className="text-[11px] lg:text-[12px] text-[#475569] whitespace-nowrap">
                                    Rate
                                </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <div className="h-[1px] w-[14px] border-t border-dashed border-red-400 shrink-0" />
                                <span className="text-[11px] lg:text-[12px] text-[#475569] whitespace-nowrap">
                                    Benchmark
                                </span>
                            </div>
                        </div>

                        {/* TABS */}

                        <div className="flex items-center border border-[#e2e8f0] rounded-[14px] p-1 self-start sm:self-auto">

                            {['12M', 'YTD', 'ALL'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveRange(tab)}
                                    className={`px-3 sm:px-4 h-[30px] lg:h-[32px] rounded-[10px] text-[10.5px] lg:text-[11px] font-[800]
                                    ${activeRange === tab
                                            ? 'bg-[#edf4ff] text-[#2563eb]'
                                            : 'text-[#64748b]'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-[240px] sm:h-[280px] lg:h-[330px]">

                    <ResponsiveContainer width="100%" height="100%">

                        <ComposedChart
                            data={chartData}
                            margin={{
                                top: 10,
                                right: 10,
                                left: -20,
                                bottom: 0,
                            }}
                        >

                            <CartesianGrid
                                stroke="#eef2f7"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="month"
                                tick={{
                                    fontSize: 10,
                                    fill: '#64748b',
                                    fontWeight: 700,
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                yAxisId="left"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fontSize: 10,
                                    fill: '#64748b',
                                }}
                            />

                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fontSize: 10,
                                    fill: '#64748b',
                                }}
                            />

                            <Tooltip />

                            <Bar
                                yAxisId="left"
                                dataKey="count"
                                fill="#dfe7f4"
                                radius={[8, 8, 0, 0]}
                                barSize={22}
                            />

                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="rate"
                                stroke="#5b8cff"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRate)"
                                dot={{
                                    r: 5,
                                    strokeWidth: 3,
                                    fill: '#fff',
                                    stroke: '#2563eb',
                                }}
                                activeDot={{
                                    r: 6,
                                }}
                            />

                            <defs>
                                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#5b8cff" stopOpacity={0.16} />
                                    <stop offset="95%" stopColor="#5b8cff" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                        </ComposedChart>

                    </ResponsiveContainer>
                </div>
            </div>


            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">

                <div className="relative w-full lg:w-[420px] lg:mb-4">

                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]"
                        sx={{ fontSize: 18 }}
                    />

                    <input
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search by DOT#, driver, or incident location..."
                        className="w-full h-[44px] lg:h-[46px] rounded-[14px] lg:rounded-[15px] border border-[#e2e8f0] bg-white pl-12 pr-4 text-[13px] outline-none"
                    />
                </div>

                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">

                    {['FATAL', 'INJURY', 'TOW-AWAY'].map(item => (

                        <button
                            key={item}
                            onClick={() => {
                                setSeverityFilter(
                                    severityFilter === item
                                        ? 'ALL'
                                        : item
                                );

                                setPage(1);
                            }}
                            className={`h-[34px] lg:h-[38px] px-2.5 sm:px-3 rounded-full border text-[9.5px] lg:text-[10px] font-[800] whitespace-nowrap
                            ${severityFilter === item
                                    ? 'bg-[#4165c9] text-white border-[#0f172a]'
                                    : 'bg-white text-[#475569] border-[#e2e8f0]'
                                }`}
                        >
                            {item}
                        </button>
                    ))}

                    <div className="h-[20px] w-[1px] bg-[#e2e8f0] mx-1" />

                    <label className="flex items-center gap-2 cursor-pointer">

                        <input
                            type="radio"
                            checked={hazmatOnly}
                            onClick={() => {
                                setHazmatOnly(prev => !prev);
                                setPage(1);
                            }}
                        />

                        <span className="text-[11.5px] lg:text-[12px] text-[#475569] whitespace-nowrap">
                            Hazmat Only
                        </span>
                    </label>
                </div>
            </div>

            <div className="bg-white border border-[#e7edf5] rounded-[18px] lg:rounded-[22px] overflow-hidden">

                <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">

                    <thead className="bg-[#f8fafc] border-b border-[#eef2f7]">

                        <tr>

                            <th className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-left text-[9.5px] lg:text-[10px] tracking-[0.8px] lg:tracking-[1px] font-[800] text-[#94a3b8] uppercase">
                                Date
                            </th>

                            <th className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-left text-[9.5px] lg:text-[10px] tracking-[0.8px] lg:tracking-[1px] font-[800] text-[#94a3b8] uppercase">
                                Severity
                            </th>

                            <th className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-left text-[9.5px] lg:text-[10px] tracking-[0.8px] lg:tracking-[1px] font-[800] text-[#94a3b8] uppercase">
                                Description
                            </th>

                            <th className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-left text-[9.5px] lg:text-[10px] tracking-[0.8px] lg:tracking-[1px] font-[800] text-[#94a3b8] uppercase">
                                Location
                            </th>

                            <th className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-right text-[9.5px] lg:text-[10px] tracking-[0.8px] lg:tracking-[1px] font-[800] text-[#94a3b8] uppercase">
                                Details
                            </th>

                        </tr>
                    </thead>

                    <tbody>

                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-4 sm:px-5 lg:px-6 py-12 text-center text-[13px] font-[500] text-[#64748b] bg-white"
                                >
                                    No crash records found matching the criteria.
                                </td>
                            </tr>
                        ) : (
                            rows.map((row, index) => (

                                <tr
                                    key={index}
                                    className="border-t border-[#f1f5f9]"
                                >

                                    <td className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-[12.5px] lg:text-[13px] font-[700] text-[#0f172a] whitespace-nowrap">
                                       {row.report_date || 'N/A'}
                                    </td>

                                    <td className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5">

                                        <span className={`px-3 py-1 rounded-full text-[9.5px] lg:text-[10px] font-[800] uppercase whitespace-nowrap ${getSeverityStyles(row.severity)}`}>
                                            {row.severity || 'N/A'}
                                        </span>

                                    </td>

                                    <td className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-[12.5px] lg:text-[13px] text-[#334155] max-w-[280px] lg:max-w-[320px]">
                                        {row.crash_event_seq_id_desc || 'N/A'}
                                    </td>

                                    <td className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5">

                                        <div className="flex items-center gap-1 text-[11.5px] lg:text-[12px] text-[#64748b] whitespace-nowrap">

                                            <LocationOnOutlined
                                                sx={{
                                                    fontSize: 15,
                                                    color: '#10b981',
                                                }}
                                            />

                                            {row.location || 'N/A'}
                                        </div>

                                    </td>

                                    <td className="px-4 sm:px-5 lg:px-6 py-4 sm:py-4.5 lg:py-5 text-right">

                                        <button className="h-[30px] lg:h-[32px] px-3 lg:px-4 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] lg:text-[11px] font-[800] hover:bg-emerald-100 transition-all whitespace-nowrap">
                                            VIEW
                                        </button>

                                    </td>

                                </tr>
                            ))
                        )}

                    </tbody>
                </table>
                </div>


                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 lg:px-6 py-4 border-t border-[#eef2f7]">

                    <p className="text-[10.5px] lg:text-[11px] text-[#94a3b8] text-center sm:text-left">
                        {filteredRows.length === 0 ? (
                            "Showing 0–0 of 0 incidents"
                        ) : (
                            <>
                                Showing {(page - 1) * ITEMS_PER_PAGE + 1}
                                –
                                {Math.min(page * ITEMS_PER_PAGE, filteredRows.length)}
                                {' '}of {filteredRows.length} incidents
                            </>
                        )}
                    </p>

                    <div className="flex items-center gap-2">

                        <button
                            disabled={page === 1}
                            onClick={() => setPage(prev => prev - 1)}
                            className="h-[32px] w-[32px] rounded-full border border-[#e2e8f0] flex items-center justify-center disabled:opacity-40"
                        >
                            <ChevronLeft sx={{ fontSize: 18 }} />
                        </button>

                        <button
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage(prev => prev + 1)}
                            className="h-[32px] w-[32px] rounded-full border border-[#e2e8f0] flex items-center justify-center disabled:opacity-40"
                        >
                            <ChevronRight sx={{ fontSize: 18}} />
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default Crashes;