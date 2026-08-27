import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CircularProgress from '@mui/material/CircularProgress';

import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import ScienceOutlined from '@mui/icons-material/ScienceOutlined';
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined';
import ReplayOutlined from '@mui/icons-material/ReplayOutlined';
import UpgradeOutlined from '@mui/icons-material/UpgradeOutlined';

import { apiFetch } from '../../../lib/api';
import { toast } from '../../../components/ui/Toaster';

import { Card } from '../DtPay/components/ui';

import { money, moneyShort, formatDate, formatPeriod, relativeDays, cardBrand } from './format';
import { StatusPill, InfoRow, UsageBar, Banner, btnPrimary, btnGhost, btnDanger } from './components';
import CancelSubscriptionDialog from './CancelSubscriptionDialog';

/*
| Where the subscription stands, and everything that can be done to it.
|
| Cancelling and resuming both go through the API, which mirrors Stripe's
| answer back — so this screen never guesses the new state, it re-reads it.
| Changing the card is handed to Stripe's own hosted portal rather than
| rebuilt here: card details must never touch this application.
*/
function BillingOverview({ overview, onReload }) {

    const navigate = useNavigate();

    const [cancelOpen, setCancelOpen] = useState(false);
    const [resuming, setResuming] = useState(false);
    const [openingPortal, setOpeningPortal] = useState(false);

    const subscription = overview?.subscription;
    const usage = overview?.load_usage;
    const card = overview?.payment_method;
    const upcoming = overview?.upcoming_invoice;

    /*
    | Stripe's hosted billing portal: card changes, tax details, and Stripe's
    | own invoice archive. A full page navigation, because the destination is
    | Stripe's domain.
    */
    const openPortal = () => {
        setOpeningPortal(true);

        apiFetch('/subscription/portal', { method: 'POST' })
            .then((response) => {
                const url = response?.data?.url;

                if (!url) throw new Error('We could not open the billing portal.');

                window.location.href = url;
            })
            .catch((error) => {
                setOpeningPortal(false);

                toast.error({
                    title: 'Could not open the portal',
                    message: error?.message || 'Please try again in a moment.',
                });
            });
    };

    const resume = () => {
        setResuming(true);

        apiFetch('/billing/subscription/resume', { method: 'POST' })
            .then((response) => {
                toast.success({
                    title: 'Subscription continuing',
                    message: response?.message || 'Your subscription will continue.',
                });

                onReload?.();
            })
            .catch((error) => {
                toast.error({
                    title: 'Could not restart',
                    message: error?.message || 'Please try again, or contact support.',
                });
            })
            .finally(() => setResuming(false));
    };

    /* ── No plan at all ─────────────────────────────────────────── */

    if (!subscription) {
        return (
            <Card title="Subscription" titleClass="text-gray-900">
                <div className="py-8 text-center">
                    <div className="text-[15px] font-bold text-gray-900">No active subscription</div>
                    <p className="text-[13px] text-gray-500 mt-1.5 max-w-[420px] mx-auto leading-relaxed">
                        Choose a plan to start booking loads. You will be billed monthly and can
                        cancel at any time.
                    </p>
                    <button className={`${btnPrimary} mt-5`} onClick={() => navigate('/subscribe')}>
                        See plans
                    </button>
                </div>
            </Card>
        );
    }

    const trialing = subscription.status === 'trialing';
    const endingSoon = subscription.cancel_at_period_end;

    return (
        <>
            {/* ── Things the customer has to be told ─────────────── */}

            <div className="flex flex-col gap-3 mb-5">

                {subscription.is_past_due && (
                    <Banner
                        tone="red"
                        icon={ErrorOutlineOutlined}
                        title="Your last payment failed"
                        action={
                            <button className={btnPrimary} onClick={openPortal} disabled={openingPortal}>
                                Update card
                            </button>
                        }
                    >
                        Stripe will retry the charge over the next few days. Your account stays open
                        in the meantime — update the card to settle it now.
                    </Banner>
                )}

                {endingSoon && (
                    <Banner
                        tone="amber"
                        icon={EventBusyOutlined}
                        title="This subscription is set to end"
                        action={
                            <button className={btnPrimary} onClick={resume} disabled={resuming}>
                                {resuming && <CircularProgress size={13} sx={{ color: '#fff' }} />}
                                <ReplayOutlined sx={{ fontSize: 16 }} />
                                Resume
                            </button>
                        }
                    >
                        You keep full access until {formatDate(subscription.current_period_ends_at)}
                        {relativeDays(subscription.current_period_ends_at)
                            ? ` (${relativeDays(subscription.current_period_ends_at)})`
                            : ''}
                        . You will not be charged again.
                    </Banner>
                )}

                {trialing && !endingSoon && (
                    <Banner tone="blue" icon={ScienceOutlined} title="You are on a free trial">
                        Your trial runs until {formatDate(subscription.trial_ends_at)}. The first
                        charge of {money(subscription.amount, subscription.currency)} is taken then —
                        cancel before it and you pay nothing.
                    </Banner>
                )}

                {card?.expires_soon && !subscription.is_past_due && (
                    <Banner
                        tone="amber"
                        icon={CreditCardOutlined}
                        title="Your card is about to expire"
                        action={
                            <button className={btnGhost} onClick={openPortal} disabled={openingPortal}>
                                Update card
                            </button>
                        }
                    >
                        {cardBrand(card.brand)} ending {card.last4} expires{' '}
                        {String(card.exp_month).padStart(2, '0')}/{card.exp_year}. Replace it before
                        the next charge to avoid an interruption.
                    </Banner>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── The plan ───────────────────────────────────── */}

                <div className="lg:col-span-2">
                    <Card
                        title="Current plan"
                        titleClass="text-gray-900"
                        tilleAction={<StatusPill status={subscription.status} />}
                    >
                        <div className="flex flex-wrap items-end justify-between gap-4 pt-1 pb-4 border-b border-gray-100">
                            <div>
                                <div className="text-[26px] font-black text-gray-900 leading-tight">
                                    {subscription.plan_name}
                                </div>
                                <div className="text-[12.5px] text-gray-500 mt-1">
                                    {subscription.load_limit === null
                                        ? 'Unlimited loads'
                                        : `${subscription.load_limit} loads per billing period`}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-[26px] font-black text-gray-900 leading-tight">
                                    {moneyShort(subscription.amount, subscription.currency)}
                                    <span className="text-[13px] font-normal text-gray-400">
                                        /{subscription.interval}
                                    </span>
                                </div>
                                <div className="text-[11.5px] text-gray-400 mt-1">
                                    {subscription.currency?.toUpperCase()} · billed automatically
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <InfoRow label="Billing period">
                                {formatPeriod(
                                    subscription.current_period_starts_at,
                                    subscription.current_period_ends_at
                                )}
                            </InfoRow>

                            <InfoRow
                                label={endingSoon ? 'Access ends' : 'Renews on'}
                                hint={relativeDays(subscription.current_period_ends_at)}
                            >
                                {formatDate(subscription.current_period_ends_at)}
                            </InfoRow>

                            {trialing && (
                                <InfoRow label="Trial ends" hint={relativeDays(subscription.trial_ends_at)}>
                                    {formatDate(subscription.trial_ends_at)}
                                </InfoRow>
                            )}

                            <InfoRow label="Invoices go to">
                                {overview?.billing_email || '—'}
                            </InfoRow>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
                            <button className={btnPrimary} onClick={() => navigate('/subscribe')}>
                                <UpgradeOutlined sx={{ fontSize: 16 }} />
                                Change plan
                            </button>

                            <button className={btnGhost} onClick={openPortal} disabled={openingPortal}>
                                {openingPortal
                                    ? <CircularProgress size={13} />
                                    : <OpenInNewOutlined sx={{ fontSize: 15 }} />}
                                Manage payment &amp; tax details
                            </button>

                            {overview?.can_cancel && (
                                <button className={btnDanger} onClick={() => setCancelOpen(true)}>
                                    Cancel subscription
                                </button>
                            )}

                            {overview?.can_resume && (
                                <button className={btnGhost} onClick={resume} disabled={resuming}>
                                    {resuming && <CircularProgress size={13} />}
                                    Resume subscription
                                </button>
                            )}
                        </div>
                    </Card>
                </div>

                {/* ── Card, next charge, usage ───────────────────── */}

                <div className="flex flex-col gap-5">

                    <Card title="Payment method" titleClass="text-gray-900">
                        {card ? (
                            <div className="pt-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#0052CC] flex items-center justify-center">
                                        <CreditCardOutlined sx={{ fontSize: 20 }} />
                                    </div>
                                    <div>
                                        <div className="text-[13.5px] font-bold text-gray-900">
                                            {cardBrand(card.brand)} •••• {card.last4}
                                        </div>
                                        <div className="text-[11.5px] text-gray-500">
                                            {card.exp_month && card.exp_year
                                                ? `Expires ${String(card.exp_month).padStart(2, '0')}/${card.exp_year}`
                                                : 'On file with Stripe'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    className={`${btnGhost} w-full mt-4`}
                                    onClick={openPortal}
                                    disabled={openingPortal}
                                >
                                    Update card
                                </button>
                            </div>
                        ) : (
                            <div className="py-3">
                                <p className="text-[12.5px] text-gray-500 leading-relaxed">
                                    No card on file yet. Add one so the next invoice can be settled
                                    automatically.
                                </p>
                                <button
                                    className={`${btnPrimary} w-full mt-3`}
                                    onClick={openPortal}
                                    disabled={openingPortal || !overview?.has_billing_account}
                                >
                                    Add a card
                                </button>
                            </div>
                        )}
                    </Card>

                    <Card title="Next charge" titleClass="text-gray-900">
                        {endingSoon ? (
                            <div className="py-2 text-[12.5px] text-gray-500 leading-relaxed">
                                Nothing further will be charged — this subscription ends on{' '}
                                {formatDate(subscription.current_period_ends_at)}.
                            </div>
                        ) : (
                            <div className="pt-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                                        <CalendarMonthOutlined sx={{ fontSize: 20 }} />
                                    </div>
                                    <div>
                                        <div className="text-[17px] font-black text-gray-900 leading-tight">
                                            {upcoming
                                                ? money(upcoming.total, upcoming.currency)
                                                : money(subscription.amount, subscription.currency)}
                                        </div>
                                        <div className="text-[11.5px] text-gray-500">
                                            on{' '}
                                            {formatDate(
                                                upcoming?.charges_at || subscription.current_period_ends_at
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stripe's preview includes tax and any proration, which is why
                                    it can differ from the plan's headline price. */}
                                {upcoming?.tax > 0 && (
                                    <div className="text-[11.5px] text-gray-400 mt-3 leading-relaxed">
                                        Includes {money(upcoming.tax, upcoming.currency)} tax on{' '}
                                        {money(upcoming.subtotal, upcoming.currency)}.
                                    </div>
                                )}

                                {!upcoming && (
                                    <div className="text-[11.5px] text-gray-400 mt-3 leading-relaxed">
                                        Estimated from your plan price. The exact amount is confirmed
                                        by Stripe on the day.
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    <Card
                        title="Load usage"
                        titleClass="text-gray-900"
                        tilleAction={<Inventory2Outlined sx={{ fontSize: 16 }} className="text-gray-400" />}
                    >
                        <div className="pt-1">
                            <UsageBar
                                used={usage?.used}
                                limit={usage?.limit}
                                unlimited={usage?.unlimited}
                            />

                            {usage?.period_starts_at && (
                                <div className="text-[11px] text-gray-400 mt-3">
                                    Counted from {formatDate(usage.period_starts_at)}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            <CancelSubscriptionDialog
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                subscription={subscription}
                reasons={overview?.cancellation_reasons || []}
                allowImmediate={overview?.allow_immediate_cancel}
                onCancelled={() => onReload?.()}
            />
        </>
    );
}

export default BillingOverview;
