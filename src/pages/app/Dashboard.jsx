import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import OpenInNew from '@mui/icons-material/OpenInNew';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined';
import Chip from '@mui/material/Chip';
import { format } from 'date-fns';

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


class Dashboard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            account_token: false,
            user: false,
            initing: true,
            user_subscribed_plan: false,
            logged_in: false,
            error_message: '',
            success_message: '',
            aiQuery: '',

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

    render() {
        if (this.state.redirect) {
            return <Navigate to={this.state.redirect} />;
        }

        const now = new Date();
        const dayNum = format(now, 'd');
        const dayName = format(now, 'EEEE').toUpperCase();
        const monthYear = format(now, 'MMMM, yyyy');

        const totalShipments = this.state.all_shipment || 0;

        const loadsLimit = this.state.user_subscribed_plan ? (this.state.user_subscribed_plan.loads_limit || 0) : 0;
        const loadsUsed = this.state.user_subscribed_plan ? (this.state.user_subscribed_plan.consumed || 0) : 0;
        const loadsPercent = loadsLimit > 0 ? Math.round((loadsUsed / loadsLimit) * 100) : 0;

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
            <div className="px-8 py-8">

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
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-[32px] font-normal text-[#1a1a1a] m-0 tracking-[-0.5px]">
                            Overview <strong className="font-bold text-[#185FA5]">Dashboard</strong>
                        </h1>
                        <p className="text-sm text-[#71717a] mt-1.5 m-0">
                            Real-time vetting, tracking and payment analytics for your carrier network.
                        </p>
                    </div>

                    <div className="flex items-center gap-3.5 bg-white border border-[#e5e5e5] rounded-[14px] py-2.5 px-5">
                        <div className="text-center min-w-[42px]">
                            <div className="text-[32px] font-bold text-[#185FA5] leading-none">{dayNum}</div>
                            <div className="text-[9px] text-[#888] font-semibold tracking-[0.5px]">{dayName}</div>
                        </div>
                        <div className="border-l border-[#e5e5e5] h-12 mx-0.5" />
                        <div>
                            <div className="text-xs font-bold text-[#333]">{monthYear}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
                                <span className="text-[11px] text-[#565E74] font-medium">Service Operational</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── AI Bar ── */}
                <div className="bg-white border border-[#edf0f2] rounded-2xl p-2.5 flex items-center justify-between gap-4 mb-6 shadow-sm">
                    <div className="flex items-center gap-3 pl-2.5 flex-1">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
                        </span>
                        <span className="text-sm text-[#7c8ba1] font-medium mr-1 whitespace-nowrap">Ask the Concierge —</span>
                        <input
                            type="text"
                            className="w-full bg-transparent border-none outline-none text-sm text-[#1a1a1a] placeholder-[#94a3b8]"
                            placeholder={`"vet MC 1234567", "track SH000025", "who's expiring this week?"`}
                            value={this.state.aiQuery}
                            onChange={(e) => this.setState({ aiQuery: e.target.value })}
                        />
                    </div>
                    <button className="bg-[#1d4ed8] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-2.5 px-5 flex items-center gap-2 transition-all shadow-sm border-none cursor-pointer">
                        <AutoAwesomeOutlined style={{ fontSize: 16 }} />
                        Ask AI
                    </button>
                </div>

                {/* ── Cards Grid ── */}
                <div className="grid grid-cols-[1fr_380px] gap-5 mb-8">

                    {/* Left — Logistics Performance */}
                    <div className="bg-white rounded-2xl border border-[#e8e8e8] p-8 pb-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
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

                        <div className="flex items-center gap-4 my-8">
                            <span className="text-[75px] font-extrabold text-[#0f172a] leading-none tracking-[-1px]">
                                {totalShipments}
                            </span>
                            <div className="flex flex-col justify-center">
                                <div className="text-[26px] font-bold text-[#64748B] leading-[1.2]">Shipments</div>
                                <div className="text-xs text-[#0284c7] font-semibold mt-1">Processed Successfully</div>
                            </div>
                            <div className="ml-auto flex flex-col items-end text-right gap-0.5">
                                <div className="flex items-center gap-1.5 text-medium text-[#185FA5] font-bold">
                                    <CheckCircleOutlined style={{ fontSize: 16 }} />
                                    Efficiency target met
                                </div>
                                <span className="text-[#404752] text-[11px] font-medium">Processed Successfully</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
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
                                <div className="text-2xl font-bold text-[#1e293b]">05</div>
                            </div>

                            {/* NOTE: static placeholder value, not yet wired to an API field */}
                            <div className="bg-[#F2F4F6] p-3.5 px-4 border border-[#BA1A1A1A] rounded-xl">
                                <div className="text-[10px] font-bold tracking-[0.5px] text-[#dc2626] uppercase mb-1.5">
                                    At-risk loads
                                </div>
                                <div className="text-2xl font-bold text-[#b91c1c]">02</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#005EA4] rounded-2xl p-6 text-white flex flex-col justify-between relative min-h-[280px]">
                        <button
                            type="button"
                            className="absolute top-4 right-4 z-50 rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer"
                            style={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                        >
                            <SettingsOutlined sx={{ fontSize: 18, color: "#fff" }} />
                        </button>

                        <div>
                            <div className="text-[10px] font-semibold tracking-wider uppercase opacity-60 mb-1.5">
                                Account Status
                            </div>
                            <h2 className="text-[28px] font-bold text-white m-0 tracking-[-0.5px]">
                                {this.state.user_subscribed_plan ? this.state.user_subscribed_plan.title : 'Demo Plan'}
                            </h2>
                            <p className="text-xs opacity-75 mt-2.5 leading-normal">
                                {!this.state.user_subscribed_plan || this.state.user_subscribed_plan?.is_demo === '1'
                                    ? 'You are currently using the trial environment. Upgrade to unlock cross-border automation.'
                                    : (this.state.user_subscribed_plan?.sub_title && this.state.user_subscribed_plan.sub_title.trim() !== '' && this.state.user_subscribed_plan.sub_title !== 'Try DollarTraq'
                                        ? this.state.user_subscribed_plan.sub_title
                                        : 'Your premium plan features are active.')}
                            </p>
                        </div>

                        <div className="my-5">
                            <div className="flex justify-between text-[11px] font-semibold opacity-90 mb-2">
                                <span className="uppercase tracking-wider">Loads Utilization</span>
                                <span>{loadsUsed} of {loadsLimit} Used</span>
                            </div>
                            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-white rounded-full h-full transition-all duration-500 ease-in-out"
                                    style={{ width: `${loadsPercent}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="block text-center bg-white text-[#185FA5] text-xs font-bold rounded-lg py-3.5">
                                Upgrade to Professional
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs font-semibold text-white/85">
                                View Plan Details <ChevronRight style={{ fontSize: 16 }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold text-[#1a1a1a]">Recent Activity</span>
                    <a href="#" className="flex items-center gap-1 text-xs font-semibold text-[#185FA5] no-underline">
                        Full Activity Log <OpenInNew style={{ fontSize: 14 }} />
                    </a>
                </div>

                {/* ── Custom Table ── */}
                <div style={s.tblWrap}>
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
                                        onClick={() => this.setState({ redirect: `/shipment/${row.uuid}` })}
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
        );
    }
}

export default Dashboard;