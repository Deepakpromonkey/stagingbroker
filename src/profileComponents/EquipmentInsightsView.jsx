import React, { useEffect, useMemo, useState } from 'react';

import {
    PhoneOutlined,
    EmailOutlined,
    ChevronLeftRounded,
    ChevronRightRounded,
    KeyboardArrowDownOutlined,
    KeyboardArrowUpOutlined
} from '@mui/icons-material';

import { apiFetch } from '../lib/api';

const PAGE_SIZE = 5;
const VIN_PREVIEW_COUNT = 5;

function isValidValue(value) {
    if (value === null || value === undefined) {
        return false;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
        return false;
    }
    return trimmed.toUpperCase() !== 'NULL';
}

function getAssociationIcon(iconKey) {
    switch (iconKey) {
        case 'phone':
            return (
                <div className='flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#eff6ff]'>
                    <PhoneOutlined className='!text-[13px] text-[#2563eb]' />
                </div>
            );
        case 'email':
            return (
                <div className='flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#eff6ff]'>
                    <EmailOutlined className='!text-[13px] text-[#2563eb]' />
                </div>
            );
        default:
            return null;
    }
}

function buildEquipmentCompanyCards(rawRows = []) {
    const companiesByKey = new Map();

    rawRows.forEach((row) => {
        if (!row || row.match_type !== 'VIN') {
            return;
        }

        const key = row.dot_number || row.legal_name;
        if (!key) {
            return;
        }

        if (!companiesByKey.has(key)) {
            companiesByKey.set(key, {
                company_name: isValidValue(row.legal_name) ? row.legal_name : 'NA',
                dba_name: isValidValue(row.dba_name) ? row.dba_name : null,
                dot_number: isValidValue(row.dot_number) ? row.dot_number : 'NA',
                matchCount: 0,
                vins: [],
                associations: []
            });
        }

        const entry = companiesByKey.get(key);
        entry.matchCount += 1;

        if (isValidValue(row.matched_vin) && !entry.vins.includes(row.matched_vin)) {
            entry.vins.push(row.matched_vin);
        }

        if (
            isValidValue(row.telephone) &&
            !entry.associations.some((a) => a.type === 'PHONE' && a.value === row.telephone)
        ) {
            entry.associations.push({
                type: 'PHONE',
                label: 'Contact Number',
                value: row.telephone,
                icon: 'phone'
            });
        }

        if (
            isValidValue(row.fax) &&
            !entry.associations.some((a) => a.type === 'FAX' && a.value === row.fax)
        ) {
            entry.associations.push({
                type: 'FAX',
                label: 'Fax Number',
                value: row.fax,
                icon: 'phone'
            });
        }

        if (
            isValidValue(row.email_address) &&
            !entry.associations.some((a) => a.type === 'EMAIL' && a.value === row.email_address)
        ) {
            entry.associations.push({
                type: 'EMAIL',
                label: 'Email Address',
                value: row.email_address,
                icon: 'email'
            });
        }
    });

    return Array.from(companiesByKey.values());
}


function extractPreloadedRows(data) {
    if (!data) return [];
    if (Array.isArray(data.vin_associations)) return data.vin_associations;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
}

function EquipmentInsightsView({ data = {}, dotNumber }) {

    const resolvedDotNumber = dotNumber || data?.dot_number;

    const [currentPage, setCurrentPage] = useState(1);

    const [rows, setRows] = useState([]);
    const [truncated, setTruncated] = useState(false);

    const [isLoading, setIsLoading] = useState(false);

    const [fetchError, setFetchError] = useState('');

    const [expandedVinKeys, setExpandedVinKeys] = useState({});

    useEffect(function () {

        const preloadedRows = extractPreloadedRows(data);

        if (preloadedRows.length > 0) {
            setRows(preloadedRows);
            setIsLoading(false);
            setFetchError('');
        }

    }, [data]);

useEffect(function () {

        const preloadedRows = extractPreloadedRows(data);

        if (preloadedRows.length > 0) {
            return;
        }

        if (!resolvedDotNumber) {
            setRows([]);
            setIsLoading(false);
            return;
        }

        const cacheKey = `equipment_insights_${resolvedDotNumber}`;

        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const parsedRows = JSON.parse(cached);
                // Only short-circuit on a cache that actually holds rows - see
                // the same guard in CompanyAssociationsView.
                if (Array.isArray(parsedRows) && parsedRows.length > 0) {
                    setRows(parsedRows);
                    setIsLoading(false);
                    setFetchError('');
                    return;
                }
                localStorage.removeItem(cacheKey);
            } catch (err) {
                console.error('Failed to parse cached equipment insights:', err);
                localStorage.removeItem(cacheKey);
            }
        }

        let cancelled = false;
        setIsLoading(true);
        setFetchError('');

        apiFetch(`/carrier/${resolvedDotNumber}/vin-association`)
            .then(function (result) {

                if (cancelled) return;

                // First candidate that is genuinely an array - `|| result` used
                // to fall through to the response envelope, a truthy object,
                // which then collapsed to [] and rendered nothing.
                const finalRows =
                    [result?.data, result?.records, result].find(Array.isArray) || [];

                setRows(finalRows);
                setTruncated(result?.truncated === true);

                // Never cache an empty result - it would suppress future fetches.
                if (finalRows.length > 0) {
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(finalRows));
                    } catch (err) {
                        console.error('Failed to cache equipment insights:', err);
                    }
                }

            })
            .catch(function (err) {

                console.error('EquipmentInsightsView fetch error:', err);

                if (!cancelled) {
                    setFetchError(err.message || 'Failed to load equipment associations.');
                    setRows([]);
                }

            })
            .finally(function () {

                if (!cancelled) {
                    setIsLoading(false);
                }

            });

        return function () {
            cancelled = true;
        };

    }, [resolvedDotNumber]);

    const companies = useMemo(function () {

        return buildEquipmentCompanyCards(rows);

    }, [rows]);

    const totalPages = Math.max(1, Math.ceil(companies.length / PAGE_SIZE));

    useEffect(function () {

        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }

    }, [totalPages, currentPage]);

    const paginatedCompanies = useMemo(function () {

        const start = (currentPage - 1) * PAGE_SIZE;
        return companies.slice(start, start + PAGE_SIZE);

    }, [companies, currentPage]);

    const toggleVinExpanded = function (key) {

        setExpandedVinKeys(function (prev) {
            return {
                ...prev,
                [key]: !prev[key]
            };
        });

    };

    return (

        <div className='space-y-[22px] bg-white p-[12px]'>

            <div className='space-y-[20px]'>

                <div className='flex items-center justify-between'>

                    <div className='space-y-[10px]'>

                        <h2 className='text-[13px] font-[600] text-[#111827]'>
                            Equipment Associations
                        </h2>

                        <div className='flex items-center gap-[10px]'>

                            <p className='text-[11px] font-[500] text-[#94a3b8]'>
                                DOT {resolvedDotNumber || 'NA'}
                            </p>

                        </div>

                    </div>

                </div>

                {isLoading ? (

                    <div className='space-y-[16px]'>
                        {[1, 2, 3].map(function (i) {
                            return (
                                <div
                                    key={i}
                                    className='animate-pulse rounded-[18px] border border-[#d9e1ee] bg-white px-[14px] py-[16px] lg:px-[20px] lg:py-[22px]'
                                >
                                    <div className='h-[16px] w-[220px] max-w-full rounded bg-[#e5e7eb]' />
                                    <div className='mt-[18px] grid grid-cols-1 gap-[14px] sm:grid-cols-3'>
                                        <div className='h-[64px] rounded-[14px] bg-[#f1f5f9]' />
                                        <div className='h-[64px] rounded-[14px] bg-[#f1f5f9]' />
                                        <div className='h-[64px] rounded-[14px] bg-[#f1f5f9]' />
                                    </div>
                                    <div className='mt-[16px] h-[80px] rounded-[14px] bg-[#f8fafc]' />
                                </div>
                            );
                        })}
                    </div>

                ) : fetchError ? (

                    <div className='rounded-[16px] border border-[#f0a5a5] bg-[#fcebeb] p-[24px] text-center lg:p-[40px]'>
                        <p className='text-[13px] font-[600] text-[#a32d2d]'>
                            {fetchError}
                        </p>
                    </div>

                ) : !paginatedCompanies.length ? (

                    <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[24px] text-center lg:p-[40px]'>

                        <p className='text-[13px] font-[600] text-[#94a3b8]'>
                            No Equipment Associations Found
                        </p>

                    </div>

                ) : (

                    paginatedCompanies.map(function (item, index) {

                        const cardKey = item.dot_number || index;
                        const isVinExpanded = !!expandedVinKeys[cardKey];
                        const visibleVins = isVinExpanded
                            ? item.vins
                            : item.vins.slice(0, VIN_PREVIEW_COUNT);
                        const hiddenVinCount = item.vins.length - VIN_PREVIEW_COUNT;

                        return (

                            <div
                                key={cardKey}
                                className='rounded-[18px] border border-[#d9e1ee] bg-white px-[14px] py-[16px] lg:px-[20px] lg:py-[22px]'
                            >

                                <div className='flex flex-col gap-[16px] lg:flex-row lg:items-start lg:justify-between lg:gap-[20px]'>

                                    <div>

                                        <h2 className='text-[16px] font-[700] uppercase leading-[24px] text-[#2563eb]'>
                                            {item.company_name}
                                        </h2>

                                        {item.dba_name && (
                                            <p className='mt-[4px] text-[11px] font-[600] uppercase text-[#94a3b8]'>
                                                DBA: {item.dba_name}
                                            </p>
                                        )}

                                    </div>

                                    <div className='flex items-center gap-[24px] lg:gap-[40px]'>

                                        <div>
                                            <p className='text-[9px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                                Matched VINs
                                            </p>
                                            <div className='mt-[5px] flex items-end gap-[5px]'>
                                                <h3 className='text-[16px] font-[700] text-[#111827]'>
                                                    {item.matchCount}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className='h-[42px] w-[1px] bg-[#e5e7eb]' />

                                        <div>
                                            <p className='text-[9px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                                DOT Number
                                            </p>
                                            <div className='mt-[5px] flex items-end gap-[5px]'>
                                                <h3 className='text-[16px] font-[700] text-[#111827]'>
                                                    {item.dot_number}
                                                </h3>
                                            </div>
                                        </div>

                                    </div>

                                </div>

                                {item.vins.length > 0 && (

                                    <div className='mt-[16px] overflow-hidden rounded-[14px] border border-[#e5e7eb]'>

                                        <div className='flex items-center justify-between bg-[#f8fafc] px-[14px] py-[10px] lg:px-[20px]'>
                                            <p className='text-[9px] font-[700] uppercase tracking-[1px] text-[#94a3b8]'>
                                                VIN Number
                                            </p>
                                            <p className='text-[9px] font-[700] uppercase tracking-[1px] text-[#94a3b8]'>
                                                {item.vins.length} Total
                                            </p>
                                        </div>

                                        {visibleVins.map(function (vin, idx) {
                                            return (
                                                <div
                                                    key={idx}
                                                    className='flex items-center justify-between gap-[10px] border-t border-[#eef2f7] px-[14px] py-[10px] lg:px-[20px]'
                                                >
                                                    <span className='truncate text-[12px] font-[600] tracking-wide text-[#111827]'>
                                                        {vin}
                                                    </span>
                                                    <div className='shrink-0 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-[10px] py-[3px] text-[9px] font-[700] text-[#2563eb]'>
                                                        VIN
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {item.vins.length > VIN_PREVIEW_COUNT && (
                                            <div className='flex justify-center border-t border-[#eef2f7] py-[10px]'>
                                                <button
                                                    onClick={function () {
                                                        toggleVinExpanded(cardKey);
                                                    }}
                                                    className='flex items-center gap-[6px] rounded-[10px] px-[14px] py-[5px] text-[11px] font-[700] text-[#2563eb] transition-all hover:bg-[#eff6ff]'
                                                >
                                                    {isVinExpanded
                                                        ? 'Show Less'
                                                        : `Show More (${hiddenVinCount})`}

                                                    {isVinExpanded ? (
                                                        <KeyboardArrowUpOutlined className='!text-[15px]' />
                                                    ) : (
                                                        <KeyboardArrowDownOutlined className='!text-[15px]' />
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                    </div>

                                )}

                                <div className='mt-[16px] overflow-hidden rounded-[14px] border border-[#e5e7eb]'>

                                    <div className='hidden bg-[#f8fafc] px-[28px] py-[10px] sm:grid sm:grid-cols-12'>
                                        <div className='col-span-3'>
                                            <p className='text-[9px] font-[700] uppercase tracking-[1px] text-[#94a3b8]'>
                                                Association Type
                                            </p>
                                        </div>
                                        <div className='col-span-7'>
                                            <p className='text-[9px] font-[700] uppercase tracking-[1px] text-[#94a3b8]'>
                                                Entity Value
                                            </p>
                                        </div>
                                        <div className='col-span-2 flex'>
                                            <p className='text-[9px] font-[700] uppercase tracking-[1px] text-[#94a3b8]'>
                                                Match Type
                                            </p>
                                        </div>
                                    </div>

                                    {!item.associations.length ? (

                                        <div className='flex items-center justify-center border-t border-[#eef2f7] py-[22px]'>
                                            <p className='text-[12px] font-[600] text-[#94a3b8]'>
                                                No Contact Data Found
                                            </p>
                                        </div>

                                    ) : (

                                        item.associations.map(function (row, idx) {

                                            return (

                                                <div
                                                    key={idx}
                                                    className='flex flex-col gap-[10px] border-t border-[#eef2f7] px-[14px] py-[12px] sm:grid sm:grid-cols-12 sm:items-center sm:gap-0 sm:px-[28px] sm:py-[14px]'
                                                >
                                                    <div className='flex items-center gap-[10px] sm:col-span-3'>
                                                        {getAssociationIcon(row.icon)}
                                                        <span className='text-[12px] font-[600] text-[#111827]'>
                                                            {row.label}
                                                        </span>
                                                    </div>

                                                    <div className='pl-[30px] sm:col-span-7 sm:pl-0'>
                                                        <p className='break-words text-[12px] font-[500] text-[#334155]'>
                                                            {row.value}
                                                        </p>
                                                    </div>

                                                    <div className='pl-[30px] sm:col-span-2 sm:flex sm:pl-0'>
                                                        <div className='inline-block rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-[10px] py-[4px] text-[9px] font-[700] text-[#2563eb]'>
                                                            VIN
                                                        </div>
                                                    </div>
                                                </div>

                                            );

                                        })

                                    )}

                                </div>

                            </div>

                        );

                    })

                )}

                {truncated && (
                    <p className='text-center text-[10px] text-[#94a3b8]'>
                        This carrier shares vehicles with more companies than can
                        be shown. Showing the strongest matches.
                    </p>
                )}

                {totalPages > 1 && (

                    <div className='flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between'>

                        <p className='text-[11px] font-[600] text-[#94a3b8]'>
                            Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                            {Math.min(currentPage * PAGE_SIZE, companies.length)} of {companies.length}
                        </p>

                        <div className='flex items-center justify-end gap-[10px] sm:justify-start'>

                            <button
                                onClick={function () {
                                    setCurrentPage(function (page) {
                                        return Math.max(1, page - 1);
                                    });
                                }}
                                disabled={currentPage === 1}
                                className='flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#d9e1ee] bg-white text-[#64748b] transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f8fafc]'
                            >
                                <ChevronLeftRounded className='!text-[18px]' />
                            </button>

                            <span className='text-[11px] font-[700] text-[#111827]'>
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={function () {
                                    setCurrentPage(function (page) {
                                        return Math.min(totalPages, page + 1);
                                    });
                                }}
                                disabled={currentPage === totalPages}
                                className='flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#d9e1ee] bg-white text-[#64748b] transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f8fafc]'
                            >
                                <ChevronRightRounded className='!text-[18px]' />
                            </button>

                        </div>

                    </div>

                )}

            </div>

        </div>

    );
}

export default EquipmentInsightsView;