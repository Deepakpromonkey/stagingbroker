import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';

import { toast } from '../../components/ui/Toaster';
import { apiFetch } from '../../lib/api';
import { storeSession } from '../../utils/Session';

import logo from '../../assets/images/logo.webp';

const COLOR_BLUE = '#2F5CFB';
const COLOR_BLUE_DARK = '#274CD1';
const COLOR_BORDER = '#E4E7EC';

const MIN_PASSWORD_LENGTH = 8;

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
        paddingTop: '16px',
        paddingBottom: '16px',
    },
};

const submitBtnSx = {
    background: `${COLOR_BLUE} !important`,
    borderRadius: '14px !important',
    textTransform: 'none !important',
    fontWeight: '600 !important',
    fontSize: '16px !important',
    padding: '14px 0 !important',
    '&:hover': { background: `${COLOR_BLUE_DARK} !important` },
    '&.Mui-disabled': { opacity: 0.6 },
};

const Shell = ({ children }) => (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4 py-10">
        <div className="w-full max-w-[440px] bg-white rounded-2xl border border-[#E4E7EC] p-8 sm:p-10">
            <img src={logo} alt="dollarTraq" className="h-8 mb-8" />
            {children}
        </div>
    </div>
);

export default function AcceptInvitation() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fatalError, setFatalError] = useState('');

    // A link that lost its token in transit — some mail clients mangle long
    // query strings — is worth naming rather than failing on submit.
    if (!token) {
        return (
            <Shell>
                <div className="flex items-start gap-3">
                    <ErrorOutlineIcon style={{ color: '#B42318' }} />
                    <div>
                        <h1 className="text-[19px] font-bold text-[#111827] mb-1">
                            This invitation link is incomplete
                        </h1>
                        <p className="text-[14px] text-[#6B7280] leading-relaxed">
                            Open the link straight from your invitation email, or ask whoever invited
                            you to send it again.
                        </p>
                        <Link to="/" className="inline-block mt-4 text-[14px] font-semibold" style={{ color: COLOR_BLUE }}>
                            Go to sign in
                        </Link>
                    </div>
                </div>
            </Shell>
        );
    }

    const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
    const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
    const canSubmit =
        password.length >= MIN_PASSWORD_LENGTH &&
        password === confirmPassword &&
        !submitting;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!canSubmit) return;

        setSubmitting(true);

        try {
            const data = await apiFetch('/invitations/accept', {
                method: 'POST',
                skipAuth: true,
                body: JSON.stringify({
                    token,
                    password,
                    password_confirmation: confirmPassword,
                }),
            });

            storeSession(data);

            toast.success({
                title: 'You are all set',
                message: 'Your password is saved and you are signed in.',
                duration: 2500,
            });

            navigate('/dashboard', { replace: true });
        } catch (err) {
            // An expired or spent link cannot be retried, so it replaces the
            // form instead of flashing a toast over a field they cannot fix.
            if (err.status === 422 && err.errors?.token) {
                setFatalError(err.errors.token[0] || err.message);
            } else {
                toast.error({
                    title: 'Could not set your password',
                    message: err.message || 'Please try again.',
                    duration: 4000,
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (fatalError) {
        return (
            <Shell>
                <div className="flex items-start gap-3">
                    <ErrorOutlineIcon style={{ color: '#B42318' }} />
                    <div>
                        <h1 className="text-[19px] font-bold text-[#111827] mb-1">
                            This link is no longer valid
                        </h1>
                        <p className="text-[14px] text-[#6B7280] leading-relaxed">{fatalError}</p>
                        <Link to="/" className="inline-block mt-4 text-[14px] font-semibold" style={{ color: COLOR_BLUE }}>
                            Go to sign in
                        </Link>
                    </div>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <h1 className="text-[22px] font-bold text-[#111827] mb-1 tracking-tight">
                Choose your password
            </h1>
            <p className="text-[14px] text-[#6B7280] mb-7 leading-relaxed">
                Pick a password and you will be signed in straight away.
            </p>

            <form onSubmit={handleSubmit} noValidate>
                <TextField
                    fullWidth
                    type={showPassword ? 'text' : 'password'}
                    label="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={tooShort}
                    helperText={tooShort ? `At least ${MIN_PASSWORD_LENGTH} characters.` : ' '}
                    autoComplete="new-password"
                    autoFocus
                    sx={textFieldSx}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockOutlinedIcon style={{ color: '#98A2B3', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword((v) => !v)} edge="end" tabIndex={-1}>
                                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <TextField
                    fullWidth
                    type={showConfirm ? 'text' : 'password'}
                    label="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={mismatch}
                    helperText={mismatch ? 'Both passwords must match.' : ' '}
                    autoComplete="new-password"
                    sx={textFieldSx}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <LockOutlinedIcon style={{ color: '#98A2B3', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShowConfirm((v) => !v)} edge="end" tabIndex={-1}>
                                    {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={!canSubmit}
                    sx={submitBtnSx}
                    className="mt-2"
                >
                    {submitting
                        ? <CircularProgress size={22} style={{ color: '#fff' }} />
                        : 'Save and continue'}
                </Button>
            </form>
        </Shell>
    );
}
