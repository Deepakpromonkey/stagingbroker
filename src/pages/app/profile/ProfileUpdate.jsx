import React, { useState, useEffect } from 'react';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Person as UserIconMui,
    MailOutlined as MailIconMui,
    Phone as PhoneIconMui,
    WorkspacePremium as BadgeIconMui,
    CalendarToday as CalendarIconMui,
    AccessTime as ClockIconMui,
    FactCheck as ChecklistIconMui,
    Lock as LockIconMui,
    Edit as PencilIconMui,
    Close as CloseIconMui,
    CheckCircle as CheckCircleIconMui,
    Shield as ShieldIconMui,
    ArrowForward as ArrowRightIconMui,
} from '@mui/icons-material';
import { apiFetch, getToken } from '../../../lib/api';
import { toast, ToastContainer} from '../../../components/ui/Toaster'

const NAVY = '#0F1B33';
const NAVY_LIGHT = '#1B2C52';
const INDIGO = '#4F46E5';
const ACCENT = '#2563EB';
const ACCENT_DARK = '#1D4ED8';
const BORDER = '#E3E7EC';
const FIELD_BG = '#F7F8FA';

const TOKEN_KEY = 'crm_auth_token';
const USER_KEY = 'crm_user';

const EyeIcon = ({ show }) =>
    show ? <VisibilityIcon sx={{ fontSize: 15 }} /> : <VisibilityOffIcon sx={{ fontSize: 15 }} />;

const UserIcon = () => <UserIconMui sx={{ fontSize: 15 }} />;

const MailIcon = () => <MailIconMui sx={{ fontSize: 15 }} />;

const PhoneIcon = () => <PhoneIconMui sx={{ fontSize: 15 }} />;

const BadgeIcon = () => <BadgeIconMui sx={{ fontSize: 15 }} />;

const CalendarIcon = () => <CalendarIconMui sx={{ fontSize: 15 }} />;

const ClockIcon = () => <ClockIconMui sx={{ fontSize: 15 }} />;

const ChecklistIcon = () => <ChecklistIconMui sx={{ fontSize: 16 }} />;

const LockIcon = ({ size = 14 }) => <LockIconMui sx={{ fontSize: size }} />;

const PencilIcon = ({ color = '#fff' }) => <PencilIconMui sx={{ fontSize: 13, color }} />;

const CloseIcon = () => <CloseIconMui sx={{ fontSize: 16 }} />;

const CheckCircleIcon = () => <CheckCircleIconMui sx={{ fontSize: 9, color: '#fff' }} />;

const ShieldIcon = () => <ShieldIconMui sx={{ fontSize: 20, color: '#fff' }} />;

const ArrowRightIcon = () => <ArrowRightIconMui sx={{ fontSize: 12 }} />;

const CHIP_THEMES = {
    indigo: { bg: '#EEF2FF', fg: '#4F46E5' },
    emerald: { bg: '#ECFDF5', fg: '#059669' },
    amber: { bg: '#FFFBEB', fg: '#D97706' },
    sky: { bg: '#F0F9FF', fg: '#0284C7' },
    rose: { bg: '#FFF1F2', fg: '#E11D48' },
    slate: { bg: '#F8FAFC', fg: '#475569' },
};

function InfoBlock({ label, value, icon, theme = 'indigo' }) {
    const c = CHIP_THEMES[theme];
    return (
        <div className="group flex items-start gap-3.5 p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-[0_4px_16px_rgba(15,27,51,0.06)] transition-all">
            <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                style={{ background: c.bg, color: c.fg }}
            >
                {icon}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 pt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
                <span className="text-[15px] font-semibold text-gray-900 break-all leading-snug">{value || '—'}</span>
            </div>
        </div>
    );
}

function TextInput({ label, icon, ...inputProps }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
                {label}
            </label>
            <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 bg-[#F7F8FA] border border-[#E3E7EC] focus-within:border-[#4F46E5] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#EEF2FF] transition-all">
                <span className="text-gray-400 flex-shrink-0">{icon}</span>
                <input
                    {...inputProps}
                    className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400"
                />
            </div>
        </div>
    );
}


function RequirementRow({ met, children }) {
    return (
        <div className="flex items-center gap-2">
            <div
                className="w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                    border: `1.5px solid ${met ? INDIGO : '#D1D5DB'}`,
                    backgroundColor: met ? INDIGO : 'transparent',
                }}
            >
                {met && <CheckCircleIcon />}
            </div>
            <span className="text-[12.5px] font-medium" style={{ color: met ? NAVY : '#9AA2B1' }}>
                {children}
            </span>
        </div>
    );
}

function getPasswordStrength(pw) {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;
    return Math.min(score, 3);
}

const STRENGTH_META = [
    { label: '', color: '#E3E7EC' },
    { label: 'Weak', color: '#DC2626' },
    { label: 'Good', color: '#D97706' },
    { label: 'Strong', color: '#059669' },
];

function PasswordField({ label, value, onChange, error, show, onToggle, placeholder, name, autoComplete, meter }) {
    const strength = meter ? getPasswordStrength(value) : 0;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                </label>
                {meter && value.length > 0 && (
                    <span className="text-[10.5px] font-bold" style={{ color: STRENGTH_META[strength].color }}>
                        {STRENGTH_META[strength].label}
                    </span>
                )}
            </div>
            <div
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition-all"
                style={{
                    backgroundColor: error ? '#FEF3F2' : FIELD_BG,
                    border: `1.5px solid ${error ? '#D92D20' : BORDER}`,
                    boxShadow: !error && value ? `0 0 0 4px ${INDIGO}0D` : 'none',
                }}
            >
                <span className="text-gray-400 flex-shrink-0"><LockIcon /> </span>
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    name={name}
                    autoComplete={autoComplete}
                    className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="text-gray-400 hover:text-[#0F1B33] flex-shrink-0"
                >
                    <EyeIcon show={show} />
                </button>
            </div>

            {meter && value.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-colors"
                            style={{ background: i < strength ? STRENGTH_META[strength].color : '#E3E7EC' }}
                        />
                    ))}
                </div>
            )}

            {error && (
                <p className="text-[11.5px] font-medium text-red-600 m-0">{error}</p>
            )}
        </div>
    );
}


const ProfileUpdate = () => {
    const [accountToken, setAccountToken] = useState(false);
    const [user, setUser] = useState({});
    const [role, setRole] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        contact: '',
        profile_pic_url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [avatarError, setAvatarError] = useState(false);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPasswordError, setOldPasswordError] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    useEffect(() => {
        setAvatarError(false);
    }, [user.profile_pic_url]);


    useEffect(() => {
        const loadData = () => {
            const token = getToken() || localStorage.getItem(TOKEN_KEY);
            const storedUser = localStorage.getItem(USER_KEY);
            const storedRole = localStorage.getItem('role');

            if (token) {
                setAccountToken(token);
            } else {
                // eslint-disable-next-line no-console
                console.warn(`[ProfileUpdate] No auth token found under localStorage key "${TOKEN_KEY}".`);
            }

            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setFormData({
                        first_name: parsedUser.first_name || '',
                        last_name: parsedUser.last_name || '',
                        contact: parsedUser.phone ?? parsedUser.contact ?? '',
                        profile_pic_url: parsedUser.profile_pic_url || ''
                    });
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.warn('[ProfileUpdate] Stored user value was not valid JSON:', storedUser, err);
                }
            } else {
                // eslint-disable-next-line no-console
                console.warn(`[ProfileUpdate] No user object found under localStorage key "${USER_KEY}". Fields will render blank until login stores it.`);
            }

            if (storedRole) {
                try {
                    setRole(JSON.parse(storedRole));
                } catch {
                    setRole(storedRole);
                }
            }
        };

        loadData();

        window.addEventListener('storage', loadData);
        return () => window.removeEventListener('storage', loadData);
    }, []);

    // Keep the edit form in sync when the drawer opens / user changes.
    useEffect(() => {
        if (editOpen && user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                contact: user.phone ?? user.contact ?? '',
                profile_pic_url: user.profile_pic_url || ''
            });
        }
    }, [editOpen, user]);

    const getInitials = () => {
        const f = user.first_name?.[0] || '';
        const l = user.last_name?.[0] || '';
        return (f + l).toUpperCase() || '?';
    };

    const getRoleLabel = () => {
        // Your API returns role as an object: { id, slug, name, level }.
        // Prefer that real shape first; fall back to role_names / a plain
        // role state only if it's ever present in some other response shape.
        if (user.role && typeof user.role === 'object') {
            return user.role.name || user.role.slug || null;
        }
        if (user.role_names) return user.role_names;
        const currentRole = role || user.role;
        if (!currentRole) return null;
        return typeof currentRole === 'object'
            ? (currentRole.name || currentRole.label || currentRole.role || '')
            : String(currentRole);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Temporary URL for immediate frontend preview.
            const previewUrl = URL.createObjectURL(file);

            setFormData(prev => ({
                ...prev,
                profile_pic_url: previewUrl,
                profile_pic_file: file
            }));
        }
    };

    // ---------------------------------------------------------------------
    // Update profile — POST {{base_url}}/update-profile
    //
    // Sent as multipart/form-data:
    //   first_name, last_name, phone, profile_image (file, optional)
    //
    // NOTE: apiFetch must NOT force a "Content-Type: application/json"
    // header when the body is a FormData instance — the browser needs to
    // set "multipart/form-data; boundary=..." itself. If your apiFetch
    // helper always sets Content-Type: application/json, either add a
    // FormData check there (skip the header when body instanceof FormData)
    // or swap the call below for a raw fetch with the Bearer token.
    // ---------------------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const payload = new FormData();
            payload.append('first_name', formData.first_name);
            payload.append('last_name', formData.last_name);
            payload.append('phone', formData.contact);

            if (formData.profile_pic_file) {
                payload.append('profile_image', formData.profile_pic_file);
            }

            const rawResult = await apiFetch('/update-profile', {
                method: 'POST',
                body: payload
            });

            const result = rawResult?.original ? rawResult.original : rawResult;

            if (result?.status) {
                const updatedUser = result?.data || result?.user || result?.row;

                // Backend returns the uploaded image URL as "profile_image",
                // but the rest of this component (avatar <img>, getInitials
                // fallback, etc.) reads "profile_pic_url". Map it across so
                // a fresh upload actually shows up without a page reload.
                // Keep checking a couple of other likely key names too, in
                // case the API response shape changes later.
                const serverPicUrl =
                    updatedUser?.profile_image ||
                    updatedUser?.profile_pic_url ||
                    result?.profile_image ||
                    result?.profile_pic;

                if (updatedUser) {
                    const mergedUser = {
                        ...user,
                        ...updatedUser,
                        profile_pic_url: serverPicUrl || user.profile_pic_url
                    };
                    localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
                    setUser(mergedUser);
                    // The native "storage" event only fires in *other* tabs,
                    // not this one, so components like AppHeader that read
                    // the user from localStorage won't see this update until
                    // a full page reload. Broadcast a custom event so any
                    // mounted component in this tab can refresh immediately.
                    window.dispatchEvent(new CustomEvent('crm-user-updated', { detail: mergedUser }));
                } else {
                    const syncedUser = {
                        ...user,
                        first_name: formData.first_name,
                        last_name: formData.last_name,
                        contact: formData.contact,
                        profile_pic_url: serverPicUrl || user.profile_pic_url
                    };
                    localStorage.setItem(USER_KEY, JSON.stringify(syncedUser));
                    setUser(syncedUser);
                    window.dispatchEvent(new CustomEvent('crm-user-updated', { detail: syncedUser }));
                }

                toast.success(result?.message || 'Profile updated successfully.');
                setEditOpen(false);
            } else {
                toast.error(result?.message || 'Failed to update profile.');
            }
        } catch (error) {
            toast.error(error?.message || 'An error occurred while updating profile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const lengthMet = newPassword.length >= 6;
    const matchMet = newPassword.length > 0 && confirmPassword === newPassword;

    const resetPasswordFields = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOldPasswordError('');
        setNewPasswordError('');
        setConfirmPasswordError('');
        setShowOld(false);
        setShowNew(false);
        setShowConfirm(false);
    };

    // ---------------------------------------------------------------------
    // Change password — matches the Postman request:
    //   POST {{base_url}}/change-password
    //   { "current_password": "...", "password": "...", "password_confirmation": "..." }
    // ---------------------------------------------------------------------
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        let hasError = false;
        if (!oldPassword) { setOldPasswordError('Current password is required.'); hasError = true; } else setOldPasswordError('');
        if (!newPassword || newPassword.length < 6) { setNewPasswordError('Password must be at least 6 characters.'); hasError = true; } else setNewPasswordError('');
        if (!confirmPassword || confirmPassword !== newPassword) { setConfirmPasswordError('Must match new password.'); hasError = true; } else setConfirmPasswordError('');

        if (hasError) return;

        setPasswordSubmitting(true);

        try {
            // apiFetch -> `${API_BASE}/change-password`, i.e. matches the
            // Postman request's {{base_url}}/change-password, with JSON
            // Content-Type + Bearer token added automatically.
            //
            // On a 4xx response, apiFetch throws an Error whose .message is
            // already the server's top-level "message" field — e.g. "Your
            // current password is incorrect." — so we don't need to dig into
            // result.errors ourselves; the catch block below handles it.
            const rawResult = await apiFetch('/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: oldPassword,
                    password: newPassword,
                    password_confirmation: confirmPassword
                })
            });

            const result = rawResult?.original ? rawResult.original : rawResult;

if (result?.status) {
    toast.success(result.message || "Password updated successfully.");

    resetPasswordFields();
    setPasswordOpen(false);
} else {
                toast.error(result?.message || 'Failed to update password.');
            }
        } catch (error) {
            // Surfaces messages like "Your current password is incorrect."
            // straight from the API via a toast instead of an inline banner.
            toast.error(error?.message || 'An error occurred while updating password.');
        } finally {
            setPasswordSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">

            {/* Remove this if <ToastContainer /> is already mounted once
                globally (e.g. in your root layout) — mounting it twice just
                means two listeners on the same store, which is harmless,
                but one is enough. */}
            <ToastContainer />

            <div className="mb-8">
                <h1 className="text-[40px] font-semibold tracking-tight text-slate-900">My Profile</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                    View your account details, update your personal information, and manage your password and security settings.
                </p>
            </div>

            <div className="max-w-5xl mx-auto flex flex-col gap-6">

                <div
                    className="relative overflow-hidden rounded-[28px] px-7 py-8 md:px-10 md:py-10"
                    style={{ background: `linear-gradient(120deg, ${NAVY} 0%, ${NAVY_LIGHT} 55%, ${INDIGO} 130%)` }}
                >

                    <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row md:items-center gap-6">

                        <div className="flex items-center gap-5 flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                                <div className="p-[3px] rounded-[22px]" style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8)' }}>
                                    {user.profile_pic_url && !avatarError ? (
                                        <img
                                            src={user.profile_pic_url}
                                            alt="Profile"
                                            onError={() => setAvatarError(true)}
                                            className="w-20 h-20 md:w-24 md:h-24 rounded-[19px] object-cover border-[3px] border-[#0F1B33]"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-[19px] border-[3px] border-[#0F1B33] bg-white/10 flex items-center justify-center">
                                            <span className="text-2xl font-bold text-white">{getInitials()}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-[3px] border-[#0F1B33]" />
                            </div>

                            <div className="min-w-0">
                                <h2 className="text-white font-bold text-xl md:text-2xl tracking-tight truncate">
                                    {user.first_name || user.last_name
                                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                                        : 'Your Name'}
                                </h2>
                                <p className="text-indigo-200/80 text-sm mt-0.5 truncate">{user.email || 'your.email@company.com'}</p>

                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-3 py-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-white text-[11px] font-semibold tracking-wide uppercase">
                                            Active session
                                        </span>
                                    </div>
                                    {getRoleLabel() && (
                                        <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-3 py-1">
                                            <span className="text-indigo-200"><BadgeIcon /></span>
                                            <span className="text-white text-[11px] font-semibold tracking-wide uppercase">
                                                {getRoleLabel()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2.5 flex-shrink-0">
                            <button
                                onClick={() => { resetPasswordFields(); setPasswordOpen(true); }}
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
                            >
                                <LockIcon />
                                <span className="hidden sm:inline">Change Password</span>
                            </button>
                            <button
                                onClick={() => setEditOpen(true)}
                                className="flex items-center gap-2 bg-white text-[#0F1B33] font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10"
                            >
                                <PencilIcon color="#0F1B33" />
                                Edit Profile
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[28px] border border-[#edf2f7] shadow-sm px-6 py-6 md:px-8 md:py-8">
                    <div className="flex items-center gap-2 text-gray-900 font-bold text-base mb-5">
                        <span className="text-[#4F46E5]"><ChecklistIcon /></span>
                        Personal Details
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InfoBlock label="Display Name" value={`${user.first_name || ''} ${user.last_name || ''}`.trim()} icon={<UserIcon />} theme="indigo" />
                        <InfoBlock label="Corporate Email" value={user.email} icon={<MailIcon />} theme="sky" />
                        <InfoBlock label="Access Level" value={getRoleLabel() || '—'} icon={<BadgeIcon />} theme="amber" />
                        <InfoBlock label="Mobile Contact" value={user.phone ?? user.contact} icon={<PhoneIcon />} theme="rose" />
                        <InfoBlock label="Onboarding Date" value={user.added_on_formatted} icon={<CalendarIcon />} theme="emerald" />
                        <InfoBlock label="Last Updated" value={user.updated_on_formatted || user.added_on_formatted} icon={<ClockIcon />} theme="slate" />
                    </div>
                </div>

            </div>

            {editOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setEditOpen(false)}
                    />

                    <div className="absolute inset-y-0 right-0 max-w-full flex">
                        <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col h-full">
                            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-y-auto">

                                {/* ---- Gradient header with overlapping avatar ---- */}
                                <div
                                    className="relative px-8 pt-7 pb-16 flex-shrink-0 overflow-hidden"
                                    style={{ background: `linear-gradient(120deg, ${NAVY} 0%, ${NAVY_LIGHT} 55%, ${INDIGO} 140%)` }}
                                >
                                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                                    <button
                                        type="button"
                                        onClick={() => setEditOpen(false)}
                                        className="absolute top-5 right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                    >
                                        <CloseIcon />
                                    </button>

                                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-indigo-200/80 m-0">
                                        Account
                                    </p>
                                    <h2 className="text-white text-xl font-bold mt-1 m-0">
                                        Edit Profile
                                    </h2>
                                    {user.updated_on_formatted && (
                                        <p className="text-indigo-200/60 text-xs mt-1">
                                            Last updated {user.updated_on_formatted}
                                        </p>
                                    )}
                                </div>

                                <div className="flex-1 px-8">

                                    <div className="-mt-12 mb-8 flex flex-col items-center">
                                        <div className="relative">
                                            <div className="p-[3px] rounded-2xl" style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8)' }}>
                                                {formData.profile_pic_url ? (
                                                    <img
                                                        src={formData.profile_pic_url}
                                                        alt="Preview"
                                                        className="w-24 h-24 rounded-[15px] object-cover border-[3px] border-white shadow-lg"
                                                    />
                                                ) : (
                                                    <div className="w-24 h-24 rounded-[15px] bg-[#EEF2FF] border-[3px] border-white shadow-lg flex items-center justify-center">
                                                        <span className="text-xl font-bold text-[#4F46E5]">{getInitials()}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <input
                                                type="file"
                                                id="drawer-avatar-input"
                                                accept="image/png, image/jpeg, image/webp"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />

                                            <label
                                                htmlFor="drawer-avatar-input"
                                                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow transition-colors"
                                                style={{ background: INDIGO }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = ACCENT_DARK}
                                                onMouseLeave={(e) => e.currentTarget.style.background = INDIGO}
                                            >
                                                <PencilIcon />
                                            </label>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-3">PNG or JPG, up to 5MB</p>
                                    </div>

                                    <div className="pb-8">
                                        <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                                            Contact Information
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <TextInput
                                                label="First Name"
                                                icon={<UserIcon />}
                                                type="text"
                                                name="first_name"
                                                value={formData.first_name}
                                                onChange={handleInputChange}
                                                required
                                            />
                                            <TextInput
                                                label="Last Name"
                                                icon={<UserIcon />}
                                                type="text"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>

                                        <TextInput
                                            label="Mobile"
                                            icon={<PhoneIcon />}
                                            type="text"
                                            name="contact"
                                            value={formData.contact}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 bg-white px-8 py-4 flex gap-3 items-center flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setEditOpen(false)}
                                        className="px-6 py-2.5 border border-gray-200 text-xs font-bold text-gray-500 rounded-full hover:bg-gray-50 transition-colors uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 flex items-center justify-center gap-2 text-white text-xs font-bold px-6 py-2.5 rounded-full shadow transition-colors uppercase tracking-wider disabled:opacity-50"
                                        style={{ background: `linear-gradient(120deg, ${NAVY}, ${INDIGO})` }}
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                        {!isSubmitting && <ArrowRightIcon />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {passwordOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => !passwordSubmitting && setPasswordOpen(false)}
                    />

                    <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">

                        <div
                            className="relative px-6 py-6 overflow-hidden"
                            style={{ background: `linear-gradient(120deg, ${NAVY} 0%, ${NAVY_LIGHT} 55%, ${INDIGO} 140%)` }}
                        >
                            <div className="absolute -top-10 -right-6 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                            <button
                                type="button"
                                onClick={() => !passwordSubmitting && setPasswordOpen(false)}
                                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                            >
                                <CloseIcon />
                            </button>

                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                                style={{ background: 'rgba(255,255,255,0.12)' }}
                            >
                                <ShieldIcon />
                            </div>
                            <h2 className="text-white text-lg font-bold m-0">Update your password</h2>
                            <p className="text-indigo-200/70 text-xs mt-1 m-0">
                                You'll be signed out on every device once it's changed.
                            </p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="px-6 py-6 flex flex-col gap-5">

                            <PasswordField
                                label="Current password"
                                value={oldPassword}
                                onChange={(val) => { setOldPassword(val); if (oldPasswordError) setOldPasswordError(''); }}
                                error={oldPasswordError}
                                show={showOld}
                                onToggle={() => setShowOld(v => !v)}
                                placeholder="Enter current password"
                                name="current-password"
                                autoComplete="current-password"
                            />

                            <PasswordField
                                label="New password"
                                value={newPassword}
                                onChange={(val) => {
                                    setNewPassword(val);
                                    if (newPasswordError) setNewPasswordError('');
                                    if (confirmPasswordError && confirmPassword && val === confirmPassword) setConfirmPasswordError('');
                                }}
                                error={newPasswordError}
                                show={showNew}
                                onToggle={() => setShowNew(v => !v)}
                                placeholder="Min. 6 characters"
                                name="new-password"
                                autoComplete="new-password"
                                meter
                            />

                            <PasswordField
                                label="Confirm new password"
                                value={confirmPassword}
                                onChange={(val) => { setConfirmPassword(val); if (confirmPasswordError) setConfirmPasswordError(''); }}
                                error={confirmPasswordError}
                                show={showConfirm}
                                onToggle={() => setShowConfirm(v => !v)}
                                placeholder="Re-enter new password"
                                name="confirm-password"
                                autoComplete="new-password"
                            />

                            <div className="flex flex-col gap-2 bg-[#FAFBFC] border border-gray-100 rounded-xl px-4 py-3.5">
                                <RequirementRow met={lengthMet}>At least 6 characters</RequirementRow>
                                <RequirementRow met={matchMet}>Confirmation matches</RequirementRow>
                            </div>

                            <div className="flex gap-3 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setPasswordOpen(false)}
                                    disabled={passwordSubmitting}
                                    className="px-5 py-2.5 border border-gray-200 text-xs font-bold text-gray-500 rounded-full hover:bg-gray-50 transition-colors uppercase tracking-wider disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 text-white text-xs font-bold px-6 py-2.5 rounded-full shadow transition-colors uppercase tracking-wider disabled:opacity-50"
                                    style={{ background: `linear-gradient(120deg, ${ACCENT}, ${INDIGO})` }}
                                >
                                    {passwordSubmitting ? 'Updating...' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileUpdate;