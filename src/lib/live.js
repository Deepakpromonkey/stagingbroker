import { useEffect, useRef, useState } from "react";

import { getEcho } from "./echo";

/*
| Live updates over Reverb, in place of polling.
|
| The API sends signals, not data — "shipment X changed", "the bell's feed
| changed" — and the page refetches through its normal endpoint. Pages keep a
| slow refresh of their own as the safety net for a dropped socket.
*/

/** This company's channel, or null before sign-in / without a company. */
export function companyChannel() {
    try {
        const company = JSON.parse(localStorage.getItem("crm_company") || "null");
        return company?.uuid ? `company.${company.uuid}` : null;
    } catch {
        return null;
    }
}

export function shipmentChannel(uuid) {
    return uuid ? `shipment.${uuid}` : null;
}

/**
 * Calls `handler` whenever `event` arrives on the private `channelName`.
 * Returns the function that stops it.
 *
 * Several components share a channel (the bell and the dashboard both follow
 * the company's), so this only ever removes its own listener — leaving the
 * channel would cut the others off as well.
 */
export function listen(channelName, event, handler) {
    const echo = getEcho();

    if (!echo || !channelName) return () => {};

    const channel = echo.private(channelName);
    channel.listen(`.${event}`, handler);

    return () => channel.stopListening(`.${event}`, handler);
}

/** Whether the socket is up right now, kept current. */
export function useSocketConnected() {
    const [connected, setConnected] = useState(() => {
        const state = getEcho()?.connector?.pusher?.connection?.state;
        return state === "connected";
    });

    useEffect(() => {
        const connection = getEcho()?.connector?.pusher?.connection;

        if (!connection) return undefined;

        const onState = () => setConnected(connection.state === "connected");
        connection.bind("state_change", onState);
        onState();

        return () => connection.unbind("state_change", onState);
    }, []);

    return connected;
}

/**
 * Hook form of listen(). The handler may change between renders without
 * resubscribing.
 */
export function useLive(channelName, event, handler) {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    });

    useEffect(() => {
        return listen(channelName, event, (payload) => handlerRef.current?.(payload));
    }, [channelName, event]);
}
