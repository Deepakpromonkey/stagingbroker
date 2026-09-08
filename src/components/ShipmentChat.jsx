import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";

import { apiFetch } from "../lib/api";
import { getEcho, getSocketId } from "../lib/echo";

/*
| The broker's side of the shipment conversation.
|
| Messages arrive two ways and must not collide: pushed live over the private
| shipment channel, and pulled by the initial fetch (plus a slow poll, which is
| the fallback when the websocket server is not running). Both paths funnel
| through addMessage(), which de-duplicates on the message uuid.
*/

const POLL_MS = 15000;

/** Local time, or empty when the timestamp is missing. */
function formatTime(iso) {
    if (!iso) return "";

    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function ShipmentChat({ shipmentUuid, driverName }) {
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [live, setLive] = useState(false);

    const scrollRef = useRef(null);
    const viewerRef = useRef("broker");

    /**
     * Adds messages the thread does not already have.
     *
     * Keyed on uuid because the same message can arrive twice — once from the
     * websocket and once from the next poll — and the two paths cannot be
     * ordered against each other.
     */
    const addMessage = useCallback((incoming) => {
        const list = Array.isArray(incoming) ? incoming : [incoming];

        setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.uuid));
            const fresh = list.filter((m) => m?.uuid && !seen.has(m.uuid));

            if (fresh.length === 0) return prev;

            return [...prev, ...fresh].sort(
                (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
            );
        });
    }, []);

    const loadThread = useCallback(
        async (showSpinner) => {
            if (!shipmentUuid) return;

            if (showSpinner) setLoading(true);

            try {
                const res = await apiFetch(`/shipments/${shipmentUuid}/messages`);
                const data = res?.data ?? {};

                viewerRef.current = data.viewer || "broker";
                addMessage(data.messages || []);
                setError("");
            } catch (err) {
                setError(err?.message || "Could not load the conversation.");
            } finally {
                if (showSpinner) setLoading(false);
            }
        },
        [shipmentUuid, addMessage],
    );

    useEffect(() => {
        setMessages([]);
        loadThread(true);
    }, [shipmentUuid, loadThread]);

    // Live delivery over the shipment's private channel.
    useEffect(() => {
        if (!shipmentUuid) return undefined;

        const echo = getEcho();
        if (!echo) return undefined;

        const channelName = `shipment.${shipmentUuid}`;

        const channel = echo
            .private(channelName)
            .listen(".message.sent", (payload) => {
                if (payload?.message) addMessage(payload.message);
            });

        // Subscription is authorised by the API, so it can legitimately fail
        // (expired token, a load this user may not see). Say so rather than
        // sitting silently on a dead socket.
        channel.error?.(() => setLive(false));

        const connection = echo.connector?.pusher?.connection;
        const onState = () => setLive(connection?.state === "connected");
        onState();
        connection?.bind("state_change", onState);

        return () => {
            connection?.unbind("state_change", onState);
            echo.leave(channelName);
        };
    }, [shipmentUuid, addMessage]);

    // The safety net: whether or not the socket is up, the thread refreshes.
    useEffect(() => {
        if (!shipmentUuid) return undefined;

        const timer = setInterval(() => loadThread(false), POLL_MS);
        return () => clearInterval(timer);
    }, [shipmentUuid, loadThread]);

    // Pin to the newest message.
    useEffect(() => {
        const box = scrollRef.current;
        if (box) box.scrollTop = box.scrollHeight;
    }, [messages.length]);

    const send = async (event) => {
        event.preventDefault();

        const body = draft.trim();
        if (!body || sending) return;

        setSending(true);
        setError("");

        try {
            const socketId = getSocketId();

            const res = await apiFetch(`/shipments/${shipmentUuid}/messages`, {
                method: "POST",
                body: JSON.stringify({ body }),
                // Lets the server's toOthers() skip this browser.
                headers: socketId ? { "X-Socket-Id": socketId } : {},
            });

            if (res?.data) addMessage(res.data);
            setDraft("");
        } catch (err) {
            setError(err?.message || "Message not sent. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const rows = useMemo(() => messages, [messages]);

    if (!shipmentUuid) {
        return (
            <div className="rounded-xl border border-[#E2E8F0] py-10 text-center text-sm font-medium text-[#94A3B8]">
                No shipment selected.
            </div>
        );
    }

    return (
        <div className="flex h-[380px] sm:h-[460px] flex-col overflow-hidden rounded-xl border border-[#E2E8F0]">

            <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 sm:px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                    <ChatBubbleOutlineIcon sx={{ fontSize: 16, color: "#94A3B8" }} className="shrink-0" />
                    <span className="text-[12px] font-bold text-[#0F172A] truncate">
                        {driverName || "Driver"}
                    </span>
                </div>
                <span
                    className={`flex items-center gap-1.5 shrink-0 text-[10px] font-bold uppercase tracking-wide ${
                        live ? "text-[#15803D]" : "text-[#94A3B8]"
                    }`}
                    title={live ? "Live updates connected" : "Not connected — refreshing every 15s instead"}
                >
                    <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[#16A34A]" : "bg-[#CBD5E1]"}`} />
                    <span>{live ? "Live" : "Polling"}</span>
                </span>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-white px-3 sm:px-4 py-3 sm:py-4">
                {loading ? (
                    <p className="py-8 text-center text-sm font-medium text-[#94A3B8]">Loading conversation…</p>
                ) : rows.length === 0 ? (
                    <p className="py-8 text-center text-sm font-medium text-[#94A3B8]">
                        No messages yet. Say something to the driver.
                    </p>
                ) : (
                    rows.map((message) => {
                        const mine = message.sender_type === viewerRef.current;

                        return (
                            <div key={message.uuid} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                                        mine
                                            ? "bg-[#001A48] text-white"
                                            : "border border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A]"
                                    }`}
                                >
                                    {!mine && (
                                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                                            {message.sender_name || "Driver"}
                                        </p>
                                    )}
                                    <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed break-words">
                                        {message.body}
                                    </p>
                                    <p
                                        className={`mt-1 text-[10px] font-medium ${
                                            mine ? "text-white/60" : "text-[#94A3B8]"
                                        }`}
                                    >
                                        {formatTime(message.created_at)}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {error && (
                <p className="border-t border-[#FEE2E2] bg-[#FEF2F2] px-3 sm:px-4 py-2 text-[11px] font-semibold text-[#B91C1C]">
                    {error}
                </p>
            )}

            <form onSubmit={send} className="flex items-center gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] px-2.5 sm:px-3 py-2.5 sm:py-3">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={2000}
                    placeholder="Type a message to the driver"
                    className="min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 sm:px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                />
                <button
                    type="submit"
                    disabled={sending || draft.trim() === ""}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#001A48] px-3 sm:px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1E293B] disabled:opacity-50"
                >
                    <SendIcon sx={{ fontSize: 15 }} />
                    <span>{sending ? "Sending…" : "Send"}</span>
                </button>
            </form>
        </div>
    );
}

export default ShipmentChat;
