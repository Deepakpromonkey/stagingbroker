import React, { Component, useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
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
import Chip from '@mui/material/Chip';
import { format } from 'date-fns';

const BASE_URL = 'https://ai.dollartraq.com';

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
// Integrates directly with Fleetra Chat API using crm_company from localStorage.
//
// NOTE: this component intentionally does NOT fall back to a hardcoded
// company/session UUID when localStorage is missing the real one. If we
// can't identify the company, we don't init a session and we don't send
// chat requests — surfacing that as an inline message instead of silently
// talking to the API as some other tenant.
// ─────────────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
    { icon: ShieldOutlined, label: 'Vet a carrier', value: 'Vet MC 1234567' },
    { icon: LocalShippingOutlined, label: 'Track a shipment', value: 'Track SH000025' },
    { icon: ScheduleOutlined, label: 'Expiring COIs', value: "What's expiring this week?" },
    { icon: WarningAmberOutlined, label: 'At-risk loads', value: 'Show me at-risk loads' },
];

function getStoredCompanyUuid() {
    try {
        const storedCompany = localStorage.getItem('crm_company');
        if (!storedCompany) return null;

        const parsed = JSON.parse(storedCompany);
        return parsed?.uuid || null;
    } catch (e) {
        return null;
    }
}

function ConciergeChat({ isOpen, onClose, seedQuery, onSeedConsumed }) {
    const [messages, setMessages] = useState([
        {
            id: 'greeting',
            role: 'bot',
            text: "Hi, I'm your logistics concierge. Ask me to vet a carrier, track a shipment, or check what's expiring this week.",
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [sessionError, setSessionError] = useState(false);
    const [conversationId, setConversationId] = useState(null);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const seededRef = useRef(false);

    // Initialize a Fleetra session using the real company_id from localStorage.
    // No fallback UUID: if we don't know the company, we don't create a
    // session, and `send` below refuses to fire without one.
    useEffect(() => {
        const initSession = async () => {
            const companyUuid = getStoredCompanyUuid();

            if (!companyUuid) {
                setSessionError(true);
                return;
            }

            try {
                const res = await fetch(`${BASE_URL}/api/session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        company_id: companyUuid,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && data.session_id) {
                        setSessionId(data.session_id);
                        setSessionError(false);
                        return;
                    }
                }

                setSessionError(true);
            } catch (err) {
                console.error('Failed to initialize session:', err);
                setSessionError(true);
            }
        };

        if (isOpen && !sessionId && !sessionError) {
            initSession();
        }
    }, [isOpen, sessionId, sessionError]);

    const send = async (text) => {
        const value = (text ?? input).trim();
        if (!value || isTyping) return;

        // Refuse to talk to the API without a real session — no fallback ID.
        if (!sessionId) {
            setMessages((prev) => [
                ...prev,
                { id: `u-${Date.now()}`, role: 'user', text: value },
                {
                    id: `b-${Date.now()}`,
                    role: 'bot',
                    text: "I couldn't verify your account, so I can't look anything up right now. Please refresh or sign in again.",
                },
            ]);
            setInput('');
            return;
        }

        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: value }]);
        setInput('');
        setIsTyping(true);

        try {
            const payload = {
                message: value,
                session_id: sessionId,
            };

            if (conversationId) {
                payload.conversation_id = conversationId;
            }

            const response = await fetch(`${BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.conversation_id) {
                    setConversationId(data.conversation_id);
                }
                setMessages((prev) => [
                    ...prev,
                    { id: `b-${Date.now()}`, role: 'bot', text: data.reply || 'No response from assistant.' },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { id: `b-${Date.now()}`, role: 'bot', text: 'Sorry, I encountered an issue processing your request.' },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { id: `b-${Date.now()}`, role: 'bot', text: 'Network error. Please try again later.' },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    // Seed the thread once with whatever was typed into the top bar, then
    // let the parent clear it so re-opening the panel doesn't replay it.
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
            window.setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, isTyping]);

    return (
        <>
            {/* Backdrop — dims the dashboard, closes the panel on click */}
            <div
                onClick={onClose}
                aria-hidden={!isOpen}
                className={`fixed inset-0 z-[90] bg-[#0B2A45] transition-opacity duration-300 ${
                    isOpen ? 'opacity-40 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
            />

            {/* Panel */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Concierge chat"
                className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[420px] bg-[#F7F9FB] shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div
                    className="flex items-start justify-between px-5 py-4 sm:px-6 sm:py-5 text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0B3E6F 0%, #185FA5 100%)' }}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                            <AutoAwesomeOutlined style={{ fontSize: 20 }} />
                        </span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="m-0 text-[15px] font-bold tracking-tight truncate">Concierge</h3>
                                <span className="text-[9px] font-bold tracking-wide bg-white/15 rounded-full px-2 py-0.5 shrink-0">
                                    BETA
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#4ADE80]" />
                                </span>
                                <span className="text-[11px] text-white/75">Vetting &amp; tracking assistant</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        aria-label="Close concierge"
                        onClick={onClose}
                        className="rounded-full border-none bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer shrink-0 transition-colors"
                    >
                        <Close style={{ fontSize: 18 }} />
                    </button>
                </div>

                {/* Message thread */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 flex flex-col gap-3.5">
                    {sessionError && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] text-amber-800">
                            We couldn't verify your account for this session, so lookups are disabled until you refresh or sign in again.
                        </div>
                    )}

                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`flex items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {m.role === 'bot' && (
                                <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#185FA5]/10 text-[#185FA5]">
                                    <AutoAwesomeOutlined style={{ fontSize: 13 }} />
                                </span>
                            )}
                            <div
                                className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                                    m.role === 'user'
                                        ? 'bg-[#1d4ed8] text-white rounded-2xl rounded-br-md'
                                        : 'bg-white text-[#1a1a1a] border border-[#e8edf2] rounded-2xl rounded-bl-md'
                                }`}
                            >
                                {m.text}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex items-end gap-2">
                            <span className="mb-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#185FA5]/10 text-[#185FA5]">
                                <AutoAwesomeOutlined style={{ fontSize: 13 }} />
                            </span>
                            <div className="flex items-center gap-1 bg-white border border-[#e8edf2] rounded-2xl rounded-bl-md px-4 py-3.5">
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className="h-1.5 w-1.5 rounded-full bg-[#9CA9B8] animate-bounce"
                                        style={{ animationDelay: `${i * 120}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions — shown until the person sends their first message */}
                    {messages.length === 1 && !isTyping && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {SUGGESTIONS.map(({ icon: Icon, label, value }) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => send(value)}
                                    className="flex items-center gap-2 rounded-xl border border-[#dbe4ee] bg-white px-3 py-2.5 text-left text-[12px] font-semibold text-[#374151] cursor-pointer transition-colors hover:border-[#185FA5] hover:bg-[#EFF6FF]"
                                >
                                    <Icon style={{ fontSize: 15 }} className="text-[#185FA5] shrink-0" />
                                    <span className="truncate">{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-[#e8edf2] bg-white px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-2 rounded-full border border-[#dbe4ee] bg-[#F7F9FB] pl-4 pr-1.5 py-1.5 focus-within:border-[#185FA5] transition-colors">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') send();
                            }}
                            placeholder="Message the concierge…"
                            className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] text-[#1a1a1a] placeholder-[#94a3b8]"
                        />
                        <button
                            type="button"
                            onClick={() => send()}
                            disabled={!input.trim() || isTyping}
                            aria-label="Send message"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-none text-white cursor-pointer transition-colors disabled:cursor-not-allowed disabled:bg-[#CBD5E1] bg-[#1d4ed8] hover:enabled:bg-blue-700"
                        >
                            <SendRounded style={{ fontSize: 15 }} />
                        </button>
                    </div>
                    <p className="m-0 mt-2 text-center text-[10px] text-[#9ca3af]">
                        Concierge is in beta — answers here are illustrative for now.
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

            // shipment totals — derived from /shipments pagination
            // metadata (see loadShipmentTotals) rather than a separate
            // totals endpoint
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
            this.setState({ account_token, logged_in: true }, () => {
                // this.init();
                this.loadShipmentTotals();
                this.loadActiveShipmentCount();
                this.loadShipments();
                this.loadSubscription();
            });
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

    getTotalFromResponse = (data, recordsFallback = []) => {
        if (!data) return recordsFallback.length;
        if (typeof data.total === 'number') return data.total;
        if (typeof data.meta?.total === 'number') return data.meta.total;
        if (typeof data.pagination?.total === 'number') return data.pagination.total;
        return recordsFallback.length;
    };

    loadShipmentTotals = () => {
        apiFetch('/shipments?page=1&per_page=1')
            .then((data) => {
                if (data && data.status) {
                    this.setState({
                        all_shipment: this.getTotalFromResponse(data, data.data || []),
                    });
                }
            })
            .catch(() => {});
    };

    loadActiveShipmentCount = () => {
        apiFetch('/shipments?page=1&per_page=1000')
            .then((data) => {
                if (data && data.status) {
                    const records = data.data || [];
                    const activeCount = records.filter(
                        (row) => !INACTIVE_STATUSES.includes((row.status || '').toLowerCase())
                    ).length;

                    this.setState({ active_shipment: activeCount });
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
                            placeholder={`"vet MC 1234567", "track SH000025", "who's expiring this week?"`}
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
                            <h2 className="text-[22px] sm:text-[24px] md:text-[28px] font-bold text-white m-0 tracking-[-0.5px]">
                                {planName}
                            </h2>
                            <p className="text-xs opacity-75 mt-2.5 leading-normal">
                                {planBlurb}
                            </p>
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
                                already paying — the CTA used to read "Upgrade
                                to Professional" regardless of plan. */}
                            {!subscription && (
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
