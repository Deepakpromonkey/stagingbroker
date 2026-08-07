import React, { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

import LocationOn from '@mui/icons-material/LocationOn';
import Phone from '@mui/icons-material/Phone';
import Email from '@mui/icons-material/Email';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';

import CarrierCard from '../../../components/CarrierCards';
import SearchOverlay from '../../../components/SearchOverlay';

import { useNavigate, useSearchParams } from 'react-router-dom';

import { apiFetch } from '../../../lib/api';

const DEFAULT_FILTERS = {
    authority_active: false,
    authority_inactive: false,
    type_interstate: false,
    type_intrastate: false,
    authority_verified: false,
    insurance_current: false,
    risk_low: false,
    risk_medium: false,
    risk_high: false,
    fleet_min: '',
    fleet_max: ''
};

const SEARCH_TYPES = ['mc', 'dot', 'company', 'phone', 'address', 'email', 'ein'];

const SEARCH_PARAM_MAP = {
    mc: 'mc_number',
    dot: 'dot_number',
    company: 'legal_name',
    phone: 'phone',
    address: 'address',
    email: 'email',
    ein: 'ein',
};

const SEARCH_ENDPOINT = '/carrier/search';

const HOW_TO_USE_ROWS = [
    [
        { label: 'MC', desc: "Search by the carrier's MC number." },
        { label: 'DOT', desc: "Search by the carrier's USDOT number." },
        { label: 'Company', desc: 'Search using the company name.' }
    ],
    [
        { label: 'Phone', desc: 'Search using the registered phone number.' },
        { label: 'Address', desc: 'Search using the registered address.' },
        { label: 'Email', desc: 'Search using the registered email address.' }
    ]
];

function CarrierCardSkeleton() {

    return (

        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">

            <Skeleton variant="text" width="40%" height={24} />
            <Skeleton variant="text" width="60%" height={20} />

            <Skeleton variant="rectangular" height={80} className="rounded-lg" />

            <div className="flex gap-3">

                <Skeleton variant="text" width="20%" />
                <Skeleton variant="text" width="20%" />

            </div>

        </div>
    );
}

function Pagination(props) {

    const currentPage = props.currentPage;
    const lastPage = props.lastPage;
    const onPrev = props.onPrev;
    const onNext = props.onNext;

    if (lastPage <= 1) return null;

    const iconButtonClass =
        'w-[36px] h-[36px] flex items-center justify-center rounded-full text-[#4b5563] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f1f5f9] transition-colors';

    return (

        <div className='flex items-center justify-center gap-[18px] py-[6px]'>

            <button
                onClick={onPrev}
                disabled={currentPage === 1}
                aria-label='Previous page'
                className={iconButtonClass}
            >
                <ChevronLeft className='!text-[20px]' />
            </button>

            <span className='text-[13px] text-[#6b7280] font-[500]'>
                Page <span className='text-[#111827] font-[700]'>{currentPage}</span> of {lastPage.toLocaleString()}
            </span>

            <button
                onClick={onNext}
                disabled={currentPage === lastPage}
                aria-label='Next page'
                className={iconButtonClass}
            >
                <ChevronRight className='!text-[20px]' />
            </button>

        </div>
    );
}
function ResultsFooter(props) {

    const currentPage = props.currentPage;
    const lastPage = props.lastPage;
    const onPrev = props.onPrev;
    const onNext = props.onNext;
    const onPageSelect = props.onPageSelect;

    return (

        <div className='flex flex-col gap-4 mt-1'>

            <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                onPrev={onPrev}
                onNext={onNext}
                onPageSelect={onPageSelect}
            />

            <div className='bg-white rounded-[14px] px-[22px] py-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.06)]'>

                <div className='flex items-center gap-2 mb-[14px]'>

                    <WarningAmberRounded className='!text-[16px] text-[#ef4444]' />

                    <span className='text-[12px] font-[700] text-[#111827] tracking-[0.02em] uppercase'>
                        How To Use
                    </span>

                </div>

                <div className='flex flex-col'>

                    {HOW_TO_USE_ROWS.map(function (row, rowIndex) {

                        const isLastRow = rowIndex === HOW_TO_USE_ROWS.length - 1;

                        return (

                            <div
                                key={rowIndex}
                                className={`grid grid-cols-1 sm:grid-cols-3 gap-x-[24px] gap-y-[10px] ${
                                    isLastRow ? '' : 'pb-[12px] mb-[12px] border-b border-[#f1f5f9]'
                                }`}
                            >

                                {row.map(function (item, itemIndex) {

                                    return (

                                        <div
                                            key={itemIndex}
                                            className='flex items-start gap-[8px] text-[12px] text-[#4b5563]'
                                        >

                                            <CheckCircle className='!text-[14px] text-[#15924c] mt-[1px] shrink-0' />

                                            <span>
                                                <strong className='text-[#111827] font-[600]'>{item.label}</strong> – {item.desc}
                                            </span>

                                        </div>
                                    );
                                })}

                            </div>
                        );
                    })}

                </div>

            </div>

        </div>
    );
}


function CarrierSearch() {

    const [accountToken, setAccountToken] = useState(false);
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState('mc');
    const [sortBy, setSortBy] = useState('sortByNameAsc');
    const [filters] = useState(DEFAULT_FILTERS);
    const [carriers, setCarriers] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [sortOptions, setSortOptions] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [selectedRisk, setSelectedRisk] = useState('');
    const [authorityVerified, setAuthorityVerified] = useState('');
    const [overlayOpen, setOverlayOpen] = useState(false);
	const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const searchRequestId = React.useRef(0);

 
    useEffect(function () {

        const token = localStorage.getItem(import.meta.env.VITE_ACCOUNT_TOKEN);

        if (token) { setAccountToken(token); }

        loadFilters(token);

    }, []);

 
    useEffect(function () {

        const q = searchParams.get('q');
        const type = searchParams.get('searched_by');

        if (q) {

            setQuery(q);

            if (type && SEARCH_TYPES.includes(type)) {
                setSearchType(type);
                runSearch(q, 1, sortBy, type);
            } else {
                runSearch(q, 1, sortBy, searchType);
            }
        }

    }, [searchParams]);

    function handleCarrierClick(carrier) {

        // NOTE: "save searched carrier" API call removed for now — not needed currently.
        navigate('/carriers/' + carrier.row_id);
    }

    useEffect(function () {

        if (query.trim() !== '') {

            runSearch(query, 1, sortBy, searchType);

        }

    }, [selectedRisk, authorityVerified]);

    function loadFilters(accountToken) {

        // const formData = new FormData();

        // if (accountToken) {

        //     formData.append('account_token', accountToken);
        // }

        // Api.post('backend/carrier/search/filters', formData, function (data) {

        //         if (data.status) {

        //             setSortOptions(data.sort_options || []);
        //         }
        //     }
        // );
    }

    function runSearch(searchText, page, sortValue, type) {

        let pageNumber = page || 1;
        let searchedByKey = type || searchType;

        if (!searchText || searchText.trim() === '') {
            setCarriers([]);
            setTotal(0);
            setCurrentPage(1);
            setLastPage(1);
            return;
        }

        const requestId = ++searchRequestId.current;

        setLoading(true);

        const params = new URLSearchParams();

        const searchedByValue = SEARCH_PARAM_MAP[searchedByKey] || 'legal_name';
        params.append('query', searchText);
        params.append('searched_by', searchedByValue);

        params.append('per_page', 10);
        params.append('page', pageNumber);

        // NOTE: the search API doesn't currently accept a `sort` param
        // (confirmed via Postman — none of the supported query examples
        // include it), so it's left out for now to avoid the
        // "selected sort is invalid" error.

        if (selectedRisk === 'Low') params.append('risk_low', 'true');
        if (selectedRisk === 'Medium') params.append('risk_medium', 'true');
        if (selectedRisk === 'High') params.append('risk_high', 'true');
        if (authorityVerified === 'Yes') params.append('authority_verified', 'true');
        if (authorityVerified === 'No') params.append('authority_verified', 'false');

        apiFetch(`${SEARCH_ENDPOINT}?${params.toString()}`)
            .then(function (res) {
                if (requestId !== searchRequestId.current) return;

                const payload = res || null;

                setCarriers(payload && Array.isArray(payload.data) ? payload.data : []);
                setTotal(payload ? payload.total || 0 : 0);
                setCurrentPage(payload ? payload.current_page || pageNumber : pageNumber);
                setLastPage(payload ? payload.last_page || 1 : 1);
            })
            .catch(function (err) {
                if (requestId !== searchRequestId.current) return;
                console.log(err);
                setCarriers([]);
                setTotal(0);
            })
            .finally(function () {
                if (requestId !== searchRequestId.current) return;
                setLoading(false);
            });
    }

    function handleKeyDown(event) {

        if (event.key === 'Enter') {

            runSearch(query, 1, sortBy, searchType);
        }
    }

    function handleClearSearch() {

        setQuery('');
        setCarriers([]);
        setTotal(0);
        setErrorMessage('');
        setCurrentPage(1);
        setLastPage(1);
    }

    function handlePrevPage() {

        if (currentPage > 1) {

            runSearch(query, currentPage - 1, sortBy, searchType);
        }
    }

    function handleNextPage() {

        if (currentPage < lastPage) {

            runSearch(query, currentPage + 1, sortBy, searchType);
        }
    }

    function handlePageSelect(page) {

        if (page !== currentPage) {

            runSearch(query, page, sortBy, searchType);
        }
    }

    function handleSortChange(event) {
        const value = event.target.value;

        setSortBy(value);

        if (query.trim() !== '') {
            runSearch(query, 1, value, searchType);
        }
    }

    function handleOverlaySearch(searchQuery, type) {
        setQuery(searchQuery);
        setSearchType(type);
        setOverlayOpen(false);
        runSearch(searchQuery, 1, sortBy, type);
    }

    function renderSortLabel(selected) {

        const labelMap = {
            sortByNameAsc: 'Name (A to Z)',
            sortByNameDesc: 'Name (Z to A)',
            'Most Relevant': 'Most Relevant'
        };

        return (
            <div className='flex items-center gap-2'>
                <span style={{ color: '#111827', fontSize: '13px', fontWeight: 700 }}>
                    SORT BY:
                </span>

                <span style={{ color: '#4E73DF', fontSize: '15px', fontWeight: 600 }}>
                    {labelMap[selected] || selected}
                </span>
            </div>
        );
    }

    return (

<div>

            <Grid container spacing={3}>

                <Grid size={12}>

                    <div className='min-h-screen p-3 md:p-4 lg:p-6'>

                        <div className='max-w-[1100px] mx-auto'>

                            <div className='flex flex-col gap-4 mt-9'>

                                {loading && (

                                    <div className='flex flex-col gap-4'>

                                        {[...Array(6)].map(function (_, index) {

                                            return (

                                                <CarrierCardSkeleton key={index} />
                                            );
                                        })}

                                    </div>
                                )}


                                {!loading && carriers.length === 0 && (

                                    <div className='text-center py-[50px] text-sm text-gray-500'>
                                        No data found
                                    </div>
                                )}


                                {!loading && carriers.length > 0 && (

                                    <>

                                        {carriers.map(function (carrier) {

                                            return (

                                                <CarrierCard
													key={carrier.id}
													carrier={carrier}
													onClick={handleCarrierClick}
												/>
                                            );
                                        })}

                                        <ResultsFooter
                                            currentPage={currentPage}
                                            lastPage={lastPage}
                                            onPrev={handlePrevPage}
                                            onNext={handleNextPage}
                                            onPageSelect={handlePageSelect}
                                        />

                                    </>

                                )}

                            </div>

                        </div>

                    </div>

                </Grid>

            </Grid>

            <SearchOverlay
                open={overlayOpen}
                onClose={() => setOverlayOpen(false)}
                onSearch={handleOverlaySearch}
                onTabChange={setSearchType}
                initialTab={searchType}
                initialQuery={query}
            />

      </div>
    );
}

export default CarrierSearch;