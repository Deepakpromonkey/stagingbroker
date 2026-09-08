import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";

import { apiFetch } from "../lib/api";

const ENDPOINT = "/notifications";

/*
| The read marker.
|
| The API derives the feed from the onboarding rows rather than storing one, so
| there is no server-side "read" flag to set. Instead the client remembers the
| timestamp of the newest item it has seen and sends it back; anything newer is
| unread. That survives reloads and stays correct across tabs, and the worst a
| cleared browser can do is show a full bell once.
*/
const SEEN_AT_KEY = "crm_notifications_seen_at";

// Long enough not to hammer the API from an idle tab, short enough that a
// carrier finishing onboarding shows up without a page reload.
const POLL_INTERVAL_MS = 60_000;

const SEVERITY = {
    success: { color: "#059669", background: "#ecfdf5", Icon: CheckCircleOutlineIcon },
    warning: { color: "#b45309", background: "#fffbeb", Icon: WarningAmberOutlinedIcon },
    error: { color: "#dc2626", background: "#fef2f2", Icon: ErrorOutlineIcon },
    info: { color: "#1e40af", background: "#eff6ff", Icon: HandshakeOutlinedIcon },
};

function readSeenAt() {
    try {
        return localStorage.getItem(SEEN_AT_KEY) || "";
    } catch {
        return "";
    }
}

function writeSeenAt(value) {
    try {
        if (value) localStorage.setItem(SEEN_AT_KEY, value);
    } catch {
        /* a browser refusing storage should not break the bell */
    }
}

/** "just now" / "4h ago" / "12 Mar" — a full date once it stops being news. */
function relativeTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const seconds = Math.round((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

/**
 * The header bell: onboarding activity for the whole company.
 *
 * `size` follows the surrounding icon buttons — the mobile header renders the
 * same component at the same size as its siblings.
 */
export default function NotificationsMenu({ size = "small" }) {
    const navigate = useNavigate();

    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [latestAt, setLatestAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Read inside the request rather than held in state: marking as read writes
    // it, and a stale copy would make the next poll re-count what was just read.
    const seenAtRef = useRef(readSeenAt());

    const load = useCallback(async () => {
        try {
            const query = seenAtRef.current
                ? `?seen_at=${encodeURIComponent(seenAtRef.current)}`
                : "";

            const response = await apiFetch(`${ENDPOINT}${query}`);

            const payload = response?.data ?? {};

            setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
            setUnreadCount(Number(payload.unread_count) || 0);
            setLatestAt(payload.latest_at ?? null);
            setError("");
        } catch (e) {
            setError(e?.message || "Could not load notifications.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();

        const timer = setInterval(load, POLL_INTERVAL_MS);

        // A backgrounded tab throttles the interval, so catch up on return
        // rather than leaving a stale count on screen.
        const onVisible = () => {
            if (document.visibilityState === "visible") load();
        };

        document.addEventListener("visibilitychange", onVisible);

        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [load]);

    const markAllRead = useCallback(() => {
        if (!latestAt) return;

        seenAtRef.current = latestAt;
        writeSeenAt(latestAt);

        setUnreadCount(0);
        setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
    }, [latestAt]);

    const handleOpen = (event) => setAnchorEl(event.currentTarget);

    const handleClose = () => setAnchorEl(null);

    const handleSelect = (notification) => {
        markAllRead();
        setAnchorEl(null);

        if (notification.link) navigate(notification.link);
    };

    const open = Boolean(anchorEl);

    const headerLabel = useMemo(() => {
        if (unreadCount === 0) return "You're all caught up";
        return `${unreadCount} new ${unreadCount === 1 ? "update" : "updates"}`;
    }, [unreadCount]);

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton
                    id="notification_button"
                    size={size}
                    aria-label="Notifications"
                    onClick={handleOpen}
                >
                    <Badge badgeContent={unreadCount} color="secondary" max={99}>
                        <NotificationsOutlinedIcon fontSize={size === "small" ? "small" : "medium"} />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: {
                            mt: 1.5,
                            width: { xs: 320, sm: 400 },
                            maxWidth: "calc(100vw - 24px)",
                            borderRadius: "14px",
                            overflow: "hidden",
                            backgroundColor: "#fff",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)",
                        },
                    },
                }}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        px: 2,
                        py: 1.5,
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                            Notifications
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                            {headerLabel}
                        </Typography>
                    </Box>

                    {unreadCount > 0 && (
                        <Button
                            size="small"
                            onClick={markAllRead}
                            sx={{ textTransform: "none", fontSize: 12, fontWeight: 600, minWidth: "auto" }}
                        >
                            Mark all read
                        </Button>
                    )}
                </Box>

                <Box sx={{ maxHeight: 420, overflowY: "auto" }}>
                    {loading && notifications.length === 0 && (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                            <CircularProgress size={20} />
                        </Box>
                    )}

                    {!loading && error && (
                        <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
                            <Typography sx={{ fontSize: 13, color: "#b91c1c" }}>{error}</Typography>
                            <Button
                                size="small"
                                onClick={load}
                                sx={{ mt: 1, textTransform: "none", fontSize: 12 }}
                            >
                                Try again
                            </Button>
                        </Box>
                    )}

                    {!loading && !error && notifications.length === 0 && (
                        <Box sx={{ px: 2, py: 5, textAlign: "center", color: "#94a3b8" }}>
                            <NotificationsNoneOutlinedIcon sx={{ fontSize: 34 }} />
                            <Typography sx={{ fontSize: 13, mt: 1 }}>
                                Nothing yet. Onboarding activity shows up here.
                            </Typography>
                        </Box>
                    )}

                    {notifications.map((notification) => {
                        const tone = SEVERITY[notification.severity] || SEVERITY.info;
                        const { Icon } = tone;

                        return (
                            <Box
                                key={notification.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleSelect(notification)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        handleSelect(notification);
                                    }
                                }}
                                sx={{
                                    display: "flex",
                                    gap: 1.5,
                                    px: 2,
                                    py: 1.5,
                                    cursor: "pointer",
                                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                                    backgroundColor: notification.unread ? "#f8fafc" : "#fff",
                                    "&:hover": { backgroundColor: "#f1f5f9" },
                                    "&:last-of-type": { borderBottom: "none" },
                                }}
                            >
                                <Box
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        width: 32,
                                        height: 32,
                                        borderRadius: "10px",
                                        backgroundColor: tone.background,
                                        color: tone.color,
                                    }}
                                >
                                    <Icon sx={{ fontSize: 18 }} />
                                </Box>

                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                fontWeight: notification.unread ? 700 : 600,
                                                color: "#0f172a",
                                                flex: 1,
                                                minWidth: 0,
                                            }}
                                        >
                                            {notification.title}
                                        </Typography>

                                        <Typography sx={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                                            {relativeTime(notification.created_at)}
                                        </Typography>
                                    </Box>

                                    <Typography sx={{ fontSize: 12.5, color: "#475569", mt: 0.25 }}>
                                        {notification.message}
                                    </Typography>
                                </Box>

                                {notification.unread && (
                                    <Box
                                        sx={{
                                            alignSelf: "center",
                                            flexShrink: 0,
                                            width: 7,
                                            height: 7,
                                            borderRadius: "50%",
                                            backgroundColor: "#2563eb",
                                        }}
                                    />
                                )}
                            </Box>
                        );
                    })}
                </Box>

                <Box sx={{ borderTop: "1px solid rgba(0,0,0,0.06)", p: 1 }}>
                    <Button
                        fullWidth
                        size="small"
                        onClick={() => {
                            handleClose();
                            navigate("/carriers");
                        }}
                        sx={{ textTransform: "none", fontSize: 12.5, fontWeight: 600 }}
                    >
                        View all onboarding
                    </Button>
                </Box>
            </Popover>
        </>
    );
}
