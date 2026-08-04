import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';


import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

import { toast } from '../../components/ui/Toaster';
import { apiFetch } from '../../lib/api';
import { getDeviceUUID } from '../../utils/DeviceUuid';

import logo from '../../assets/images/logo.webp';
import image from '../../assets/images/image.png';

const COLOR_BLUE = '#2F5CFB';
const COLOR_BLUE_DARK = '#274CD1';
const COLOR_BORDER = '#E4E7EC';

const textFieldSx = {
    '& .MuiOutlinedInput-root': {
        background: '#F7F8FA',
        borderRadius: '14px',
    },
    '& .MuiOutlinedInput-notchedOutline': {
        borderColor: COLOR_BORDER,
        borderRadius: '14px',
    },
    '& .MuiOutlinedInput-input': {
        color: '#111827',
        fontSize: 15,
        paddingLeft: '42px',
        paddingTop: '16px',
        paddingBottom: '16px',
    },
    '& input:-webkit-autofill': {
        WebkitBoxShadow: '0 0 0 100px #F7F8FA inset !important',
        WebkitTextFillColor: '#111827 !important',
        caretColor: '#111827',
        borderRadius: 'inherit',
    },
};

const textFieldSxPassword = {
    ...textFieldSx,
    '& .MuiOutlinedInput-input': {
        ...textFieldSx['& .MuiOutlinedInput-input'],
        paddingRight: '40px',
    },
};

const submitBtnSx = {
    background: `${COLOR_BLUE} !important`,
    borderRadius: '14px !important',
    textTransform: 'none !important',
    fontWeight: '600 !important',
    fontSize: '16px !important',
    padding: '14px 0 !important',
    '&:hover': {
        background: `${COLOR_BLUE_DARK} !important`,
    },
};

const GridBackground = () => (
    <div
        className="absolute inset-0 pointer-events-none"
        style={{
            backgroundImage:
                'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
        }}
    />
);

const RingDecoration = ({ className }) => (
    <div className={`absolute ${className}`}>
        <div className="relative w-full h-full rounded-full bg-white/10">
            <div className="absolute inset-[28%] rounded-full bg-white/20">
                <div className="absolute inset-[35%] rounded-full bg-white/40"></div>
            </div>
        </div>
    </div>
);

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const OTP_SESSION_KEY = 'crm_otp_session';
const OTP_EMAIL_KEY = 'crm_otp_email';

function saveOtpSession(otpSession, email) {
    localStorage.setItem(OTP_SESSION_KEY, otpSession);
    localStorage.setItem(OTP_EMAIL_KEY, email);
}

function getStoredOtpSession() {
    return {
        otpSession: localStorage.getItem(OTP_SESSION_KEY) || '',
        email: localStorage.getItem(OTP_EMAIL_KEY) || '',
    };
}

function clearOtpSession() {
    localStorage.removeItem(OTP_SESSION_KEY);
    localStorage.removeItem(OTP_EMAIL_KEY);
}

const RESEND_COOLDOWN = 30;

const OtpModal = ({ email, otpSession, rememberDevice, onClose, onVerified, onResend }) => {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef([]);
    const abortControllerRef = useRef(null);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const submitOtp = useCallback(async (code) => {
        if (code.length !== 6 || verifying) return;
        setVerifying(true);
        setError('');

        try {

            const data = await apiFetch('/verify-login-otp', {
                method: 'POST',
                skipAuth: true,
                body: JSON.stringify({
                    otp_session: otpSession,
                    otp: code,
                    remember_device: rememberDevice,
                    device_uuid: getDeviceUUID(),
                }),
            });

            if (data && data.status) {
                clearOtpSession();
                onVerified(data);
            } else {
                setError((data && data.message) || 'Invalid code. Please try again.');
                setDigits(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            setError(err?.message || 'Invalid or expired code. Please try again.');
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setVerifying(false);
        }
    }, [otpSession, rememberDevice, verifying, onVerified]);

    useEffect(() => {
        if (!('OTPCredential' in window) || !navigator.credentials?.get) return;

        const controller = new AbortController();
        abortControllerRef.current = controller;

        navigator.credentials
            .get({ otp: { transport: ['sms'] }, signal: controller.signal })
            .then((otp) => {
                const code = (otp?.code || '').replace(/\D/g, '').slice(0, 6);
                if (code.length === 6) {
                    setDigits(code.split(''));
                    submitOtp(code);
                }
            })
            .catch(() => { /* user dismissed, timed out, or unsupported — ignore */ });

        return () => controller.abort();
    }, []);

    const focusBox = (index) => {
        inputRefs.current[index]?.focus();
        inputRefs.current[index]?.select();
    };

    const handleChange = (index, rawValue) => {
        const value = rawValue.replace(/\D/g, '');
        if (value === '') {
            setDigits((prev) => {
                const next = [...prev];
                next[index] = '';
                return next;
            });
            return;
        }

        const chars = value.split('');
        setDigits((prev) => {
            const next = [...prev];
            let i = index;
            for (const ch of chars) {
                if (i > 5) break;
                next[i] = ch;
                i += 1;
            }

            const filled = next.join('');
            if (filled.length === 6) {
                setTimeout(() => submitOtp(filled), 0);
            } else {
                setTimeout(() => focusBox(Math.min(i, 5)), 0);
            }
            return next;
        });
        setError('');
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (digits[index] === '' && index > 0) {
                focusBox(index - 1);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            focusBox(index - 1);
        } else if (e.key === 'ArrowRight' && index < 5) {
            focusBox(index + 1);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const next = ['', '', '', '', '', ''];
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        setError('');
        if (pasted.length === 6) {
            submitOtp(pasted);
        } else {
            focusBox(pasted.length);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || resending) return;
        setResending(true);
        setError('');
        try {
            await onResend();
            setDigits(['', '', '', '', '', '']);
            setResendCooldown(RESEND_COOLDOWN);
            inputRefs.current[0]?.focus();
            toast.success({ title: 'Code sent', message: 'A new code has been sent to your email.', duration: 3000 });
        } catch (err) {
            setError(err?.message || 'Could not resend code. Please try again.');
        } finally {
            setResending(false);
        }
    };

    const handleClose = () => {
        clearOtpSession();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.25)] p-7">
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute right-4 top-4 flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                    aria-label="Close"
                >
                    <CloseIcon sx={{ fontSize: 18 }} />
                </button>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl mb-4" style={{ background: '#EEF2FF' }}>
                    <ShieldOutlinedIcon sx={{ fontSize: 22, color: COLOR_BLUE }} />
                </div>

                <h2 className="text-[20px] font-bold text-gray-900 m-0 mb-1.5">Verify it's you</h2>
                <p className="text-[13.5px] text-gray-500 m-0 mb-6 leading-relaxed">
                    Enter the 6-digit code sent to <span className="font-semibold text-gray-700">{email}</span>
                </p>

                <div className="flex justify-between gap-2 mb-2" onPaste={handlePaste}>
                    {digits.map((d, i) => (
                        <input
                            key={i}
                            ref={(el) => (inputRefs.current[i] = el)}
                            value={d}
                            onChange={(e) => handleChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoComplete={i === 0 ? 'one-time-code' : 'off'}
                            disabled={verifying}
                            className="w-[46px] h-[54px] text-center text-[20px] font-semibold rounded-xl border outline-none"
                            style={{
                                borderColor: error ? '#F0997B' : COLOR_BORDER,
                                background: verifying ? '#F7F8FA' : '#FFFFFF',
                                color: '#111827',
                            }}
                            onFocus={(e) => e.target.select()}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-[12.5px] text-[#D85A30] m-0 mb-2">{error}</p>
                )}

                <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={submitBtnSx}
                    disabled={verifying || digits.join('').length !== 6}
                    onClick={() => submitOtp(digits.join(''))}
                    startIcon={verifying ? <CircularProgress size={18} color="inherit" /> : null}
                >
                    {verifying ? 'Verifying...' : 'Verify & continue'}
                </Button>

                <div className="text-center mt-5">
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendCooldown > 0 || resending}
                        className="text-[13px] font-semibold bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed"
                        style={{ color: resendCooldown > 0 ? '#9CA3AF' : COLOR_BLUE }}
                    >
                        {resending
                            ? 'Sending...'
                            : resendCooldown > 0
                                ? `Resend code in ${resendCooldown}s`
                                : "Didn't get a code? Resend"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ForgotPasswordModal = ({ email, otpSession: initialOtpSession, onClose, onDone }) => {
    const [step, setStep] = useState('otp'); // 'otp' | 'reset'

    // OTP step state
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [verifying, setVerifying] = useState(false);
    const [otpError, setOtpError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
    const [resending, setResending] = useState(false);
    const inputRefs = useRef([]);
    const [verifiedOtp, setVerifiedOtp] = useState('');
    const [resetToken, setResetToken] = useState(''); 

    // otp_session returned by /forgot-password, refreshed on resend.
    // Sent along with the code so the backend can tie the OTP to the
    // right request instead of matching on email alone.
    const [otpSession, setOtpSession] = useState(initialOtpSession || '');

    // Reset step state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetError, setResetError] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    useEffect(() => {
        if (step !== 'otp' || resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown, step]);

    useEffect(() => {
        if (step === 'otp') inputRefs.current[0]?.focus();
    }, [step]);

    const focusBox = (index) => {
        inputRefs.current[index]?.focus();
        inputRefs.current[index]?.select();
    };

const submitOtp = useCallback(async (code) => {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    setOtpError('');
    try {
        const data = await apiFetch('/verify-forgot-password-otp', {
            method: 'POST',
            skipAuth: true,
            body: JSON.stringify({ email, otp_session: otpSession, otp: code }),
        });

        if (data && data.status) {
            const token = data.data?.reset_token || data.reset_token || '';
            setResetToken(token);
            setVerifiedOtp(code);
            setStep('reset');
        } else {
            setOtpError((data && data.message) || 'Invalid code. Please try again.');
            setDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    } catch (err) {
        setOtpError(err?.message || 'Invalid or expired code. Please try again.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
    } finally {
        setVerifying(false);
    }
}, [email, otpSession, verifying]);

    const handleChange = (index, rawValue) => {
        const value = rawValue.replace(/\D/g, '');
        if (value === '') {
            setDigits((prev) => {
                const next = [...prev];
                next[index] = '';
                return next;
            });
            return;
        }

        const chars = value.split('');
        setDigits((prev) => {
            const next = [...prev];
            let i = index;
            for (const ch of chars) {
                if (i > 5) break;
                next[i] = ch;
                i += 1;
            }

            const filled = next.join('');
            if (filled.length === 6) {
                setTimeout(() => submitOtp(filled), 0);
            } else {
                setTimeout(() => focusBox(Math.min(i, 5)), 0);
            }
            return next;
        });
        setOtpError('');
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace') {
            if (digits[index] === '' && index > 0) {
                focusBox(index - 1);
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            focusBox(index - 1);
        } else if (e.key === 'ArrowRight' && index < 5) {
            focusBox(index + 1);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const next = ['', '', '', '', '', ''];
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        setOtpError('');
        if (pasted.length === 6) {
            submitOtp(pasted);
        } else {
            focusBox(pasted.length);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0 || resending) return;
        setResending(true);
        setOtpError('');
        try {
            const data = await apiFetch('/forgot-password', {
                method: 'POST',
                skipAuth: true,
                body: JSON.stringify({ email }),
            });

            // Resending issues a fresh otp_session — swap it in so the
            // next verify call is checked against the new one.
            const nextOtpSession = data?.data?.otp_session;
            if (nextOtpSession) {
                setOtpSession(nextOtpSession);
            }

            setDigits(['', '', '', '', '', '']);
            setResendCooldown(RESEND_COOLDOWN);
            inputRefs.current[0]?.focus();
            toast.success({ title: 'Code sent', message: 'A new code has been sent to your email.', duration: 3000 });
        } catch (err) {
            setOtpError(err?.message || 'Could not resend code. Please try again.');
        } finally {
            setResending(false);
        }
    };

 const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (newPassword === '' || confirmPassword === '') {
        setResetError('Please fill in both fields.');
        return;
    }
    if (newPassword !== confirmPassword) {
        setResetError('Passwords do not match.');
        return;
    }

    setResetError('');
    setResetLoading(true);
    try {
        const data = await apiFetch('/reset-password', {
            method: 'POST',
            skipAuth: true,
            body: JSON.stringify({
                email,
                reset_token: resetToken,
                password: newPassword,
                password_confirmation: confirmPassword,
            }),
        });

        if (data && data.status) {
            toast.success({
                title: 'Password updated',
                message: data.message || 'Your password has been reset successfully.',
                duration: 4000,
            });
            onDone();
        } else {
            setResetError((data && data.message) || 'Could not reset password.');
        }
    } catch (err) {
        setResetError(err?.message || 'Could not reset password.');
    } finally {
        setResetLoading(false);
    }
};

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="relative w-full max-w-[400px] bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.25)] p-7">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                    aria-label="Close"
                >
                    <CloseIcon sx={{ fontSize: 18 }} />
                </button>

                {step === 'otp' ? (
                    <>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl mb-4" style={{ background: '#EEF2FF' }}>
                            <ShieldOutlinedIcon sx={{ fontSize: 22, color: COLOR_BLUE }} />
                        </div>

                        <h2 className="text-[20px] font-bold text-gray-900 m-0 mb-1.5">Verify it's you</h2>
                        <p className="text-[13.5px] text-gray-500 m-0 mb-6 leading-relaxed">
                            Enter the 6-digit code sent to <span className="font-semibold text-gray-700">{email}</span>
                        </p>

                        <div className="flex justify-between gap-2 mb-2" onPaste={handlePaste}>
                            {digits.map((d, i) => (
                                <input
                                    key={i}
                                    ref={(el) => (inputRefs.current[i] = el)}
                                    value={d}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                    disabled={verifying}
                                    className="w-[46px] h-[54px] text-center text-[20px] font-semibold rounded-xl border outline-none"
                                    style={{
                                        borderColor: otpError ? '#F0997B' : COLOR_BORDER,
                                        background: verifying ? '#F7F8FA' : '#FFFFFF',
                                        color: '#111827',
                                    }}
                                    onFocus={(e) => e.target.select()}
                                />
                            ))}
                        </div>

                        {otpError && (
                            <p className="text-[12.5px] text-[#D85A30] m-0 mb-2">{otpError}</p>
                        )}

                        <Button
                            variant="contained"
                            size="large"
                            fullWidth
                            sx={submitBtnSx}
                            disabled={verifying || digits.join('').length !== 6}
                            onClick={() => submitOtp(digits.join(''))}
                            startIcon={verifying ? <CircularProgress size={18} color="inherit" /> : null}
                        >
                            {verifying ? 'Verifying...' : 'Verify code'}
                        </Button>

                        <div className="text-center mt-5">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resendCooldown > 0 || resending}
                                className="text-[13px] font-semibold bg-transparent border-0 cursor-pointer disabled:cursor-not-allowed"
                                style={{ color: resendCooldown > 0 ? '#9CA3AF' : COLOR_BLUE }}
                            >
                                {resending
                                    ? 'Sending...'
                                    : resendCooldown > 0
                                        ? `Resend code in ${resendCooldown}s`
                                        : "Didn't get a code? Resend"}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl mb-4" style={{ background: '#EEF2FF' }}>
                            <LockOutlinedIcon sx={{ fontSize: 22, color: COLOR_BLUE }} />
                        </div>

                        <h2 className="text-[20px] font-bold text-gray-900 m-0 mb-1.5">Set a new password</h2>
                        <p className="text-[13.5px] text-gray-500 m-0 mb-6 leading-relaxed">
                            Choose a new password for <span className="font-semibold text-gray-700">{email}</span>
                        </p>

                        <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                            <div className="relative w-full">
                                <span className="absolute left-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center pointer-events-none z-[2] text-gray-400">
                                    <LockOutlinedIcon sx={{ fontSize: 19 }} />
                                </span>
                                <TextField
                                    placeholder="New Password"
                                    variant="outlined"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        setResetError('');
                                    }}
                                    fullWidth
                                    autoComplete="new-password"
                                    sx={textFieldSxPassword}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center cursor-pointer z-[2] text-gray-400 bg-transparent border-0 p-0"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    tabIndex={-1}
                                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showNewPassword ? <Visibility sx={{ fontSize: 19 }} /> : <VisibilityOff sx={{ fontSize: 19 }} />}
                                </button>
                            </div>

                            <div className="relative w-full">
                                <span className="absolute left-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center pointer-events-none z-[2] text-gray-400">
                                    <LockOutlinedIcon sx={{ fontSize: 19 }} />
                                </span>
                                <TextField
                                    placeholder="Confirm Password"
                                    variant="outlined"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setResetError('');
                                    }}
                                    fullWidth
                                    autoComplete="new-password"
                                    sx={textFieldSxPassword}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center cursor-pointer z-[2] text-gray-400 bg-transparent border-0 p-0"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex={-1}
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <Visibility sx={{ fontSize: 19 }} /> : <VisibilityOff sx={{ fontSize: 19 }} />}
                                </button>
                            </div>

                            {resetError && (
                                <p className="text-[12.5px] text-[#D85A30] m-0 -mt-2">{resetError}</p>
                            )}

                            <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                type="submit"
                                sx={submitBtnSx}
                                disabled={resetLoading}
                                startIcon={resetLoading ? <CircularProgress size={18} color="inherit" /> : null}
                            >
                                {resetLoading ? 'Updating...' : 'Reset Password'}
                            </Button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

const Login  = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [loggedIn] = useState(!!localStorage.getItem('crm_auth_token'));

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberDevice, setRememberDevice] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);

    const [forgotPassword, setForgotPassword] = useState(false);
    const [forgotModalOpen, setForgotModalOpen] = useState(false);
    const [forgotOtpSession, setForgotOtpSession] = useState('');

    const stored = getStoredOtpSession();
    const [otpModalOpen, setOtpModalOpen] = useState(!!stored.otpSession);
    const [otpSession, setOtpSession] = useState(stored.otpSession);

    useEffect(() => {
        if (stored.otpSession && stored.email) {
            setEmail(stored.email);
        }
    }, []);

    const handleLoginSuccess = (data) => {
        const token = data.data?.token;
        const userData = data.data?.user ?? null;

        if (token) {
            localStorage.setItem('crm_auth_token', token);
            document.cookie = [
                `crm_auth_token=${token}`,
                'path=/',
                `max-age=${60 * 60 * 24 * 7}`,
                'SameSite=Lax',
            ].join('; ');
        }

        if (userData) {
            let roleValue = 'employee';
            if (userData.role) {
                if (typeof userData.role === 'string') {
                    roleValue = userData.role.toLowerCase();
                } else if (typeof userData.role === 'object') {
                    roleValue = (userData.role.slug || userData.role.name || 'employee').toLowerCase();
                }
            }

            const normalizedUser = {
                ...userData,
                role: roleValue,
                roleDetails: (userData.role && typeof userData.role === 'object') ? userData.role : null,
                name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email,
            };
            localStorage.setItem('crm_user', JSON.stringify(normalizedUser));
            if (userData.company) {
                localStorage.setItem('crm_company', JSON.stringify(userData.company));
            }
        }

        toast.success({title: 'Welcome back', message: data.message || 'Logged in successfully.', duration: 2500,});

        clearOtpSession();
        setOtpSession('');
        setOtpModalOpen(false);
        navigate('/dashboard');
    };

    const performLogin = async () => {
        const data = await apiFetch('/login', {
            method: 'POST',
            skipAuth: true,
            body: JSON.stringify({
                email,
                password,
                device_uuid: getDeviceUUID(),
            }),
        });

        if (data && data.status && data.data?.requires_otp) {

            saveOtpSession(data.data.otp_session, email);
            setOtpSession(data.data.otp_session);
            setOtpModalOpen(true);
            return;
        }

        if (data && data.status) {
            handleLoginSuccess(data);
        } else {

            toast.error({title: 'Login failed',message: (data && data.message) || 'Please check your credentials and try again.',duration: 6000,});
        }
    };

    const loginSubmit = (event) => {
        event.preventDefault();

        if (forgotPassword) {
            forgotPasswordSubmit(event);
            return;
        }

        let hasError = false;

        if (!validEmail(email)) {
            setEmailError(true);
            hasError = true;
        } else {
            setEmailError(false);
        }

        if (password === '') {
            setPasswordError(true);
            hasError = true;
        } else {
            setPasswordError(false);
        }

        if (hasError) {
            toast.error({title: 'Missing information',message: 'Please check the highlighted fields and try again.',});

            return;
        }

        setLoading(true);
        performLogin()
            .catch((err) => {
                toast.error({title: 'Login failed',message: err?.message || 'Please check your credentials and try again.',duration: 6000,});
            })
            .finally(() => setLoading(false));
    };

    const forgotPasswordSubmit = (event) => {
        event.preventDefault();

        if (!validEmail(email)) {
            setEmailError(true);
            toast.error({ title: 'Invalid email', message: 'Please enter a valid email address.' });
            return;
        }
        setEmailError(false);

        setLoading(true);
        apiFetch('/forgot-password', {
            method: 'POST',
            skipAuth: true,
            body: JSON.stringify({ email }),
        })
            .then((data) => {
                if (data && data.status) {
                    // Capture the otp_session so it can be handed to the
                    // modal and sent back with the verify/reset calls.
                    setForgotOtpSession(data.data?.otp_session || '');

                    toast.success({
                        title: 'Check your inbox',
                        message: data.message || 'A verification code has been sent to your email.',
                        duration: 4000,
                    });
                    setForgotModalOpen(true);
                } else {
                    toast.error({
                        title: 'Request failed',
                        message: (data && data.message) || 'Could not send reset email.',
                        duration: 6000,
                    });
                }
            })
            .catch((err) => {
                toast.error({title: 'Request failed',message: err?.message || 'Could not send reset email.',duration: 6000,});
            })
            .finally(() => setLoading(false));
    };

    const handleResendOtp = () => performLogin();

    if (loggedIn) {
        return <Navigate to="/dashboard" />;
    }

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-y-auto overflow-x-hidden z-[1000] bg-white">
            <div className="flex flex-col md:flex-row w-full min-h-full">
                <div className="relative order-2 md:order-1 w-full md:w-1/2 bg-[#2F5CFB] flex items-center justify-center overflow-hidden min-h-[560px] md:min-h-full">
                    <GridBackground />
                    <RingDecoration className="w-28 h-28 top-8 right-10" />
                    <RingDecoration className="w-16 h-16 top-[42%] left-[8%]" />
                    <RingDecoration className="w-14 h-14 top-[35%] left-1/2 -translate-x-1/2" />

                    <div className="relative z-[2] w-full max-w-[520px] flex flex-col items-center px-8 py-12 box-border">
                        <div className="text-center text-white mb-8">
                            <h2 className="text-[28px] font-light leading-[36px] mb-4 max-w-[380px] mx-auto">
                                The easiest way to manage your Shipment.
                            </h2>
                            <p className="text-base m-0 text-[#DBEAFE]">Join the DollarTraq now!</p>
                        </div>

                        <div className="relative w-[600px] max-w-[540px]">
                            <div className="absolute inset-0 rounded-2xl bg-white/25 blur-[1px] rotate-[-4deg] translate-y-3 shadow-[0_20px_35px_rgba(0,0,0,0.18)]" />
                            <div className="absolute inset-0 rounded-2xl bg-white/45 blur-[0.5px] rotate-[3deg] translate-y-1.5 shadow-[0_20px_35px_rgba(0,0,0,0.2)]" />
                            <div className="relative rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.28)] bg-white p-2">
                                <img
                                    src={image}
                                    alt="DollarTraq dashboard preview"
                                    className="block w-full h-[420px] object-cover object-top rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="order-1 md:order-2 w-full md:w-1/2 bg-white flex items-center justify-center px-8 py-10 box-border">
                    <div className="w-full max-w-[440px]">
                        <img src={logo} alt="DollarTraq" className="h-[42px] w-auto mb-10 block" />
                        <div>
                            <h1 className="text-[25px] leading-tight font-bold text-gray-900 m-0 mb-3 tracking-tight">
                                {forgotPassword ? 'Reset your password.' : 'Log in to your account.'}
                            </h1>
                            <p className="text-[15px] text-gray-500 m-0 mb-8">
                                {forgotPassword
                                    ? 'Enter your email address and we will send you a reset link.'
                                    : 'Enter your email address and password to log in.'}
                            </p>
                        </div>

                        <form onSubmit={loginSubmit} className="flex flex-col gap-5">
                            <div className="relative w-full">
                                <span className="absolute left-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center pointer-events-none z-[2] text-gray-400">
                                    <EmailOutlinedIcon sx={{ fontSize: 19 }} />
                                </span>
                               <TextField
                                    placeholder="Email Address"
                                    variant="outlined"
                                    value={email}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setEmail(value);
                                        if (emailError && validEmail(value)) {
                                            setEmailError(false);
                                        }
                                    }}
                                    error={emailError}
                                    fullWidth
                                    helperText={emailError ? 'Please enter valid email address' : ''}
                                    autoComplete="off"
                                    sx={textFieldSx}
                                />
                            </div>

                            {!forgotPassword && (
                                <div className="relative w-full">
                                    <span className="absolute left-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center pointer-events-none z-[2] text-gray-400">
                                        <LockOutlinedIcon sx={{ fontSize: 19 }} />
                                    </span>
                                  <TextField
                                        placeholder="Password"
                                        variant="outlined"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setPassword(value);
                                            if (passwordError && value !== '') {
                                                setPasswordError(false);
                                            }
                                        }}
                                        error={passwordError}
                                        fullWidth
                                        helperText={passwordError ? 'Please enter valid password' : ''}
                                        autoComplete="off"
                                        sx={textFieldSxPassword}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center cursor-pointer z-[2] text-gray-400 bg-transparent border-0 p-0"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? <Visibility sx={{ fontSize: 19 }} /> : <VisibilityOff sx={{ fontSize: 19 }} />}
                                    </button>
                                </div>
                            )}

                            {!forgotPassword && (
                                <div className="flex justify-between items-center -mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={rememberDevice}
                                            onChange={(e) => setRememberDevice(e.target.checked)}
                                            className="w-4 h-4 accent-[#2F5CFB]"
                                        />
                                    <span className="text-[13px] text-gray-600">Remember this device.</span>
                                    </label>
                                    <span
                                        className="text-sm text-[#2F5CFB] cursor-pointer font-medium"
                                        onClick={() => {
                                            setForgotPassword(true);
                                            setEmail('');
                                            setEmailError(false);
                                        }}
                                    >
                                        Forgot password?
                                    </span>
                                </div>
                            )}

                            <Button
                                variant="contained"
                                size="large"
                                sx={{ width: '100%', ...submitBtnSx }}
                                type="submit"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                            >
                                {loading
                                    ? (forgotPassword ? 'Sending...' : 'Logging in...')
                                    : (forgotPassword ? 'Send Password Email' : 'Login')}
                            </Button>

                            {forgotPassword && (
                                <Button
                                    variant="text"
                                    size="small"
                                    startIcon={<ArrowBackIcon />}
                                    onClick={() => setForgotPassword(false)}
                                    sx={{ textTransform: 'none !important', alignSelf: 'center' }}
                                >
                                    Back to Login
                                </Button>
                            )}

                            {!forgotPassword && (
                                <>
                                    <div className="flex items-center text-center text-gray-400 text-sm my-2">
                                        <span className="flex-1 border-b border-[#E4E7EC]"></span>
                                        <span className="px-4">or</span>
                                        <span className="flex-1 border-b border-[#E4E7EC]"></span>
                                    </div>
                                    <div className="text-center text-sm text-gray-500">
                                        Don't you have an account? <a href="/signup" className="text-[#2F5CFB] font-semibold no-underline">Sign Up </a>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {otpModalOpen && (
                <OtpModal
                    email={email}
                    otpSession={otpSession}
                    rememberDevice={rememberDevice}
                    onClose={() => setOtpModalOpen(false)}
                    onVerified={handleLoginSuccess}
                    onResend={handleResendOtp}
                />
            )}

            {forgotModalOpen && (
                <ForgotPasswordModal
                    email={email}
                    otpSession={forgotOtpSession}
                    onClose={() => setForgotModalOpen(false)}
                    onDone={() => {
                        setForgotModalOpen(false);
                        setForgotPassword(false);
                        setForgotOtpSession('');
                        setEmail('');
                    }}
                />
            )}
        </div>
    );
};

export default Login;
