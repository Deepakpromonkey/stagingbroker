import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Search,
    MoreVert,
    ChevronLeft,
    ChevronRight,
    InsightsOutlined,
    LocalShippingOutlined,
    PieChartOutlined,
    WarningAmberOutlined,
    FiberManualRecord,
    HubOutlined,
    GroupsOutlined,
    RoomOutlined
} from '@mui/icons-material';

function LoadHistory({ data }) {
    const history = data || {};

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const searchInputRef = useRef(null);

    const rowsPerPage = 4;

    const concentration = history?.concentration || {};
    const concentrationItems = concentration?.items || [];
    const concentrationPercent = parseFloat(
        String(concentration?.total || '0').replace('%', '')
    );

    const radius = 42;
    const stroke = 8;
    const normalizedRadius = radius;
    const circumference = 2 * Math.PI * normalizedRadius;
    const strokeDashoffset =
        circumference - (concentrationPercent / 100) * circumference;

    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    const filteredRows = useMemo(() => {
        const rows = [...(history?.tableData || [])];
        const keyword = search.trim().toLowerCase();

        if (!keyword) return rows;

        return rows.filter((item) =>
            item.shipper?.toLowerCase().includes(keyword) ||
            item.status?.toLowerCase().includes(keyword)
        );
    }, [history?.tableData, search]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));

    const paginatedRows = filteredRows.slice(
        (page - 1) * rowsPerPage,
        page * rowsPerPage
    );

    const handlePrev = () => {
        if (page > 1) {
            setPage((prev) => prev - 1);
        }
    };

    const handleNext = () => {
        if (page < totalPages) {
            setPage((prev) => prev + 1);
        }
    };

    const handleSearchIconClick = () => {
        setIsSearchOpen(true);
    };

    const handleSearchBlur = () => {
        if (!search.trim()) {
            setIsSearchOpen(false);
        }
    };

    const getSummaryCardIcon = (card, index) => {
        const title = card?.title?.toLowerCase?.() || '';

        if (title.includes('strong')) {
            return (
                <InsightsOutlined
                    sx={{
                        fontSize: 15,
                        color: '#1d4ed8'
                    }}
                />
            );
        }

        if (title.includes('full')) {
            return (
                <LocalShippingOutlined
                    sx={{
                        fontSize: 15,
                        color: '#64748b'
                    }}
                />
            );
        }

        if (title.includes('less')) {
            return (
                <PieChartOutlined
                    sx={{
                        fontSize: 15,
                        color: '#64748b'
                    }}
                />
            );
        }

        if (title.includes('deadhead')) {
            return (
                <WarningAmberOutlined
                    sx={{
                        fontSize: 15,
                        color: '#b91c1c'
                    }}
                />
            );
        }

        const fallbackIcons = [
            <InsightsOutlined sx={{ fontSize: 15, color: '#1d4ed8' }} />,
            <LocalShippingOutlined sx={{ fontSize: 15, color: '#64748b' }} />,
            <PieChartOutlined sx={{ fontSize: 15, color: '#64748b' }} />,
            <WarningAmberOutlined sx={{ fontSize: 15, color: '#b91c1c' }} />
        ];

        return fallbackIcons[index] || fallbackIcons[0];
    };

    const getInsightIcon = (index) => {
        const icons = [
            {
                icon: (
                    <HubOutlined
                        sx={{
                            fontSize: 14,
                            color: '#2563eb'
                        }}
                    />
                ),
                bg: '#eef4ff'
            },
            {
                icon: (
                    <GroupsOutlined
                        sx={{
                            fontSize: 14,
                            color: '#16a34a'
                        }}
                    />
                ),
                bg: '#ecfdf3'
            },
            {
                icon: (
                    <RoomOutlined
                        sx={{
                            fontSize: 14,
                            color: '#ea580c'
                        }}
                    />
                ),
                bg: '#fff3ed'
            }
        ];

        return icons[index] || icons[0];
    };

    const concentrationColors = ['#1457c8', '#3b82f6', '#60a5fa', '#93c5fd'];

    const renderInsightText = (text = '') => {
        const regex = /(\b\d+(\.\d+)?%\b|T-AL-1)/g;
        const parts = text.split(regex);

        return parts.filter(Boolean).map((part, index) => {
            const isBluePercent =
                part === '2.5%' ||
                part === '6.3%' ||
                part === '19%';

            const isGreenPercent = part === '34%';
            const isOrangeText = part === 'T-AL-1' || part === '6%';

            if (isBluePercent) {
                return (
                    <span key={index} className="font-[700] text-[#2563eb]">
                        {part}
                    </span>
                );
            }

            if (isGreenPercent) {
                return (
                    <span key={index} className="font-[700] text-[#16a34a]">
                        {part}
                    </span>
                );
            }

            if (isOrangeText) {
                return (
                    <span key={index} className="font-[700] text-[#c2410c]">
                        {part}
                    </span>
                );
            }

            return <span key={index}>{part}</span>;
        });
    };

    return (
        <div className="rounded-[8px] border border-[#dfe5ec] bg-[#fbfbfc] p-[18px]">
            <div className="flex items-center mt-2 gap-2">
                <div className="h-[6px] w-[6px] rounded-full bg-[#22c55e]" />
                <h2 className="text-[13px] font-[800] tracking-[0.8px] text-[#111827] uppercase">
                    Load History
                </h2>
            </div>

            <p className="mt-[8px] max-w-[920px] text-[9px] leading-[15px] text-[#7c8aa0]">
                Fleet tractors and trailers identified through observations on
                the road. Note: If the carrier has no recent observations,
                equipment may not be shown — even if power units are reported.
            </p>
            <div className="mt-[20px] grid grid-cols-4 gap-[14px]">
                {(history?.summaryCards || []).map((card, index) => {
                    const title = card?.title?.toLowerCase?.() || '';
                    const isStrong = title.includes('strong');
                    const isDeadhead = title.includes('deadhead');
                    const isFullTruckload = title.includes('full');

                    return (
                        <div
                            key={card.id}
                            className={`rounded-[6px] border bg-white px-[16px] py-[14px] ${
                                isStrong
                                    ? 'border-[#3b82f6]'
                                    : isDeadhead
                                    ? 'border-[#eadede]'
                                    : 'border-[#e5e7eb]'
                            }`}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-[6px]">
                                {isStrong && (
                                    <div className="flex h-[20px] w-[20px] items-center justify-center rounded-[4px] border border-[#cfe0ff] bg-[#f5f9ff]">
                                        {getSummaryCardIcon(card, index)}
                                    </div>
                                )}

                                {!isStrong && (
                                    <p
                                        className={`text-[9px] font-[700] uppercase tracking-[0.4px] ${
                                            isDeadhead
                                                ? 'text-[#b91c1c]'
                                                : 'text-[#6b7280]'
                                        }`}
                                    >
                                        {card.title}
                                    </p>
                                )}

                                {isStrong && (
                                    <p className="text-[11px] font-[700] text-[#111827]">
                                        {card.title}
                                    </p>
                                )}
                            </div>

                            {/* Value */}
                            {isStrong ? (
                                <div className="mt-[10px] flex items-end gap-[8px]">
                                    <h3 className="text-[30px] leading-none font-[800] text-[#111827]">
                                        {card.value}
                                    </h3>

                                    <span className="mb-[4px] text-[11px] text-[#6b7280]">
                                        {card.subtitle}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="h-[36px]" />

                                    <h3
                                        className={`text-[30px] leading-none font-[800] ${
                                            isDeadhead
                                                ? 'text-[#b91c1c]'
                                                : 'text-[#111827]'
                                        }`}
                                    >
                                        {card.value}
                                    </h3>

                                    <p
                                        className={`mt-[10px] text-[11px] ${
                                            isDeadhead
                                                ? 'text-[#9ca3af]'
                                                : isFullTruckload
                                                ? 'text-[#16a34a]'
                                                : 'text-[#9ca3af]'
                                        }`}
                                    >
                                        {card.subtitle}
                                    </p>
                                </>
                            )}

                            {/* Footer for Strong card */}
                            {isStrong && (
                                <>
                                    <div className="mt-[16px] h-[1px] w-full bg-[#e5e7eb]" />

                                    <div className="mt-[10px] flex items-center justify-between">
                                        <span className="text-[9px] text-[#94a3b8]">
                                            {card.footerLabel || 'Confidence Score'}
                                        </span>

                                        <span className="text-[9px] font-[700] text-[#1d4ed8]">
                                            {card.footerValue || `${card.progress}%`}
                                        </span>
                                    </div>

                                    <div className="mt-[5px] h-[5px] overflow-hidden rounded-full bg-[#dbe4f0]">
                                        <div
                                            className="h-full rounded-full bg-[#1457c8]"
                                            style={{
                                                width: `${card.progress || 0}%`
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
<div className="mt-[18px] grid grid-cols-12 gap-[14px]">
    <div className="col-span-12 overflow-hidden rounded-[8px] border border-[#dfe5ec] bg-white">
        <div className="flex h-[54px] items-center border-b border-[#e8edf3] px-[16px]">
            <div className="flex items-center gap-[9px]">
                <InsightsOutlined
                    sx={{
                        fontSize: 18,
                        color: '#1457c8',
                    }}
                />
                <p className="text-[14px] font-[700] text-[#111827]">
                    Key Insights
                </p>
            </div>
        </div>

        <div className="p-[14px]">
            {/* --- CHECK IF INSIGHTS ARE EMPTY --- */}
            {!history?.insights || history.insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-[32px] px-[16px] text-center bg-[#f8fafc] rounded-[6px] border border-dashed border-[#cbd5e1]">
                    
                    {/* Empty State UI Container with Custom Icon Positioning */}
                    <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#f1f5f9] text-[#94a3b8] mb-[12px]">
                        <InsightsOutlined sx={{ fontSize: 24 }} />
                    </div>
                    
                    <h4 className="text-[13px] font-[600] text-[#334155]">
                        No Insights Available
                    </h4>
                    
                    <p className="mt-[4px] max-w-[260px] text-[11px] leading-[16px] text-[#64748b]">
                        No loads tracked with Dollar Traq Network yet.
                    </p>
                    
                </div>
            ) : (
                /* --- RENDER INSIGHTS LIST IF DATA EXISTS --- */
                <div className="space-y-[10px]">
                    {(history.insights).map((item, index) => {
                        const insightMeta = getInsightIcon(index);

                        return (
                            <div
                                key={item.id}
                                className="rounded-[6px] border border-[#eceff5] bg-[#f7f8fc] px-[12px] py-[16px]"
                            >
                                <div className="flex items-center gap-[15px]">
                                    <div 
                                        className="relative h-[40px] w-[34px] flex-shrink-0 rounded-[8px] flex items-center justify-center"
                                        style={{ backgroundColor: insightMeta.bg }}
                                    >
                                        <div className="mt-[6px]">
                                            {insightMeta.icon}
                                        </div>
                                    </div>

                                    <p className="text-[11px] leading-[18px] text-[#4b5563]">
                                        {renderInsightText(item.title)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
{/* 
                <div className="col-span-5 overflow-hidden rounded-[8px] border border-[#dfe5ec] bg-white">
                    <div className="flex h-[54px] items-center justify-between border-b border-[#e8edf3] px-[16px]">
                        <p className="text-[14px] font-[700] text-[#111827]">
                            Customer Concentration
                        </p>

                        <div className="flex h-[20px] items-center rounded-full bg-[#ecfdf3] px-[8px] text-[11px] font-[700] text-[#16a34a]">
                            {concentration?.total || '0%'} Top 5
                        </div>
                    </div>

                    <div className="px-[18px] py-[16px]">
                    <div className="flex justify-center">
                    <div className="relative flex h-[160px] w-[160px] items-center justify-center">
                        <svg
                            width="160"
                            height="160"
                            viewBox="0 0 160 160"
                            className="-rotate-90"
                        >
                            <circle
                                cx="80"
                                cy="80"
                                r={60}
                                fill="none"
                                stroke="#dbe4f0"
                                strokeWidth={10}
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r={60}
                                fill="none"
                                stroke="#1457c8"
                                strokeWidth={10}
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 60}
                                strokeDashoffset={
                                    2 * Math.PI * 60 -
                                    (concentrationPercent / 100) * (2 * Math.PI * 60)
                                }
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <h3 className="text-[32px] leading-none font-[800] text-[#1f2937]">
                                {concentration?.total || '0%'}
                            </h3>
                            <p className="mt-[4px] text-[9px] uppercase tracking-[0.5px] text-[#9ca3af]">
                                {concentration?.label || ''}
                            </p>
                        </div>
                    </div>
                </div>

                        <div className="mt-[14px] space-y-[12px]">
                            {concentrationItems.map((item, index) => (
                                <div
                                    key={`${item.name}-${index}`}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-[7px]">
                                        <div
                                            className="h-[6px] w-[6px] rounded-full"
                                            style={{
                                                backgroundColor:
                                                    concentrationColors[
                                                        index % concentrationColors.length
                                                    ]
                                            }}
                                        />
                                        <span className="text-[11px] text-[#475569]">
                                            {item.name}
                                        </span>
                                    </div>

                                    <span className="text-[11px] font-[700] text-[#111827]">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div> */}
            </div>

            {/* <div className="mt-[20px] overflow-hidden rounded-[8px] border border-[#dfe5ec] bg-white">
                <div className="flex h-[64px] items-center justify-between px-[18px]">
                    <h3 className="text-[14px] font-[700] text-[#111827]">
                        Detailed Shipper Performance
                    </h3>

                    <div className="flex items-center gap-[10px]">
                        <div
                            className={`relative overflow-hidden transition-all duration-200 ${
                                isSearchOpen ? 'w-[190px]' : 'w-[28px]'
                            }`}
                        >
                            {isSearchOpen ? (
                                <>
                                    <Search
                                        sx={{ fontSize: 16 }}
                                        className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[#94a3b8]"
                                    />
                                    <input
                                        ref={searchInputRef}
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        onBlur={handleSearchBlur}
                                        placeholder="Search..."
                                        className="h-[30px] w-full rounded-[8px] border border-[#d9e1ee] bg-white pl-[30px] pr-[10px] text-[11px] text-[#111827] outline-none placeholder:text-[#94a3b8]"
                                    />
                                </>
                            ) : (
                                <button
                                    onClick={handleSearchIconClick}
                                    className="flex h-[28px] w-[28px] mt-[2px] items-center justify-center rounded-full text-[#6b7280]"
                                >
                                    <Search sx={{ fontSize:20 }} />
                                </button>
                            )}
                        </div>

                        <button className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#6b7280]">
                            <MoreVert sx={{ fontSize: 20 }} />
                        </button>
                    </div>
                </div>

                <table className="w-full">
                    <thead className="bg-[#f4f5fa]">
                        <tr>
                            {[
                                'SHIPPER NAME',
                                'TOTAL VOLUME',
                                'ON-TIME %',
                                'REVENUE',
                                'STATUS'
                            ].map((head) => (
                                <th
                                    key={head}
                                    className="px-[18px] py-[11px] text-left text-[8px] font-[800] tracking-[0.8px] text-[#6b7280] uppercase"
                                >
                                    {head}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {paginatedRows.length > 0 ? (
                            paginatedRows.map((row) => {
                                const isGood = row.onTime >= 90;
                                const onTimeColor = isGood ? '#0f766e' : '#b45309';
                                const statusActive = row.status === 'ACTIVE';

                                return (
                                    <tr key={row.id} className="border-t border-[#eef2f7]">
                                        <td className="px-[18px] py-[16px]">
                                            <div className="flex items-center gap-[10px]">
                                                <div className="flex h-[20px] w-[20px] items-center justify-center rounded-[6px] bg-[#e9eef8] text-[9px] font-[700] text-[#2456c3] pt-[2px]">
                                                    {row.id}
                                                </div>
                                                <span className="text-[11px] font-[600] text-[#111827]">
                                                    {row.shipper}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-[18px] py-[16px] text-[11px] text-[#374151]">
                                            {row.totalVolume}
                                        </td>

                                        <td className="px-[18px] py-[16px]">
                                            <div className="flex items-center gap-[10px]">
                                                <div className="h-[4px] w-[88px] overflow-hidden rounded-full bg-[#e5e7eb]">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${row.onTime}%`,
                                                            backgroundColor: onTimeColor
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-[700] text-[#111827]">
                                                    {row.onTime}%
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-[18px] py-[16px] text-[11px] font-[500] text-[#111827]">
                                            {row.revenue}
                                        </td>

                                        <td className="px-[18px] py-[16px]">
                                            <div
                                                className={`inline-flex h-[22px] items-center gap-[4px] rounded-full px-[8px] text-[9px] font-[700] ${
                                                    statusActive
                                                        ? 'bg-[#dcfce7] text-[#16a34a]'
                                                        : 'bg-[#fee2e2] text-[#dc2626]'
                                                }`}
                                            >
                                                <FiberManualRecord sx={{ fontSize: 8 }} />
                                                {row.status}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-[18px] py-[24px] text-center text-[11px] text-[#94a3b8]"
                                >
                                    No shippers found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="flex h-[46px] items-center justify-between border-t border-[#eef2f7] px-[18px]">
                    <p className="text-[9px] text-[#8b95a7]">
                        Showing {filteredRows.length === 0 ? 0 : (page - 1) * rowsPerPage + 1}-
                        {Math.min(page * rowsPerPage, filteredRows.length)} of{' '}
                        {filteredRows.length} shippers
                    </p>

                    <div className="flex items-center gap-[8px]">
                        <button
                            disabled={page === 1}
                            onClick={handlePrev}
                            className={`flex h-[20px] w-[20px] items-center justify-center rounded-full text-[#475569] ${
                                page === 1 ? 'cursor-not-allowed opacity-40' : ''
                            }`}
                        >
                            <ChevronLeft sx={{ fontSize: 14 }} />
                        </button>

                        {Array.from({ length: totalPages }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setPage(index + 1)}
                                className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] px-[5px] pt-[2px] text-[9px] font-[700] ${
                                    page === index + 1
                                        ? 'bg-[#1457c8] text-white'
                                        : 'text-[#475569]'
                                }`}
                            >
                                {index + 1}
                            </button>
                        ))}

                        <button
                            disabled={page === totalPages || totalPages === 0}
                            onClick={handleNext}
                            className={`flex h-[20px] w-[20px] items-center justify-center rounded-full text-[#475569] ${
                                page === totalPages || totalPages === 0
                                    ? 'cursor-not-allowed opacity-40'
                                    : ''
                            }`}
                        >
                            <ChevronRight sx={{ fontSize: 14 }} />
                        </button>
                    </div>
                </div>
            </div> */}
        </div>
    );
}

export default LoadHistory;