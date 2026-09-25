import { useState, useEffect } from 'react';
import Skeleton from '@mui/material/Skeleton';
import { useNavigate } from 'react-router-dom';
import CarrierCard from '../../../components/CarrierCards';
import CarrierListActions from '../../../components/CarrierListActions';
import { apiFetch } from '../../../lib/api';

// AuthorityTag (CarrierCards.jsx) reads this as an FMCSA status code
// ("A" = active), not a boolean - same convention ShortlistedCarriers.jsx
// uses for the same component.
function authorityCode(isActive) {
    return isActive ? 'A' : 'I';
}

function CarrierCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3">
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <Skeleton variant="text" width={180} height={22} />
                    <div className="flex gap-2">
                        <Skeleton variant="rounded" width={90} height={22} />
                        <Skeleton variant="rounded" width={110} height={22} />
                    </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-1.5 sm:items-end">
                    <Skeleton variant="rounded" width={140} height={22} />
                    <Skeleton variant="rounded" width={120} height={22} />
                    <Skeleton variant="rounded" width={70} height={22} />
                </div>
            </div>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="text" width="50%" height={18} />
        </div>
    );
}

function BlockedCarriers() {
    const navigate = useNavigate();
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [carriers, setCarriers] = useState([]);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        loadBlockedCarriers();
    }, []);

    function flashSuccess(message) {
        setErrorMessage('');
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 4000);
    }

    function flashError(message) {
        setSuccessMessage('');
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(''), 4000);
    }

    function handleCarrierClick(carrier) {
        navigate('/carriers/' + carrier.carrier_id);
    }

    function loadBlockedCarriers() {
        setLoading(true);

        apiFetch('/blocked', {
            method: 'GET'
        })
            .then(response => {
                const rawData = response.data || [];

                const mappedCarriers = rawData.map(item => ({
                    carrier_id: item.row_id,
                    company_name: item.legal_name || item.dba_name || '-',
                    mc_number: item.mc_number || '-',
                    dot_number: item.dot_number || '-',
                    vin: item.vin || '-',
                    duns: item.duns || '-',
                    address: [item.phy_city, item.phy_state].filter(Boolean).join(', ') || '-',
                    phone: item.telephone || '-',
                    email: item.email_address || '-',
                    mileage: item.mcs150_mileage || item.recent_mileage || null,
                    fleet_size: item.nbr_power_unit || item.driver_total || null,
                    carrier_operation: item.carrier_operation || 'A',

                    // Real values from the API now - see
                    // DtSearchScoringService::enrichCarriers(), called from
                    // CarrierBlockedController. active_authority and
                    // authority_verified come off the same computed flag;
                    // the card just wants two different shapes of it (an
                    // FMCSA-style code for the badge, a boolean for the
                    // checkmark row).
                    active_authority: authorityCode(item.active_authority),
                    authority_verified: !!item.authority_verified,
                    insurance_current: !!item.insurance_current,
                    risk_level: item.risk_level || null,
                    dt_score: item.dt_score ?? null,
                    // Supplied by the blocked endpoint on top of the carrier
                    // record itself — who blocked them, and when.
                    blocked_by: item.blocked_by || null,
                    blocked_at: item.blocked_at || null
                }));

                setCarriers(mappedCarriers);
                setTotal(mappedCarriers.length);
            })
            .catch(err => {
                flashError(err.message || 'Failed to load blocked carriers.');
            })
            .finally(() => setLoading(false));
    }

    function unblockCarrier(carrier_id) {
        setSuccessMessage('');
        setErrorMessage('');

        apiFetch('/blocked', {
            method: 'DELETE',
            body: JSON.stringify({ row_id: carrier_id })
        })
            .then(data => {
                setCarriers(prev => prev.filter(c => c.carrier_id !== carrier_id));
                setTotal(prev => Math.max(prev - 1, 0));
                flashSuccess(data?.message || 'Carrier removed from blocklist');
            })
            .catch(err => {
                flashError(err.message || 'Something went wrong');
            });
    }

    const blockedToolbar = (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5 w-full">
            <CarrierListActions
                type="blocked"
                onSuccess={flashSuccess}
                onError={flashError}
                onImported={(result) => {
                    flashSuccess(result.message);
                    // The import writes straight to the blocklist, so the page
                    // is stale the moment it succeeds.
                    loadBlockedCarriers();
                }}
            />

            <div className="flex items-center gap-3 sm:gap-3.5 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-3.5 w-full sm:w-auto">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-[10px] bg-red-50 shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M5.6 5.6l12.8 12.8" />
                    </svg>
                </div>
                <div>
                    <div className="text-lg sm:text-xl font-semibold text-gray-900 leading-tight tabular-nums">
                        {loading ? '–' : total}
                    </div>
                    <div className="text-xs text-gray-500 leading-tight mt-0.5">Total blocked</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-4 py-5 sm:px-6 md:px-8 lg:px-14">

            <div className="mb-6 sm:mb-8">
                <h1 className="text-[26px] sm:text-[32px] md:text-[40px] font-semibold tracking-tight text-slate-900">
                    Blocked carriers
                </h1>
                <p className="mt-2 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-slate-500">
                    Carriers your company has blocked from being booked or contacted.
                </p>
            </div>

            <div className="max-w-5xl mx-auto flex flex-col gap-5 sm:gap-6">

                {successMessage && (
                    <div className="w-full p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium">
                        ✓ {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="w-full p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium">
                        ✕ {errorMessage}
                    </div>
                )}

                {blockedToolbar}

                <div className="flex flex-col gap-3 w-full">
                    {loading &&
                        [...Array(3)].map((_, i) => (
                            <CarrierCardSkeleton key={i} />
                        ))
                    }

                    {!loading && carriers.length === 0 && (
                        <div className="text-center py-12 sm:py-16 px-4 sm:px-6 border border-dashed border-gray-200 rounded-xl text-sm text-gray-500 bg-white">
                            No blocked carriers — carriers you block will show up here.
                        </div>
                    )}

                    {carriers.map(carrier => (
                        <div key={carrier.carrier_id} className="flex flex-col gap-1">
                            <CarrierCard
                                carrier={carrier}
                                showRemove
                                removeLabel="Remove from blocklist"
                                onRemove={unblockCarrier}
                                onClick={handleCarrierClick}
                            />

                            {(carrier.blocked_by || carrier.blocked_at) && (
                                <div className="px-1 text-xs text-gray-500">
                                    Blocked
                                    {carrier.blocked_by ? ` by ${carrier.blocked_by}` : ''}
                                    {carrier.blocked_at ? ` on ${carrier.blocked_at}` : ''}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BlockedCarriers;
