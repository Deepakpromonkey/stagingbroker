import React, { useEffect, useMemo, useState } from 'react';
import {
    LocationOnOutlined,
    PhoneOutlined,
    EmailOutlined,
    BadgeOutlined,
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
    // `matched_value` carries the shared address and the API now selects the
    // other carrier's own as well, so `field` resolves. `sharedKey` stays as the
    // last fallback - it points at the profiled carrier's own address, which is
    // by definition the value that matched. Without it these rows were silently
    // dropped and the panel showed "no data found" on a successful response.
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
    },
    'LEGAL NAME': {
        label: 'Legal Name',
        field: 'legal_name',
        icon: 'name',
        filter: 'NAME'
    },
    'DBA NAME': {
        label: 'DBA Name',
        field: 'dba_name',
        icon: 'name',
        filter: 'NAME'
    },

    /*
    | Matches against details this carrier used to be reachable on, from the
    | FMCSA change log. A carrier that shares a phone number it dropped last
    | year with whoever answers it now is the same finding as sharing one
    | today, and the only one a current-values query cannot see. Every one of
    | these rows carries `matched_value` — the former detail that produced the
    | hit — so the panel can name it.
    */
    'FORMER EMAIL': {
        label: 'Former Email',
        field: 'email_address',
        icon: 'email',
        filter: 'EMAIL',
        former: true
    },
    'FORMER PHONE': {
        label: 'Former Contact Number',
        field: 'telephone',
        icon: 'phone',
        filter: 'PHONE',
        former: true
    },
    'FORMER FAX': {
        label: 'Former Fax Number',
        field: 'fax',
        icon: 'phone',
        filter: 'FAX',
        former: true
    },
    'FORMER LEGAL NAME': {
        label: 'Former Legal Name',
        field: 'legal_name',
        icon: 'name',
        filter: 'NAME',
        former: true
    },
    'FORMER DBA NAME': {
        label: 'Former DBA Name',
        field: 'dba_name',
        icon: 'name',
        filter: 'NAME',
        former: true
    },
    'FORMER PHYSICAL ADDRESS': {
        label: 'Former Physical Address',
        icon: 'address',
        filter: 'ADDRESS',
        former: true
    },
    'FORMER MAILING ADDRESS': {
        label: 'Former Mailing Address',
        icon: 'address',
        filter: 'ADDRESS',
        former: true
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
    { label: 'Fax', value: 'FAX' },
    { label: 'Name', value: 'NAME' },
    { label: 'Former Details', value: 'FORMER' }
];

/** 'FORMER' cuts across the type filters rather than being one of them. */
function matchesFilter(association, filter) {
    if (filter === 'ALL') {
        return true;
    }

    if (filter === 'FORMER') {
        return association.former === true;
    }

    return association.type === filter;
}

function getAssociationIcon(iconKey) {
    switch (iconKey) {
        case 'address':
            return (
                <div className='flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#eff6ff]'>
                    <LocationOnOutlined className='!text-[13px] text-[#2563eb]' />
                </div>
            );
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
        case 'name':
            return (
                <div className='flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-[#eff6ff]'>
                    <BadgeOutlined className='!text-[13px] text-[#2563eb]' />
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

        // `matched_value` is what the two carriers actually share, and the only
        // source for a former detail — the other carrier's current columns hold
        // whatever they use today, which is not what produced the match.
        let value = isValidValue(row.matched_value)
            ? row.matched_value
            : row[config.field];

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
                // The carrier's own details, independent of what matched. A
                // profile is being read to decide whether these two companies
                // are the same operation, and that needs who they are and how
                // to reach them - not only the single field that collided.
                contact: {
                    email: isValidValue(row.email_address) ? row.email_address : null,
                    telephone: isValidValue(row.telephone) ? row.telephone : null,
                    fax: isValidValue(row.fax) ? row.fax : null,
                    physical_address: isValidValue(row.physical_address) ? row.physical_address : null,
                    mailing_address: isValidValue(row.mailing_address) ? row.mailing_address : null
                },
                associations: []
            });
        }

        companiesByKey.get(key).associations.push({
            type: config.filter,
            label: config.label,
            former: config.former === true,
            value,
            period: row.observation_period || '--',
            icon: config.icon
        });
    });

    return Array.from(companiesByKey.values());
}

const CONTACT_FIELDS = [
    { key: 'email', label: 'Email', icon: 'email' },
    { key: 'telephone', label: 'Contact Number', icon: 'phone' },
    { key: 'fax', label: 'Fax', icon: 'phone' },
    { key: 'physical_address', label: 'Physical Address', icon: 'address' },
    { key: 'mailing_address', label: 'Mailing Address', icon: 'address' }
];

function CompanyContactDetails({ contact }) {
    const fields = CONTACT_FIELDS.filter((item) => isValidValue(contact?.[item.key]));

    if (!fields.length) {
        return null;
    }

    return (
        <div className='mt-[16px] rounded-[14px] border border-[#e5e7eb] bg-[#fbfdff] px-[16px] py-[14px]'>
            <p className='text-[9px] font-[700] uppercase tracking-[1px] text-[#94a3b8]'>
                Company Details
            </p>

            <div className='mt-[12px] grid grid-cols-1 gap-[12px] sm:grid-cols-2'>
                {fields.map((item) => (
                    <div key={item.key} className='flex items-start gap-[10px]'>
                        {getAssociationIcon(item.icon)}
                        <div className='min-w-0'>
                            <p className='text-[9px] font-[600] uppercase tracking-[0.8px] text-[#94a3b8]'>
                                {item.label}
                            </p>
                            <p className='mt-[2px] break-words text-[12px] font-[500] text-[#334155]'>
                                {contact[item.key]}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CompanyAssociationsView({ dotNumber, data, physicalAddress, mailingAddress }) {
    const [activeFilter, setActiveFilter] = useState('ALL');
    const [rows, setRows] = useState([]);
    const [truncated, setTruncated] = useState(false);
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

        // Versioned: the cache has no expiry, so anyone who had already viewed
        // a carrier would otherwise keep the pre-change-log rows forever.
        const cacheKey = `company_associations_v3_${dotNumber}`;

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
                setTruncated(result?.truncated === true);

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
            company.associations.some((item) => matchesFilter(item, activeFilter))
        );
    }, [companies, activeFilter]);

    const filterCounts = useMemo(() => {
        const counts = { ALL: companies.length };

        FILTERS.forEach((item) => {
            if (item.value === 'ALL') {
                return;
            }
            counts[item.value] = companies.filter((company) =>
                company.associations.some((assoc) => matchesFilter(assoc, item.value))
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

    const getFilteredAssociations = (associations = []) =>
        associations.filter((item) => matchesFilter(item, activeFilter));

    if (isLoading) {
        return (
            <div className='space-y-[16px]'>
                {[1, 2, 3].map((i) => (
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
                ))}
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className='rounded-[16px] border border-[#f0a5a5] bg-[#fcebeb] p-[24px] text-center lg:p-[40px]'>
                <p className='text-[13px] font-[600] text-[#a32d2d]'>
                    {fetchError}
                </p>
            </div>
        );
    }

    if (!companies.length) {
        return (
            <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[24px] text-center lg:p-[40px]'>
                <p className='text-[13px] font-[600] text-[#94a3b8]'>
                    No Data Found
                </p>
            </div>
        );
    }

    return (
        <div className='space-y-[20px]'>
            <div className='flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between'>
                <h2 className='text-[13px] font-[600] text-[#111827]'>
                    Company Associations
                </h2>

                <div className='flex flex-wrap items-center gap-[8px] lg:pt-[8px]'>
    {FILTERS.map((item) => {
        const count = filterCounts[item.value] || 0;

        return (
            <button
                key={item.value}
                onClick={() => setActiveFilter(item.value)}
                className={`relative rounded-[8px] border px-[12px] py-[7px] text-[10px] font-[600] transition-all lg:px-[16px] lg:py-[8px] ${
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
                <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[24px] text-center lg:p-[40px]'>
                    <p className='text-[13px] font-[600] text-[#94a3b8]'>
                        {activeFilter === 'EMAIL'
                            ? 'No Email Found'
                            : activeFilter === 'PHONE'
                            ? 'No Contact Numbers Found'
                            : activeFilter === 'FAX'
                            ? 'No Fax Numbers Found'
                            : activeFilter === 'ADDRESS'
                            ? 'No Address Found'
                            : activeFilter === 'NAME'
                            ? 'No Shared Names Found'
                            : activeFilter === 'FORMER'
                            ? 'No Former Details Shared With Other Carriers'
                            : 'No Data Found'}
                    </p>
                </div>
            ) : (
                paginatedCompanies.map((company, index) => {
                    const associationRows = getFilteredAssociations(company.associations);

                    return (
                        <div
                            key={company.dot_number || index}
                            className='rounded-[18px] border border-[#d9e1ee] bg-white px-[14px] py-[16px] lg:px-[20px] lg:py-[22px]'
                        >
                            <div className='flex flex-col gap-[16px] lg:flex-row lg:items-start lg:justify-between lg:gap-[20px]'>
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

                                <div className='flex items-center gap-[24px] lg:gap-[40px]'>
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

                            <div className='mt-[22px] grid grid-cols-1 gap-[14px] sm:grid-cols-3'>
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

                            <CompanyContactDetails contact={company.contact} />

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

                                </div>

                                {associationRows.map((row, idx) => (
                                    <div
                                        key={idx}
                                        className='flex flex-col gap-[6px] border-t border-[#eef2f7] px-[14px] py-[12px] sm:grid sm:grid-cols-12 sm:items-center sm:gap-0 sm:px-[28px] sm:py-[14px]'
                                    >
                                        <div className='flex items-center gap-[10px] sm:col-span-3'>
                                            {getAssociationIcon(row.icon)}
                                            <span className='text-[12px] font-[600] text-[#111827]'>
                                                {row.label}
                                            </span>
                                            {row.former && (
                                                <span className='rounded-full bg-[#fef3c7] px-[7px] py-[2px] text-[8px] font-[700] uppercase tracking-[0.5px] text-[#92400e]'>
                                                    No longer used
                                                </span>
                                            )}
                                        </div>

                                        <div className='pl-[30px] sm:col-span-7 sm:pl-0'>
                                            <p className='break-words text-[12px] font-[500] text-[#334155]'>
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

            {truncated && (
                <p className='text-center text-[10px] text-[#94a3b8]'>
                    This carrier shares details with more companies than can be
                    shown. Showing the strongest matches.
                </p>
            )}

            {totalPages > 1 && filteredCompanies.length > 0 && (
                <div className='flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between'>
                    <p className='text-[11px] font-[600] text-[#94a3b8]'>
                        Showing {(currentPage - 1) * PAGE_SIZE + 1}-
                        {Math.min(currentPage * PAGE_SIZE, filteredCompanies.length)} of {filteredCompanies.length}
                    </p>

                    <div className='flex items-center justify-end gap-[10px] sm:justify-start'>
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