import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { toast } from '../../components/ui/Toaster';

import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LocalPhoneOutlinedIcon from '@mui/icons-material/LocalPhoneOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { apiFetch } from '../../lib/api';

import logo from '../../assets/images/logo.webp';
import image from '../../assets/images/image.png';

const COLOR_MAIN = '#178A54';
const COLOR_MAIN_DARK = '#136E43';
const COLOR_BORDER = '#E4E7EC';


const COUNTRY_CODES = [
    { code: 'IN', dial: '+91', label: 'India', digits: 10 },
    { code: 'US', dial: '+1', label: 'United States', digits: 10 },
    { code: 'CA', dial: '+1', label: 'Canada', digits: 10 },
    { code: 'MX', dial: '+52', label: 'Mexico', digits: 10 },
];

// Business type options — value is what gets sent to the backend
const BUSINESS_TYPES = [
    { value: '3pl_freight_broker', label: '3PL / Freight Broker' },
    { value: 'freight_forwarder_shipper', label: 'Freight Forwarder / Shipper' },
    { value: 'technology_vendor', label: 'Technology Vendor' },
    { value: 'insurance_agency', label: 'Insurance Agency' },
    { value: 'other', label: 'Other' },
];

const CountryFlag = ({ code }) => (
    <img
        src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
        srcSet={`https://flagcdn.com/48x36/${code.toLowerCase()}.png 2x`}
        width={20}
        height={15}
        alt=""
        className="inline-block shrink-0 rounded-[2px] object-cover"
    />
);

const useOutsideClick = (ref, onOutside) => {
    useEffect(() => {
        function handler(e) {
            if (ref.current && !ref.current.contains(e.target)) onOutside();
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, onOutside]);
};

const CountryCodeDropdown = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    useOutsideClick(rootRef, () => setOpen(false));

    const selected = COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[1];

    return (
        <div className="relative shrink-0" ref={rootRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 h-[46px] sm:h-[54px] px-2.5 sm:px-3 rounded-[14px] border cursor-pointer"
                style={{ background: '#F7F8FA', borderColor: COLOR_BORDER }}
            >
                <CountryFlag code={selected.code} />
                <span className="text-sm font-medium text-gray-700">{selected.dial}</span>
            </button>

            {open && (
                <div
                    className="absolute z-20 mt-2 w-56 max-h-60 overflow-y-auto rounded-xl border bg-white shadow-lg"
                    style={{ borderColor: COLOR_BORDER }}
                >
                    {COUNTRY_CODES.map((c) => (
                        <button
                            type="button"
                            key={c.code}
                            onClick={() => { onChange(c.code); setOpen(false); }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${c.code === value ? 'bg-gray-50 font-semibold' : ''
                                }`}
                        >
                            <CountryFlag code={c.code} />
                            <span className="text-gray-500 w-7">{c.code}</span>
                            <span>{c.dial}</span>
                            <span className="text-gray-400 ml-auto">{c.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const BusinessTypeDropdown = ({ value, onChange, error }) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    useOutsideClick(rootRef, () => setOpen(false));

    const selected = BUSINESS_TYPES.find((b) => b.value === value);

    return (
        <div className="relative w-full" ref={rootRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2.5 w-full h-[46px] sm:h-[54px] px-3.5 rounded-[14px] border cursor-pointer text-left"
                style={{
                    background: '#F7F8FA',
                    borderColor: error ? '#d32f2f' : COLOR_BORDER,
                }}
            >
                <ApartmentOutlinedIcon sx={{ fontSize: 19 }} className="text-gray-400 shrink-0" />
                <span className={`flex-1 text-[15px] truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selected ? selected.label : 'Business Type'}
                </span>
                <KeyboardArrowDownIcon
                    sx={{ fontSize: 20, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
                    className="text-gray-400 shrink-0"
                />
            </button>

            {open && (
                <div
                    className="absolute z-20 mt-2 w-full rounded-xl border bg-white shadow-lg overflow-hidden"
                    style={{ borderColor: COLOR_BORDER }}
                >
                    {BUSINESS_TYPES.map((b) => (
                        <button
                            type="button"
                            key={b.value}
                            onClick={() => { onChange(b.value); setOpen(false); }}
                            className={`flex w-full items-center px-3.5 py-2.5 text-left text-sm hover:bg-gray-50 ${b.value === value ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-700'
                                }`}
                        >
                            {b.label}
                        </button>
                    ))}
                </div>
            )}

            {error && (
                <p className="mt-1 ml-1 text-xs" style={{ color: '#d32f2f' }}>
                    Please select your business type
                </p>
            )}
        </div>
    );
};

const phoneDigits = (value) => (value || '').replace(/\D/g, '');

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
    background: `${COLOR_MAIN} !important`,
    borderRadius: '14px !important',
    textTransform: 'none !important',
    fontWeight: '600 !important',
    fontSize: '16px !important',
    padding: '14px 0 !important',
    '&:hover': {
        background: `${COLOR_MAIN_DARK} !important`,
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

const IconField = ({ icon, trailing, ...textFieldProps }) => (
    <div className="relative w-full">
        <span className="absolute left-3.5 top-[27px] -translate-y-1/2 flex items-center justify-center pointer-events-none z-[2] text-gray-400">
            {icon}
        </span>
        <TextField
            variant="outlined"
            fullWidth
            autoComplete="off"
            sx={trailing ? textFieldSxPassword : textFieldSx}
            {...textFieldProps}
        />
        {trailing &&
            <div className="absolute right-3.5 top-[27px] -translate-y-1/2 z-[2]">
                {trailing}
            </div>
        }
    </div>
);

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const Signup = () => {

    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('US'); 
    const [businessType, setBusinessType] = useState('');
    const [dotNumber, setDotNumber] = useState('');
    const [company, setCompany] = useState('');

    const [firstNameError, setFirstNameError] = useState(false);
    const [lastNameError, setLastNameError] = useState(false);
    const [emailError, setEmailError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);
    const [passwordConfirmationError, setPasswordConfirmationError] = useState(false);
    const [phoneError, setPhoneError] = useState(false);
    const [businessTypeError, setBusinessTypeError] = useState(false);
    const [dotNumberError, setDotNumberError] = useState(false);
    const [companyError, setCompanyError] = useState(false);

    const signupSubmit = (event) => {

        event.preventDefault();

        var _has_error = false;

        if(firstName.trim() === ''){
            setFirstNameError(true);
            _has_error = true;
        }else{
            setFirstNameError(false);
        }

        if(lastName.trim() === ''){
            setLastNameError(true);
            _has_error = true;
        }else{
            setLastNameError(false);
        }

        if(!validEmail(email)){
            setEmailError(true);
            _has_error = true;
        }else{
            setEmailError(false);
        }

        if(password === '' || password.length < 6){
            setPasswordError(true);
            _has_error = true;
        }else{
            setPasswordError(false);
        }

        if(passwordConfirmation === '' || passwordConfirmation !== password){
            setPasswordConfirmationError(true);
            _has_error = true;
        }else{
            setPasswordConfirmationError(false);
        }

      const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[1];
const phoneDigitCount = phoneDigits(phone).length;

if(phone.trim() === '' || phoneDigitCount !== selectedCountry.digits){
    setPhoneError(true);
    _has_error = true;
}else{
    setPhoneError(false);
}

        if(businessType === ''){
            setBusinessTypeError(true);
            _has_error = true;
        }else{
            setBusinessTypeError(false);
        }

        // DOT# is mandatory only for 3PL / Freight Broker
        if(businessType === '3pl_freight_broker'){
            if(dotNumber.trim() === ''){
                setDotNumberError(true);
                _has_error = true;
            }else{
                setDotNumberError(false);
            }
        }else{
            setDotNumberError(false);
        }

        if(company.trim() === ''){
            setCompanyError(true);
            _has_error = true;
        }else{
            setCompanyError(false);
        }

        if(_has_error){

            toast.error({
                title: 'Missing information',
                message: 'Please check the highlighted fields and try again.',
            });

        }else{

        setLoading(true);
        
        apiFetch('/signup', {
            method: 'POST',
            skipAuth: true, 
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                email: email,
                phone: phone,
                phone_country_code: selectedCountry.dial,
                password: password,
                password_confirmation: passwordConfirmation,
                business_type: businessType,
                dot_number: businessType === '3pl_freight_broker' ? dotNumber.trim() : null,
                company_name: company,
            }),
        })
        .then((data) => {
            if (data && data.status) {
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
        role: roleValue,                 // e.g. "owner_admin" — safe for role checks like ===
        roleDetails: (userData.role && typeof userData.role === 'object') ? userData.role : null, // keep id/name/level if you need them elsewhere
        name: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email,
    };
    localStorage.setItem('crm_user', JSON.stringify(normalizedUser));
    if (userData.company) {
        localStorage.setItem('crm_company', JSON.stringify(userData.company));
    }
}

                // No pricing API yet — clear any stale plan flag so the
                // guard on /dashboard forces a fresh plan selection.
                localStorage.removeItem('crm_plan_selected');
        
                toast.success({
                    title: 'Account Created',
                    message: data.message || `Welcome, ${firstName}!`,
                    duration: 2500,
                });
        
                // Send the new user to pick a plan before they can reach
                // the dashboard. `fromSignup` tells the Subscription page
                // to redirect to /dashboard once a plan is chosen.
                // NOTE: this path must match the route registered in App.jsx
                // (Route path="/subscribe"), not "/subscription".
                navigate('/subscribe', { state: { fromSignup: true } });
            } else {
                toast.error({
                    title: 'Signup Failed',
                    message: (data && data.message) ? String(data.message) : 'Registration failed. Please try again.',
                    duration: 6000,
                });
            }
        })
        .catch((err) => {
            const safeMessage =
                (err && typeof err.message === 'string' && err.message.trim() !== '')
                    ? err.message
                    : 'Registration failed. Please try again.';
        
            if (err?.errors?.email) {
                setEmailError(true);
            }
        
            setTimeout(() => {
                toast.error({
                    title: 'Signup Failed',
                    message: safeMessage,
                    duration: 6000,
                });
            }, 0);
        })
        .finally(() => {
            setLoading(false);
        });
        }
    }

    return (
        <div
            className="fixed inset-0 w-screen h-screen overflow-y-auto overflow-x-hidden z-[1000] bg-white"
        >
            <div className="flex flex-col xl:flex-row w-full min-h-full">

                <div className="relative order-2 xl:order-1 w-full xl:w-1/2 bg-[#178A54] flex items-center justify-center overflow-hidden min-h-[420px] sm:min-h-[500px] md:min-h-[560px] lg:min-h-[600px] xl:min-h-full">
                    <GridBackground />
                    <RingDecoration className="hidden sm:block w-20 h-20 md:w-28 md:h-28 top-8 right-10" />
                    <RingDecoration className="hidden sm:block w-12 h-12 md:w-16 md:h-16 top-[42%] left-[8%]" />
                    <RingDecoration className="hidden sm:block w-10 h-10 md:w-14 md:h-14 top-[35%] left-1/2 -translate-x-1/2" />

                    <div className="relative z-[2] w-full max-w-[520px] flex flex-col items-center px-5 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 box-border">
                        <div className="text-center text-white mb-6 md:mb-8">
                            <h2 className="text-[20px] sm:text-[24px] md:text-[28px] font-light leading-[26px] sm:leading-[32px] md:leading-[36px] mb-3 md:mb-4 max-w-[380px] mx-auto">
                                The easiest way to manage your Shipment.
                            </h2>
                            <p className="text-sm md:text-base m-0 text-[#D9F2E5]">Join now!</p>
                        </div>

                        <div className="relative w-full max-w-[420px] sm:max-w-[480px] md:max-w-[560px] xl:w-[600px] xl:max-w-[540px]">
                            <div className="absolute inset-0 rounded-2xl bg-white/25 blur-[1px] rotate-[-4deg] translate-y-3 shadow-[0_20px_35px_rgba(0,0,0,0.18)]" />
                            <div className="absolute inset-0 rounded-2xl bg-white/45 blur-[0.5px] rotate-[3deg] translate-y-1.5 shadow-[0_20px_35px_rgba(0,0,0,0.2)]" />
                            <div className="relative rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.28)] bg-white p-2">
                                <img
                                    src={image}
                                    alt="Dashboard preview"
                                    className="block w-full h-[220px] sm:h-[300px] md:h-[420px] object-cover object-top rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="order-1 xl:order-2 w-full xl:w-1/2 bg-white flex items-center justify-center px-5 sm:px-6 md:px-10 lg:px-12 xl:px-8 py-8 md:py-10 box-border">
                    <div className="w-full max-w-[520px]">
                        <img
                            src={logo}
                            alt="Logo"
                            className="h-9 md:h-[42px] w-auto mb-6 md:mb-10 block"
                        />
                        <div>
                            <h1 className="text-[20px] sm:text-[22px] md:text-[25px] leading-tight font-bold text-gray-900 m-0 mb-2 md:mb-3 tracking-tight">
                                Create Account
                            </h1>
                            <p className="text-sm md:text-[15px] text-gray-500 m-0 mb-6 md:mb-8">
                                Enter your details below to get started.
                            </p>
                        </div>

                        <form onSubmit={signupSubmit} className="flex flex-col gap-4 md:gap-5">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">

                                <IconField
                                    icon={<PersonOutlineIcon sx={{ fontSize: 19 }} />}
                                    placeholder="First Name"
                                    value={firstName}
                                    onChange={(e) => {
                                        setFirstName(e.target.value);
                                        if (firstNameError) setFirstNameError(false);
                                    }}
                                    error={firstNameError}
                                    helperText={firstNameError ? 'Please enter your first name' : ''}
                                />

                                <IconField
                                    icon={<PersonOutlineIcon sx={{ fontSize: 19 }} />}
                                    placeholder="Last Name"
                                    value={lastName}
                                    onChange={(e) => {
                                        setLastName(e.target.value);
                                        if (lastNameError) setLastNameError(false);
                                    }}
                                    error={lastNameError}
                                    helperText={lastNameError ? 'Please enter your last name' : ''}
                                />

                                <IconField
                                    icon={<EmailOutlinedIcon sx={{ fontSize: 19 }} />}
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError(false);
                                    }}
                                    error={emailError}
                                    helperText={emailError ? 'Please enter valid email address' : ''}
                                />

<div className="flex gap-2 items-start">
    <CountryCodeDropdown value={countryCode} onChange={setCountryCode} />
    <div className="flex-1 min-w-0">
        <IconField
            icon={<LocalPhoneOutlinedIcon sx={{ fontSize: 19 }} />}
            placeholder="Phone"
            value={phone}
            onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(false);
            }}
            error={phoneError}
            helperText={
                phoneError
                    ? `Please enter a valid ${COUNTRY_CODES.find((c) => c.code === countryCode)?.digits ?? 10}-digit phone number`
                    : ''
            }
        />
    </div>
</div>

                                <IconField
                                    icon={<LockOutlinedIcon sx={{ fontSize: 19 }} />}
                                    placeholder="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setPassword(value);
                                        if (passwordError) setPasswordError(false);
                                        if (passwordConfirmation !== '') {
                                            setPasswordConfirmationError(value !== passwordConfirmation);
                                        }
                                    }}
                                    error={passwordError}
                                    helperText={passwordError ? 'Please enter a password (min 8 characters)' : ''}
                                    trailing={
                                        <button
                                            type="button"
                                            className="flex items-center justify-center cursor-pointer text-gray-400 bg-transparent border-0 p-0"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? <Visibility sx={{ fontSize: 19 }} /> : <VisibilityOff sx={{ fontSize: 19 }} />}
                                        </button>
                                    }
                                />

                                <IconField
                                    icon={<LockOutlinedIcon sx={{ fontSize: 19 }} />}
                                    placeholder="Confirm Password"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={passwordConfirmation}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setPasswordConfirmation(value);
                                        if (passwordConfirmationError) {
                                            setPasswordConfirmationError(value !== password);
                                        }
                                    }}
                                    error={passwordConfirmationError}
                                    helperText={passwordConfirmationError ? 'Passwords must match' : ''}
                                    trailing={
                                        <button
                                            type="button"
                                            className="flex items-center justify-center cursor-pointer text-gray-400 bg-transparent border-0 p-0"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex={-1}
                                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showConfirmPassword ? <Visibility sx={{ fontSize: 19 }} /> : <VisibilityOff sx={{ fontSize: 19 }} />}
                                        </button>
                                    }
                                />

                                <div className="sm:col-span-2">
                                    <BusinessTypeDropdown
                                        value={businessType}
                                        error={businessTypeError}
                                        onChange={(val) => {
                                            setBusinessType(val);
                                            if (businessTypeError) setBusinessTypeError(false);
                                            if (val !== '3pl_freight_broker') {
                                                setDotNumber('');
                                                setDotNumberError(false);
                                            }
                                        }}
                                    />
                                </div>

                                {businessType === '3pl_freight_broker' && (
                                    <div className="sm:col-span-2">
                                        <IconField
                                            icon={<BadgeOutlinedIcon sx={{ fontSize: 19 }} />}
                                            placeholder="DOT Number"
                                            value={dotNumber}
                                            onChange={(e) => {
                                                setDotNumber(e.target.value);
                                                if (dotNumberError) setDotNumberError(false);
                                            }}
                                            error={dotNumberError}
                                            helperText={dotNumberError ? 'DOT number is required for 3PL / Freight Broker' : ''}
                                        />
                                    </div>
                                )}
                            </div>

                            <IconField
                                icon={<BusinessOutlinedIcon sx={{ fontSize: 19 }} />}
                                placeholder="Company Name"
                                value={company}
                                onChange={(e) => {
                                    setCompany(e.target.value);
                                    if (companyError) setCompanyError(false);
                                }}
                                error={companyError}
                                helperText={companyError ? 'Please enter your company name' : ''}
                            />

                            <Button
                                color="secondary"
                                variant="contained"
                                size="large"
                                sx={{ width: '100%', ...submitBtnSx }}
                                type="submit"
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </Button>

                            <div className="flex items-center text-center text-gray-400 text-sm my-2">
                                <span className="flex-1 border-b border-[#E4E7EC]"></span>
                                <span className="px-4">or</span>
                                <span className="flex-1 border-b border-[#E4E7EC]"></span>
                            </div>

                            <div className="text-center text-sm text-gray-500">
                                Already have an account?{' '}
                                <Link to="/" className="font-semibold no-underline" style={{ color: COLOR_MAIN }}>
                                    Login
                                </Link>
                            </div>

                        </form>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Signup;