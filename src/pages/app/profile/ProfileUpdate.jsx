import React, { useState, useEffect, useRef } from 'react';
import {
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Person as UserIconMui,
    MailOutlined as MailIconMui,
    Phone as PhoneIconMui,
    WorkspacePremium as BadgeIconMui,
    CalendarToday as CalendarIconMui,
    AccessTime as ClockIconMui,
    Lock as LockIconMui,
    Edit as PencilIconMui,
    Close as CloseIconMui,
    CheckCircle as CheckCircleIconMui,
    Shield as ShieldIconMui,
    ArrowForward as ArrowRightIconMui,
    Public as PublicIconMui,
    Search as SearchIconMui,
    KeyboardArrowDown as KeyboardArrowDownIconMui,
    ZoomIn as ZoomInIconMui,
    ZoomOut as ZoomOutIconMui,
    ContentCopy as CopyIconMui,
    Check as CheckIconMui,
    RestartAlt as ResetIconMui,
    RotateRight as RotateRightIconMui,
    AutoAwesome as GenerateIconMui,
} from '@mui/icons-material';
import { apiFetch, getToken } from '../../../lib/api';
import {
    COUNTRY_CODES,
    PHONE_VALIDATION,
    validatePhoneForCountry,
    sanitizePhoneDigits,
    resolveCountryCode,
    dialFor,
} from '../../../lib/phone';
import CountryFlag from '../../../components/CountryFlag';
import { toast, ToastContainer } from '../../../components/ui/Toaster'

const NAVY = '#0F1B33';
const NAVY_LIGHT = '#1B2C52';
const INDIGO = '#4F46E5';
const ACCENT = '#2563EB';
const ACCENT_DARK = '#1D4ED8';
const BORDER = '#E3E7EC';
const FIELD_BG = '#F7F8FA';
const PAGE_BG = '#F4F5F1';

const TOKEN_KEY = 'crm_auth_token';
const USER_KEY = 'crm_user';

const MAX_NAME_LENGTH = 50;

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 16;

const MAX_PHOTO_SIZE_MB = 5;
const ALLOWED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

function generateStrongPassword(length = 14) {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%^&*';
    const all = upper + lower + digits + symbols;

    const randomInt = (max) => {
        const buffer = new Uint32Array(1);
        window.crypto.getRandomValues(buffer);
        return buffer[0] % max;
    };
    const pick = (set) => set[randomInt(set.length)];

    const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
    while (chars.length < length) chars.push(pick(all));

    // Fisher–Yates shuffle so the guaranteed characters aren't always first.
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}

// Strips digits/symbols from name fields — letters and spaces only,
// capped at MAX_NAME_LENGTH.
function sanitizeName(rawValue) {
    return (rawValue || "").replace(/[^A-Za-z\s]/g, "").slice(0, MAX_NAME_LENGTH);
}

/*
| "Onboarding Date" / "Last Updated".
|
| The API sends a pre-formatted string, but the cached `crm_user` written at
| login predates those fields, so fall back to formatting the raw timestamp
| here rather than rendering an em dash at a user whose account plainly does
| have a creation date.
*/
function formatAccountDate(...candidates) {
    for (const candidate of candidates) {
        if (!candidate) continue;

        // Already formatted by the API — pass it straight through.
        if (typeof candidate === "string" && !/^\d{4}-\d{2}-\d{2}/.test(candidate)) {
            return candidate;
        }

        const date = new Date(candidate);

        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }
    }

    return "";
}
function withCacheBust(url, version) {
    if (!url) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${version}`;
}

const EyeIcon = ({ show }) =>
    show ? <VisibilityIcon sx={{ fontSize: 15 }} /> : <VisibilityOffIcon sx={{ fontSize: 15 }} />;

const UserIcon = () => <UserIconMui sx={{ fontSize: 14 }} />;
const MailIcon = () => <MailIconMui sx={{ fontSize: 14 }} />;
const PhoneIcon = () => <PhoneIconMui sx={{ fontSize: 14 }} />;
const BadgeIcon = () => <BadgeIconMui sx={{ fontSize: 14 }} />;
const CalendarIcon = () => <CalendarIconMui sx={{ fontSize: 14 }} />;
const ClockIcon = () => <ClockIconMui sx={{ fontSize: 14 }} />;
const LockIcon = ({ size = 13 }) => <LockIconMui sx={{ fontSize: size }} />;
const PencilIcon = ({ color = '#fff', size = 13 }) => <PencilIconMui sx={{ fontSize: size, color }} />;
const CloseIcon = () => <CloseIconMui sx={{ fontSize: 16 }} />;
const CheckCircleIcon = () => <CheckCircleIconMui sx={{ fontSize: 9, color: '#fff' }} />;
const ShieldIcon = ({ color = '#fff', size = 18 }) => <ShieldIconMui sx={{ fontSize: size, color }} />;
const ArrowRightIcon = () => <ArrowRightIconMui sx={{ fontSize: 12 }} />;
const GlobeIcon = () => <PublicIconMui sx={{ fontSize: 14 }} />;
const SearchIcon = () => <SearchIconMui sx={{ fontSize: 16 }} />;
const ChevronDownIcon = () => <KeyboardArrowDownIconMui sx={{ fontSize: 18 }} />;
const ZoomInIcon = () => <ZoomInIconMui sx={{ fontSize: 20 }} />;
const ZoomOutIcon = () => <ZoomOutIconMui sx={{ fontSize: 20 }} />;
const CopyIcon = () => <CopyIconMui sx={{ fontSize: 13 }} />;
const CheckIcon = () => <CheckIconMui sx={{ fontSize: 13 }} />;
const ResetIcon = () => <ResetIconMui sx={{ fontSize: 13 }} />;

/*
| Full-screen profile photo viewer.
|
| - Click the backdrop, press Esc (handled by the parent) or hit the X to close.
| - Zoom with the +/- buttons, the keyboard (+ / - / 0) or double-click / wheel.
| - With no photo it shows the initials avatar at full size.
*/
function ImageLightbox({ src, name, initials, onClose }) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const stageRef = useRef(null);
    const dragRef = useRef(null);
    const movedRef = useRef(false);

    const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
    const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
    const rotate = () => setRotation((r) => (r + 90) % 360);
    const zoomReset = () => { setZoom(1); setRotation(0); };

    // Click-and-drag to pan around the photo while zoomed in.
    const startDrag = (e) => {
        if (zoom <= ZOOM_MIN || !stageRef.current) return;
        movedRef.current = false;
        dragRef.current = {
            x: e.clientX,
            y: e.clientY,
            left: stageRef.current.scrollLeft,
            top: stageRef.current.scrollTop,
        };
    };
    const moveDrag = (e) => {
        if (!dragRef.current || !stageRef.current) return;
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
        stageRef.current.scrollLeft = dragRef.current.left - dx;
        stageRef.current.scrollTop = dragRef.current.top - dy;
    };
    const endDrag = () => { dragRef.current = null; };

    // Lock page scroll while the viewer is open.
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, []);

    // Keyboard zoom shortcuts.
    useEffect(() => {
        function handler(e) {
            if (e.key === '+' || e.key === '=') zoomIn();
            else if (e.key === '-' || e.key === '_') zoomOut();
            else if (e.key === '0') zoomReset();
            else if (e.key === 'r' || e.key === 'R') rotate();
        }
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const handleWheel = (e) => {
        if (!src) return;
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
    };

    const controlBtn =
        'w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center text-white transition-colors';

    return (
        <div
            className="fixed inset-0 z-[60] flex flex-col bg-black/85 backdrop-blur-md"
            style={{ animation: 'pfLightboxFade 180ms ease-out' }}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Profile photo"
        >
            <style>{`
                @keyframes pfLightboxFade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes pfLightboxPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
            `}</style>

            {/* Top bar */}
            <div
                className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="min-w-0">
                    <p className="text-white font-semibold text-sm sm:text-base truncate m-0">
                        {name || 'Profile photo'}
                    </p>
                    <p className="text-white/50 text-[11px] m-0">
                        {src
                            ? `${Math.round(zoom * 100)}% · ${zoom > ZOOM_MIN ? 'Drag to move · ' : ''}Scroll or double-click to zoom · R to rotate`
                            : 'No photo uploaded yet'}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {src && (
                        <>
                            <button type="button" className={controlBtn} onClick={zoomOut} disabled={zoom <= ZOOM_MIN} title="Zoom out (-)">
                                <ZoomOutIcon />
                            </button>
                            <button type="button" className={controlBtn} onClick={zoomIn} disabled={zoom >= ZOOM_MAX} title="Zoom in (+)">
                                <ZoomInIcon />
                            </button>
                            <button type="button" className={controlBtn} onClick={rotate} title="Rotate (R)">
                                <RotateRightIconMui sx={{ fontSize: 20 }} />
                            </button>
                            <button type="button" className={controlBtn} onClick={zoomReset} disabled={zoom === ZOOM_MIN && rotation === 0} title="Reset (0)">
                                <ResetIconMui sx={{ fontSize: 20 }} />
                            </button>
                        </>
                    )}
                    <button type="button" className={controlBtn} onClick={onClose} title="Close (Esc)">
                        <CloseIconMui sx={{ fontSize: 20 }} />
                    </button>
                </div>
            </div>

            {/* Stage */}
            <div
                ref={stageRef}
                className="flex-1 min-h-0 overflow-auto flex px-4 pb-6"
                onWheel={handleWheel}
                onMouseDown={startDrag}
                onMouseMove={moveDrag}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onClick={(e) => {
                    // A drag that ends on the backdrop shouldn't close the viewer.
                    if (movedRef.current) {
                        e.stopPropagation();
                        movedRef.current = false;
                    }
                }}
            >
                {src ? (
                    <img
                        src={src}
                        alt={name || 'Profile'}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={() => setZoom((z) => (z >= ZOOM_MAX ? ZOOM_MIN : Math.min(ZOOM_MAX, z + ZOOM_STEP * 2)))}
                        draggable={false}
                        className="m-auto rounded-2xl object-contain shadow-2xl select-none"
                        style={{
                            maxHeight: `${78 * zoom}vh`,
                            maxWidth: `${100 * zoom}%`,
                            cursor: zoom > ZOOM_MIN ? 'grab' : 'zoom-in',
                            transform: `rotate(${rotation}deg)`,
                            animation: 'pfLightboxPop 220ms ease-out',
                            transition: 'max-height 160ms ease, max-width 160ms ease, transform 200ms ease',
                        }}
                    />
                ) : (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="m-auto w-56 h-56 sm:w-72 sm:h-72 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20"
                        style={{
                            background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})`,
                            animation: 'pfLightboxPop 220ms ease-out',
                        }}
                    >
                        <span className="text-6xl sm:text-7xl font-bold text-white">{initials}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value, icon, copyText }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!copyText) return;
        try {
            await navigator.clipboard.writeText(copyText);
            setCopied(true);
            toast.success(`${label} copied.`);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            toast.error('Could not copy to clipboard.');
        }
    };

    return (
        <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#EEF0F3] last:border-0">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex-shrink-0">
                <span style={{ color: INDIGO }}>{icon}</span>
                {label}
            </span>
            <span className="flex items-center justify-end gap-2 min-w-0">
                <span className="text-[14px] sm:text-[15px] font-semibold text-gray-900 text-right break-all">
                    {value || '—'}
                </span>
                {copyText && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        title={`Copy ${label}`}
                        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#EEF2FF]"
                        style={{ color: copied ? '#059669' : '#9CA3AF' }}
                    >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                )}
            </span>
        </div>
    );
}

function TextInput({ label, icon, error, ...inputProps }) {
    const [focused, setFocused] = useState(false);
    const hasValue = Boolean(inputProps.value);
    const borderColor = error ? '#D92D20' : focused ? INDIGO : hasValue ? '#D7DCE3' : '#E3E7EC';

    return (
        <div>
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                        background: focused ? INDIGO : error ? '#FEF3F2' : '#EEF2FF',
                        color: focused ? '#fff' : error ? '#D92D20' : INDIGO,
                    }}
                >
                    {icon}
                </div>
                <div className="flex-1 min-w-0 relative">
                    <label
                        className="block text-[10px] font-semibold uppercase tracking-wide mb-1 transition-colors"
                        style={{ color: focused ? INDIGO : '#9CA3AF' }}
                    >
                        {label}
                    </label>
                    <input
                        {...inputProps}
                        onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
                        onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
                        className="w-full border-0 border-b-2 outline-none bg-transparent text-[15px] font-semibold text-gray-900 placeholder:text-gray-300 placeholder:font-medium pb-1.5 transition-colors"
                        style={{ borderColor }}
                    />
                </div>
            </div>
            {error && (
                <p className="text-[11.5px] font-medium text-red-600 mt-1.5 mb-0 ml-[52px]">{error}</p>
            )}
        </div>
    );
}

function CountryCodeSelect({ value, onChange, options }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef(null);

    useEffect(() => {
        function handler(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setQuery("");
            }
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selected = options.find((o) => o.code === value) || options[0];
    const filtered = query
        ? options.filter((o) =>
            `${o.code} ${o.dial} ${o.label}`.toLowerCase().includes(query.toLowerCase())
        )
        : options;

    return (
        <div className="flex items-center gap-3" ref={rootRef}>
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                style={{ background: open ? INDIGO : '#EEF2FF', color: open ? '#fff' : INDIGO }}
            >
                <GlobeIcon />
            </div>
            <div className="flex-1 min-w-0 relative">
                <label
                    className="block text-[10px] font-semibold uppercase tracking-wide mb-1 transition-colors"
                    style={{ color: open ? INDIGO : '#9CA3AF' }}
                >
                    Country Code
                </label>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="w-full flex items-center justify-between border-0 border-b-2 outline-none bg-transparent text-[15px] font-semibold text-gray-900 pb-1.5 transition-colors"
                    style={{ borderColor: open ? INDIGO : '#E3E7EC' }}
                >
                    <span className="flex items-center gap-2">
                        <CountryFlag code={selected.code} />
                        {selected.code} {selected.dial}
                    </span>
                    <ChevronDownIcon />
                </button>

                {open && (
                    <div className="absolute z-20 mt-1 w-full min-w-[240px] overflow-hidden rounded-xl border border-[#E3E7EC] bg-white shadow-lg">
                        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                            <SearchIcon />
                            <input
                                autoFocus
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search country or code…"
                                className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-300"
                            />
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                            {filtered.length === 0 && (
                                <p className="px-4 py-2.5 text-sm text-gray-400">No matches</p>
                            )}
                            {filtered.map((opt) => {
                                const isSelected = opt.code === value;
                                return (
                                    <button
                                        type="button"
                                        key={opt.code}
                                        onClick={() => {
                                            onChange(opt.code);
                                            setOpen(false);
                                            setQuery("");
                                        }}
                                        className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition ${isSelected ? "bg-[#EEF2FF] text-[#4F46E5]" : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        <CountryFlag code={opt.code} />
                                        <span className="font-semibold">{opt.code}</span>
                                        <span className="text-gray-400">{opt.dial}</span>
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
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

function PasswordField({ label, value, onChange, error, show, onToggle, placeholder, name, autoComplete, meter, maxLength }) {
    const strength = meter ? getPasswordStrength(value) : 0;
    const [focused, setFocused] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const borderColor = error ? '#D92D20' : focused ? INDIGO : value ? '#D7DCE3' : '#E3E7EC';
    const chipColor = error ? '#D92D20' : focused ? INDIGO : '#9CA3AF';
    const chipBg = error ? '#FEF3F2' : focused ? '#EEF2FF' : '#F7F8FA';

    return (
        <div className="flex items-start gap-3">
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-5 transition-colors"
                style={{ background: chipBg, color: chipColor }}
            >
                <LockIcon />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <label
                        className="text-[10px] font-semibold uppercase tracking-wide transition-colors"
                        style={{ color: focused ? INDIGO : '#9CA3AF' }}
                    >
                        {label}
                    </label>
                    {meter && value.length > 0 && (
                        <span className="text-[10.5px] font-bold" style={{ color: STRENGTH_META[strength].color }}>
                            {STRENGTH_META[strength].label}
                        </span>
                    )}
                </div>

                <div
                    className="flex items-center gap-2 border-b-2 pb-1.5 transition-colors"
                    style={{ borderColor }}
                >
                    <input
                        type={show ? 'text' : 'password'}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => { setFocused(false); setCapsOn(false); }}
                        onKeyDown={(e) => setCapsOn(Boolean(e.getModifierState && e.getModifierState('CapsLock')))}
                        onKeyUp={(e) => setCapsOn(Boolean(e.getModifierState && e.getModifierState('CapsLock')))}
                        placeholder={placeholder}
                        name={name}
                        autoComplete={autoComplete}
                        maxLength={maxLength}
                        className="flex-1 min-w-0 border-none outline-none bg-transparent text-[15px] font-semibold text-gray-900 placeholder:text-gray-300 placeholder:font-medium"
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
                    <div className="flex gap-1 mt-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-1 flex-1 rounded-full transition-colors"
                                style={{ background: i < strength ? STRENGTH_META[strength].color : '#E3E7EC' }}
                            />
                        ))}
                    </div>
                )}

                {capsOn && (
                    <p className="text-[11.5px] font-medium mt-1.5 mb-0" style={{ color: '#D97706' }}>
                        Caps Lock is on
                    </p>
                )}

                {error && <p className="text-[11.5px] font-medium text-red-600 mt-1.5 mb-0">{error}</p>}
            </div>
        </div>
    );
}


const ProfileUpdate = () => {
    const [accountToken, setAccountToken] = useState(false);
    const [user, setUser] = useState({});
    const [role, setRole] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);

    const [pictureVersion, setPictureVersion] = useState(0);

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState('');
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        contact: '',
        country_code: 'US',
        profile_pic_url: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [photoDragging, setPhotoDragging] = useState(false);

    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');
    const [contactError, setContactError] = useState('');

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

                  
                    const resolvedPicUrl = parsedUser.profile_pic_url || parsedUser.profile_image || '';
                    const normalizedUser = { ...parsedUser, profile_pic_url: resolvedPicUrl };

                    if (resolvedPicUrl && !parsedUser.profile_pic_url) {
                        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
                    }

                    setUser(normalizedUser);
                    setFormData({
                        first_name: normalizedUser.first_name || '',
                        last_name: normalizedUser.last_name || '',
                        contact: normalizedUser.phone ?? normalizedUser.contact ?? '',
                        country_code: resolveCountryCode(normalizedUser.country_code),
                        profile_pic_url: normalizedUser.profile_pic_url || ''
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

    useEffect(() => {
        let cancelled = false;

        const REFRESHED_FIELDS = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'country_code',
            'designation',
            'permissions',
            'added_on',
            'added_on_formatted',
            'updated_on',
            'updated_on_formatted',
        ];

        (async () => {
            try {
                const result = await apiFetch('/me');

                const fresh = result?.data ?? result;

                if (cancelled || !fresh || typeof fresh !== 'object') return;

                const patch = {};

                for (const field of REFRESHED_FIELDS) {
                    if (fresh[field] !== undefined) patch[field] = fresh[field];
                }

                // The API calls it profile_image; every screen here reads
                // profile_pic_url. Map it rather than leaving the avatar blank.
                if (fresh.profile_image) patch.profile_pic_url = fresh.profile_image;

                setUser((previous) => {
                    const merged = { ...previous, ...patch };

                    localStorage.setItem(USER_KEY, JSON.stringify(merged));
                    window.dispatchEvent(new CustomEvent('crm-user-updated', { detail: merged }));

                    return merged;
                });
            } catch {
                // A failed refresh is not worth a toast: whatever was cached at
                // login still renders.
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // Keep the edit form in sync when the drawer opens / user changes.
    useEffect(() => {
        if (editOpen && user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                contact: user.phone ?? user.contact ?? '',
                country_code: resolveCountryCode(user.country_code),
                profile_pic_url: user.profile_pic_url || ''
            });
            setFirstNameError('');
            setLastNameError('');
            setContactError('');
        }
    }, [editOpen, user]);

    // Unsaved-changes guard for the edit drawer.
    const isFormDirty =
        editOpen &&
        (
            formData.first_name !== (user.first_name || '') ||
            formData.last_name !== (user.last_name || '') ||
            String(formData.contact || '') !== String(user.phone ?? user.contact ?? '') ||
            formData.country_code !== resolveCountryCode(user.country_code) ||
            Boolean(formData.profile_pic_file)
        );

    const requestCloseEdit = () => {
        if (isFormDirty && !window.confirm('You have unsaved changes. Discard them?')) return;
        setEditOpen(false);
    };

    // Esc closes the top-most layer: photo viewer first, then the drawer / dialog.
    useEffect(() => {
        function handleEscape(e) {
            if (e.key !== 'Escape') return;

            if (lightboxOpen) {
                setLightboxOpen(false);
            } else if (passwordOpen && !passwordSubmitting) {
                setPasswordOpen(false);
            } else if (editOpen && !isSubmitting) {
                requestCloseEdit();
            }
        }

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [lightboxOpen, passwordOpen, passwordSubmitting, editOpen, isSubmitting, formData, user]);

    const onboardingDateLabel = formatAccountDate(
        user.added_on_formatted,
        user.added_on,
        user.created_at,
    );

    const lastUpdatedLabel = formatAccountDate(
        user.updated_on_formatted,
        user.updated_on,
        user.updated_at,
    ) || onboardingDateLabel;

    const getInitials = () => {
        const f = user.first_name?.[0] || '';
        const l = user.last_name?.[0] || '';
        return (f + l).toUpperCase() || '?';
    };

    const getRoleLabel = () => {

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

    // Open the photo viewer with a given image (or none → initials avatar).
    const openPhotoViewer = (src) => {
        setLightboxSrc(src || '');
        setLightboxOpen(true);
    };

    // Profile completeness — a small nudge to fill in the missing details.
    const completenessChecks = [
        Boolean(user.first_name),
        Boolean(user.last_name),
        Boolean(user.email),
        Boolean(user.phone ?? user.contact),
        Boolean(user.profile_pic_url) && !avatarError,
    ];
    const completenessPercent = Math.round(
        (completenessChecks.filter(Boolean).length / completenessChecks.length) * 100
    );
    const completenessColor =
        completenessPercent === 100 ? '#059669' : completenessPercent >= 60 ? INDIGO : '#D97706';

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // First / last name: letters + spaces only, capped at 50 chars.
    const handleNameInputChange = (field) => (e) => {
        const sanitized = sanitizeName(e.target.value);
        setFormData(prev => ({ ...prev, [field]: sanitized }));
        if (field === 'first_name' && firstNameError) setFirstNameError('');
        if (field === 'last_name' && lastNameError) setLastNameError('');
    };

    // Mobile: digits only, capped to the selected country's max length —
    // same sanitizer used in Step 1.
    const handleContactChange = (e) => {
        const sanitized = sanitizePhoneDigits(e.target.value, formData.country_code);
        setFormData(prev => ({ ...prev, contact: sanitized }));
        if (contactError) setContactError('');
    };

    const handleCountryCodeChange = (code) => {
        setFormData(prev => ({
            ...prev,
            country_code: code,
            // re-trim the existing number to the newly selected country's length
            contact: sanitizePhoneDigits(prev.contact, code),
        }));
        if (contactError) setContactError('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Reject unsupported types / oversized files before previewing.
            if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
                toast.error('Please choose a PNG, JPG or WEBP image.');
                e.target.value = '';
                return;
            }
            if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
                toast.error(`Image must be ${MAX_PHOTO_SIZE_MB}MB or smaller.`);
                e.target.value = '';
                return;
            }

            // Free the previous temporary preview, if any.
            if (formData.profile_pic_file && formData.profile_pic_url?.startsWith('blob:')) {
                URL.revokeObjectURL(formData.profile_pic_url);
            }

            // Temporary URL for immediate frontend preview.
            const previewUrl = URL.createObjectURL(file);

            setFormData(prev => ({
                ...prev,
                profile_pic_url: previewUrl,
                profile_pic_file: file
            }));
        }
    };

    // Drag & drop an image onto the photo area — same checks as the file picker.
    const handlePhotoDrop = (e) => {
        e.preventDefault();
        setPhotoDragging(false);
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFileChange({ target: { files, value: '' } });
        }
    };

    // Discard a newly picked (unsaved) photo and go back to the saved one.
    const handleRevertPhoto = () => {
        if (formData.profile_pic_url?.startsWith('blob:')) {
            URL.revokeObjectURL(formData.profile_pic_url);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';

        setFormData(prev => {
            const { profile_pic_file, ...rest } = prev;
            return { ...rest, profile_pic_url: user.profile_pic_url || '' };
        });
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedFirst = formData.first_name.trim();
        const trimmedLast = formData.last_name.trim();

        let hasError = false;

        if (!trimmedFirst) {
            setFirstNameError('First name is required.');
            hasError = true;
        } else if (!/^[A-Za-z\s]+$/.test(trimmedFirst)) {
            setFirstNameError('First name can only contain letters.');
            hasError = true;
        } else if (trimmedFirst.length > MAX_NAME_LENGTH) {
            setFirstNameError(`First name must be ${MAX_NAME_LENGTH} characters or fewer.`);
            hasError = true;
        } else {
            setFirstNameError('');
        }

        if (!trimmedLast) {
            setLastNameError('Last name is required.');
            hasError = true;
        } else if (!/^[A-Za-z\s]+$/.test(trimmedLast)) {
            setLastNameError('Last name can only contain letters.');
            hasError = true;
        } else if (trimmedLast.length > MAX_NAME_LENGTH) {
            setLastNameError(`Last name must be ${MAX_NAME_LENGTH} characters or fewer.`);
            hasError = true;
        } else {
            setLastNameError('');
        }

        const phoneCheck = validatePhoneForCountry(formData.contact, formData.country_code);
        if (phoneCheck !== true) {
            setContactError(phoneCheck);
            hasError = true;
        } else {
            setContactError('');
        }

        if (hasError) return;

        setIsSubmitting(true);

        try {
            const dialCode = dialFor(formData.country_code);

            const payload = new FormData();
            payload.append('first_name', trimmedFirst);
            payload.append('last_name', trimmedLast);
            payload.append('phone', formData.contact);
            payload.append('country_code', dialCode);

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

           
                const serverPicUrl =
                    updatedUser?.profile_image ||
                    updatedUser?.profile_pic_url ||
                    result?.profile_image ||
                    result?.profile_pic;

                if (updatedUser) {
                    const mergedUser = {
                        ...user,
                        ...updatedUser,
                        country_code: formData.country_code,
                        profile_pic_url: serverPicUrl || user.profile_pic_url
                    };
                    localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
                    setUser(mergedUser);
               
                    window.dispatchEvent(new CustomEvent('crm-user-updated', { detail: mergedUser }));
                } else {
                    const syncedUser = {
                        ...user,
                        first_name: trimmedFirst,
                        last_name: trimmedLast,
                        contact: formData.contact,
                        country_code: formData.country_code,
                        profile_pic_url: serverPicUrl || user.profile_pic_url
                    };
                    localStorage.setItem(USER_KEY, JSON.stringify(syncedUser));
                    setUser(syncedUser);
                    window.dispatchEvent(new CustomEvent('crm-user-updated', { detail: syncedUser }));
                }

                setPictureVersion((v) => v + 1);

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

    const lengthMet =
        newPassword.length >= MIN_PASSWORD_LENGTH &&
        newPassword.length <= MAX_PASSWORD_LENGTH;
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

    const handleGeneratePassword = async () => {
        const generated = generateStrongPassword();

        setNewPassword(generated);
        setConfirmPassword(generated);
        setNewPasswordError('');
        setConfirmPasswordError('');
        setShowNew(true);
        setShowConfirm(true);

        try {
            await navigator.clipboard.writeText(generated);
            toast.success('Strong password generated and copied.');
        } catch {
            toast.success('Strong password generated.');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        let hasError = false;

        if (!oldPassword) {
            setOldPasswordError('Current password is required.');
            hasError = true;
        } else if (oldPassword.length < MIN_PASSWORD_LENGTH || oldPassword.length > MAX_PASSWORD_LENGTH) {
            setOldPasswordError(`Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`);
            hasError = true;
        } else {
            setOldPasswordError('');
        }

        if (!newPassword) {
            setNewPasswordError('New password is required.');
            hasError = true;
        } else if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
            setNewPasswordError(`Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`);
            hasError = true;
        } else {
            setNewPasswordError('');
        }

        if (!confirmPassword || confirmPassword !== newPassword) {
            setConfirmPasswordError('Must match new password.');
            hasError = true;
        } else if (confirmPassword.length < MIN_PASSWORD_LENGTH || confirmPassword.length > MAX_PASSWORD_LENGTH) {
            setConfirmPasswordError(`Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`);
            hasError = true;
        } else {
            setConfirmPasswordError('');
        }

        if (hasError) return;

        setPasswordSubmitting(true);

        try {
       
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
         
            toast.error(error?.message || 'An error occurred while updating password.');
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const fullDisplayName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    const savedPhotoSrc =
        user.profile_pic_url && !avatarError
            ? withCacheBust(user.profile_pic_url, pictureVersion)
            : '';

    return (
        <div className="min-h-screen px-4 py-5 sm:px-6 md:px-8 lg:px-14" style={{ background: PAGE_BG }}>

            <ToastContainer />

            <div className="mb-6 sm:mb-8">
                <h1 className="text-[26px] sm:text-[32px] md:text-[40px] font-semibold tracking-tight text-slate-900">My Profile</h1>
                <p className="mt-2 max-w-2xl text-sm sm:text-[15px] leading-relaxed text-slate-500">
                    View your account details, update your personal information, and manage your password and security settings.
                </p>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr] gap-5 sm:gap-6 items-start">

                <div
                    className="md:sticky md:top-6 relative bg-white rounded-[24px] border border-[#edf2f7] pt-8 pb-6 px-6 flex flex-col items-center text-center"
                    style={{ boxShadow: '0 8px 30px rgba(15,27,51,0.06)' }}
                >
                    <div className="relative mb-4">
                        {/* Click the avatar to open the photo viewer popup */}
                        <button
                            type="button"
                            onClick={() => openPhotoViewer(savedPhotoSrc)}
                            title="View profile photo"
                            aria-label="View profile photo"
                            className="group relative block rounded-full cursor-zoom-in focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
                        >
                            <div className="p-[3px] rounded-full" style={{ background: `linear-gradient(135deg, ${INDIGO}, #38BDF8)` }}>
                                {user.profile_pic_url && !avatarError ? (
                                    <img
                                        src={withCacheBust(user.profile_pic_url, pictureVersion)}
                                        alt="Profile"
                                        onError={() => setAvatarError(true)}
                                        className="w-24 h-24 rounded-full object-cover border-[3px] border-white"
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full border-[3px] border-white flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_LIGHT})` }}>
                                        <span className="text-2xl font-bold text-white">{getInitials()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Hover hint */}
                            <div className="absolute inset-[3px] rounded-full bg-black/45 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity pointer-events-none">
                                <ZoomInIconMui sx={{ fontSize: 22, color: '#fff' }} />
                                <span className="text-[9.5px] font-bold uppercase tracking-wider text-white">View</span>
                            </div>
                        </button>
                        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-[3px] border-white pointer-events-none" />
                    </div>

                    <h2 className="font-bold text-lg text-slate-900 tracking-tight truncate max-w-full">
                        {user.first_name || user.last_name
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : 'Your Name'}
                    </h2>
                    <p className="text-gray-400 text-[13px] mt-0.5 truncate max-w-full">{user.email || 'your.email@company.com'}</p>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 rounded-full px-3 py-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-emerald-700 text-[10.5px] font-semibold tracking-wide uppercase">
                                Active
                            </span>
                        </div>
                        {getRoleLabel() && (
                            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: '#EEF2FF' }}>
                                <span style={{ color: INDIGO }}><BadgeIcon /></span>
                                <span className="text-[10.5px] font-semibold tracking-wide uppercase" style={{ color: INDIGO }}>
                                    {getRoleLabel()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Profile completeness */}
                    <div className="w-full mt-5 text-left">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                                Profile strength
                            </span>
                            <span className="text-[11px] font-bold" style={{ color: completenessColor }}>
                                {completenessPercent}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#E3E7EC' }}>
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${completenessPercent}%`, background: completenessColor }}
                            />
                        </div>
                        {completenessPercent < 100 && (
                            <p className="text-[11px] text-gray-400 mt-1.5 mb-0">
                                {avatarError || !user.profile_pic_url
                                    ? 'Add a profile photo to complete your profile.'
                                    : 'Fill in your remaining details to complete your profile.'}
                            </p>
                        )}
                    </div>

                    <div className="w-full h-px my-5" style={{ background: BORDER }} />

                    <div className="flex flex-col gap-2.5 w-full">
                        <button
                            onClick={() => setEditOpen(true)}
                            className="flex items-center justify-center gap-2 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md shadow-indigo-900/10 transition-transform hover:-translate-y-0.5"
                            style={{ background: `linear-gradient(120deg, ${NAVY}, ${INDIGO})` }}
                        >
                            <PencilIcon />
                            Edit Profile
                        </button>
                        <button
                            onClick={() => { resetPasswordFields(); setPasswordOpen(true); }}
                            className="flex items-center justify-center gap-2 font-semibold text-sm px-4 py-2.5 rounded-xl border border-[#E3E7EC] text-[#0F1B33] hover:bg-gray-50 transition-colors"
                        >
                            <LockIcon />
                            Change Password
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-5 sm:gap-6">

                    <div className="bg-white rounded-[24px] border border-[#edf2f7] px-5 py-5 sm:px-7 sm:py-6" style={{ boxShadow: '0 8px 30px rgba(15,27,51,0.04)' }}>
                        <div className="text-gray-900 font-bold text-sm sm:text-base mb-1">Personal Details</div>
                        <p className="text-[12.5px] text-gray-400 mb-2">Information on record for your account.</p>

                        <div className="mt-2">
                            <DetailRow label="Display Name" value={`${user.first_name || ''} ${user.last_name || ''}`.trim()} copyText={`${user.first_name || ''} ${user.last_name || ''}`.trim()} icon={<UserIcon />} />
                            <DetailRow label="Corporate Email" value={user.email} icon={<MailIcon />} copyText={user.email} />
                            <DetailRow label="Access Level" value={getRoleLabel() || '—'} icon={<BadgeIcon />} />
                            <DetailRow
                                label="Mobile Contact"
                                value={
                                    user.phone ?? user.contact
                                        ? `${dialFor(user.country_code, '')} ${user.phone ?? user.contact}`.trim()
                                        : ''
                                }
                                copyText={
                                    user.phone ?? user.contact
                                        ? `${dialFor(user.country_code, '')} ${user.phone ?? user.contact}`.trim()
                                        : ''
                                }
                                icon={<PhoneIcon />}
                            />
                            <DetailRow label="Onboarding Date" value={onboardingDateLabel} icon={<CalendarIcon />} />
                            <DetailRow label="Last Updated" value={lastUpdatedLabel} icon={<ClockIcon />} />
                        </div>
                    </div>

                    {/* <div
                        className="relative overflow-hidden rounded-[24px] px-5 py-5 sm:px-7 sm:py-6 flex items-center justify-between gap-4 flex-wrap"
                        style={{ background: `linear-gradient(120deg, ${NAVY} 0%, ${NAVY_LIGHT} 60%, ${INDIGO} 150%)` }}
                    >
                        <div className="flex items-start gap-3 min-w-0 relative">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
                                <ShieldIcon />
                            </div>
                            <div className="min-w-0">
                                <div className="text-white font-bold text-sm sm:text-base">Password &amp; Security</div>
                                <p className="text-indigo-200/70 text-[12.5px] mt-0.5">Keep your account secure with a strong, unique password.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { resetPasswordFields(); setPasswordOpen(true); }}
                            className="flex items-center gap-2 bg-white text-[#0F1B33] font-semibold text-sm px-4 py-2.5 rounded-xl flex-shrink-0 hover:bg-indigo-50 transition-colors relative"
                        >
                            <LockIcon />
                            Change Password
                        </button>
                    </div> */}

                </div>

            </div>

            {editOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={requestCloseEdit}
                    />

                    <div className="absolute inset-0 flex items-center justify-center p-4 sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:bottom-0 sm:p-0 sm:items-stretch sm:justify-end sm:max-w-full">
                        <div className="w-full max-w-md max-h-[90vh] rounded-[24px] overflow-hidden sm:w-screen sm:max-w-lg sm:max-h-full sm:h-full sm:rounded-none bg-white shadow-2xl flex flex-col">
                            <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-y-auto">

                                <div
                                    className="relative px-5 pt-6 pb-14 sm:px-8 sm:pt-7 sm:pb-16 flex-shrink-0 overflow-hidden"
                                    style={{ background: `linear-gradient(120deg, ${NAVY} 0%, ${NAVY_LIGHT} 55%, ${INDIGO} 140%)` }}
                                >
                                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                                    <button
                                        type="button"
                                        onClick={requestCloseEdit}
                                        className="absolute top-4 right-5 sm:top-5 sm:right-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                                    >
                                        <CloseIcon />
                                    </button>

                                    <p className="text-[10.5px] font-bold uppercase tracking-widest text-indigo-200/80 m-0">
                                        Account
                                    </p>
                                    <h2 className="text-white text-lg sm:text-xl font-bold mt-1 m-0">
                                        Edit Profile
                                    </h2>
                                    {lastUpdatedLabel && (
                                        <p className="text-indigo-200/60 text-xs mt-1">
                                            Last updated {lastUpdatedLabel}
                                        </p>
                                    )}
                                    {isFormDirty && (
                                        <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                                            Unsaved changes
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 px-5 sm:px-8">

                                    <div
                                        className="-mt-10 sm:-mt-12 mb-6 sm:mb-8 flex flex-col items-center"
                                        onDragOver={(e) => { e.preventDefault(); setPhotoDragging(true); }}
                                        onDragLeave={() => setPhotoDragging(false)}
                                        onDrop={handlePhotoDrop}
                                        style={photoDragging ? { outline: `2px dashed ${INDIGO}`, outlineOffset: 6, borderRadius: 16 } : undefined}
                                    >
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => openPhotoViewer(formData.profile_pic_url)}
                                                title="Preview photo"
                                                aria-label="Preview photo"
                                                className="group relative block rounded-full cursor-zoom-in focus:outline-none"
                                            >
                                                <div className="p-[3px] rounded-full" style={{ background: `linear-gradient(135deg, ${INDIGO}, #38BDF8)` }}>
                                                    {formData.profile_pic_url ? (
                                                        <img
                                                            src={formData.profile_pic_url}
                                                            alt="Preview"
                                                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-[3px] border-white shadow-lg"
                                                        />
                                                    ) : (
                                                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#EEF2FF] border-[3px] border-white shadow-lg flex items-center justify-center">
                                                            <span className="text-lg sm:text-xl font-bold text-[#4F46E5]">{getInitials()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute inset-[3px] rounded-full bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <ZoomInIconMui sx={{ fontSize: 22, color: '#fff' }} />
                                                </div>
                                            </button>

                                            <input
                                                ref={fileInputRef}
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
                                        <p className="text-[11px] text-gray-400 mt-3">
                                            {photoDragging ? 'Drop image to use it' : 'PNG or JPG, up to 5MB · or drop an image here'}
                                        </p>

                                        {formData.profile_pic_file && (
                                            <button
                                                type="button"
                                                onClick={handleRevertPhoto}
                                                className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1 rounded-full transition-colors hover:bg-[#EEF2FF]"
                                                style={{ color: INDIGO }}
                                            >
                                                <ResetIcon />
                                                Undo new photo
                                            </button>
                                        )}
                                    </div>

                                    <div className="pb-8">
                                        <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400 mb-4">
                                            Contact Information
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                                            <TextInput
                                                label="First Name"
                                                icon={<UserIcon />}
                                                type="text"
                                                name="first_name"
                                                value={formData.first_name}
                                                onChange={handleNameInputChange('first_name')}
                                                error={firstNameError}
                                                maxLength={MAX_NAME_LENGTH}
                                                required
                                            />
                                            <TextInput
                                                label="Last Name"
                                                icon={<UserIcon />}
                                                type="text"
                                                name="last_name"
                                                value={formData.last_name}
                                                onChange={handleNameInputChange('last_name')}
                                                error={lastNameError}
                                                maxLength={MAX_NAME_LENGTH}
                                                required
                                            />
                                        </div>
                                        <div className="flex items-start gap-4 mb-5">

                                            <div className="w-[200px] flex-shrink-0">
                                                <CountryCodeSelect
                                                    value={formData.country_code}
                                                    onChange={handleCountryCodeChange}
                                                    options={COUNTRY_CODES}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <TextInput
                                                    label="Mobile"
                                                    icon={<PhoneIcon />}
                                                    type="text"
                                                    name="contact"
                                                    inputMode="numeric"
                                                    value={formData.contact}
                                                    onChange={handleContactChange}
                                                    error={contactError}
                                                    maxLength={
                                                        (PHONE_VALIDATION[formData.country_code] || PHONE_VALIDATION.US).length
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 bg-white px-5 py-4 sm:px-8 flex gap-3 items-center flex-shrink-0">
                                    <button
                                        type="button"
                                        onClick={requestCloseEdit}
                                        className="px-5 sm:px-6 py-2.5 border border-gray-200 text-xs font-bold text-gray-500 rounded-full hover:bg-gray-50 transition-colors uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 flex items-center justify-center gap-2 text-white text-xs font-bold px-5 sm:px-6 py-2.5 rounded-full shadow transition-colors uppercase tracking-wider disabled:opacity-50"
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

                    <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">

                        <div
                            className="relative px-5 py-5 sm:px-6 sm:py-6 overflow-hidden"
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
                                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-3"
                                style={{ background: 'rgba(255,255,255,0.12)' }}
                            >
                                <ShieldIcon />
                            </div>
                            <h2 className="text-white text-base sm:text-lg font-bold m-0">Update your password</h2>
                            <p className="text-indigo-200/70 text-xs mt-1 m-0">
                                You'll be signed out on every device once it's changed.
                            </p>
                        </div>

                        <form onSubmit={handlePasswordSubmit} className="px-5 py-5 sm:px-6 sm:py-6 flex flex-col gap-5">

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
                                maxLength={MAX_PASSWORD_LENGTH}
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
                                placeholder="8-16 characters"
                                name="new-password"
                                autoComplete="new-password"
                                meter
                                maxLength={MAX_PASSWORD_LENGTH}
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
                                maxLength={MAX_PASSWORD_LENGTH}
                            />

                            <button
                                type="button"
                                onClick={handleGeneratePassword}
                                className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-[#EEF2FF]"
                                style={{ color: INDIGO, border: '1px solid #E0E7FF' }}
                            >
                                <GenerateIconMui sx={{ fontSize: 14 }} />
                                Suggest a strong password
                            </button>

                            <div className="flex flex-col gap-2 bg-[#FAFBFC] border border-gray-100 rounded-xl px-4 py-3.5">
                                <RequirementRow met={lengthMet}>8–16 characters</RequirementRow>
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

            {lightboxOpen && (
                <ImageLightbox
                    src={lightboxSrc}
                    name={fullDisplayName}
                    initials={getInitials()}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </div>
    );
};

export default ProfileUpdate;