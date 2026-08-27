import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';

import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';

import { apiFetch } from '../../../lib/api';
import { refreshPlanAccess } from '../../../RouteGuard';

import { PH } from '../DtPay/components/ui';

import { btnGhost } from './components';
import BillingOverview from './BillingOverview';
import BillingInvoices from './BillingInvoices';
import BillingReport from './BillingReport';

/*
| The billing screen.
|
| Three tabs, and each owns its own data: the overview is loaded here because
| cancelling and resuming change it, while the invoice list and the report fetch
| independently so opening one does not slow the others down.
|
| The tab lives in the URL so a link to ?tab=invoices lands where it says it
| will — which matters because the invoice email points people here.
|
| This is also where Stripe's billing portal returns the customer
| (config('subscriptions.portal_return_path') on the API is /billing), so the
| overview is re-read on mount rather than trusting anything cached: the reason
| they went to Stripe was to change something here.
*/

const TABS = [
    { key: 'overview', label: 'Overview', icon: CreditCardOutlined },
    { key: 'invoices', label: 'Invoices', icon: ReceiptLongOutlined },
    { key: 'report', label: 'Report', icon: InsightsOutlined },
];

function Billing() {

    const [searchParams, setSearchParams] = useSearchParams();

    const requestedTab = searchParams.get('tab');
    const activeTab = TABS.some((tab) => tab.key === requestedTab) ? requestedTab : 'overview';

    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadOverview = useCallback(() => {
        setLoading(true);
        setError('');

        return apiFetch('/billing')
            .then((response) => {
                setOverview(response?.data || null);

                /*
                | Cancelling immediately, or a plan change made inside Stripe's
                | portal, moves whether this account is allowed past the
                | paywall. RouteGuard caches that answer per page load, so it
                | has to be told to ask again — otherwise the next navigation
                | is decided by a stale yes.
                */
                refreshPlanAccess();
            })
            .catch((err) => setError(err?.message || 'We could not load your billing details.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { loadOverview(); }, [loadOverview]);

    const selectTab = (key) => {
        // `replace` so the back button leaves the billing page rather than
        // walking back through the tabs one at a time.
        setSearchParams(key === 'overview' ? {} : { tab: key }, { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">

            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>
                    <PH
                        crumb={<>Billing</>}
                        title="Billing &amp; subscription"
                        desc="Your plan, what you have been charged, and every invoice — downloadable as a PDF or emailed to you."
                    />
                </Grid>

                <Grid size={12}>
                    <div
                        role="tablist"
                        aria-label="Billing sections"
                        className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-0"
                    >
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.key;

                            return (
                                <button
                                    key={tab.key}
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => selectTab(tab.key)}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2.5 -mb-px border-b-2 text-[12.5px] font-bold transition ${
                                        active
                                            ? 'border-[#0052CC] text-[#0052CC]'
                                            : 'border-transparent text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <Icon sx={{ fontSize: 16 }} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </Grid>

                <Grid size={12}>

                    {activeTab === 'overview' && (
                        loading ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                <div className="lg:col-span-2">
                                    <Skeleton height={340} sx={{ transform: 'none', borderRadius: '16px' }} />
                                </div>
                                <div className="flex flex-col gap-5">
                                    <Skeleton height={150} sx={{ transform: 'none', borderRadius: '16px' }} />
                                    <Skeleton height={150} sx={{ transform: 'none', borderRadius: '16px' }} />
                                </div>
                            </div>
                        ) : error ? (
                            <div className="rounded-2xl border-2 border-gray-500/[.1] bg-white shadow-sm px-6 py-12 text-center">
                                <div className="text-[13.5px] font-bold text-gray-900">{error}</div>
                                <p className="text-[12.5px] text-gray-500 mt-1.5">
                                    Your subscription is unaffected — this is only the page failing to load.
                                </p>
                                <button className={`${btnGhost} mt-4`} onClick={loadOverview}>
                                    Try again
                                </button>
                            </div>
                        ) : (
                            <BillingOverview overview={overview} onReload={loadOverview} />
                        )
                    )}

                    {activeTab === 'invoices' && <BillingInvoices />}

                    {activeTab === 'report' && <BillingReport />}

                </Grid>
            </Grid>
        </div>
    );
}

export default Billing;
