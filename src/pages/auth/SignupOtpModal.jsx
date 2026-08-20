import { useCallback, useEffect, useRef, useState } from 'react';

import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';

import { apiFetch } from '../../lib/api';

const OTP_LENGTH = 6;

const COLOR_BLUE = '#1D4ED8';

/**
 * Confirms one contact detail during signup.
 *
 * Opened per channel rather than once for both: the two codes travel over
 * different networks and arrive at different times, and pairing them in a
 * single dialog would make the faster one wait on the slower.
 *
 * `onVerified` receives the token the signup form must send back — a proof for
 * one address, so the caller keeps the email and phone tokens apart.
 */
export default function SignupOtpModal({
    open,
    channel,
    destination,
    onClose,
    onVerified,
}) {
    const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [sentTo, setSentTo] = useState('');
    const [cooldown, setCooldown] = useState(0);

    const sessionRef = useRef(null);
    const inputsRef = useRef([]);

    const isEmail = channel === 'email';

    const code = digits.join('');

    const requestCode = useCallback(
        async function (isResend) {
            setSending(true);
            setError('');
            setNotice('');

            try {
                const res = await apiFetch('/signup/otp/send', {
                    method: 'POST',
                    skipAuth: true,
                    body: JSON.stringify({ channel, destination }),
                });

                sessionRef.current = res?.data?.otp_session || null;

                setSentTo(res?.data?.destination || destination);
                setCooldown(Number(res?.data?.resend_after_seconds) || 30);

                if (isResend) setNotice('A new code is on its way.');
            } catch (err) {
                setError(err?.message || 'Could not send the code. Please try again.');
            } finally {
                setSending(false);
            }
        },
        [channel, destination],
    );

    /*
    | One request per opening. The effect keys off `open` alone — including
    | requestCode would re-fire it whenever the parent re-renders with a new
    | destination string, and every one of those is a real SMS.
    */
    const openedRef = useRef(false);

    useEffect(() => {
        if (!open) {
            openedRef.current = false;
            return;
        }

        if (openedRef.current) return;

        openedRef.current = true;

        setDigits(Array(OTP_LENGTH).fill(''));
        setError('');
        setNotice('');
        sessionRef.current = null;

        requestCode(false);
    }, [open, requestCode]);

    useEffect(() => {
        if (!open || cooldown <= 0) return undefined;

        const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);

        return () => clearTimeout(timer);
    }, [open, cooldown]);

    useEffect(() => {
        if (open) inputsRef.current[0]?.focus();
    }, [open]);

    const setDigitAt = (index, value) => {
        setDigits((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const handleChange = (index, rawValue) => {
        const value = rawValue.replace(/\D/g, '');

        if (!value) {
            setDigitAt(index, '');
            return;
        }

        // A phone keyboard's autofill drops the whole code into one box.
        if (value.length > 1) {
            const spread = value.slice(0, OTP_LENGTH - index).split('');

            setDigits((prev) => {
                const next = [...prev];
                spread.forEach((digit, offset) => {
                    next[index + offset] = digit;
                });
                return next;
            });

            inputsRef.current[Math.min(index + spread.length, OTP_LENGTH - 1)]?.focus();
            return;
        }

        setDigitAt(index, value);

        if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();

        if (error) setError('');
    };

    const handleKeyDown = (index, event) => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }

        if (event.key === 'ArrowLeft' && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }

        if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handlePaste = (event) => {
        const pasted = (event.clipboardData.getData('text') || '').replace(/\D/g, '');

        if (!pasted) return;

        event.preventDefault();

        const spread = pasted.slice(0, OTP_LENGTH).split('');

        setDigits(Array.from({ length: OTP_LENGTH }, (_, i) => spread[i] || ''));

        inputsRef.current[Math.min(spread.length, OTP_LENGTH - 1)]?.focus();
    };

    const submit = async function () {
        if (code.length !== OTP_LENGTH || verifying) return;

        if (!sessionRef.current) {
            setError('Request a code before verifying.');
            return;
        }

        setVerifying(true);
        setError('');

        try {
            const res = await apiFetch('/signup/otp/verify', {
                method: 'POST',
                skipAuth: true,
                body: JSON.stringify({
                    otp_session: sessionRef.current,
                    otp: code,
                }),
            });

            onVerified?.(channel, res?.data?.verification_token);
        } catch (err) {
            setError(err?.message || 'That code is not correct.');

            setDigits(Array(OTP_LENGTH).fill(''));
            inputsRef.current[0]?.focus();
        } finally {
            setVerifying(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full bg-[#EEF2FF] p-2.5 text-[#4F46E5]">
                            {isEmail ? (
                                <EmailOutlinedIcon sx={{ fontSize: 22 }} />
                            ) : (
                                <LocalPhoneOutlinedIcon sx={{ fontSize: 22 }} />
                            )}
                        </div>

                        <div>
                            <h3 className="m-0 text-lg font-bold text-[#111827]">
                                Verify your {isEmail ? 'email' : 'phone'}
                            </h3>

                            <p className="m-0 mt-0.5 text-xs text-[#6B7280]">
                                {sending && !sentTo
                                    ? 'Sending your code…'
                                    : `Code sent to ${sentTo || destination}`}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="cursor-pointer rounded-full border-0 bg-transparent p-1 text-gray-400 hover:text-gray-600"
                    >
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </button>
                </div>

                <div className="mt-6 flex justify-center gap-2" onPaste={handlePaste}>
                    {digits.map((digit, index) => (
                        <input
                            // Fixed-length field: the index IS the identity.
                            key={index}
                            ref={(el) => {
                                inputsRef.current[index] = el;
                            }}
                            value={digit}
                            inputMode="numeric"
                            autoComplete={index === 0 ? 'one-time-code' : 'off'}
                            maxLength={OTP_LENGTH}
                            disabled={sending || verifying}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onFocus={(e) => e.target.select()}
                            className={`h-12 w-11 rounded-xl border text-center text-lg font-bold text-[#111827] outline-none transition-colors focus:border-[#1D4ED8] disabled:bg-gray-50 ${
                                error ? 'border-red-400' : 'border-[#E5E7EB]'
                            }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="mt-3 text-center text-xs text-red-500">{error}</p>
                )}

                {!error && notice && (
                    <p className="mt-3 text-center text-xs text-emerald-600">{notice}</p>
                )}

                <button
                    type="button"
                    onClick={submit}
                    disabled={code.length !== OTP_LENGTH || verifying || sending}
                    style={{
                        backgroundColor:
                            code.length === OTP_LENGTH && !verifying && !sending
                                ? COLOR_BLUE
                                : '#D1D5DB',
                    }}
                    className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed"
                >
                    {verifying ? <CircularProgress size={16} color="inherit" /> : null}
                    {verifying ? 'Verifying…' : 'Verify'}
                </button>

                <p className="mt-4 text-center text-xs text-[#6B7280]">
                    Didn&apos;t get it?{' '}
                    <button
                        type="button"
                        disabled={cooldown > 0 || sending || verifying}
                        onClick={() => requestCode(true)}
                        style={{ color: cooldown > 0 ? '#9CA3AF' : COLOR_BLUE }}
                        className="cursor-pointer border-0 bg-transparent p-0 font-semibold disabled:cursor-not-allowed"
                    >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                    </button>
                </p>
            </div>
        </div>
    );
}
