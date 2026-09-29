/**
 * Fleetra SSE client.
 *
 * Uses fetch + ReadableStream rather than EventSource, because EventSource
 * cannot send an Authorization header or a POST body — and the tenant scope
 * has to travel in a header.
 *
 * Two entry points, one transport. `send()` starts a turn, `resume()` answers
 * an interrupt. They stream identically, and either can end in another
 * interrupt — a T1 action needing a missing parameter will pause twice. The
 * caller doesn't need to track depth; it just handles onInterrupt again.
 */

import { API_BASE } from "./api";

// Same origin by default: "/fleetra/chat" is served by the Vite proxy in
// development (see vite.config.js) and by nginx in production. Keeping it
// relative means no CORS, and the same code in both places.
//
// Set VITE_FLEETRA_URL in .env only to bypass the proxy and call the API
// directly (then the API needs FLEETRA_CORS_ORIGINS set to this app's origin).
const BASE_URL = (import.meta.env?.VITE_FLEETRA_URL ?? "").replace(/\/$/, "");

const CHAT = `${BASE_URL}/fleetra/chat`;
const RESUME = `${BASE_URL}/fleetra/resume`;

// Fleetra rejects the dashboard's Sanctum token: it only trusts a short-lived
// JWT that Laravel signs for it. Swap one for the other, and reuse the JWT
// until a minute before it expires.
let fleetraJwt = null; // { sanctum, token, expiresAt }

async function fleetraToken(sanctum, { force = false, signal } = {}) {
  if (!force && fleetraJwt?.sanctum === sanctum && Date.now() < fleetraJwt.expiresAt) {
    return fleetraJwt.token;
  }
  const res = await fetch(`${API_BASE}/fleetra/token`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${sanctum}` },
    signal,
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`fleetra token: ${res.status}`);
  const { token, expires_in } = await res.json();
  fleetraJwt = { sanctum, token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return token;
}

/**
 * Start a new turn. Never pass a thread id here — the server mints a fresh one
 * per message, and it arrives in the `thread` event for use in resume().
 *
 * @param {object} [opts.context]  from createHistoryStore().context()
 */
export function send({ message, context, ...rest }) {
  return stream(CHAT, { message, context: context ?? null }, rest);
}

/**
 * Answer a pause.
 * @param {object} opts
 * @param {string} opts.threadId  from the interrupt event itself
 * @param {*}      opts.value     {carrier_id: 42} | {approved: true} | {text: "12345"}
 * @param {object} [opts.context] sent in case the reply turns out to be a new request
 */
export function resume({ threadId, value, context, ...rest }) {
  return stream(RESUME, { thread_id: threadId, value, context: context ?? null }, rest);
}

async function stream(url, body, {
  token,
  signal,
  onThread,
  onIntent,
  onToken,
  onInterrupt,
  onChips,
  onTurn,
  onResponse,
  onDone,
  onError,
}) {
  const post = (jwt) => fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  let response;
  try {
    const jwt = await fleetraToken(token, { signal });
    if (!jwt) {
      onError?.("Your session expired. Reload the dashboard to sign in again.");
      return;
    }
    response = await post(jwt);
    // A cached JWT can be rejected (e.g. Fleetra's key was rotated): retry once fresh.
    if (response.status === 401) {
      const fresh = await fleetraToken(token, { force: true, signal });
      if (fresh) response = await post(fresh);
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    onError?.("Couldn't reach Fleetra. Check your connection and try again.");
    return;
  }

  if (response.status === 401) {
    onError?.("Your session expired. Reload the dashboard to sign in again.");
    return;
  }
  if (response.status === 404) {
    onError?.("That request is no longer pending. Start again from the top.");
    return;
  }
  if (!response.ok || !response.body) {
    onError?.("Fleetra is unavailable right now. The carrier profiles still work.");
    return;
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;

      let split;
      while ((split = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        dispatch(frame, {
          onThread, onIntent, onToken, onInterrupt, onChips, onTurn, onResponse, onDone, onError,
        });
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      onError?.("The connection dropped mid-answer. Try asking again.");
    }
  } finally {
    reader.releaseLock();
  }
}

function dispatch(frame, h) {
  let event = "message";
  const dataLines = [];

  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataLines.push(line.slice(6));
  }
  if (!dataLines.length) return;

  let payload;
  try {
    payload = JSON.parse(dataLines.join("\n"));
  } catch {
    return;
  }

  switch (event) {
    case "thread":     h.onThread?.(payload.thread_id); break;
    case "intent":     h.onIntent?.(payload); break;
    case "token":      h.onToken?.(payload.text); break;
    case "interrupt":  h.onInterrupt?.(payload); break;
    case "chips":      h.onChips?.(payload.chips ?? []); break;
    case "turn":       h.onTurn?.(payload); break;
    case "response":   h.onResponse?.(payload); break;
    case "done":       h.onDone?.(payload.telemetry ?? {}); break;
    case "error":      h.onError?.(payload.message); break;
  }
}
