import { clearSessionStorage } from "../utils/Auth";

export const STRIPE_PUBLIC_KEY = 'pk_live_51TP2bME8lGA6s4DI1Qrd3hBPKD6jZEZFP43NN0tJT0eV9aFU4V4kfaCybqtfmxWAntEnEkkMOU5N8TzLq6VBuvrS009KsgSeic';

/*
| Production by default, so a build with no env set is the deployed app.
|
| Point VITE_API_BASE at a local API in .env.local (gitignored) to run the two
| halves together -- previously this meant editing the line below and
| remembering not to commit it.
*/
export const API_BASE = import.meta.env.VITE_API_BASE;




export const SOCKET_BASE = API_BASE.replace(/^http/, "ws");
 
export function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("crm_auth_token") ?? "";
}
 
export function authHeaders(isFormData = false, skipAuth = false) {
    const token = getToken();
    return {
        ...(!isFormData && {
            "Content-Type": "application/json",
            Accept: "application/json",
        }),
        ...(!skipAuth && token && { Authorization: `Bearer ${token}` }),
    };
}
 
const REQUEST_TIMEOUT_MS = 60000;

async function readBodyWithIdleTimeout(res, idleMs = 1500, maxMs = 20000) {
    if (!res.body || !res.body.getReader) {
        return res.text();
    }
 
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let lastChunkTime = Date.now();
    const start = Date.now();
 
    try {
        while (true) {
            const idleRemaining = idleMs - (Date.now() - lastChunkTime);
            const maxRemaining = maxMs - (Date.now() - start);
            const waitMs = Math.max(0, Math.min(idleRemaining, maxRemaining));
 
            if (waitMs <= 0) break; 
 
            const result = await Promise.race([
                reader.read(),
                new Promise((resolve) => setTimeout(() => resolve({ __idle: true }), waitMs)),
            ]);
 
            if (result.__idle) break; 
 
            const { done, value } = result;
            if (value) {
                text += decoder.decode(value, { stream: true });
                lastChunkTime = Date.now();
            }
            if (done) break;
        }
    } finally {
        try { reader.cancel(); } catch (e) { /* ignore */ }
    }
 
    return text;
}
 
export async function apiFetch(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const { skipAuth = false, ...fetchOptions } = options;
 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
 
    try {
        let res;
        try {
            res = await fetch(`${API_BASE}${path}`, {
                ...fetchOptions,
                headers: {
                    ...authHeaders(isFormData, skipAuth),
                    ...options.headers,
                },
                signal: controller.signal,
            });
        } catch (fetchErr) {
            if (fetchErr.name === "AbortError") {
                throw new Error("Request timed out. Please check your connection and try again.");
            }
            throw new Error("Network error. Please check your connection and try again.");
        }
 
if (res.status === 401) {
    localStorage.removeItem("crm_auth_token");
    localStorage.removeItem("crm_user");
    document.cookie = "crm_auth_token=; Max-Age=0; path=/; SameSite=Lax";
    if (typeof window !== "undefined") window.location.href = "/";
    throw new Error("Unauthorized");
}
 
        let responseText = "";
        try {

            // Read `res` directly, NOT res.clone(). clone() tees the body into
            // two streams; we only ever drained the clone, so the abandoned
            // branch filled its internal queue and applied backpressure. Past
            // roughly a few hundred KB that stalls reads on the branch we ARE
            // reading, the idle timer below fires, and we silently keep a
            // truncated body. Small responses fit the queue and were unaffected,
            // which is why only the large endpoints broke. Nothing reads the
            // body after this point - only res.status / res.ok - so the clone
            // was never needed.
            responseText = await readBodyWithIdleTimeout(res);
        } catch (readErr) {
            throw new Error("Failed to read the server's response. Please try again.");
        }
 
        let json = {};
        try {
            json = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            // A body that arrived but will not parse means readBodyWithIdleTimeout
            // truncated it (slow chunk / large payload). Returning {} here made
            // that look like a successful empty response to every caller.
            console.error("Invalid JSON response:", responseText);
            throw new Error(
                "The server's response was incomplete. Please try again."
            );
        }
 
        if (!res.ok) {
            const firstFieldError = json?.errors ? Object.values(json.errors).flat()[0] : null;
            const message = json?.message || firstFieldError || `Request failed (${res.status})`;
            const err = new Error(message);
            err.status = res.status;
            err.errors = json.errors || {};
            throw err;
        }
 
        return json;
    } finally {
        clearTimeout(timeoutId);
    }
}
/*
| A file behind the bearer token, as something the browser can render.
|
| An <img> or <iframe> src cannot carry an Authorization header, so a private
| file has to be fetched here and handed on as an object URL. The caller owns
| what comes back and must revoke it -- the blob is held in memory until it
| does, and a PDF re-fetched on every render would otherwise pile up.
*/
export async function apiBlobUrl(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: authHeaders(),
    });

    if (!res.ok) {
        let message = `Could not load the file (${res.status})`;

        try {
            const json = await res.json();
            if (json?.message) message = json.message;
        } catch { /* not JSON -- keep the status message */ }

        const err = new Error(message);
        err.status = res.status;
        throw err;
    }

    return URL.createObjectURL(await res.blob());
}

export async function apiDownload(path, optionsOrFallbackName = {}, fallbackName = "download") {
    let options = optionsOrFallbackName;

    if (typeof optionsOrFallbackName === "string") {
        fallbackName = optionsOrFallbackName;
        options = {};
    }

    const { method = "GET", body, headers: extraHeaders, ...restOptions } = options;
    const isFormData = body instanceof FormData;

    const res = await fetch(`${API_BASE}${path}`, {
        ...restOptions,
        method,
        body,
        headers: {
            ...authHeaders(isFormData),
            ...extraHeaders,
        },
    });

    if (!res.ok) {
        let message = `Download failed (${res.status})`;
        try {
            const json = await res.json();
            if (json?.message) message = json.message;
        } catch { /* not JSON — keep the status message */ }
        throw new Error(message);
    }

    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const filename = match ? decodeURIComponent(match[1]) : fallbackName;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}
