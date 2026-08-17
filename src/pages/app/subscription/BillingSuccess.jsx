import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { CheckCircleOutlineOutlined, ErrorOutlineOutlined } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';

import { apiFetch } from '../../../lib/api';
import { refreshPlanAccess } from '../../../RouteGuard';

/*
| Where Stripe returns the customer after Checkout (config('subscriptions.success_path')).
|
| Stripe appends the session id, which is exchanged here for the real
| subscription via POST /subscription/checkout/sync. The webhook is the durable
| path for this and will land on its own, but it can lag by a few seconds and
| this screen should not have to guess — so it asks directly rather than
| showing a success message it has not confirmed.
|
| The API answers with a null subscription while Stripe is still settling the
| payment, which is a "not yet", not a failure. That case is retried a few
| times before giving up and telling the user it is still processing.
*/

const SYNC_ATTEMPTS = 5;
const RETRY_DELAY_MS = 2000;

function BillingSuccess() {

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');

    // 'syncing' | 'active' | 'processing' | 'error'
    const [state, setState] = useState('syncing');
    const [message, setMessage] = useState('');

    // Strict mode mounts effects twice in development; without this the sync
    // fires two overlapping chains of retries.
    const startedRef = useRef(false);
    const timerRef = useRef(null);

    const sync = useCallback((attempt) => {

        apiFetch('/subscription/checkout/sync', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId }),
        })
            .then((data) => {
                const subscription = data?.data?.subscription;

                if (subscription?.is_active) {
                    // The guard caches the paywall answer per page load, so it
                    // has to be told the account just became subscribed.
                    refreshPlanAccess();
                    setState('active');
                    return;
                }

                // Payment taken, subscription not visible yet — give Stripe a
                // moment and ask again.
                if (attempt < SYNC_ATTEMPTS) {
                    timerRef.current = setTimeout(() => sync(attempt + 1), RETRY_DELAY_MS);
                    return;
                }

                setState('processing');
                setMessage(data?.message || 'Your payment is still processing.');
            })
            .catch((error) => {
                setState('error');
                setMessage(error?.message || 'We could not confirm your payment.');
            });

    }, [sessionId]);

    useEffect(() => {

        if (startedRef.current) return undefined;
        startedRef.current = true;

        if (!sessionId) {
            setState('error');
            setMessage('This link is missing its checkout reference.');
            return undefined;
        }

        sync(1);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };

    }, [sessionId, sync]);

    // Once the subscription is live there is nothing to read here, so the
    // dashboard opens on its own rather than waiting on a click.
    useEffect(() => {
        if (state !== 'active') return undefined;

        const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
        return () => clearTimeout(timer);
    }, [state, navigate]);

    return (
        <div className="w-full min-h-screen bg-[#000B21] relative overflow-hidden px-[24px] py-[100px] text-white">

            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#0044B3] rounded-full blur-[160px] opacity-20 pointer-events-none" />

            <div className="relative z-10 mx-auto flex max-w-[520px] flex-col items-center text-center">

                {state === 'syncing' && (
                    <>
                        <CircularProgress size={40} sx={{ color: '#3B82F6' }} />
                        <h1 className="mt-[28px] text-[26px] font-normal tracking-tight">
                            Confirming your payment
                        </h1>
                        <p className="mt-[12px] text-[14px] text-[#94A3B8] leading-[1.6]">
                            This only takes a moment. Please don&rsquo;t close this page.
                        </p>
                    </>
                )}

                {state === 'active' && (
                    <>
                        <CheckCircleOutlineOutlined sx={{ fontSize: 56, color: '#22C55E' }} />
                        <h1 className="mt-[24px] text-[28px] font-normal tracking-tight">
                            You&rsquo;re all set
                        </h1>
                        <p className="mt-[12px] text-[14px] text-[#94A3B8] leading-[1.6]">
                            Your subscription is active. Taking you to your dashboard&hellip;
                        </p>
                        <button
                            onClick={() => navigate('/dashboard', { replace: true })}
                            className="mt-[28px] h-[48px] px-[28px] rounded-full bg-[#0052CC] text-[13.5px] font-medium text-white transition-all duration-200 hover:bg-[#0066FF]"
                        >
                            Go to dashboard
                        </button>
                    </>
                )}

                {state === 'processing' && (
                    <>
                        <CircularProgress size={40} sx={{ color: '#F59E0B' }} />
                        <h1 className="mt-[28px] text-[26px] font-normal tracking-tight">
                            Payment received
                        </h1>
                        <p className="mt-[12px] text-[14px] text-[#94A3B8] leading-[1.6]">
                            {message} We&rsquo;ll activate your account as soon as Stripe confirms
                            it — you don&rsquo;t need to pay again.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-[28px] h-[48px] px-[28px] rounded-full bg-[#0052CC] text-[13.5px] font-medium text-white transition-all duration-200 hover:bg-[#0066FF]"
                        >
                            Check again
                        </button>
                    </>
                )}

                {state === 'error' && (
                    <>
                        <ErrorOutlineOutlined sx={{ fontSize: 56, color: '#F87171' }} />
                        <h1 className="mt-[24px] text-[26px] font-normal tracking-tight">
                            We couldn&rsquo;t confirm your payment
                        </h1>
                        <p className="mt-[12px] text-[14px] text-[#94A3B8] leading-[1.6]">
                            {message} If you were charged, don&rsquo;t pay again — contact support
                            and we&rsquo;ll sort it out.
                        </p>
                        <button
                            onClick={() => navigate('/subscribe', { replace: true })}
                            className="mt-[28px] h-[48px] px-[28px] rounded-full border border-[#3B82F6] bg-transparent text-[13.5px] font-medium text-white transition-all duration-200 hover:bg-[#111E38]"
                        >
                            Back to plans
                        </button>
                    </>
                )}

            </div>
        </div>
    );
}

export default BillingSuccess;
