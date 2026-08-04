import React, { useState, useMemo, useRef, useEffect } from 'react';

import {
    CalendarMonth,
    IosShare,
    Search,
    CheckCircleOutlined,
    FilterList,
    DirectionsCarFilled,
    AccessTime,
    Build,
    Opacity,
    Badge as BadgeIcon,
    WarningAmber,
    ArrowForward
} from '@mui/icons-material';

const CATEGORY_COLORS = {
    'UNSAFE DRIVING': {
        text: '#2563eb',
        bg: '#eff6ff',
        main: '#2563eb'
    },

    'HOS COMPL.': {
        text: '#d97706',
        bg: '#fffbeb',
        main: '#f59e0b'
    },

    'VEHICLE MAINT.': {
        text: '#dc2626',
        bg: '#fef2f2',
        main: '#ef4444'
    },

    'VEHICLE MAINTENANCE': {
        text: '#dc2626',
        bg: '#fef2f2',
        main: '#ef4444'
    },

    'DRIVER FITNESS': {
        text: '#059669',
        bg: '#ecfdf5',
        main: '#10b981'
    },

    HAZMAT: {
        text: '#7c3aed',
        bg: '#f5f3ff',
        main: '#8b5cf6'
    },

    'CRASH INDICATOR': {
        text: '#334155',
        bg: '#f8fafc',
        main: '#64748b'
    }
};

const METRIC_CONFIG = [
    {
        key: 'unsafeDriving',
        label: 'Unsafe Driving',
        subtitle: 'Behavior Analysis',
        shortLabel: 'Unsafe',
        icon: DirectionsCarFilled,
        color: '#2563eb',
        // keywords checked against a normalized basic_desc - matches
        // "UNSAFE DRIVING", "Unsafe Driving", etc regardless of exact wording
        categoryKeywords: ['UNSAFE']
    },

    {
        key: 'hosCompliance',
        label: 'HOS Compliance',
        subtitle: 'Hours-of-Service',
        shortLabel: 'HOS',
        icon: AccessTime,
        color: '#f59e0b',
        categoryKeywords: ['HOS', 'HOURS']
    },

    {
        key: 'vehicleMaint',
        label: 'Vehicle Maintenance',
        subtitle: 'Technical Status',
        shortLabel: 'Maintenance',
        icon: Build,
        color: '#ef4444',
        categoryKeywords: ['VEHICLE MAINT', 'MAINTENANCE']
    },

    {
        key: 'controlledSubstances',
        label: 'Drug & Alcohol',
        subtitle: 'Compliance Check',
        shortLabel: 'Drug/Alcohol',
        icon: Opacity,
        color: '#8b5cf6',
        // matched against basic_desc first; falls back to the
        // subt_alcohol_viol field if no category text is present at all
        categoryKeywords: ['CONTROLLED SUBSTANCE', 'ALCOHOL', 'DRUG']
    },

    {
        key: 'driverFitness',
        label: 'Driver Fitness',
        subtitle: 'Medical & Licenses',
        shortLabel: 'Fitness',
        icon: BadgeIcon,
        color: '#10b981',
        categoryKeywords: ['DRIVER FITNESS', 'FITNESS']
    },
];

// Normalizes a basic_desc string for loose matching: uppercase, trim, and
// collapse punctuation/whitespace so "Vehicle Maint." and "VEHICLE
// MAINTENANCE" both reduce to something keyword-matchable.
function normalizeCategory(value) {

    return decodeEntities(value)
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

}

// Some basic_desc values in the raw data contain literal HTML entities
// (e.g. "CONTROLLED SUBSTANCES/&#8203;ALCOHOL") instead of real characters.
// React renders text as-is, so without this they show up as literal
// "&#8203;" text in the UI. This decodes the common ones back to real chars.
function decodeEntities(str) {

    if (!str) return '';

    return String(str)
        .replace(/&#(\d+);/g, function (match, dec) {

            return String.fromCharCode(Number(dec));

        })
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // strip zero-width space specifically, in case it survived decoding
        .replace(/\u200B/g, '');

}

function getMetricValue(config, basics) {

    const smsMeasures = basics?.sms_measures || {};
    const inspections = basics?.inspections || [];

    let rawValue = 0;

    switch (config.key) {

        case 'unsafeDriving':

            rawValue = smsMeasures?.unsafe_driv_measure || 0;

            break;

        case 'crashIndicator':

            rawValue = smsMeasures?.crash_ind_measure || 0;

            break;

        case 'hosCompliance':

            rawValue = smsMeasures?.hos_driv_measure || 0;

            break;

        case 'vehicleMaint':

            rawValue = smsMeasures?.veh_maint_measure || 0;

            break;

        case 'controlledSubstances':

            rawValue = inspections.reduce(function (sum, item) {

                return sum + Number(item?.subt_alcohol_viol || 0);

            }, 0);

            break;

        case 'driverFitness':

            rawValue = smsMeasures?.driv_fit_measure || 0;

            break;

        case 'hazmat':

            rawValue = inspections.reduce(function (sum, item) {

                return sum + Number(item?.hm_viol || 0);

            }, 0);

            break;

        default:

            rawValue = 0;

            break;

    }

    return Math.round(Number(rawValue) || 0);

}

function Basics({ data }) {

    const ROWS_PER_LOAD = 4;

    const [visibleCount, setVisibleCount] =
        useState(ROWS_PER_LOAD);

    const [selectedMetric, setSelectedMetric] =
        useState(METRIC_CONFIG[0].key);

    const [expandedRows, setExpandedRows] = 
        useState({});

    const tableRef = useRef(null);

    const basics = data || {};

    const violationData =
        basics?.violation_details || [];

    const selectedConfig =
        METRIC_CONFIG.find(function (c) {

            return c.key === selectedMetric;

        }) || METRIC_CONFIG[0];

    // Filter the violation log down to whichever tab/metric is selected.
    // Most tabs match on basic_desc; controlled substances has no category
    // text in the log, so it's matched by the presence of an alcohol/drug
    // violation on the row instead.
    const filteredData = useMemo(function () {

        const keywords = selectedConfig.categoryKeywords || [];

        return violationData.filter(function (log) {

            const normalized = normalizeCategory(log?.basic_desc);

            const matchesKeyword = keywords.some(function (kw) {

                return normalized.includes(kw);

            });

            if (matchesKeyword) {

                return true;

            }

            // Drug & Alcohol rows sometimes carry no basic_desc category text
            // at all - fall back to the violation-count field for those.
            if (
                selectedConfig.key === 'controlledSubstances' &&
                Number(log?.subt_alcohol_viol || 0) > 0
            ) {

                return true;

            }

            return false;

        });

    }, [violationData, selectedConfig]);

    const totalCount = filteredData.length;

    const unsafeCount = useMemo(function () {

        return filteredData.filter(function (log) {

            return (
                log?.oos_violation === true ||
                log?.oos_violation === 'true' ||
                log?.oos_violation === 1
            );

        }).length;

    }, [filteredData]);

    // Reset pagination/expanded rows whenever the selected tab changes so
    // stale row indices from the previous filtered list don't leak through.
    useEffect(function () {

        setVisibleCount(ROWS_PER_LOAD);
        setExpandedRows({});

    }, [selectedMetric]);

    const visibleData = filteredData.slice(
        0,
        visibleCount
    );

    const remainingCount = Math.max(
        0,
        totalCount - visibleCount
    );

    const hasMore = visibleCount < totalCount;

    const selectedValue = getMetricValue(selectedConfig, basics);

    const SelectedIcon = selectedConfig.icon;

    const toggleRowDescription = function (idx) {
        setExpandedRows(function (prev) {
            const next = { ...prev };
            if (next[idx]) {
                delete next[idx];
            } else {
                next[idx] = true;
            }
            return next;
        });
    };

    // Clean up long timestamp string formats (e.g., 2024-07-01T00:00:00.000000Z)
    const formatDate = function (dateStr) {
        if (!dateStr) return '--';
        if (dateStr.includes('T')) {
            return dateStr.split('T')[0];
        }
        return dateStr;
    };

    // Keep the table header in view when collapsing back to 4 rows,
    // instead of leaving the user scrolled down past the (now shorter) table.
    const scrollToTable = function () {
        if (tableRef.current) {
            tableRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    };

    return (

        <div className='space-y-6 bg-[#f8fafc] p-6'>

            <div className='flex items-center justify-between'>

                <div>

                    <h2 className='text-xl font-extrabold text-[#001b3d]'>

                        Safety Performance

                    </h2>

                    <p className='mt-1 text-[12px] tracking-wide text-[#94a3b8]'>

                        Real-time compliance monitoring and risk assessment

                    </p>

                </div>

                <div className='flex gap-2'>

                </div>

            </div>

            <div className='grid grid-cols-5 gap-4'>

                {METRIC_CONFIG.map(function (config) {

                    const isSelected = config.key === selectedMetric;
                    const Icon = config.icon;

                    return (

                        <button
                            key={config.key}
                            onClick={function () {

                                setSelectedMetric(config.key);

                            }}
                            className={`relative flex flex-col items-start rounded-xl border p-4 text-left shadow-sm transition-colors ${
                                isSelected
                                    ? 'border-transparent bg-blue-600'
                                    : 'border-[#e2e8f0] bg-white hover:bg-slate-50'
                            }`}
                        >

                            {isSelected && (

                                <span className='absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white'>

                                    Focus

                                </span>

                            )}

                            <div
                                className={`mb-4 flex h-8 w-8 items-center justify-center rounded-lg ${
                                    isSelected
                                        ? 'bg-white/15 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >

                                <Icon sx={{ fontSize: 18 }} />

                            </div>

                            <p
                                className={`text-[13px] font-[900] ${
                                    isSelected ? 'text-white' : 'text-[#001b3d]'
                                }`}
                            >

                                {config.label}

                            </p>

                            <p
                                className={`mt-1 text-[11px] ${
                                    isSelected ? 'text-white/70' : 'text-slate-400'
                                }`}
                            >

                                {config.subtitle}

                            </p>

                        </button>

                    );

                })}

            </div>

            {/* SELECTED METRIC SUMMARY */}

            <div
                className='flex items-center gap-5 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm'
                style={{
                    background: `linear-gradient(90deg, ${selectedConfig.color}0d 0%, #ffffff 45%)`
                }}
            >

                <div
                    className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl'
                    style={{
                        backgroundColor: `${selectedConfig.color}1a`,
                        color: selectedConfig.color
                    }}
                >

                    <SelectedIcon sx={{ fontSize: 26 }} />

                </div>

                <div className='flex-1'>

                    <p className='text-[11px] font-black uppercase tracking-wide text-slate-400'>

                        {selectedConfig.subtitle}

                    </p>

                    <p className='mt-0.5 text-[16px] font-[900] text-[#001b3d]'>

                        {selectedConfig.label} Measure

                    </p>

                </div>

                <div
                    className='flex items-center gap-3 rounded-2xl px-6 py-3'
                    style={{
                        backgroundColor: `${selectedConfig.color}12`
                    }}
                >

                    <span
                        className='text-[28px] font-[900] leading-none'
                        style={{ color: selectedConfig.color }}
                    >

                        {selectedValue}

                    </span>

                </div>

            </div>

            {/* VIOLATION HISTORY */}

            <div
                id='comprehensive-log'
                ref={tableRef}
                className='overflow-hidden rounded-[24px] border border-[#e2e8f0] bg-white shadow-sm scroll-mt-6'
            >

                <div className='flex items-center justify-between border-b border-slate-100 px-8 py-6'>

                    <div className='flex items-center gap-3'>

                        <h3 className='text-[16px] font-[900] text-[#001b3d]'>

                            Violation History

                        </h3>

                        <span className='flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-600'>

                            <WarningAmber sx={{ fontSize: 14 }} />

                            {selectedConfig.shortLabel}: {totalCount}

                        </span>

                       

                    </div>

                    <button className='flex items-center gap-2 text-[12px] font-black text-[#001b3d] hover:text-blue-600'>

                        <FilterList
                            sx={{
                                fontSize: 18,
                                color: '#94a3b8'
                            }}
                        />

                        Safety Policy Guide

                    </button>

                </div>

                {visibleData && visibleData.length > 0 ? (
                    <>
                        <table className='w-full table-fixed'>

                            <thead className='border-b border-slate-100 bg-[#f8fafc]'>

                                <tr>

                                    <th className='w-[15%] px-8 py-5 text-left text-[11px] font-black text-slate-400'>
                                        Date
                                    </th>

                                    <th className='w-[15%] px-8 py-5 text-left text-[11px] font-black text-slate-400'>
                                        Code
                                    </th>

                                    <th className='w-[22%] px-8 py-5 text-left text-[11px] font-black text-slate-400'>
                                        Category
                                    </th>

                                    <th className='w-[28%] px-8 py-5 text-left text-[11px] font-black text-slate-400'>
                                        Description
                                    </th>

                                    <th className='w-[10%] px-8 py-5 text-center text-[11px] font-black text-slate-400'>
                                        OOS
                                    </th>

                                    <th className='w-[10%] px-8 py-5 text-center text-[11px] font-black text-slate-400'>
                                        Severity
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {visibleData.map(function (
                                    log,
                                    idx
                                ) {

                                    const severity =
                                        Math.round(
                                            Number(
                                                log?.severity_weight || 0
                                            )
                                        );

                                    const isOOS =
                                        log?.oos_violation === true ||
                                        log?.oos_violation === 'true' ||
                                        log?.oos_violation === 1;

                                    const category =
                                        decodeEntities(log?.basic_desc);

                                    const categoryStyle =
                                        CATEGORY_COLORS[
                                        category
                                        ] || {
                                            text: '#64748b',
                                            bg: '#f8fafc'
                                        };

                                    const descriptionText = log?.section_desc || '--';
                                    const isRowExpanded = !!expandedRows[idx];

                                    return (

                                        <tr
                                            key={idx}
                                            className='border-b border-slate-100 align-top'
                                        >

                                            <td className='px-8 py-6 text-[14px] font-bold text-[#475569] whitespace-nowrap'>

                                                {formatDate(log?.insp_date)}

                                            </td>

                                            <td className='px-8 py-6 text-[14px] font-[800] text-[#0f172a]'>

                                                {log?.viol_code || '--'}

                                            </td>

                                            <td className='px-8 py-6'>

                                                <span
                                                    style={{
                                                        color:
                                                            categoryStyle.text,

                                                        backgroundColor:
                                                            categoryStyle.bg
                                                    }}
                                                    className='rounded-lg px-3 py-1 text-[11px] font-black uppercase inline-block whitespace-normal break-words max-w-full leading-snug'
                                                >

                                                    {category || '--'}

                                                </span>

                                            </td>

                                            <td className='px-8 py-6 text-[13px] font-medium text-slate-500 break-words'>
                                                <div className={isRowExpanded ? "" : "line-clamp-2"}>
                                                    {descriptionText}
                                                </div>
                                                {descriptionText.length > 60 && (
                                                    <button
                                                        onClick={function () {
                                                            toggleRowDescription(idx);
                                                        }}
                                                        className='mt-1 text-[12px] font-black text-blue-600 hover:underline block'
                                                    >
                                                        {isRowExpanded ? 'Show less' : 'More'}
                                                    </button>
                                                )}
                                            </td>

                                            <td className='px-8 py-6 text-center'>

                                                {isOOS ? (

                                                    <CheckCircleOutlined
                                                        sx={{
                                                            color: '#10b981',
                                                            fontSize: 20
                                                        }}
                                                    />

                                                ) : (

                                                    <span className='text-[13px] font-bold text-slate-300'>

                                                        &mdash;

                                                    </span>

                                                )}

                                            </td>

                                            <td className='px-8 py-6 text-center text-[14px] font-black text-[#0f172a]'>

                                                {severity}

                                            </td>

                                        </tr>

                                    );

                                })}

                            </tbody>

                        </table>

                        <div className='flex items-center justify-center gap-6 border-t border-slate-100 py-5'>
                            {hasMore && (
                                <button
                                    onClick={function () {
                                        setVisibleCount(
                                            visibleCount + ROWS_PER_LOAD
                                        );
                                    }}
                                    className='flex items-center gap-2 text-[13px] font-black text-[#001b3d] hover:text-blue-600'
                                >
                                    Show {Math.min(ROWS_PER_LOAD, remainingCount)} more ({remainingCount} left of {totalCount})
                                    <ArrowForward sx={{ fontSize: 16 }} />
                                </button>
                            )}
                            
                            {visibleCount > ROWS_PER_LOAD && (
                                <button
                                    onClick={function () {
                                        setVisibleCount(ROWS_PER_LOAD);
                                        scrollToTable();
                                    }}
                                    className='text-[13px] font-black text-slate-400 hover:text-blue-600'
                                >
                                    Show less
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className='flex flex-col items-center justify-center border-t border-slate-100 py-10 text-center'>

                        <p className='text-[15px] font-[900] text-slate-700'>
                            No Logs Found
                        </p>

                        <p className='mt-1 text-[13px] text-slate-400'>
                            There are no {selectedConfig.label.toLowerCase()} violations recorded.
                        </p>

                    </div>
                )}

            </div>

        </div>

    );
}

export default Basics;