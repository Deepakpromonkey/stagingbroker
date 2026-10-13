import React, { Component, useState, useMemo, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { apiFetch, getToken } from '../../lib/api';
import { send as fleetraSend, resume as fleetraResume } from '../../lib/fleetraClient';
import { createHistoryStore } from '../../lib/fleetraHistory';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import OpenInNew from '@mui/icons-material/OpenInNew';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import Close from '@mui/icons-material/Close';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import SendRounded from '@mui/icons-material/SendRounded';
import AddCommentOutlined from '@mui/icons-material/AddCommentOutlined';
import OpenInFull from '@mui/icons-material/OpenInFull';
import CloseFullscreen from '@mui/icons-material/CloseFullscreen';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import CheckRounded from '@mui/icons-material/CheckRounded';
import RefreshRounded from '@mui/icons-material/RefreshRounded';
import StopRounded from '@mui/icons-material/StopRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import ThumbUpAltOutlined from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownAltOutlined from '@mui/icons-material/ThumbDownAltOutlined';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import MicNoneOutlined from '@mui/icons-material/MicNoneOutlined';
import Mic from '@mui/icons-material/Mic';
import History from '@mui/icons-material/History';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import Chip from '@mui/material/Chip';
import { format } from 'date-fns';
import DataUpdateNotice, { shouldShowDataUpdateNotice } from './data-update/DataUpdateNotice';
import { companyChannel, listen } from '../../lib/live';

const TRACKING_METHOD_LABELS = {
    driver_phone: "Driver's Cell Phone",
    eld: 'ELD / Telematics',
    gps: 'Trailer GPS',
};

const DRIVER_TYPE_LABELS = {
    company_driver: 'Company Driver',
    leased_owner_operator: 'Owner Operator (Leased)',
    independent_owner_operator: 'Owner Operator (Independent)',
    other_company_driver: 'Other Carrier Driver',
};

const INACTIVE_STATUSES = ['draft', 'delivered', 'cancelled', 'canceled'];

// Two different detail pages live behind two different routes (see App.jsx):
// /shipment/:row_id for a manually/driver-phone-tracked load, and the more
// specific /shipment/eld/:uuid for an ELD one. Every "click this shipment
// row" handler needs to pick the right one, so it lives here once rather
// than being re-decided (and re-forgotten) at each call site.
function shipmentDetailPath(row) {
    return row?.tracking_method === 'eld' ? `/shipment/eld/${row.uuid}` : `/shipment/${row.uuid}`;
}

function statusChipColor(status) {
    const k = (status || '').toLowerCase();
    if (k.includes('delivered')) return 'success';
    if (k.includes('transit')) return 'primary';
    if (k.includes('draft')) return 'default';
    if (k.includes('pending')) return 'warning';
    if (k.includes('pickup')) return 'info';
    if (k.includes('cancel')) return 'error';
    return 'default';
}

function statusLabel(status) {
    if (!status) return 'Unknown';
    return status
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// ─────────────────────────────────────────────────────────────────────────
// Concierge chat
//
// Slides in from the right on desktop, and takes the full screen on mobile.
// Talks to the Fleetra streaming API via the shared `send`/`resume` transport,
// with per-user conversation memory from fleetraHistory.js.
//
// It deliberately does NOT fall back to a hardcoded token or tenant. If we
// can't identify the account, we say so instead of talking to the API as
// someone else.
//
// Colours follow the Account Status card: #005EA4 primary, #004A82 pressed,
// #E5F0F9 tint, #D5E3F0 lines, #F4F8FC canvas, #0B2A45 text.
// ─────────────────────────────────────────────────────────────────────────

function getFleetraToken() {
    try {
        return getToken() || '';
    } catch (e) {
        return '';
    }
}

function getFleetraUserKey() {
    try {
        const storedCompany = localStorage.getItem('crm_company');
        const storedUser = localStorage.getItem('crm_user');
        const companyUuid = storedCompany ? JSON.parse(storedCompany)?.uuid : null;
        const userId = storedUser ? JSON.parse(storedUser)?.id : null;
        if (!companyUuid) return null;
        return `${companyUuid}:${userId ?? 'anonymous'}`;
    } catch (e) {
        return null;
    }
}

function getFleetraFirstName() {
    try {
        const u = JSON.parse(localStorage.getItem('crm_user') || 'null');
        return String(u?.first_name || '').trim().split(' ')[0] || '';
    } catch (e) {
        return '';
    }
}

// One list feeds the start screen, the quick-prompt strip and the "/" menu.
const COMMANDS = [
    { cmd: '/vet', icon: ShieldOutlined, label: 'Vet a carrier', desc: 'Authority, insurance and safety record', example: 'Vet MC 1234567', fill: 'Vet MC ' },
    { cmd: '/track', icon: LocalShippingOutlined, label: 'Track a shipment', desc: 'Where a load is right now', example: 'Track SH000025', fill: 'Track SH' },
];

const GREETING_TEXT =
    "Hi, I'm your logistics concierge. Ask me to vet a carrier or track a shipment.";

const makeGreeting = () => ({ id: 'greeting', role: 'bot', text: GREETING_TEXT, ts: Date.now() });

// The conversation survives a page refresh (per tenant + user, tab-scoped).
const CHAT_STORE_PREFIX = 'fleetra:chat:';
const MAX_STORED_MESSAGES = 60;

// The last few things this person asked, kept across sessions.
const RECENT_PREFIX = 'fleetra:recent:';
const MAX_RECENT = 4;

function loadStoredMessages(userKey) {
    if (!userKey) return null;
    try {
        const raw = sessionStorage.getItem(CHAT_STORE_PREFIX + userKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        const clean = parsed.filter(
            (m) =>
                m &&
                typeof m.id === 'string' &&
                (m.role === 'bot' || m.role === 'user') &&
                (m.text || m.chips?.length)
        );
        return clean.length > 0 ? clean : null;
    } catch (e) {
        return null;
    }
}

function loadRecent(userKey) {
    if (!userKey) return [];
    try {
        const r = JSON.parse(localStorage.getItem(RECENT_PREFIX + userKey) || '[]');
        return Array.isArray(r) ? r.filter((x) => typeof x === 'string').slice(0, MAX_RECENT) : [];
    } catch (e) {
        return [];
    }
}

function saveRecent(userKey, list) {
    if (!userKey) return;
    try {
        localStorage.setItem(RECENT_PREFIX + userKey, JSON.stringify(list.slice(0, MAX_RECENT)));
    } catch (e) {
        // storage blocked
    }
}

function timeGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

// Browser speech-to-text, where it exists (Chrome, Edge, Safari).
const SpeechRec =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// A shipment / MC / DOT number inside a reply becomes a tap-to-copy chip.
const ID_RE = /\b(SH\d{4,}|MC[\s-]?\d{5,8}|DOT[\s-]?\d{5,8})\b/gi;

function IdChip({ value }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch (e) {
            // clipboard blocked
        }
    };
    return (
        <button
            type="button"
            onClick={copy}
            title={copied ? 'Copied' : 'Click to copy'}
            className="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#C5DAEC] bg-[#E5F0F9] px-1.5 py-px align-baseline text-[12px] font-semibold text-[#004A82] transition-colors hover:bg-[#D3E6F5]"
        >
            {value}
            {copied && <CheckRounded style={{ fontSize: 12, color: '#16a34a' }} />}
        </button>
    );
}

// Tiny, safe markdown: **bold**, `code`, "- " / "1. " lists, line breaks.
// Renders React nodes only, never injects HTML.
function renderInline(text, keyPrefix) {
    const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        const key = `${keyPrefix}-${i}`;
        if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={key} className="font-semibold text-[#0B2A45]">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
            return (
                <code key={key} className="rounded bg-[#E5F0F9] px-1 py-0.5 text-[12px] text-[#004A82]">
                    {part.slice(1, -1)}
                </code>
            );
        }
        return (
            <React.Fragment key={key}>
                {part.split(ID_RE).map((seg, j) =>
                    j % 2 === 1 ? <IdChip key={`${key}-${j}`} value={seg} /> : seg
                )}
            </React.Fragment>
        );
    });
}

function MessageText({ text }) {
    const lines = String(text || '').split('\n');
    const blocks = [];
    let list = null;

    lines.forEach((line) => {
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);

        if (bullet || numbered) {
            const type = bullet ? 'ul' : 'ol';
            if (!list || list.type !== type) {
                list = { type, items: [] };
                blocks.push(list);
            }
            list.items.push(bullet ? bullet[1] : numbered[2]);
        } else {
            list = null;
            blocks.push({ type: 'p', text: line });
        }
    });

    return (
        <>
            {blocks.map((block, i) => {
                if (block.type === 'ul' || block.type === 'ol') {
                    const ListTag = block.type;
                    return (
                        <ListTag
                            key={i}
                            className={`m-0 my-1.5 space-y-1 pl-5 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'} marker:text-[#005EA4]`}
                        >
                            {block.items.map((item, j) => (
                                <li key={j}>{renderInline(item, `${i}-${j}`)}</li>
                            ))}
                        </ListTag>
                    );
                }
                if (!block.text.trim()) return <div key={i} className="h-2" />;
                return (
                    <p key={i} className="m-0">
                        {renderInline(block.text, `p${i}`)}
                    </p>
                );
            })}
        </>
    );
}

// The assistant's avatar: a plain brand tile with a truck, no sparkles.
function BotAvatar({ className = '' }) {
    return (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#005EA4] text-white ${className}`}>
            <LocalShippingOutlined style={{ fontSize: 16 }} />
        </span>
    );
}

// ── Start screen ───────────────────────────────────────────────────────
// Leads with your real loads instead of a greeting and an illustration.
function EmptyState({ firstName, stats, recent, onSend, onClearRecent }) {
    return (
        <div className="mx-auto max-w-[520px] pt-1">
            <h2 className="m-0 text-[22px] font-semibold leading-snug tracking-[-0.3px] text-[#0B2A45]">
                {timeGreeting()}
                {firstName ? `, ${firstName}` : ''}
            </h2>
            <p className="m-0 mt-1 text-[14px] leading-relaxed text-[#5b6b80]">
                What do you want to check?
                {stats && (
                    <span className="mt-1 block text-[13px]">
                        <span className="font-semibold text-[#005EA4]">{stats.active}</span> of your {stats.total} loads
                        are moving right now.
                    </span>
                )}
            </p>

            <section className="mt-6">
                <h3 className="m-0 mb-2 text-[12.5px] font-semibold text-[#5b6b80]">Ask about</h3>
                <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
                    {COMMANDS.map(({ icon: Icon, label, desc, example, cmd }) => (
                        <li key={cmd}>
                            <button
                                type="button"
                                onClick={() => onSend(example)}
                                className="group/ask flex h-full w-full cursor-pointer flex-col items-start gap-1 rounded-2xl border border-[#D5E3F0] bg-white p-3.5 text-left transition-colors hover:border-[#005EA4] hover:bg-[#F4F8FC]"
                            >
                                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#0B2A45]">
                                    <Icon style={{ fontSize: 17 }} className="text-[#005EA4]" />
                                    {label}
                                </span>
                                <span className="text-[12px] leading-snug text-[#6b7a8f]">{desc}</span>
                                <span className="mt-1 text-[12px] italic text-[#005EA4] opacity-80 group-hover/ask:opacity-100">
                                    “{example}”
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </section>

            {recent.length > 0 && (
                <section className="mt-6">
                    <div className="mb-1.5 flex items-center justify-between">
                        <h3 className="m-0 text-[12.5px] font-semibold text-[#5b6b80]">Ask again</h3>
                        <button
                            type="button"
                            onClick={onClearRecent}
                            className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-[#8a9bb0] hover:text-[#005EA4]"
                        >
                            Clear
                        </button>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                        {recent.map((q) => (
                            <li key={q}>
                                <button
                                    type="button"
                                    onClick={() => onSend(q)}
                                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent px-2 py-1.5 text-left text-[12.5px] text-[#334155] transition-colors hover:bg-white hover:text-[#005EA4]"
                                >
                                    <History style={{ fontSize: 15 }} className="shrink-0 text-[#9ab0c7]" />
                                    <span className="truncate">{q}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <p className="m-0 mt-6 text-[12px] text-[#8a9bb0]">
                Type <kbd className="rounded border border-[#D5E3F0] bg-white px-1.5 text-[11.5px] font-semibold text-[#005EA4]">/</kbd> for shortcuts, or press ↑ to reuse a question.
            </p>
        </div>
    );
}

function ConciergeChat({ isOpen, onClose, seedQuery, onSeedConsumed }) {
    const token = getFleetraToken();
    const userKey = getFleetraUserKey();
    const tokenMissing = !token || !userKey;
    const firstName = getFleetraFirstName();

    const [messages, setMessages] = useState(() => loadStoredMessages(userKey) || [makeGreeting()]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    // Id of the bot message currently being streamed (drives the caret + hides actions).
    const [streamingId, setStreamingId] = useState(null);
    // Active interrupt: { type: 'ask'|'disambiguation'|'confirm', thread_id, ... }
    const [pending, setPending] = useState(null);
    const [wide, setWide] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [chatCopied, setChatCopied] = useState(false);
    const [showJump, setShowJump] = useState(false);
    const [slashIndex, setSlashIndex] = useState(0);

    // Live data for the start screen
    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState(() => loadRecent(userKey));
    const [listening, setListening] = useState(false);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const seededRef = useRef(false);
    const abortRef = useRef(null);
    const stoppedRef = useRef(false);
    const stickRef = useRef(true);
    const lastUserTextRef = useRef('');
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const recentRef = useRef(recent);
    const recRef = useRef(null);
    const histIdxRef = useRef(-1);

    const history = useMemo(() => createHistoryStore({ userKey: userKey || 'anonymous' }), [userKey]);

    useEffect(
        () => () => {
            abortRef.current?.abort();
            recRef.current?.abort?.();
        },
        []
    );

    // A card interrupt locks the composer; an "ask" interrupt keeps it open
    // because the typed reply IS the answer.
    const cardOpen = pending && pending.type !== 'ask';

    const isFresh = messages.length === 1 && messages[0].id === 'greeting';
    const lastBotId = [...messages]
        .reverse()
        .find((m) => m.role === 'bot' && m.id !== 'greeting' && m.text && !m.error)?.id;
    const streamingMsg = messages.find((m) => m.id === streamingId);
    const waiting = isTyping && !pending && !streamingMsg?.text;

    const slashMatches =
        input.startsWith('/') && !input.includes(' ') && !cardOpen && pending?.type !== 'ask'
            ? COMMANDS.filter((c) => c.cmd.startsWith(input.toLowerCase()))
            : [];
    const showSlash = slashMatches.length > 0;

    // Everything typed in this chat, newest first (for ↑ / ↓).
    const promptHistory = useMemo(() => {
        const seen = new Set();
        const out = [];
        for (let i = messages.length - 1; i >= 0; i -= 1) {
            const m = messages[i];
            if (m.role === 'user' && m.text && !seen.has(m.text)) {
                seen.add(m.text);
                out.push(m.text);
            }
        }
        return out;
    }, [messages]);

    // Live numbers each time the panel opens (same endpoint the dashboard uses).
    useEffect(() => {
        if (!isOpen || tokenMissing) return;

        apiFetch('/shipments/summary')
            .then((data) => {
                if (data && data.status) {
                    const byStatus = data.data?.by_status || {};
                    const active = Object.entries(byStatus)
                        .filter(([st]) => !INACTIVE_STATUSES.includes(st))
                        .reduce((sum, [, n]) => sum + Number(n || 0), 0);
                    setStats({ total: Number(data.data?.total) || 0, active });
                }
            })
            .catch(() => {});
    }, [isOpen, tokenMissing]);

    const rememberPrompt = (value) => {
        const next = [value, ...recentRef.current.filter((x) => x !== value)].slice(0, MAX_RECENT);
        recentRef.current = next;
        setRecent(next);
        saveRecent(userKey, next);
    };

    const clearRecent = () => {
        recentRef.current = [];
        setRecent([]);
        saveRecent(userKey, []);
    };

    const handlersFor = (botMsgId) => {
        const controller = new AbortController();
        abortRef.current = controller;
        return {
            token,
            signal: controller.signal,
            onToken: (text) => {
                setMessages((prev) =>
                    prev.map((m) => (m.id === botMsgId ? { ...m, text: (m.text || '') + text } : m))
                );
            },
            onInterrupt: (p) => {
                if (p.type === 'ask') {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === botMsgId ? { ...m, text: p.question } : m))
                    );
                }
                setPending(p);
            },
            onChips: (chips) => {
                setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, chips } : m)));
            },
            onTurn: (summary) => {
                // Read through a ref: recording inside a setState updater runs
                // twice under React strict mode and would log each turn double.
                const botMsg = messagesRef.current.find((m) => m.id === botMsgId);
                history.record({
                    user: lastUserTextRef.current,
                    assistant: botMsg?.text || '',
                    intent_id: summary.intent_id,
                    carrier: summary.carrier,
                });
            },
            onError: (message) => {
                // A user-initiated stop aborts the request; that isn't an error to show.
                if (controller.signal.aborted) return;
                setMessages((prev) =>
                    prev.map((m) => (m.id === botMsgId ? { ...m, text: message, error: true } : m))
                );
            },
        };
    };

    const startTurn = async (echoText, runner) => {
        setIsTyping(true);
        stoppedRef.current = false;

        const stamp = Date.now();
        const botMsgId = `b-${stamp}-${Math.random().toString(36).slice(2)}`;
        setStreamingId(botMsgId);

        setMessages((prev) => [
            ...prev,
            { id: `u-${stamp}`, role: 'user', text: echoText, ts: stamp },
            { id: botMsgId, role: 'bot', text: '', chips: [], ts: stamp },
        ]);

        try {
            await runner(handlersFor(botMsgId));
        } catch (err) {
            if (!stoppedRef.current) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === botMsgId && !m.text
                            ? { ...m, text: err?.message || 'Something went wrong. Please try again.', error: true }
                            : m
                    )
                );
            }
        } finally {
            if (stoppedRef.current) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === botMsgId
                            ? m.text
                                ? { ...m, stopped: true }
                                : { ...m, text: 'Stopped.', stopped: true }
                            : m
                    )
                );
                stoppedRef.current = false;
            }
            setIsTyping(false);
            setStreamingId(null);
            abortRef.current = null;
        }
    };

    const send = async (text) => {
        const value = (text ?? input).trim();
        if (!value || isTyping) return;

        if (tokenMissing) {
            const stamp = Date.now();
            setMessages((prev) => [
                ...prev,
                { id: `u-${stamp}`, role: 'user', text: value, ts: stamp },
                {
                    id: `b-${stamp}`,
                    role: 'bot',
                    text: "I couldn't verify your account, so I can't look anything up right now. Please refresh or sign in again.",
                    ts: stamp,
                },
            ]);
            setInput('');
            return;
        }

        setInput('');
        histIdxRef.current = -1;
        lastUserTextRef.current = value;
        rememberPrompt(value);
        setPending(null);

        await startTurn(value, (handlers) =>
            fleetraSend({ message: value, context: history.context(), ...handlers })
        );
    };

    const answerPending = async (value, echo) => {
        if (!pending) return;
        const threadId = pending.thread_id;
        setPending(null);
        lastUserTextRef.current = echo;

        await startTurn(echo, (handlers) =>
            fleetraResume({ threadId, value, context: history.context(), ...handlers })
        );
    };

    const submit = () => {
        if (isTyping) return;
        if (pending?.type === 'ask') {
            const text = input.trim();
            if (!text) return;
            setInput('');
            answerPending({ text }, text);
            return;
        }
        send();
    };

    // ── Chat tools ──────────────────────────────────────────────────────

    const stopGenerating = () => {
        stoppedRef.current = true;
        abortRef.current?.abort();
    };

    const copyMessage = async (m) => {
        try {
            await navigator.clipboard.writeText(m.text || '');
            setCopiedId(m.id);
            window.setTimeout(() => setCopiedId((current) => (current === m.id ? null : current)), 1500);
        } catch (e) {
            // clipboard blocked
        }
    };

    const buildTranscript = () =>
        messages
            .filter((m) => m.text && m.id !== 'greeting')
            .map((m) => `${m.role === 'user' ? 'You' : 'Fleetra'}: ${m.text}`)
            .join('\n\n');

    const copyTranscript = async () => {
        const transcript = buildTranscript();
        if (!transcript) return;
        try {
            await navigator.clipboard.writeText(transcript);
            setChatCopied(true);
            window.setTimeout(() => setChatCopied(false), 1500);
        } catch (e) {
            // ignore
        }
    };

    // Save the conversation as a text file.
    const exportTranscript = () => {
        const transcript = buildTranscript();
        if (!transcript) return;
        const header = `Fleetra conversation, ${format(new Date(), 'd MMM yyyy, h:mm a')}\n\n`;
        const blob = new Blob([header + transcript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fleetra-chat-${format(new Date(), 'yyyy-MM-dd-HHmm')}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const rateMessage = (m, value) => {
        setMessages((prev) =>
            prev.map((x) => (x.id === m.id ? { ...x, feedback: x.feedback === value ? null : value } : x))
        );
        window.dispatchEvent(
            new CustomEvent('fleetra:feedback', { detail: { id: m.id, value, text: m.text || '' } })
        );
    };

    // Re-ask the question that came before reply `botId`.
    const reaskFrom = (botId) => {
        if (isTyping || pending || tokenMissing) return;
        const botIdx = botId ? messages.findIndex((m) => m.id === botId) : messages.length;
        let userIdx = -1;
        for (let i = botIdx - 1; i >= 0; i -= 1) {
            if (messages[i].role === 'user') {
                userIdx = i;
                break;
            }
        }
        if (userIdx < 0) return;
        const question = messages[userIdx].text;
        setMessages((prev) => prev.slice(0, userIdx));
        send(question);
    };

    const clearChat = () => {
        if (!isFresh && !window.confirm('Clear this conversation?')) return;
        if (isTyping) stopGenerating();
        history.clear?.();
        setMessages([makeGreeting()]);
        setPending(null);
        setInput('');
        try {
            if (userKey) sessionStorage.removeItem(CHAT_STORE_PREFIX + userKey);
        } catch (e) {
            // ignore
        }
    };

    const pickCommand = (c) => {
        setInput(c.fill);
        setSlashIndex(0);
        window.setTimeout(() => {
            const el = inputRef.current;
            if (el) {
                el.focus();
                el.setSelectionRange(c.fill.length, c.fill.length);
            }
        }, 0);
    };

    // Dictate instead of type.
    const toggleVoice = () => {
        if (!SpeechRec) return;
        if (listening) {
            recRef.current?.stop?.();
            return;
        }
        const rec = new SpeechRec();
        rec.lang = navigator.language || 'en-US';
        rec.interimResults = true;
        rec.continuous = false;
        rec.onresult = (e) => {
            setInput(Array.from(e.results).map((r) => r[0].transcript).join(' '));
        };
        rec.onerror = () => setListening(false);
        rec.onend = () => {
            setListening(false);
            inputRef.current?.focus();
        };
        recRef.current = rec;
        try {
            rec.start();
            setListening(true);
        } catch (e) {
            setListening(false);
        }
    };

    const jumpToBottom = () => {
        stickRef.current = true;
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };

    const handleThreadScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        stickRef.current = distance < 120;
        setShowJump(distance > 240);
    };

    // ── Effects ─────────────────────────────────────────────────────────

    // Seed once with whatever was typed into the top bar, then let the parent
    // clear it so re-opening the panel doesn't replay it.
    useEffect(() => {
        if (isOpen && seedQuery && !seededRef.current) {
            seededRef.current = true;
            send(seedQuery);
            onSeedConsumed?.();
        }
        if (!isOpen) {
            seededRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, seedQuery]);

    useEffect(() => {
        if (isOpen) {
            stickRef.current = true;
            window.setTimeout(() => {
                inputRef.current?.focus();
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
            }, 300);
        }
    }, [isOpen]);

    // Esc closes the command menu first, then the panel.
    useEffect(() => {
        if (!isOpen) return undefined;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (showSlash) {
                setInput('');
                return;
            }
            onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose, showSlash]);

    useEffect(() => {
        setSlashIndex(0);
    }, [input]);

    // Follow the conversation, unless the person scrolled up to read.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const last = messages[messages.length - 1];
        if (stickRef.current || last?.role === 'user') {
            el.scrollTo({ top: el.scrollHeight, behavior: isTyping ? 'auto' : 'smooth' });
        }
    }, [messages, isTyping, pending]);

    // Keep the transcript across refreshes (only once a turn has settled).
    useEffect(() => {
        if (!userKey || isTyping) return;
        try {
            const toStore = messages.filter((m) => m.text || m.chips?.length).slice(-MAX_STORED_MESSAGES);
            sessionStorage.setItem(CHAT_STORE_PREFIX + userKey, JSON.stringify(toStore));
        } catch (e) {
            // storage full / blocked
        }
    }, [messages, isTyping, userKey]);

    // Auto-growing composer (up to ~5 lines).
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [input]);

    const headerBtn =
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-none bg-white/15 text-white cursor-pointer transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40';
    const actionBtn =
        'flex h-7 w-7 items-center justify-center rounded-lg border-none bg-transparent text-[#8a9bb0] cursor-pointer transition-colors hover:bg-[#E5F0F9] hover:text-[#005EA4]';

    const statusText = tokenMissing ? 'Signed out' : isTyping ? 'Working on it…' : listening ? 'Listening…' : 'Online';
    const statusDotColor = tokenMissing ? '#FBBF24' : isTyping || listening ? '#BAE6FD' : '#86EFAC';
    const threadStart =
        Number.isFinite(messages[0]?.ts) ? format(new Date(messages[0].ts), 'EEE, d MMM') : 'Today';

    return (
        <>
            <style>{`
                @keyframes fleetraMsgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
                .fleetra-msg-in { animation: fleetraMsgIn 160ms ease-out both; }
                .fleetra-no-scrollbar { scrollbar-width: none; }
                .fleetra-no-scrollbar::-webkit-scrollbar { display: none; }
                .fleetra-thread { scrollbar-width: thin; scrollbar-color: #C3D3E3 transparent; }
                @media (prefers-reduced-motion: reduce) {
                    .fleetra-msg-in { animation: none; }
                }
            `}</style>

            {/* Backdrop */}
            <div
                onClick={onClose}
                aria-hidden={!isOpen}
                className={`fixed inset-0 z-[90] bg-[#0B2A45] transition-opacity duration-300 ${
                    isOpen ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
            />

            {/* Panel: a floating sheet on desktop, full screen on mobile */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Fleetra chat"
                style={{
                    transform: isOpen ? 'translateX(0)' : 'translateX(calc(100% + 32px))',
                    boxShadow: '0 28px 90px rgba(0,74,130,0.35)',
                }}
                className={`fixed inset-0 z-[100] flex flex-col overflow-hidden bg-white transition-[transform,width] duration-300 ease-out sm:inset-auto sm:bottom-3 sm:right-3 sm:top-3 sm:rounded-[24px] ${
                    wide ? 'sm:w-[92vw] sm:max-w-[960px]' : 'sm:w-[460px]'
                }`}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-3 bg-[#005EA4] px-4 py-3 text-white">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#005EA4]">
                            <LocalShippingOutlined style={{ fontSize: 22 }} />
                        </span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="m-0 truncate text-[16px] font-bold tracking-tight">Fleetra</h3>
                                <span className="shrink-0 rounded-md bg-white/20 px-1.5 py-px text-[10px] font-semibold text-white">
                                    Beta
                                </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    {!tokenMissing && (
                                        <span
                                            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                                            style={{ background: statusDotColor }}
                                        />
                                    )}
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: statusDotColor }} />
                                </span>
                                <span className="truncate text-[11.5px] text-white/80">{statusText}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        <button
                            type="button"
                            aria-label="Copy conversation"
                            title={chatCopied ? 'Copied' : 'Copy conversation'}
                            onClick={copyTranscript}
                            disabled={isFresh}
                            className={headerBtn}
                        >
                            {chatCopied ? <CheckRounded style={{ fontSize: 16 }} /> : <ContentCopyOutlined style={{ fontSize: 15 }} />}
                        </button>
                        <button
                            type="button"
                            aria-label="Download conversation"
                            title="Download as .txt"
                            onClick={exportTranscript}
                            disabled={isFresh}
                            className={headerBtn}
                        >
                            <FileDownloadOutlined style={{ fontSize: 17 }} />
                        </button>
                        <button
                            type="button"
                            aria-label="New conversation"
                            title="New conversation"
                            onClick={clearChat}
                            disabled={isFresh && !isTyping}
                            className={headerBtn}
                        >
                            <AddCommentOutlined style={{ fontSize: 16 }} />
                        </button>
                        <button
                            type="button"
                            aria-label={wide ? 'Make panel narrower' : 'Make panel wider'}
                            title={wide ? 'Narrower' : 'Wider'}
                            onClick={() => setWide((v) => !v)}
                            className={`${headerBtn} hidden sm:flex`}
                        >
                            {wide ? <CloseFullscreen style={{ fontSize: 15 }} /> : <OpenInFull style={{ fontSize: 15 }} />}
                        </button>
                        <button type="button" aria-label="Close chat" title="Close (Esc)" onClick={onClose} className={headerBtn}>
                            <Close style={{ fontSize: 18 }} />
                        </button>
                    </div>
                </div>

                {/* Thread */}
                <div className="relative min-h-0 flex-1 bg-[#F4F8FC]">
                    <div
                        ref={scrollRef}
                        onScroll={handleThreadScroll}
                        className="fleetra-thread h-full overflow-y-auto px-4 py-5 sm:px-5"
                    >
                        {tokenMissing && (
                            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-800">
                                <WarningAmberOutlined style={{ fontSize: 15 }} className="mt-px shrink-0" />
                                <span>
                                    We couldn't verify your account for this session, so lookups are disabled until you
                                    refresh or sign in again.
                                </span>
                            </div>
                        )}

                        {isFresh ? (
                            <EmptyState
                                firstName={firstName}
                                stats={stats}
                                recent={recent}
                                onSend={send}
                                onClearRecent={clearRecent}
                            />
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="self-center rounded-full bg-[#E5F0F9] px-3 py-1 text-[11.5px] font-medium text-[#4a6a88]">
                                    {threadStart}
                                </div>

                                {messages.map((m) => {
                                    if (m.id === 'greeting') return null;
                                    const isUser = m.role === 'user';
                                    if (!isUser && !m.text && !m.chips?.length) return null;

                                    const isStreaming = m.id === streamingId;
                                    const showActions = !isUser && m.text && !m.error && !isStreaming;
                                    const isLastBot = m.id === lastBotId;
                                    const tsLabel = Number.isFinite(m.ts) ? format(new Date(m.ts), 'h:mm a') : '';

                                    // You: a right-aligned bubble
                                    if (isUser) {
                                        return (
                                            <div key={m.id} className="fleetra-msg-in group flex flex-col items-end">
                                                <div className="max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#005EA4] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white">
                                                    {m.text}
                                                </div>
                                                {tsLabel && (
                                                    <div className="mt-1 pr-1 text-[10.5px] text-[#9ca9b8] opacity-0 transition-opacity group-hover:opacity-100">
                                                        {tsLabel}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Fleetra: avatar + a white card
                                    return (
                                        <div key={m.id} className="fleetra-msg-in group flex items-start gap-2.5">
                                            <BotAvatar className="mt-0.5" />
                                            <div className="min-w-0 max-w-[92%] flex-1">
                                                {m.text && m.error ? (
                                                    <div className="rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-3.5 py-3">
                                                        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-red-700">
                                                            <ErrorOutlineRounded style={{ fontSize: 17 }} />
                                                            Couldn't get an answer
                                                        </div>
                                                        <p className="m-0 mt-1 break-words text-[12.5px] leading-relaxed text-red-700/90">{m.text}</p>
                                                        {!isTyping && (
                                                            <button
                                                                type="button"
                                                                onClick={() => reaskFrom(m.id)}
                                                                className="mt-2.5 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                                                            >
                                                                <RefreshRounded style={{ fontSize: 14 }} />
                                                                Try again
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    m.text && (
                                                        <div className="break-words rounded-2xl rounded-tl-md border border-[#D5E3F0] bg-white px-3.5 py-3 text-[13.5px] leading-[1.65] text-[#1f2937] shadow-[0_1px_2px_rgba(0,74,130,0.05)]">
                                                            <MessageText text={m.text} />
                                                            {isStreaming && (
                                                                <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-[#005EA4]" />
                                                            )}
                                                            {m.stopped && m.text !== 'Stopped.' && (
                                                                <div className="mt-1.5 text-[11px] italic text-[#9ca9b8]">Stopped before finishing.</div>
                                                            )}
                                                        </div>
                                                    )
                                                )}

                                                {/* Quick-action chips returned alongside a reply */}
                                                {m.chips?.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                                        {m.chips.map((chip) => (
                                                            <button
                                                                key={chip.action}
                                                                type="button"
                                                                onClick={() =>
                                                                    window.dispatchEvent(new CustomEvent('fleetra:action', { detail: chip }))
                                                                }
                                                                className="inline-flex cursor-pointer items-center gap-0.5 rounded-lg border border-[#005EA4]/30 bg-white py-1.5 pl-3 pr-2 text-[12px] font-semibold text-[#005EA4] transition-colors hover:border-[#005EA4] hover:bg-[#005EA4] hover:text-white"
                                                            >
                                                                {chip.label}
                                                                <ChevronRight style={{ fontSize: 15 }} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="mt-1 flex items-center gap-1">
                                                    {tsLabel && !m.error && <span className="pl-1 text-[10.5px] text-[#9ca9b8]">{tsLabel}</span>}
                                                    {showActions && (
                                                        <div
                                                            className={`ml-1 flex items-center gap-0.5 transition-opacity ${
                                                                isLastBot ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
                                                            }`}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => copyMessage(m)}
                                                                aria-label="Copy reply"
                                                                title={copiedId === m.id ? 'Copied' : 'Copy'}
                                                                className={actionBtn}
                                                            >
                                                                {copiedId === m.id ? (
                                                                    <CheckRounded style={{ fontSize: 15, color: '#16a34a' }} />
                                                                ) : (
                                                                    <ContentCopyOutlined style={{ fontSize: 14 }} />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => rateMessage(m, 'up')}
                                                                aria-label="Good reply"
                                                                title="Good reply"
                                                                className={actionBtn}
                                                                style={m.feedback === 'up' ? { color: '#005EA4', background: '#E5F0F9' } : undefined}
                                                            >
                                                                <ThumbUpAltOutlined style={{ fontSize: 14 }} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => rateMessage(m, 'down')}
                                                                aria-label="Bad reply"
                                                                title="Bad reply"
                                                                className={actionBtn}
                                                                style={m.feedback === 'down' ? { color: '#dc2626', background: '#FDECEC' } : undefined}
                                                            >
                                                                <ThumbDownAltOutlined style={{ fontSize: 14 }} />
                                                            </button>
                                                            {isLastBot && !isTyping && !pending && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => reaskFrom(m.id)}
                                                                    aria-label="Ask again"
                                                                    title="Ask again"
                                                                    className={actionBtn}
                                                                >
                                                                    <RefreshRounded style={{ fontSize: 16 }} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Disambiguation card: pick one of several matched carriers */}
                                {pending?.type === 'disambiguation' && (
                                    <div className="fleetra-msg-in flex items-start gap-2.5">
                                        <BotAvatar className="mt-0.5" />
                                        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl rounded-tl-md border border-[#D5E3F0] bg-white">
                                            <p className="m-0 border-b border-[#E6EEF6] bg-[#F4F8FC] px-3.5 py-3 text-[13px] font-semibold leading-snug text-[#0B2A45]">
                                                {pending.question}
                                            </p>
                                            <div className="flex flex-col p-1.5">
                                                {pending.options.map((o) => (
                                                    <button
                                                        key={o.carrier_id}
                                                        type="button"
                                                        onClick={() => answerPending({ carrier_id: o.carrier_id }, o.label)}
                                                        className="group/opt flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-transparent px-2.5 py-2.5 text-left transition-colors hover:bg-[#E5F0F9]"
                                                    >
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#005EA4] text-[12px] font-bold text-white">
                                                            {String(o.label || '?').trim().slice(0, 2).toUpperCase()}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[13px] font-semibold text-[#0B2A45]">{o.label}</span>
                                                            <span className="mt-1 flex flex-wrap items-center gap-1">
                                                                <span className="rounded-md bg-[#E5F0F9] px-1.5 py-px text-[11px] font-semibold text-[#004A82]">MC{o.mc}</span>
                                                                <span className="rounded-md bg-[#E5F0F9] px-1.5 py-px text-[11px] font-semibold text-[#004A82]">DOT{o.dot}</span>
                                                                <span className="text-[11px] text-[#7c8ba1]">{o.state ?? '—'}</span>
                                                                <span
                                                                    className={`rounded-md px-1.5 py-px text-[11px] font-semibold ${
                                                                        /active/i.test(String(o.authority))
                                                                            ? 'bg-emerald-50 text-emerald-700'
                                                                            : 'bg-amber-50 text-amber-700'
                                                                    }`}
                                                                >
                                                                    {o.authority}
                                                                </span>
                                                            </span>
                                                            {o.matched_on && (
                                                                <span className="mt-1 block text-[11px] text-[#9ca9b8]">Matched on {o.matched_on}</span>
                                                            )}
                                                        </span>
                                                        <ChevronRight style={{ fontSize: 18 }} className="shrink-0 text-[#B4C7DA] group-hover/opt:text-[#005EA4]" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Confirm card: yes/no before an action runs */}
                                {pending?.type === 'confirm' && (
                                    <div className="fleetra-msg-in flex items-start gap-2.5">
                                        <BotAvatar className="mt-0.5" />
                                        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-[#BFD7EE] bg-white p-4">
                                            <div className="mb-3.5 flex items-start gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5F0F9] text-[#005EA4]">
                                                    <ShieldOutlined style={{ fontSize: 18 }} />
                                                </span>
                                                <p className="m-0 pt-1 text-[13px] font-semibold leading-snug text-[#0B2A45]">{pending.copy}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => answerPending({ approved: true }, 'Yes')}
                                                    className="flex-1 cursor-pointer rounded-xl border-none bg-[#005EA4] py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#004A82]"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => answerPending({ approved: false }, 'Cancel')}
                                                    className="flex-1 cursor-pointer rounded-xl border border-[#D5E3F0] bg-white py-2.5 text-[12.5px] font-semibold text-[#334155] transition-colors hover:bg-[#F1F5F9]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Waiting for the first words of a reply */}
                                {waiting && (
                                    <div className="fleetra-msg-in flex items-center gap-2.5">
                                        <BotAvatar />
                                        <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-[#D5E3F0] bg-white px-3.5 py-3">
                                            <span className="flex items-center gap-1">
                                                {[0, 1, 2].map((i) => (
                                                    <span
                                                        key={i}
                                                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#005EA4]"
                                                        style={{ animationDelay: `${i * 120}ms` }}
                                                    />
                                                ))}
                                            </span>
                                            <span className="text-[12px] text-[#6b7a8f]">Looking that up…</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {showJump && (
                        <button
                            type="button"
                            onClick={jumpToBottom}
                            aria-label="Jump to latest message"
                            className="absolute bottom-3 left-1/2 flex h-9 w-9 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-[#D5E3F0] bg-white text-[#005EA4] shadow-[0_6px_18px_rgba(0,74,130,0.18)] transition-colors hover:bg-[#E5F0F9]"
                        >
                            <KeyboardArrowDownRounded style={{ fontSize: 22 }} />
                        </button>
                    )}
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-[#D5E3F0] bg-white px-3 pb-3 pt-2.5 sm:px-4">
                    {!isFresh && !isTyping && !pending && !showSlash && (
                        <div className="fleetra-no-scrollbar -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1">
                            {COMMANDS.map(({ icon: Icon, label, example, cmd }) => (
                                <button
                                    key={cmd}
                                    type="button"
                                    onClick={() => send(example)}
                                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D5E3F0] bg-[#F4F8FC] px-2.5 py-1.5 text-[12px] font-semibold text-[#334155] transition-colors hover:border-[#005EA4] hover:bg-[#E5F0F9] hover:text-[#005EA4]"
                                >
                                    <Icon style={{ fontSize: 14 }} className="text-[#005EA4]" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        {showSlash && (
                            <div className="fleetra-msg-in absolute bottom-full left-0 right-0 z-10 mb-2 overflow-hidden rounded-2xl border border-[#D5E3F0] bg-white p-1.5 shadow-[0_14px_40px_rgba(0,74,130,0.18)]">
                                {slashMatches.map((c, i) => {
                                    const Icon = c.icon;
                                    return (
                                        <button
                                            key={c.cmd}
                                            type="button"
                                            onMouseEnter={() => setSlashIndex(i)}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                pickCommand(c);
                                            }}
                                            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-none px-2.5 py-2 text-left transition-colors ${
                                                i === slashIndex ? 'bg-[#E5F0F9]' : 'bg-transparent'
                                            }`}
                                        >
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#005EA4] ring-1 ring-[#D5E3F0]">
                                                <Icon style={{ fontSize: 16 }} />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[12.5px] font-semibold text-[#0B2A45]">{c.label}</span>
                                                <span className="block truncate text-[11.5px] text-[#7c8ba1]">{c.desc}</span>
                                            </span>
                                            <span className="shrink-0 text-[11.5px] font-semibold text-[#005EA4]">{c.cmd}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-end gap-2 rounded-2xl border border-[#C5D6E6] bg-white p-1.5 transition-all focus-within:border-[#005EA4] focus-within:shadow-[0_0_0_4px_rgba(0,94,164,0.12)]">
                            <button
                                type="button"
                                aria-label="Show shortcuts"
                                title="Shortcuts"
                                disabled={Boolean(cardOpen)}
                                onClick={() => {
                                    setInput('/');
                                    inputRef.current?.focus();
                                }}
                                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-[#E5F0F9] text-[15px] font-bold text-[#005EA4] transition-colors hover:bg-[#D3E6F5] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                /
                            </button>

                            <textarea
                                ref={inputRef}
                                rows={1}
                                value={input}
                                onChange={(e) => {
                                    histIdxRef.current = -1;
                                    setInput(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.nativeEvent?.isComposing) return;

                                    if (showSlash) {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setSlashIndex((i) => (i + 1) % slashMatches.length);
                                            return;
                                        }
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setSlashIndex((i) => (i - 1 + slashMatches.length) % slashMatches.length);
                                            return;
                                        }
                                        if (e.key === 'Enter' || e.key === 'Tab') {
                                            e.preventDefault();
                                            pickCommand(slashMatches[slashIndex] || slashMatches[0]);
                                            return;
                                        }
                                    }

                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        submit();
                                        return;
                                    }

                                    // ↑ / ↓ walks back through what you asked earlier.
                                    if (e.key === 'ArrowUp' && (!input || histIdxRef.current >= 0)) {
                                        const pool = promptHistory.length
                                            ? promptHistory
                                            : lastUserTextRef.current
                                                ? [lastUserTextRef.current]
                                                : [];
                                        if (!pool.length) return;
                                        e.preventDefault();
                                        histIdxRef.current = Math.min(histIdxRef.current + 1, pool.length - 1);
                                        setInput(pool[histIdxRef.current]);
                                    } else if (e.key === 'ArrowDown' && histIdxRef.current >= 0) {
                                        e.preventDefault();
                                        histIdxRef.current -= 1;
                                        setInput(histIdxRef.current >= 0 ? promptHistory[histIdxRef.current] : '');
                                    }
                                }}
                                disabled={Boolean(cardOpen)}
                                placeholder={
                                    cardOpen
                                        ? 'Choose an option above to continue'
                                        : listening
                                            ? 'Listening…'
                                            : pending?.type === 'ask'
                                                ? 'Type your answer…'
                                                : 'Ask about a carrier or a load…'
                                }
                                className="my-2 max-h-[120px] min-w-0 flex-1 resize-none border-none bg-transparent text-[13.5px] leading-[1.45] text-[#1a1a1a] outline-none placeholder-[#94a3b8] disabled:cursor-not-allowed"
                            />

                            {SpeechRec && !isTyping && (
                                <button
                                    type="button"
                                    onClick={toggleVoice}
                                    disabled={Boolean(cardOpen)}
                                    aria-label={listening ? 'Stop dictation' : 'Dictate'}
                                    title={listening ? 'Stop dictation' : 'Dictate'}
                                    className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                        listening
                                            ? 'animate-pulse bg-[#005EA4] text-white'
                                            : 'bg-transparent text-[#8a9bb0] hover:bg-[#E5F0F9] hover:text-[#005EA4]'
                                    }`}
                                >
                                    {listening ? <Mic style={{ fontSize: 18 }} /> : <MicNoneOutlined style={{ fontSize: 18 }} />}
                                </button>
                            )}

                            {isTyping ? (
                                <button
                                    type="button"
                                    onClick={stopGenerating}
                                    aria-label="Stop generating"
                                    title="Stop generating"
                                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-[#004A82] text-white transition-colors hover:bg-[#005EA4]"
                                >
                                    <StopRounded style={{ fontSize: 18 }} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={submit}
                                    disabled={!input.trim() || Boolean(cardOpen)}
                                    aria-label="Send message"
                                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-none bg-[#005EA4] text-white transition-colors hover:enabled:bg-[#004A82] disabled:cursor-not-allowed disabled:bg-[#CBD5E1]"
                                >
                                    <SendRounded style={{ fontSize: 16 }} />
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="m-0 mt-2 text-center text-[10.5px] text-[#9ca9b8]">
                        Fleetra is in beta, so answers here are illustrative for now.
                        <span className="hidden sm:inline"> Shift+Enter adds a new line.</span>
                    </p>
                </div>
            </div>
        </>
    );
}

class Dashboard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            account_token: false,
            user: false,
            initing: true,
            user_subscribed_plan: false,

            // Live plan + allowance from GET /subscription. Kept apart from
            // `user_subscribed_plan`, which is only the copy cached in
            // localStorage at login and goes stale the moment a plan changes.
            subscription: null,
            load_usage: null,
            subscription_loading: true,

            logged_in: false,
            error_message: '',
            success_message: '',
            aiQuery: '',

            // Controls the Concierge slide-over. `ai_seed_query` carries
            // whatever was typed into the top bar into the panel's first
            // message, then gets cleared so it isn't replayed next time.
            ai_modal_open: false,
            ai_seed_query: '',

            show_data_update_notice: false,
            // shipment totals — from /shipments/summary (see loadShipmentTotals)
            all_shipment: 0,
            active_shipment: 0,

            // custom table data
            shipments: [],
            shipments_loading: false,

            redirect: false,
        };
    }

    componentDidMount = () => {
        const account_token = localStorage.getItem('crm_auth_token');
        const user = localStorage.getItem('crm_user');

        if (account_token) {
            this.setState({
                account_token,
                logged_in: true,
            }, () => {
                // this.init();
                this.loadShipmentTotals();
                this.loadShipments();
                this.loadSubscription();
            });

            // A shipment added or moving on elsewhere refreshes the tiles and
            // recent activity here, without a reload.
            this.stopLive = listen(companyChannel(), 'shipment.updated', this.onShipmentPush);
        }

        if (user) {
            try {
                const parsedUser = JSON.parse(user);
                this.setState({ user: parsedUser });
                if (parsedUser && parsedUser.hasOwnProperty('plan')) {
                    this.setState({ user_subscribed_plan: parsedUser.plan });
                }
            } catch (e) {
            }
        }
    };

    componentWillUnmount = () => {
        this.stopLive?.();
        clearTimeout(this.pushTimer);
    };

    // Several pushes in a burst (a bulk import, a trip sheet's stops) become
    // one refresh.
    onShipmentPush = () => {
        clearTimeout(this.pushTimer);
        this.pushTimer = setTimeout(() => {
            this.loadShipmentTotals();
            this.loadShipments();
        }, 1000);
    };

    init = () => {
        this.setState({ initing: true });

        apiFetch('/app/customer/load', {
            method: 'POST',
            body: JSON.stringify({ page: 'dashboard' }),
        })
            .then((data) => {
                if (data && data.status) {
                    this.setState({ user: data.customer });
                    if (data.customer.hasOwnProperty('plan')) {
                        this.setState({ user_subscribed_plan: data.customer.plan });
                    }
                    localStorage.setItem('crm_user', JSON.stringify(data.customer));
                }
            })
            .catch(() => {})
            .finally(() => {
                this.setState({ initing: false });
            });
    };

    /**
     * The plan and this period's load allowance.
     *
     * Read from the API rather than the `plan` cached on the user in
     * localStorage: that copy is written at login and never refreshed, so an
     * upgrade — or a load consumed five minutes ago — would not show until the
     * next sign-in.
     *
     * A failure here must not take the dashboard down with it. The widget falls
     * back to the cached plan, and to the trial wording when there is none.
     */
    loadSubscription = () => {
        apiFetch('/subscription', { method: 'GET' })
            .then((res) => {
                const data = res?.data || {};

                this.setState({
                    subscription: data.subscription || null,
                    load_usage: data.load_usage || null,
                });
            })
            .catch(() => {})
            .finally(() => {
                this.setState({ subscription_loading: false });
            });
    };

    /**
     * Both tiles from one count. These used to page through /shipments,
     * which returns fifteen rows at most, so neither tile could pass 15 — and
     * it took two full list requests to get there.
     */
    loadShipmentTotals = () => {
        apiFetch('/shipments/summary')
            .then((data) => {
                if (data && data.status) {
                    const byStatus = data.data?.by_status || {};
                    const activeCount = Object.entries(byStatus)
                        .filter(([status]) => !INACTIVE_STATUSES.includes(status))
                        .reduce((sum, [, count]) => sum + Number(count || 0), 0);

                    this.setState({
                        all_shipment: Number(data.data?.total) || 0,
                        active_shipment: activeCount,
                    });
                }
            })
            .catch(() => {});
    };

    loadShipments = () => {
        this.setState({ shipments_loading: true });

        apiFetch('/shipments?page=1&per_page=10&sort_by=shipment.added_on&sort_order=desc')
            .then((data) => {
                if (data && data.status) {
                    const records = data.data || [];
                    this.setState({
                        shipments: records.slice(0, 10),
                    });
                }
            })
            .catch((err) => {
                this.setState({ error_message: err?.message || 'Could not load recent activity.' });
            })
            .finally(() => {
                this.setState({ shipments_loading: false });
            });
    };

    openConcierge = () => {
        this.setState({ ai_modal_open: true, ai_seed_query: this.state.aiQuery });
        this.setState({ aiQuery: '' });
    };

    render() {
        if (this.state.redirect) {
            return <Navigate to={this.state.redirect} />;
        }

        const now = new Date();
        const dayNum = format(now, 'd');
        const dayName = format(now, 'EEEE').toUpperCase();
        const monthYear = format(now, 'MMMM, yyyy');

        const totalShipments = this.state.all_shipment || 0;

        /*
        | Plan and allowance, preferring the live subscription and falling back
        | to the plan cached on the user at login.
        |
        | `limit` is null on an unlimited plan, which is different from a limit
        | of zero — treating the two alike would draw a full red bar for the
        | customers paying the most.
        */
        const subscription = this.state.subscription;
        const loadUsage = this.state.load_usage;

        const cachedPlan = this.state.user_subscribed_plan;

        const planName =
            subscription?.plan_name ||
            cachedPlan?.title ||
            'Demo Plan';

        /*
        | The API reports `unlimited: true` when there is no subscription at
        | all — nothing is capped because no plan is in force. That is true, but
        | showing "Unlimited" beside "Demo Plan" reads as a generous allowance
        | rather than no plan, so only a real subscription is allowed to say it.
        */
        const isUnlimited = !!subscription && !!loadUsage?.unlimited;

        const loadsLimit = loadUsage
            ? loadUsage.limit
            : (cachedPlan ? (cachedPlan.loads_limit || 0) : 0);

        const loadsUsed = loadUsage
            ? (loadUsage.used || 0)
            : (cachedPlan ? (cachedPlan.consumed || 0) : 0);

        // An unlimited plan has no meaningful percentage, so the bar is left
        // full rather than dividing by null.
        const loadsPercent = isUnlimited
            ? 100
            : (loadsLimit > 0
                ? Math.min(100, Math.round((loadsUsed / loadsLimit) * 100))
                : 0);

        // Over-quota is worth seeing at a glance rather than as a bar that
        // silently pins at 100%.
        const isOverQuota = !isUnlimited && loadsLimit > 0 && loadsUsed > loadsLimit;

        const usageLabel = this.state.subscription_loading
            ? '…'
            : isUnlimited
                ? `${loadsUsed} Used · Unlimited`
                : loadsLimit > 0
                    ? `${loadsUsed} of ${loadsLimit} Used`
                    : `${loadsUsed} Used`;

        // Only a real subscription can describe itself; anything else is still
        // the trial.
        const planBlurb = subscription
            ? (subscription.cancel_at_period_end
                ? 'Your plan is set to cancel at the end of this billing period.'
                : subscription.is_past_due
                    ? 'Payment failed — update your card to keep your plan active.'
                    : 'Your premium plan features are active.')
            : 'You are currently using the trial environment. Upgrade to unlock cross-border automation.';

        const activeShipments = this.state.active_shipment;

        const shipments = this.state.shipments || [];
        const shipments_loading = this.state.shipments_loading || false;

        const columns = [
            { label: 'Shipment #' },
            { label: 'Carrier' },
            { label: 'Pro # / Load ID' },
            { label: 'Tracking Method' },
            { label: 'Tracking #' },
            { label: 'Driver Type' },
            { label: 'Status' },

        ];

        const s = {
            tblWrap: {
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                overflow: 'hidden',
            },
            table: {
                width: '100%',
                minWidth: 760,
                borderCollapse: 'collapse',
                fontSize: 13,
            },
            th: {
                padding: '11px 14px',
                textAlign: 'left',
                fontSize: 11,
                fontWeight: 700,
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                whiteSpace: 'nowrap',
            },
            td: {
                padding: '12px 14px',
                color: '#1a1a1a',
                verticalAlign: 'middle',
                borderBottom: '1px solid #f1f5f9',
            },
            tdLast: {
                padding: '12px 14px',
                color: '#1a1a1a',
                verticalAlign: 'middle',
            },
            emptyRow: {
                textAlign: 'center',
                padding: '40px 14px',
                color: '#9ca3af',
                fontSize: 13,
            },
        };

        return (
            <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8">
   {this.state.show_data_update_notice && (
                    <DataUpdateNotice
                        onAcknowledge={() => this.setState({ show_data_update_notice: false })}
                    />
                )}
                {/* ── Inline messages ── */}
                {this.state.error_message ? (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {this.state.error_message}
                        <button
                            type="button"
                            onClick={() => this.setState({ error_message: '' })}
                            className="ml-4 text-red-400 hover:text-red-600"
                        >
                            ✕
                        </button>
                    </div>
                ) : null}
                {this.state.success_message ? (
                    <div className="mb-4 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {this.state.success_message}
                        <button
                            type="button"
                            onClick={() => this.setState({ success_message: '' })}
                            className="ml-4 text-green-400 hover:text-green-600"
                        >
                            ✕
                        </button>
                    </div>
                ) : null}

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-[22px] sm:text-[26px] md:text-[32px] font-normal text-[#1a1a1a] m-0 tracking-[-0.5px]">
                            Overview <strong className="font-bold text-[#185FA5]">Dashboard</strong>
                        </h1>
                        <p className="text-sm text-[#71717a] mt-1.5 m-0">
                            Real-time vetting, tracking and payment analytics for your carrier network.
                        </p>
                    </div>

                    <div className="flex items-center gap-3.5 bg-white border border-[#e5e5e5] rounded-[14px] py-2.5 px-5 self-start sm:self-auto">
                        <div className="text-center min-w-[42px]">
                            <div className="text-[24px] sm:text-[28px] md:text-[32px] font-bold text-[#185FA5] leading-none">{dayNum}</div>
                            <div className="text-[9px] text-[#888] font-semibold tracking-[0.5px]">{dayName}</div>
                        </div>
                        <div className="border-l border-[#e5e5e5] h-12 mx-0.5" />
                        <div>
                            <div className="text-xs font-bold text-[#333]">{monthYear}</div>

                        </div>
                    </div>
                </div>

                {/* ── AI Bar ── */}
                <div className="bg-white border border-[#edf0f2] rounded-2xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 shadow-sm">
                    <div className="flex items-center gap-3 pl-2.5 flex-1 min-w-0">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
                        </span>
                        <span className="text-sm text-[#7c8ba1] font-medium mr-1 whitespace-nowrap">Ask the Concierge —</span>
                        <input
                            type="text"
                            className="w-full min-w-0 bg-transparent border-none outline-none text-sm text-[#1a1a1a] placeholder-[#94a3b8]"
                            placeholder={`"vet MC 1234567", "track SH000025" ...`}
                            value={this.state.aiQuery}
                            onChange={(e) => this.setState({ aiQuery: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') this.openConcierge();
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={this.openConcierge}
                        className="w-full sm:w-auto bg-[#1d4ed8] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-2.5 px-5 flex items-center justify-center gap-2 transition-all shadow-sm border-none cursor-pointer"
                    >
                        <AutoAwesomeOutlined style={{ fontSize: 16 }} />
                        Ask AI
                    </button>
                </div>

                {/* ── Cards Grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 mb-8">

                    {/* Left — Logistics Performance */}
                    <div className="bg-white rounded-2xl border border-[#e8e8e8] p-5 sm:p-6 md:p-8 pb-5 md:pb-6 flex flex-col justify-between">
                        <div className="flex flex-wrap gap-3 justify-between items-start">
                            <div>
                                <div className="text-[11px] font-bold tracking-[1.8px] text-[#404752] uppercase">
                                    Logistics Performance
                                </div>
                                <div className="text-xs text-[#8a94a6] mt-2.5">
                                    Real-time tracking and delivery analytics for the current cycle.
                                </div>
                            </div>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#185FA5] border border-[#cbd5e1] rounded-[20px] py-0.5 px-2.5 bg-[#f8fafc]">
                                <span className="w-1 h-1 rounded-full bg-[#185FA5]" />
                                LIVE
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 my-6 md:my-8">
                            <span className="text-[46px] sm:text-[60px] md:text-[75px] font-extrabold text-[#0f172a] leading-none tracking-[-1px]">
                                {totalShipments}
                            </span>
                            <div className="flex flex-col justify-center">
                                <div className="text-[18px] sm:text-[22px] md:text-[26px] font-bold text-[#64748B] leading-[1.2]">Shipments</div>
                                <div className="text-xs text-[#0284c7] font-semibold mt-1">Processed Successfully</div>
                            </div>
                            <div className="sm:ml-auto flex flex-col items-start sm:items-end text-left sm:text-right gap-0.5">
                                <div className="flex items-center gap-1.5 text-medium text-[#185FA5] font-bold">
                                    <CheckCircleOutlined style={{ fontSize: 16 }} />
                                    Efficiency target met
                                </div>
                                <span className="text-[#404752] text-[11px] font-medium">Processed Successfully</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <button
                                onClick={() => this.setState({ redirect: '/load-search' })}
                                style={{ all: 'unset', display: 'block', cursor: 'pointer', background: '#EFF6FF', padding: '14px 16px', border: '1px solid #BFDBFE', borderRadius: '12px' }}
                            >
                                <div className="text-[10px] font-bold tracking-[0.5px] text-[#1D4ED8] uppercase mb-1.5 flex items-center gap-1">
                                    <LocalShippingOutlined style={{ fontSize: 13 }} />
                                    TRACKING NOW
                                </div>
                                <div className="text-2xl font-bold text-[#1E40AF]">
                                    {String(activeShipments).padStart(2, '0')}
                                </div>
                            </button>

                            {/* NOTE: static placeholder value, not yet wired to an API field */}
                            <div className="bg-[#f4f5f7] p-3.5 px-4 border border-transparent rounded-xl">
                                <div className="text-[10px] font-bold tracking-[0.5px] text-[#8a94a6] uppercase mb-1.5">
                                    COIs expiring ≤7d
                                </div>
                                <div className="text-2xl font-bold text-[#1e293b]">00</div>
                            </div>

                            {/* NOTE: static placeholder value, not yet wired to an API field */}
                            <div className="bg-[#F2F4F6] p-3.5 px-4 border border-[#BA1A1A1A] rounded-xl">
                                <div className="text-[10px] font-bold tracking-[0.5px] text-[#dc2626] uppercase mb-1.5">
                                    At-risk loads
                                </div>
                                <div className="text-2xl font-bold text-[#b91c1c]">00</div>
                            </div>
                        </div>
                    </div>

                    {/* Right — Account Status */}
                    <div className="bg-[#005EA4] rounded-2xl p-5 sm:p-6 text-white flex flex-col justify-between relative min-h-[240px] sm:min-h-[280px]">
                       <button
  type="button"
  onClick={() => this.setState({ redirect: "/billing" })}
  className="absolute top-4 right-4 z-50 rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer"
  style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
>
  <SettingsOutlined sx={{ fontSize: 18, color: "#fff" }} />
</button>

                        <div>
                            <div className="text-[10px] font-semibold tracking-wider uppercase opacity-60 mb-1.5">
                                Account Status
                            </div>

                            {/* Placeholder until /subscription answers, so the wrong
                                plan name / trial text never flashes first. */}
                            {this.state.subscription_loading ? (
                                <>
                                    <div className="h-8 w-40 bg-white/20 rounded animate-pulse" />
                                    <div className="h-3 w-56 bg-white/20 rounded animate-pulse mt-3" />
                                </>
                            ) : (
                                <>
                                    <h2 className="text-[22px] sm:text-[24px] md:text-[28px] font-bold text-white m-0 tracking-[-0.5px]">
                                        {planName}
                                    </h2>
                                    <p className="text-xs opacity-75 mt-2.5 leading-normal">
                                        {planBlurb}
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="my-5">
                            <div className="flex justify-between text-[11px] font-semibold opacity-90 mb-2">
                                <span className="uppercase tracking-wider">Loads Utilization</span>
                                <span>{usageLabel}</span>
                            </div>
                            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                                <div
                                    className={`rounded-full h-full transition-all duration-500 ease-in-out ${
                                        isOverQuota ? 'bg-[#FCA5A5]' : 'bg-white'
                                    }`}
                                    style={{ width: `${loadsPercent}%` }}
                                />
                            </div>

                            {isOverQuota && (
                                <p className="text-[11px] mt-2 text-[#FCA5A5]">
                                    You are over this period's load allowance.
                                </p>
                            )}

                            {!isUnlimited && loadUsage?.period_ends_at && (
                                <p className="text-[11px] mt-2 opacity-60">
                                    Resets {format(new Date(loadUsage.period_ends_at), 'd MMM yyyy')}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            {/* Only offer an upgrade to someone who is not
                                already paying, and only once we know. */}
                            {!this.state.subscription_loading && !subscription && (
                                <a
                                    href="/subscribe"
                                    className="block text-center bg-white text-[#185FA5] text-xs font-bold rounded-lg py-3.5 no-underline"
                                >
                                    Upgrade to Professional
                                </a>
                            )}


                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4 gap-3">
                    <span className="text-base sm:text-lg font-bold text-[#1a1a1a]">Recent Activity</span>
                    <a href="/load-search" className="flex items-center gap-1 text-xs font-semibold text-[#185FA5] no-underline whitespace-nowrap">
                        Full Activity Log <OpenInNew style={{ fontSize: 14 }} />
                    </a>
                </div>

                {/* ── Custom Table (desktop / tablet-landscape only — unchanged) ──
                     NOTE: s.tblWrap sets `overflow: 'hidden'` as an inline
                     style, which — being inline — always overrides the
                     Tailwind `overflow-x-auto` class if both land on the
                     same element. That silently killed horizontal
                     scrolling. Fixed by splitting into an outer div (keeps
                     the rounded/clipped look from s.tblWrap) and an inner
                     div that actually scrolls. Look is unchanged. */}
                <div className="hidden md:block">
                    <div style={s.tblWrap}>
                    <div className="overflow-x-auto">
                        <table style={s.table}>
                            <thead>
                                <tr>
                                    {columns.map((col) => (
                                        <th key={col.label} style={s.th}>{col.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {shipments_loading && (
                                    <tr>
                                        <td colSpan={columns.length} style={s.emptyRow}>
                                            Loading…
                                        </td>
                                    </tr>
                                )}

                                {!shipments_loading && shipments.length === 0 && (
                                    <tr>
                                        <td colSpan={columns.length} style={s.emptyRow}>
                                            No shipments found.
                                        </td>
                                    </tr>
                                )}

                                {!shipments_loading && shipments.map((row, i) => {
                                    const isLast = i === shipments.length - 1;
                                    const td = isLast ? s.tdLast : s.td;

                                    const carrierDisplay = row.carrier_name || row.carrier_mc || row.carrier_dot || '—';
                                    const trackingMethodDisplay = TRACKING_METHOD_LABELS[row.tracking_method] || row.tracking_method || '—';
                                    const driverTypeDisplay = DRIVER_TYPE_LABELS[row.driver_type] || row.driver_type || '—';

                                    return (
                                        <tr
                                            key={row.uuid || i}
                                            className="dashboard-shipment-row"
                                            style={{
                                                background: '#fff',
                                                transition: 'background 0.15s, box-shadow 0.15s',
                                                cursor: 'pointer',
                                                borderLeft: '3px solid transparent'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = '#f8fafc';
                                                e.currentTarget.style.borderLeft = '3px solid #185FA5';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = '#fff';
                                                e.currentTarget.style.borderLeft = '3px solid transparent';
                                            }}
                                            onClick={() => this.setState({ redirect: shipmentDetailPath(row) })}
                                        >
                                            {/* Shipment Number */}
                                            <td style={{ ...td, color: '#003178', fontWeight: 700 }}>
                                                <span className="dashboard-shipment-number">
                                                    {row.shipment_no}
                                                </span>
                                            </td>

                                            {/* Carrier */}
                                            <td style={{ ...td, fontWeight: 600 }}>
                                                {carrierDisplay}
                                            </td>

                                            {/* Pro # / Load ID */}
                                            <td style={td}>
                                                {row.pro_number || '—'}
                                            </td>

                                            {/* Tracking Method */}
                                            <td style={td}>
                                                {trackingMethodDisplay}
                                            </td>

                                            {/* Tracking # */}
                                            <td style={{ ...td, fontWeight: 600 }}>
                                                {row.tracking_number || '—'}
                                            </td>

                                            {/* Driver Type */}
                                            <td style={td}>
                                                {driverTypeDisplay}
                                            </td>

                                            {/* Status */}
                                            <td style={td}>
                                                <Chip
                                                    label={statusLabel(row.status)}
                                                    variant="outlined"
                                                    size="small"
                                                    color={statusChipColor(row.status)}
                                                />
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    </div>
                </div>

                <div className="md:hidden flex flex-col gap-3">
                    {shipments_loading && (
                        <div className="bg-white border border-[#e5e7eb] rounded-2xl py-10 text-center text-sm text-[#9ca3af]">
                            Loading…
                        </div>
                    )}

                    {!shipments_loading && shipments.length === 0 && (
                        <div className="bg-white border border-[#e5e7eb] rounded-2xl py-10 text-center text-sm text-[#9ca3af]">
                            No shipments found.
                        </div>
                    )}

                    {!shipments_loading && shipments.map((row, i) => {
                        const carrierDisplay = row.carrier_name || row.carrier_mc || row.carrier_dot || '—';
                        const trackingMethodDisplay = TRACKING_METHOD_LABELS[row.tracking_method] || row.tracking_method || '—';
                        const driverTypeDisplay = DRIVER_TYPE_LABELS[row.driver_type] || row.driver_type || '—';

                        return (
                            <div
                                key={row.uuid || i}
                                onClick={() => this.setState({ redirect: `/shipment/${row.uuid}` })}
                                className="bg-[#fff] border border-[#e5e7eb] rounded-2xl p-4 cursor-pointer active:bg-[#f8fafc]"
                                style={{ borderLeft: '3px solid #185FA5' }}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <span className="text-[15px] font-bold text-[#003178]">
                                        {row.shipment_no}
                                    </span>
                                    <Chip
                                        label={statusLabel(row.status)}
                                        variant="outlined"
                                        size="small"
                                        color={statusChipColor(row.status)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]">
                                    <div>
                                        <div className="text-[10px] font-bold tracking-[0.5px] text-[#9ca3af] uppercase mb-0.5">
                                            Carrier
                                        </div>
                                        <div className="font-semibold text-[#1a1a1a]">{carrierDisplay}</div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-bold tracking-[0.5px] text-[#9ca3af] uppercase mb-0.5">
                                            Pro # / Load ID
                                        </div>
                                        <div className="text-[#1a1a1a]">{row.pro_number || '—'}</div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-bold tracking-[0.5px] text-[#9ca3af] uppercase mb-0.5">
                                            Tracking Method
                                        </div>
                                        <div className="text-[#1a1a1a]">{trackingMethodDisplay}</div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-bold tracking-[0.5px] text-[#9ca3af] uppercase mb-0.5">
                                            Tracking #
                                        </div>
                                        <div className="font-semibold text-[#1a1a1a]">{row.tracking_number || '—'}</div>
                                    </div>

                                    <div className="col-span-2">
                                        <div className="text-[10px] font-bold tracking-[0.5px] text-[#9ca3af] uppercase mb-0.5">
                                            Driver Type
                                        </div>
                                        <div className="text-[#1a1a1a]">{driverTypeDisplay}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Concierge chat panel ── */}
                <ConciergeChat
                    isOpen={this.state.ai_modal_open}
                    onClose={() => this.setState({ ai_modal_open: false })}
                    seedQuery={this.state.ai_seed_query}
                    onSeedConsumed={() => this.setState({ ai_seed_query: '' })}
                />

            </div>
        );
    }
}

export default Dashboard;