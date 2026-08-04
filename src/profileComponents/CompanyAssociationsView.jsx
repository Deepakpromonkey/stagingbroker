import React, { useEffect, useMemo, useState } from 'react';
import {
    LocationOnOutlined,
    PhoneOutlined,
    EmailOutlined,
    ChevronLeftRounded,
    ChevronRightRounded
} from '@mui/icons-material';

import { apiFetch } from '../lib/api';

const PAGE_SIZE = 5;

const ASSOCIATION_TYPE_CONFIG = {
    PHONE: {
        label: 'Contact Number',
        field: 'telephone',
        icon: 'phone',
        filter: 'PHONE'
    },
    FAX: {
        label: 'Fax Number',
        field: 'fax',
        icon: 'phone',
        filter: 'FAX'
    },
    EMAIL: {
        label: 'Email Address',
        field: 'email_address',
        icon: 'email',
        filter: 'EMAIL'
    },
    // The API matches on address in its WHERE clause but never SELECTs the
    // address columns, so `field` is absent on these rows. `sharedKey` points at
    // the profiled carrier's own address, which is by definition the value that
    // matched. Without this the rows were silently dropped and the panel showed
    // "no data found" despite a successful response.
    'MAILING ADDRESS': {
        label: 'Mailing Address',
        field: 'mailing_address',
        sharedKey: 'mailing',
        icon: 'address',
        filter: 'ADDRESS'
    },
    'PHYSICAL ADDRESS': {
        label: 'Physical Address',
        field: 'physical_address',
        sharedKey: 'physical',
        icon: 'address',
        filter: 'ADDRESS'
    }
};

function formatAddress(address) {
    if (!address || typeof address !== 'object') {
        return '';
    }
    return [address.street, address.city, address.state, address.zip]
        .filter(isValidValue)
        .join(', ');
}

const FILTERS = [
    { label: 'See All', value: 'ALL' },
    { label: 'Address', value: 'ADDRESS' },
    { label: 'Email', value: 'EMAIL' },
    { label: 'Contact', value: 'PHONE' },
    { label: 'Fax', value: 'FAX' }
];

function getAssociationIcon(iconKey) {
    switch (iconKey) {
        case 'address':
            return (
                <div className='flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#eff6ff]'>
                    <LocationOnOutlined className='!text-[13px] text-[#2563eb]' />
                </div>
            );
        case 'phone':
            return (
                <div className='flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#eff6ff]'>
                    <PhoneOutlined className='!text-[13px] text-[#2563eb]' />
                </div>
            );
        case 'email':
            return (
                <div className='flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#eff6ff]'>
                    <EmailOutlined className='!text-[13px] text-[#2563eb]' />
                </div>
            );
        default:
            return null;
    }
}

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

function buildCompanyCards(rawRows = [], sharedAddresses = {}) {
    const companiesByKey = new Map();

    rawRows.forEach((row) => {
        const config = ASSOCIATION_TYPE_CONFIG[row.match_type];
        if (!config) {
            return;
        }

        // Prefer the value on the row; fall back to the profiled carrier's own
        // address for match types the API does not send a value for.
        let value = row[config.field];

        if (!isValidValue(value) && config.sharedKey) {
            value = sharedAddresses[config.sharedKey];
        }

        if (!isValidValue(value)) {
            // Still keep address matches visible - the match itself is the
            // finding, even when we cannot render the exact string.
            if (!config.sharedKey) {
                return;
            }
            value = 'Same as this carrier';
        }

        const key = row.dot_number || row.legal_name;

        if (!companiesByKey.has(key)) {
            companiesByKey.set(key, {
                company_name: row.legal_name,
                dba_name: isValidValue(row.dba_name) ? row.dba_name : null,
                dot_number: row.dot_number,
                mc_number: row.mc_number || null,
                duns_number: row.duns_number || null,
                annual_mileage: row.annual_mileage || null,
                fleet_size: row.fleet_size || null,
                associations: []
            });
        }

        companiesByKey.get(key).associations.push({
            type: config.filter,
            label: config.label,
            value,
            period: row.observation_period || '--',
            icon: config.icon
        });
    });

    return Array.from(companiesByKey.values());
}

function CompanyAssociationsView({ dotNumber, data, physicalAddress, mailingAddress }) {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (data && data.length > 0) {
            setRows(data);
            setIsLoading(false);
            setFetchError('');
        }
    }, [data]);

useEffect(() => {
        if (data && data.length > 0) {
            return;
        }

        if (!dotNumber) {
            setRows([]);
            setIsLoading(false);
            return;
        }

        const cacheKey = `company_associations_${dotNumber}`;

        // 1. Check localStorage first
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const parsedRows = JSON.parse(cached);
                // Only short-circuit on a cache that actually holds rows. An
                // empty array used to be treated as a valid hit, which meant one
                // failed response permanently stopped this component from ever
                // calling the API again.
                if (Array.isArray(parsedRows) && parsedRows.length > 0) {
                    setRows(parsedRows);
                    setIsLoading(false);
                    setFetchError('');
                    return; // no API call
                }
                localStorage.removeItem(cacheKey);
            } catch (err) {
                console.error('Failed to parse cached associations:', err);
                localStorage.removeItem(cacheKey);
                // falls through to fetch fresh data below
            }
        }

        let cancelled = false;
        setIsLoading(true);
        setFetchError('');

        apiFetch(`/carriers/${dotNumber}/associations`)
            .then((result) => {
                if (cancelled) return;

                // Take the first candidate that is genuinely an array - the old
                // `a || b || result` chain fell through to the response envelope
                // itself, which is a truthy object, and silently became [].
                const finalRows =
                    [result?.data, result?.records, result].find(Array.isArray) || [];

                setRows(finalRows);

                // 2. Cache it so next visit skips the API. Never cache an empty
                // result - that would suppress every future fetch.
                if (finalRows.length > 0) {
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(finalRows));
                    } catch (err) {
                        console.error('Failed to cache associations:', err);
                    }
                }
            })
            .catch((err) => {
                console.error('CompanyAssociationsView fetch error:', err);
                if (!cancelled) {
                    setFetchError(err.message || 'Failed to load company associations.');
                    setRows([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return function () {
            cancelled = true;
        };
    }, [dotNumber, data]);

    const sharedAddresses = useMemo(() => ({
        physical: formatAddress(physicalAddress),
        mailing: formatAddress(mailingAddress)
    }), [physicalAddress, mailingAddress]);

    const companies = useMemo(
        () => buildCompanyCards(rows, sharedAddresses),
        [rows, sharedAddresses]
    );

  
    const filteredCompanies = useMemo(() => {
        if (activeFilter === 'ALL') {
            return companies;
        }
        return companies.filter((company) =>
            company.associations.some((item) => item.type === activeFilter)
        );
    }, [companies, activeFilter]);

    const filterCounts = useMemo(() => {
        const counts = { ALL: companies.length };

        FILTERS.forEach((item) => {
            if (item.value === 'ALL') {
                return;
            }
            counts[item.value] = companies.filter((company) =>
                company.associations.some((assoc) => assoc.type === item.value)
            ).length;
        });

        return counts;
    }, [companies]);

    const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);


    useEffect(() => {
        setCurrentPage(1);
    }, [activeFilter]);

    const paginatedCompanies = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredCompanies.slice(start, start + PAGE_SIZE);
    }, [filteredCompanies, currentPage]);

    const getFilteredAssociations = (associations = []) => {
        if (activeFilter === 'ALL') {
            return associations;
        }
        return associations.filter((item) => item.type === activeFilter);
    };

    if (isLoading) {
        return (
            <div className='space-y-[16px]'>
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className='animate-pulse rounded-[18px] border border-[#d9e1ee] bg-white px-[20px] py-[22px]'
                    >
                        <div className='h-[16px] w-[220px] rounded bg-[#e5e7eb]' />
                        <div className='mt-[18px] grid grid-cols-3 gap-[14px]'>
                            <div className='h-[64px] rounded-[14px] bg-[#f1f5f9]' />
                            <div className='h-[64px] rounded-[14px] bg-[#f1f5f9]' />
                            <div className='h-[64px] rounded-[14px] bg-[#f1f5f9]' />
                        </div>
                        <div className='mt-[16px] h-[80px] rounded-[14px] bg-[#f8fafc]' />
                    </div>
                ))}
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className='rounded-[16px] border border-[#f0a5a5] bg-[#fcebeb] p-[40px] text-center'>
                <p className='text-[13px] font-[600] text-[#a32d2d]'>
                    {fetchError}
                </p>
            </div>
        );
    }

    if (!companies.length) {
        return (
            <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[40px] text-center'>
                <p className='text-[13px] font-[600] text-[#94a3b8]'>
                    No Data Found
                </p>
            </div>
        );
    }

    return (
        <div className='space-y-[20px]'>
            <div className='flex items-center justify-between'>
                <h2 className='text-[13px] font-[600] text-[#111827]'>
                    Company Associations
                </h2>

                <div className='flex items-center gap-[8px] pt-[8px]'>
    {FILTERS.map((item) => {
        const count = filterCounts[item.value] || 0;

        return (
            <button
                key={item.value}
                onClick={() => setActiveFilter(item.value)}
                className={`relative rounded-[8px] border px-[16px] py-[8px] text-[10px] font-[600] transition-all ${
                    activeFilter === item.value
                        ? 'bg-[#2563eb] border-[#2563eb] text-white'
                        : 'bg-white border-[#d9e1ee] text-[#64748b] hover:bg-[#f8fafc]'
                }`}
            >
                {item.label}

                {count > 0 && (
                    <span
                        className={`absolute -top-[8px] -right-[8px] flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-[4px] text-[9px] font-[700] leading-none text-white ${
                            activeFilter === item.value
                                ? 'bg-[#dc2626] ring-2 ring-white'
                                : 'bg-[#dc2626] ring-2 ring-white'
                        }`}
                    >
                        {count}
                    </span>
                )}
            </button>
        );
    })}
</div>
            </div>

            {!filteredCompanies.length ? (
                <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[40px] text-center'>
                    <p className='text-[13px] font-[600] text-[#94a3b8]'>
                        {activeFilter === 'EMAIL'
                            ? 'No Email Found'
                            : activeFilter === 'PHONE'
                            ? 'No Contact Numbers Found'
                            : activeFilter === 'FAX'
                            ? 'No Fax Numbers Found'
                            : activeFilter === 'ADDRESS'
                            ? 'No Address Found'
                            : 'No Data Found'}
                    </p>
                </div>
            ) : (
                paginatedCompanies.map((company, index) => {
                    const associationRows = getFilteredAssociations(company.associations);

                    return (
                        <div
                            key={company.dot_number || index}
                            className='rounded-[18px] border border-[#d9e1ee] bg-white px-[20px] py-[22px]'
                        >
                            <div className='flex items-start justify-between gap-[20px]'>
                                <div>
                                    <h2 className='text-[16px] font-[700] uppercase leading-[24px] text-[#2563eb]'>
                                        {company.company_name}
                                    </h2>
                                    {company.dba_name && (
                                        <p className='mt-[4px] text-[11px] font-[600] uppercase text-[#94a3b8]'>
                                            DBA: {company.dba_name}
                                        </p>
                                    )}
                                </div>

                                <div className='flex items-center gap-[40px]'>
                                    <div>
                                        <p className='text-[9px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                            Annual Mileage
                                        </p>
                                        <div className='mt-[5px] flex items-end gap-[5px]'>
                                            <h3 className='text-[16px] font-[700] text-[#111827]'>
                                                {company.annual_mileage || '--'}
                                            </h3>
                                            <span className='mb-[1px] text-[9px] font-[600] uppercase text-[#94a3b8]'>
                                                MI
                                            </span>
                                        </div>
                                    </div>

                                    <div className='h-[42px] w-[1px] bg-[#e5e7eb]' />

                                    <div>
                                        <p className='text-[9px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                            Fleet Size
                                        </p>
                                        <div className='mt-[5px] flex items-end gap-[5px]'>
                                            <h3 className='text-[16px] font-[700] text-[#111827]'>
                                                {company.fleet_size || '--'}
                                            </h3>
                                            <span className='mb-[1px] text-[9px] font-[600] uppercase text-[#94a3b8]'>
                                                UNIT
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='mt-[22px] grid grid-cols-3 gap-[14px]'>
                                <div className='rounded-[14px] border border-[#e5e7eb] bg-white px-[16px] py-[14px]'>
                                    <p className='text-[10px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                        MC NUMBER
                                    </p>
                                    <h3 className='mt-[8px] text-[22px] font-[700] text-[#111827]'>
                                        {company.mc_number || '--'}
                                    </h3>
                                </div>

                                <div className='rounded-[14px] border border-[#e5e7eb] bg-white px-[16px] py-[14px]'>
                                    <p className='text-[10px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                        DOT NUMBER
                                    </p>
                                    <h3 className='mt-[8px] text-[22px] font-[700] text-[#111827]'>
                                        {company.dot_number || '--'}
                                    </h3>
                                </div>

                                <div className='rounded-[14px] border border-[#e5e7eb] bg-white px-[16px] py-[14px]'>
                                    <p className='text-[10px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                        DUNS NUMBER
                                    </p>
                                    <h3 className='mt-[8px] text-[22px] font-[700] text-[#111827]'>
                                        {company.duns_number || '--'}
                                    </h3>
                                </div>
                            </div>

                            <div className='mt-[16px] overflow-hidden rounded-[14px] border border-[#e5e7eb]'>
                                <div className='grid grid-cols-12 bg-[#f8fafc] px-[28px] py-[10px]'>
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

                                </div>

                                {associationRows.map((row, idx) => (
                                    <div
                                        key={idx}
                                        className='grid grid-cols-12 items-center border-t border-[#eef2f7] px-[28px] py-[14px]'
                                    >
                                        <div className='col-span-3 flex items-center gap-[10px]'>
                                            {getAssociationIcon(row.icon)}
                                            <span className='text-[12px] font-[600] text-[#111827]'>
                                                {row.label}
                                            </span>
                                        </div>

                                        <div className='col-span-7'>
                                            <p className='text-[12px] font-[500] text-[#334155]'>
                                                {row.value}
                                            </p>
                                        </div>


                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })
            )}

            {totalPages > 1 && filteredCompanies.length > 0 && (
                <div className='flex items-center justify-between'>
                    <p className='text-[11px] font-[600] text-[#94a3b8]'>
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                        {Math.min(currentPage * PAGE_SIZE, filteredCompanies.length)} of {filteredCompanies.length}
                    </p>

                    <div className='flex items-center gap-[10px]'>
                        <button
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            disabled={currentPage === 1}
                            className='flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#d9e1ee] bg-white text-[#64748b] transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f8fafc]'
                        >
                            <ChevronLeftRounded className='!text-[18px]' />
                        </button>

                        <span className='text-[11px] font-[700] text-[#111827]'>
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            disabled={currentPage === totalPages}
                            className='flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#d9e1ee] bg-white text-[#64748b] transition-all disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:bg-[#f8fafc]'
                        >
                            <ChevronRightRounded className='!text-[18px]' />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CompanyAssociationsView;