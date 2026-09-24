/**
 * Browser-held conversation history for Fleetra.
 *
 * The server stores nothing between messages. This module keeps the last few
 * exchanges plus a "focus" carrier and sends them with each message, so
 * follow-ups like "what about their insurance?" can be understood.
 *
 * Storage is sessionStorage, deliberately NOT localStorage:
 *   - survives a page refresh
 *   - dies with the tab
 *   - is never shared with another tab or left behind on a shared machine
 *
 * History is cleared when:
 *   - the tab closes                    (sessionStorage does this)
 *   - 30 minutes pass with no activity  (checked on every read)
 *   - the user logs out                 (call clearAllFleetraHistory())
 *   - the user or tenant changes        (different userKey → different bucket;
 *                                        ConciergeChat also wipes on change)
 *   - the broker clicks "New conversation"
 *
 * Nothing here is trusted by the server. It is sanitised there and used only
 * as text hints for rewriting — never to pick a carrier or a tenant.
 */

export const DEFAULT_EXCHANGES = 5;
export const IDLE_MS = 30 * 60 * 1000;
export const MAX_CHARS = 500;
const PREFIX = "fleetra:history:";

export const CONTEXT_VERSION = 1;
const empty = () => ({ turns: [], focus: null, flags: {}, lastActive: 0 });

function defaultStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null; // storage disabled (privacy mode) — history just won't persist
  }
}

function clip(text) {
  return typeof text === "string" ? text.slice(0, MAX_CHARS) : "";
}

function cleanCarrier(c) {
  if (!c || (!c.mc && !c.dot)) return null;
  return { name: c.name ?? null, mc: c.mc ?? null, dot: c.dot ?? null };
}

/**
 * @param {object} opts
 * @param {string} opts.userKey     unique per tenant+user, e.g. `${tenantId}:${userId}`
 * @param {number} [opts.exchanges] how many past exchanges to keep and send
 * @param {Storage} [opts.storage]  injectable for tests
 * @param {() => number} [opts.now] injectable clock for tests
 */
export function createHistoryStore({
  userKey,
  exchanges = DEFAULT_EXCHANGES,
  storage = defaultStorage(),
  now = () => Date.now(),
}) {
  const key = PREFIX + (userKey || "anonymous");

  function read() {
    try {
      const raw = storage?.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || !Array.isArray(parsed.turns)) return empty();
      return parsed;
    } catch {
      return empty(); // corrupted entry: start clean rather than crash
    }
  }

  function write(h) {
    try {
      storage?.setItem(key, JSON.stringify(h));
    } catch {
      /* quota or disabled storage: history is best-effort */
    }
  }

  function clear() {
    try {
      storage?.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  /** Reads history, expiring it first if the conversation went idle. */
  function current() {
    const h = read();
    if (h.lastActive && now() - h.lastActive > IDLE_MS) {
      clear();
      return empty();
    }
    return h;
  }

  return {
    /** What to send with the next message. Versioned so the server can
     *  evolve the format without breaking older tabs. */
    context() {
      const h = current();
      return { v: CONTEXT_VERSION, turns: h.turns.slice(-exchanges), focus: h.focus,
               flags: h.flags || {} };
    },

    /** Session memory for rules that need it (e.g. "note already shown",
     *  "suggestion declined"). Short keys; booleans or short string lists. */
    setFlag(key, value) {
      const h = current();
      h.flags = { ...(h.flags || {}), [key]: value };
      h.lastActive = h.lastActive || now();
      write(h);
    },

    /** Store a finished exchange. `carrier` comes from the server's `turn` event. */
    record({ user, assistant, intent_id = null, carrier = null }) {
      const h = current();
      const c = cleanCarrier(carrier);
      h.turns = [
        ...h.turns,
        { user: clip(user), assistant: clip(assistant), intent_id, carrier: c },
      ].slice(-exchanges);
      if (c) h.focus = c; // most recent carrier becomes the focus for "their"
      h.lastActive = now();
      write(h);
    },

    clear,
  };
}

/** Call on logout. Removes every Fleetra history bucket in this tab. */
export function clearAllFleetraHistory(storage = defaultStorage()) {
  try {
    if (!storage) return;
    const doomed = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => storage.removeItem(k));
  } catch {
    /* ignore */
  }
}