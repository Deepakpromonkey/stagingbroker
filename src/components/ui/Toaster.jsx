import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";

const VARIANTS = {
    error: {
        icon: ErrorRoundedIcon,
        color: "#DC2626",
        bg: "#FDF1F1",
        border: "#F6D3D3",
        chip: "#FCE2E2",
        defaultTitle: "Something went wrong",
    },
    success: {
        icon: CheckCircleRoundedIcon,
        color: "#178A54",
        bg: "#F0FAF5",
        border: "#CDEBDC",
        chip: "#DCF3E7",
        defaultTitle: "Success",
    },
    warning: {
        icon: WarningRoundedIcon,
        color: "#B45309",
        bg: "#FEF8ED",
        border: "#F6E3BE",
        chip: "#FBEDCC",
        defaultTitle: "Warning",
    },
    info: {
        icon: InfoRoundedIcon,
        color: "#2563EB",
        bg: "#F0F5FE",
        border: "#CFE0F9",
        chip: "#DEEAFB",
        defaultTitle: "Note",
    },
};


let _toasts = [];
const _listeners = new Set();

function _notify() {
    for (const listener of _listeners) listener();
}

function _subscribe(listener) {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
}

function _getSnapshot() {
    return _toasts;
}

function _push(options) {
 
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const type = options.type ?? "info";
    const v = VARIANTS[type] ?? VARIANTS.info;

    const toast = {
        id,
        type,
        title: options.title ?? v.defaultTitle,
        message:
            typeof options.message === "string" && options.message.trim() !== ""
                ? options.message
                : options.message != null
                ? String(options.message)
                : "",
        duration: typeof options.duration === "number" ? options.duration : 5000,
    };

    _toasts = [..._toasts, toast];
    _notify();
    return id;
}

function _remove(id) {
    _toasts = _toasts.filter((t) => t.id !== id);
    _notify();
}

function _clearAll() {
    _toasts = [];
    _notify();
}

function CountdownRing({ progress, color, onClick }) {
    const size = 24;
    const stroke = 2.5;
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - progress / 100);

    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Dismiss notification"
            className="relative flex-shrink-0 rounded-full transition-opacity hover:opacity-70"
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 50ms linear" }}
                />
            </svg>
            <CloseIcon
                sx={{ fontSize: 12 }}
                className="absolute inset-0 m-auto text-gray-500"
            />
        </button>
    );
}

function ToastItem({ id, type, title, message, duration, onDismiss }) {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const [paused, setPaused] = useState(false);
    const [progress, setProgress] = useState(100);
    const intervalRef = useRef(null);
    const v = VARIANTS[type] ?? VARIANTS.info;
    const Icon = v.icon;

    const dismiss = useCallback(() => {
        setLeaving(true);
        clearInterval(intervalRef.current);
        setTimeout(() => onDismiss(id), 220);
    }, [id, onDismiss]);

    useEffect(() => {
        const raf = requestAnimationFrame(() => setVisible(true));

        if (!duration || duration <= 0) {
            return () => cancelAnimationFrame(raf);
        }

        const step = 100 / (duration / 50);

        intervalRef.current = setInterval(() => {
            if (paused) return;
            setProgress((p) => {
                const next = p - step;
                if (next <= 0) {
                    clearInterval(intervalRef.current);
                    dismiss();
                }
                return Math.max(next, 0);
            });
        }, 50);

        return () => {
            cancelAnimationFrame(raf);
            clearInterval(intervalRef.current);
        };
    }, [duration, dismiss, paused]);

    return (
        <div
            role="alert"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative flex w-[360px] max-w-[90vw] items-start gap-3 rounded-2xl p-3.5"
            style={{
                background: v.bg,
                border: `1px solid ${v.border}`,
                boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
                transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.28s ease",
                transform: visible && !leaving
                    ? "translateX(0) scale(1)"
                    : "translateX(20px) scale(0.96)",
                opacity: visible && !leaving ? 1 : 0,
            }}
        >
            <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                style={{ background: v.chip }}
            >
                <Icon sx={{ fontSize: 19, color: v.color }} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
                <p className="m-0 text-[13.5px] font-semibold leading-snug text-gray-900">
                    {title}
                </p>
                {message ? (
                    <p className="m-0 mt-1 text-[12.5px] leading-relaxed text-gray-600 break-words">
                        {message}
                    </p>
                ) : null}
            </div>

            {duration > 0 ? (
                <CountdownRing progress={progress} color={v.color} onClick={dismiss} />
            ) : (
                <button
                    type="button"
                    onClick={dismiss}
                    className="flex-shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-black/5 hover:text-gray-700"
                    aria-label="Dismiss notification"
                >
                    <CloseIcon sx={{ fontSize: 14 }} />
                </button>
            )}
        </div>
    );
}

export function ToastContainer() {
    const toasts = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);

    return (
        <div className="pointer-events-none fixed top-5 right-5 z-[9999] flex flex-col gap-3">
            {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                    <ToastItem {...t} onDismiss={_remove} />
                </div>
            ))}
        </div>
    );
}

export function toast(options) {
    if (typeof options === "string") options = { type: "info", message: options };
    return _push(options ?? {});
}

toast.error = (msg, opts = {}) =>
    toast({ type: "error", ...(typeof msg === "string" ? { message: msg } : msg), ...opts });

toast.success = (msg, opts = {}) =>
    toast({ type: "success", ...(typeof msg === "string" ? { message: msg } : msg), ...opts });

toast.warning = (msg, opts = {}) =>
    toast({ type: "warning", ...(typeof msg === "string" ? { message: msg } : msg), ...opts });

toast.info = (msg, opts = {}) =>
    toast({ type: "info", ...(typeof msg === "string" ? { message: msg } : msg), ...opts });

toast.dismiss = (id) => _remove(id);
toast.clear = () => _clearAll();