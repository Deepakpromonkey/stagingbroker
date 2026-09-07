import React, { useState, useEffect } from 'react';

import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

import LocationOn from '@mui/icons-material/LocationOn';
import Phone from '@mui/icons-material/Phone';
import Email from '@mui/icons-material/Email';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Business from '@mui/icons-material/Business';
import Badge from '@mui/icons-material/Badge';
import TagRounded from '@mui/icons-material/TagRounded';
import TravelExploreRounded from '@mui/icons-material/TravelExploreRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';

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


const SEARCH_TYPE_META = {
    mc: {
        label: 'MC Number',
        short: 'MC',
        desc: "Search by the carrier's MC number.",
        icon: Badge,
        color: '#4E73DF',
        bg: '#eef2ff'
    },
    dot: {
        label: 'DOT Number',
        short: 'DOT',
        desc: "Search by the carrier's USDOT number.",
        icon: TagRounded,
        color: '#7c3aed',
        bg: '#f5f3ff'
    },
    company: {
        label: 'Company Name',
        short: 'Company',
        desc: 'Search using the company name.',
        icon: Business,
        color: '#0891b2',
        bg: '#ecfeff'
    },
    phone: {
        label: 'Phone',
        short: 'Phone',
        desc: 'Search using the registered phone number.',
        icon: Phone,
        color: '#059669',
        bg: '#ecfdf5'
    },
    address: {
        label: 'Address',
        short: 'Address',
        desc: 'Search using the registered address.',
        icon: LocationOn,
        color: '#d97706',
        bg: '#fffbeb'
    },
    email: {
        label: 'Email',
        short: 'Email',
        desc: 'Search using the registered email address.',
        icon: Email,
        color: '#e11d48',
        bg: '#fff1f2'
    },
    ein: {
        label: 'EIN',
        short: 'EIN',
        desc: "Search by the carrier's EIN.",
        icon: TagRounded,
        color: '#4338ca',
        bg: '#eef2ff'
    }
};

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
    // Null while the total is still being counted server-side; paging runs off
    // hasMore in that window, which the API always knows exactly.
    const lastPage = props.lastPage;
    const hasMore = props.hasMore;
    const onPrev = props.onPrev;
    const onNext = props.onNext;

    if (!hasMore && currentPage <= 1) return null;

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
                Page <span className='text-[#111827] font-[700]'>{currentPage}</span>
                {lastPage ? ` of ${lastPage.toLocaleString()}` : ''}
            </span>

            <button
                onClick={onNext}
                disabled={!hasMore}
                aria-label='Next page'
                className={iconButtonClass}
            >
                <ChevronRight className='!text-[20px]' />
            </button>

        </div>
    );
}

// "How To Use" — a plain-language checklist so it's obvious what each identifier
// means and how to use it, on a soft gradient banner (no white card stack).
function HowToUseFlow(props) {

    const compact = props.compact;
    const types = ['mc', 'dot', 'company', 'phone', 'address', 'email'];

    return (

        <div
            className='relative overflow-hidden rounded-[20px] border border-[#e5e7eb]'
            style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 55%, #f5f3ff 100%)'
            }}
        >

            <div className='absolute -top-10 -right-10 w-[160px] h-[160px] rounded-full bg-white/40 blur-2xl pointer-events-none' />
            <div className='absolute -bottom-14 -left-10 w-[180px] h-[180px] rounded-full bg-[#c7d2fe]/30 blur-2xl pointer-events-none' />

            <div className={`relative ${compact ? 'px-5 py-5' : 'px-6 py-7 md:px-8 md:py-8'}`}>

                <div className='flex items-center gap-2 mb-1'>
                    <AutoAwesomeRounded className='!text-[18px] text-[#4E73DF]' />
                    <span className='text-[11px] font-[800] tracking-[0.12em] text-[#4E73DF] uppercase'>
                        Quick Guide
                    </span>
                </div>

                <h3 className='text-[18px] md:text-[19px] font-[800] text-[#111827] mb-1'>
                    Search carriers your way
                </h3>
                <p className='text-[13px] text-[#6b7280] mb-5 max-w-[560px]'>
                    Use any of the identifiers below — results update instantly as soon as you run a search.
                </p>

                <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'} gap-x-8 gap-y-4`}>

                    {types.map(function (typeKey) {

                        const meta = SEARCH_TYPE_META[typeKey];
                        const Icon = meta.icon;

                        return (

                            <div key={typeKey} className='flex items-start gap-3'>

                                <div
                                    className='w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0'
                                    style={{ backgroundColor: meta.bg, border: `1.5px solid ${meta.color}33` }}
                                >
                                    <Icon style={{ fontSize: 16, color: meta.color }} />
                                </div>

                                <p className='text-[13px] leading-[1.5] text-[#4b5563] pt-1'>
                                    <span className='font-[700] text-[#111827]'>{meta.label}</span>
                                    <span className='text-[#9ca3af]'> — </span>
                                    {meta.desc}
                                </p>

                            </div>
                        );
                    })}

                </div>

            </div>

        </div>
    );
}

// Shown before any search has been performed — fills the empty space with
// a real hero instead of a blank page.
function EmptyState(props) {

    const onOpenOverlay = props.onOpenOverlay;

    return (

        <div className='flex flex-col gap-8'>

            <div className='flex flex-col items-center text-center gap-4 pt-6 pb-2'>

                <div
                    className='w-[76px] h-[76px] rounded-full flex items-center justify-center'
                    style={{ background: 'linear-gradient(135deg, #4E73DF 0%, #7c3aed 100%)' }}
                >
                    <TravelExploreRounded style={{ fontSize: 36, color: '#fff' }} />
                </div>

                <div className='flex flex-col gap-1.5'>
                    <h2 className='text-[24px] md:text-[26px] font-[800] text-[#111827]'>
                        Find any carrier, instantly
                    </h2>
                    <p className='text-[14px] text-[#6b7280] max-w-[420px] mx-auto'>
                        Search by MC number, DOT number, company name, phone, address, email, or EIN.
                    </p>
                </div>

                <button
                    onClick={onOpenOverlay}
                    className='mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-[700] text-white shadow-[0_6px_16px_rgba(78,115,223,0.35)] hover:shadow-[0_8px_20px_rgba(78,115,223,0.45)] transition-shadow'
                    style={{ background: 'linear-gradient(135deg, #4E73DF 0%, #7c3aed 100%)' }}
                >
                    <TravelExploreRounded className='!text-[16px]' />
                    Start a search
                </button>

            </div>

            <HowToUseFlow />

        </div>
    );
}

// Shown after a search runs but returns nothing.
function NoResultsState(props) {

    const query = props.query;
    const searchType = props.searchType;
    const onOpenOverlay = props.onOpenOverlay;
    const onClear = props.onClear;

    const meta = SEARCH_TYPE_META[searchType] || SEARCH_TYPE_META.mc;

    return (

        <div className='flex flex-col gap-8'>

            <div className='flex flex-col items-center text-center gap-4 py-10 px-6 bg-white rounded-[20px] border border-[#f1f5f9]'>

                <div className='w-[64px] h-[64px] rounded-full bg-[#fef2f2] flex items-center justify-center'>
                    <SearchOffRounded style={{ fontSize: 30, color: '#ef4444' }} />
                </div>

                <div className='flex flex-col gap-1.5'>
                    <h2 className='text-[19px] font-[800] text-[#111827]'>
                        No carriers found
                    </h2>
                    <p className='text-[13px] text-[#6b7280] max-w-[380px] mx-auto'>
                        We couldn't find a match for <span className='font-[700] text-[#111827]'>"{query}"</span> using {meta.label}. Try a different identifier or double-check for typos.
                    </p>
                </div>

                <div className='flex items-center gap-3 mt-1'>
                    <button
                        onClick={onOpenOverlay}
                        className='inline-flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-[700] text-white'
                        style={{ background: 'linear-gradient(135deg, #4E73DF 0%, #7c3aed 100%)' }}
                    >
                        Try another search
                    </button>
                    <button
                        onClick={onClear}
                        className='px-4 py-2 rounded-full text-[13px] font-[700] text-[#4b5563] border border-[#e5e7eb] hover:bg-[#f8fafc] transition-colors'
                    >
                        Clear
                    </button>
                </div>

            </div>

            <HowToUseFlow compact />

        </div>
    );
}

// Slim summary bar shown above the results list — total count, query, search-type badge.
function ResultsHeader(props) {

    const total = props.total;
    const shownSoFar = props.shownSoFar;
    const query = props.query;
    const searchType = props.searchType;
    const onOpenOverlay = props.onOpenOverlay;

    const meta = SEARCH_TYPE_META[searchType] || SEARCH_TYPE_META.mc;
    const Icon = meta.icon;

    return (

        <div className='flex items-center justify-between gap-3 flex-wrap bg-white rounded-[14px] px-[18px] py-[14px] border border-[#f1f5f9]'>

            <div className='flex items-center gap-3 min-w-0'>

                <div
                    className='w-[38px] h-[38px] rounded-full flex items-center justify-center shrink-0'
                    style={{ backgroundColor: meta.bg }}
                >
                    <Icon style={{ fontSize: 18, color: meta.color }} />
                </div>

                <div className='flex flex-col min-w-0'>
                    <span className='text-[15px] font-[800] text-[#111827] truncate'>
                        {total === null
                            ? `${shownSoFar.toLocaleString()}+ results`
                            : `${total.toLocaleString()} ${total === 1 ? 'result' : 'results'}`}
                    </span>
                    <span className='text-[12px] text-[#6b7280] truncate'>
                        {meta.label} · "{query}"
                    </span>
                </div>

            </div>

            <button
                onClick={onOpenOverlay}
                className='text-[12px] font-[700] text-[#4E73DF] hover:text-[#3b5bc4] shrink-0'
            >
                Refine search
            </button>

        </div>
    );
}

function ResultsFooter(props) {

    const currentPage = props.currentPage;
    const lastPage = props.lastPage;
    const hasMore = props.hasMore;
    const onPrev = props.onPrev;
    const onNext = props.onNext;
    const onPageSelect = props.onPageSelect;

    return (

        <div className='flex flex-col gap-6 mt-2'>

            <Pagination
                currentPage={currentPage}
                lastPage={lastPage}
                hasMore={hasMore}
                onPrev={onPrev}
                onNext={onNext}
                onPageSelect={onPageSelect}
            />

            <HowToUseFlow compact />

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
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sortOptions, setSortOptions] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [selectedRisk, setSelectedRisk] = useState('');
    const [authorityVerified, setAuthorityVerified] = useState('');
    const [overlayOpen, setOverlayOpen] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
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
            setLastPage(null);
            setHasMore(false);
            setHasSearched(false);
            return;
        }

        const requestId = ++searchRequestId.current;

        setLoading(true);
        setHasSearched(true);

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
                // total / last_page are null until the server has counted the
                // matches; ?? rather than || so a real zero is not thrown away.
                setTotal(payload ? payload.total ?? null : 0);
                setCurrentPage(payload ? payload.current_page || pageNumber : pageNumber);
                setLastPage(payload ? payload.last_page ?? null : null);
                setHasMore(payload ? !!payload.has_more_pages : false);
                setErrorMessage('');
            })
            .catch(function (err) {
                if (requestId !== searchRequestId.current) return;
                console.log(err);
                setCarriers([]);
                setTotal(0);
               setErrorMessage(err?.message || 'Something went wrong while searching. Please try again.');
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
        setHasSearched(false);
    }

    function handlePrevPage() {

        if (currentPage > 1) {

            runSearch(query, currentPage - 1, sortBy, searchType);
        }
    }

    function handleNextPage() {

        if (hasMore) {

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

                    <div className='min-h-screen p-3 md:p-4 lg:p-6' style={{ background: '#f8fafc' }}>

                        <div className='max-w-[1100px] mx-auto'>

                            <div className='flex flex-col gap-5 mt-9'>

                                {errorMessage && (

                                    <div className='flex items-center gap-2 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-[13px] font-[600] rounded-[12px] px-4 py-3'>
                                        <ErrorOutlineRounded className='!text-[18px]' />
                                        {errorMessage}
                                    </div>
                                )}

                                {loading && (

                                    <div className='flex flex-col gap-4'>

                                        {[...Array(6)].map(function (_, index) {

                                            return (

                                                <CarrierCardSkeleton key={index} />
                                            );
                                        })}

                                    </div>
                                )}

                                {!loading && !hasSearched && (

                                    <EmptyState onOpenOverlay={() => setOverlayOpen(true)} />
                                )}

                              {!loading && hasSearched && !errorMessage && carriers.length === 0 && (

                                    <NoResultsState
                                        query={query}
                                        searchType={searchType}
                                        onOpenOverlay={() => setOverlayOpen(true)}
                                        onClear={handleClearSearch}
                                    />
                                )}

                                {!loading && hasSearched && carriers.length > 0 && (

                                    <>

                                        <ResultsHeader
                                            total={total}
                                            shownSoFar={(currentPage - 1) * 10 + carriers.length}
                                            query={query}
                                            searchType={searchType}
                                            onOpenOverlay={() => setOverlayOpen(true)}
                                        />

                                        <div className='flex flex-col gap-4'>

                                            {carriers.map(function (carrier) {

                                                return (

                                                    <CarrierCard
                                                        key={carrier.id}
                                                        carrier={carrier}
                                                        onClick={handleCarrierClick}
                                                    />
                                                );
                                            })}

                                        </div>

                                        <ResultsFooter
                                            currentPage={currentPage}
                                            lastPage={lastPage}
                                            hasMore={hasMore}
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
