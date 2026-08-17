import Echo from "laravel-echo";
import Pusher from "pusher-js";

import { API_BASE, getToken } from "./api";

// laravel-echo reaches for a global Pusher rather than importing it.
window.Pusher = Pusher;

// The API root, without the /api/v1 suffix — /broadcasting/auth is registered
// at the application root, not under the versioned API prefix.
const API_ROOT = API_BASE.replace(/\/api\/v1\/?$/, "");

let echo = null;

/**
 * The shared Echo connection.
 *
 * Built lazily and kept as a single instance: every chat window on the page
 * shares one websocket, and opening a second connection per shipment would
 * multiply sockets for no benefit.
 *
 * Reverb speaks the Pusher protocol, which is why the Pusher client is used
 * here — and why the driver app can use any standard Pusher client library
 * against the same server.
 */
export function getEcho() {
    if (echo) return echo;

    const key = import.meta.env.VITE_REVERB_APP_KEY;

    // Without a key there is nothing to connect to. Returning null lets the chat
    // fall back to its polling refresh rather than throwing on every render.
    if (!key) {
        console.warn(
            "VITE_REVERB_APP_KEY is not set — live chat updates are disabled, falling back to polling.",
        );
        return null;
    }

    const scheme = import.meta.env.VITE_REVERB_SCHEME || "http";
    const host = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
    const port = Number(import.meta.env.VITE_REVERB_PORT || (scheme === "https" ? 443 : 8080));

    echo = new Echo({
        broadcaster: "reverb",
        key,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === "https",
        enabledTransports: ["ws", "wss"],

        // The channel is private, so every subscription is authorised by the
        // API first. Sanctum tokens, not session cookies — hence the explicit
        // Authorization header rather than Echo's cookie default.
        authEndpoint: `${API_ROOT}/broadcasting/auth`,
        auth: {
            headers: {
                Authorization: `Bearer ${getToken()}`,
                Accept: "application/json",
            },
        },
    });

    return echo;
}

/**
 * The id of the live socket, or null when there is no connection.
 *
 * Sent as X-Socket-Id on outgoing messages so the server's `toOthers()` skips
 * this browser — it has already rendered the message optimistically, and
 * echoing it back would show it twice.
 */
export function getSocketId() {
    try {
        return getEcho()?.socketId() ?? null;
    } catch {
        return null;
    }
}

/** Drops the shared connection — used when the signed-in user changes. */
export function disconnectEcho() {
    if (!echo) return;

    try {
        echo.disconnect();
    } finally {
        echo = null;
    }
}
