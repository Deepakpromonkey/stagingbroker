import React from 'react';
import { 
    CheckCircleOutlined,
    ErrorOutlined,
    ReportGmailerrorredOutlined,
    ShieldOutlined,
    LocalShippingOutlined,
    DirectionsCarOutlined,
    NotificationsNoneOutlined,
    CarCrashOutlined
} from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

function Overview({ data }) { 
    
const issIndex = Number(data?.fmcsa_data?.issScore ?? 0);
    const riskLevel = data?.riskLevel ?? "N/A";
const statusCode = data?.fmcsa_data?.statusCode;

const status =
    statusCode === "A"
        ? "ACTIVE"
        : statusCode === "I"
        ? "INACTIVE"
        : "NO DATA";
    const verifications = data?.verifications ?? [];
    const criticalFlags = data?.criticalFlags ?? [];
    const basicsTable = data?.basicsTable ?? {};
    const inspections = data?.inspections ?? {};
    const crashes = data?.crashes ?? {};

const metrics = [
    {
        label: 'SAFETY RATING',
        value: data?.risk_level,
        badge: data?.risk_level,
        badgeClass: 'bg-[#ecfbf2] text-[#2f9e55]',
        icon: <ShieldOutlined />,
        iconBg: 'bg-[#eef4ff]',
        iconColor: 'text-[#2563eb]',
        showBadge: true
    },
    {
        label: 'VEHICLE OOS',
        value:
            data?.computed?.inspections_vehicle_out_of_service_pct != null
                ? `${data.computed.inspections_vehicle_out_of_service_pct}%`
                : 'NA',
        icon: <LocalShippingOutlined />,
        iconBg: 'bg-[#f3f6fb]',
        iconColor: 'text-[#64748b]'
    },
    {
        label: 'CRASH RATE',
        value: data?.crash_rate,
        icon: <DirectionsCarOutlined />,
        iconBg: 'bg-[#fff7f1]',
        iconColor: 'text-[#ea580c]'
    },
    {
        label: 'ACTIVE ALERTS',
        value: 'TBC',
        icon: <NotificationsNoneOutlined />,
        iconBg: 'bg-[#fff1f2]',
        iconColor: 'text-[#ef4444]'
    }
];

const crashList = data?.crashes || [];

const fatalCount = crashList.reduce(
    (sum, item) => sum + (Number(item?.fatalities) || 0),
    0
);

const injuryCount = crashList.reduce(
    (sum, item) => sum + (Number(item?.injuries) || 0),
    0
);

const totalCrashes = crashList.length;

function renderValue(value) {

    return (
        value !== null &&
        value !== undefined &&
        value !== ''
    )
        ? value
        : 'NA';
}

    const isHighRisk = issIndex > 50;
    const themeColor = isHighRisk ? "#ef4444" : "#10b981";
    const bgColor = isHighRisk ? "#fef2f2" : "#ecfdf5";
    const textColor = isHighRisk ? "#991b1b" : "#059669";

    return (
        <div className="bg-[#f8fafc] p-[32px] space-y-[24px]">
            
            <div className="grid grid-cols-12 gap-[24px]">
                <div className="col-span-4 bg-white rounded-[16px] border border-[#d9e1ee] p-[30px] flex flex-col items-center justify-center shadow-sm">
                    <div className="relative flex items-center justify-center mb-6">
                        <CircularProgress variant="determinate" value={100} size={200} thickness={2.5} style={{ color: '#f1f5f9' }} />
                        <CircularProgress
                            variant="determinate"
                            value={issIndex}
                            size={200}
                            thickness={2.5}
                            style={{ 
                                color: themeColor, 
                                position: 'absolute', 
                                left: 0,
                                strokeLinecap: 'round',
                                transform: 'rotate(-90deg)'
                            }}
                        />
                        <div className="absolute text-center ">
                            <span className="block text-[11px] font-[700] text-[#94a3b8] uppercase tracking-widest mt-1">ISS Index</span>
                            <span className="block text-[54px] font-[800] text-[#0f172a] leading-none my-1">{issIndex}</span>
                            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: bgColor, color: textColor }}>
                                {riskLevel}
                            </span>
                        </div>
                    </div>
                    <div className="w-full flex items-center justify-center gap-2 rounded-full border border-[#10b98120] bg-[#f0fff4] py-3 px-6">
                        <div className="h-2 w-2 rounded-full mt-1 bg-[#10b981]" />
                        <span className="text-[11px] font-[800] uppercase tracking-wider text-[#10b981]">STATUS: {status}</span>
                    </div>
                </div>

                <div className="col-span-8 bg-white rounded-[16px] border border-[#d9e1ee] p-[32px] shadow-sm">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="h-4 w-[3px] bg-[#1c5dbe] rounded-full" />
                        <h3 className="text-[12px] font-[800] uppercase tracking-widest text-[#64748b]">ISS Status</h3>
                    </div>
                    <div className="space-y-4">

                        {
                            verifications.length > 0
                                ? (
                                    verifications.map((item, index) => (

                                        <div
                                            key={index}
                                            className="flex items-center justify-between py-1"
                                        >

                                            <span className="text-[14px] font-[600] text-[#334155]">
                                                {item.label}
                                            </span>

                                            {
                                                item.isPass
                                                    ? (
                                                        <CheckCircleOutlined className="text-[#10b981] !text-[24px]" />
                                                    )
                                                    : (
                                                        <ErrorOutlined className="text-[#ef4444] !text-[24px]" />
                                                    )
                                            }

                                        </div>

                                    ))
                                )
                                : (
                                    <div className="flex h-[220px] items-center justify-center">

                                        <p className="text-[14px] font-[500] text-[#94a3b8]">
                                            No ISS verification data available
                                        </p>

                                    </div>
                                )
                        }

                </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-[16px]">

                {metrics.map((item, index) => (

                    <div
                        key={index}
                        className="bg-white rounded-[12px] border border-[#e5eaf2] p-[20px] shadow-sm relative"
                    >

                        <div className="mb-[20px] flex items-center justify-between">

                            <div
                                className={`grid h-[40px] w-[40px] place-items-center rounded-[10px] ${item.iconBg}`}
                            >

                                {
                                    React.cloneElement(item.icon, {
                                        className: `!text-[22px] ${item.iconColor}`
                                    })
                                }

                            </div>

                            {
                                item.showBadge &&
                                item.badge &&
                                (
                                    <span
                                        className={`rounded-[4px] px-[8px] py-[3px] text-[9px] font-[800] uppercase tracking-wide ${item.badgeClass}`}
                                    >
                                        {renderValue(item.badge)}
                                    </span>
                                )
                            }

                        </div>

                        <div className="mb-[4px] text-[10px] font-[700] uppercase tracking-wider text-[#94a3b8]">
                            {renderValue(item.label)}
                        </div>

                        <div className='flex items-baseline gap-[4px] text-[20px] font-[700] text-[#111827]'>

                            {renderValue(item.value)}

                            {
                                item.unit &&
                                (
                                    <span className='text-[13px] font-[500] text-[#8b97a8]'>
                                        {renderValue(item.unit)}
                                    </span>
                                )
                            }

                        </div>

                    </div>

                ))}

            </div>

            {criticalFlags.length > 0 && (
                <div className="rounded-[16px] border border-[#fee2e2] bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center gap-4 p-6 border-b border-[#fee2e2] ">
                        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#ef4444]">
                            <ReportGmailerrorredOutlined className="text-white !text-[24px] mt-2.5" />
                        </div>
                        <div>
                            <h4 className="text-[12px] font-[800] text-[#0f172a] uppercase">{criticalFlags.length} Critical Flags Identified</h4>
                            <p className="text-[10px] font-[700] text-[#94a3b8] uppercase tracking-wide">Priority Attention Required</p>
                        </div>
                    </div>
                    <div className="divide-y divide-[#fee2e2]">
                        {criticalFlags.map((flag, idx) => (
                            <div key={idx} className="p-6 flex items-center gap-4 bg-[#fffafb]">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#fee2e2] text-[#ef4444] text-[12px] font-[800]">!</div>
                                <p className="text-[14px] text-[#475569] leading-relaxed">
                                    {flag.message.split(/(\d+%|\d+\.\d+%)/).map((part, i) => 
                                        /(\d+%|\d+\.\d+%)/.test(part) ? <span key={i} className="text-[#ef4444] font-[800]">{part}</span> : part
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* <div className="bg-white rounded-[18px] border border-[#d9e1ee] overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-[24px] py-[18px] border-b border-[#e2e8f0]">
                    <div className="flex items-center gap-2">
                        <ShieldOutlined className="text-[#0f172a]" />
                        <h2 className="text-[15px] font-[700] text-[#0f172a] uppercase tracking-wide">Basics</h2>
                    </div>
                    <span className="bg-[#eef2f7] text-[#64748b] text-[10px] font-[700] px-3 py-1 rounded-full uppercase tracking-wide">CSA Safety Data</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px]">
                        <thead>
                            <tr className="border-b border-[#e2e8f0] bg-[#fcfcfd]">
                                <th className="text-left px-[18px] py-[18px] text-[11px] font-[700] text-[#475569] uppercase">Metric</th>
                                {['Unsafe Driving', 'Crash Indicator', 'HOS Compliance', 'Vehicle Maint.', 'Ctrl. Substances', 'Driver Fitness', 'Hazmat'].map((item, idx) => (
                                    <th key={idx} className="text-center px-[14px] py-[18px] text-[10px] font-[800] text-[#64748b] uppercase tracking-wide">{item}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { label: 'Percentile', key: 'percentile' },
                                { label: 'Threshold', key: 'threshold' },
                                { label: 'Violations', key: 'violations' },
                                { label: 'Severe Violations', key: 'severeViolations' },
                                { label: 'OOS Violations', key: 'oosViolations' },
                                { label: 'Measures', key: 'measures' },
                                { label: 'Basic Alerts', key: 'basicAlerts' }
                            ].map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-[#eef2f7] last:border-none">
                                    <td className="px-[18px] py-[20px] text-[13px] font-[500] text-[#334155] whitespace-nowrap">{row.label}</td>
                                    {['unsafeDriving', 'crashIndicator', 'hosCompliance', 'vehicleMaint', 'controlledSubstances', 'driverFitness', 'hazmat'].map((col, colIdx) => {
                                        const val = basicsTable[row.key]?.[col];
                                        const isDanger = val === '86%' || val === 'X' || val === '✕';
                                        return (
                                            <td key={colIdx} className={`text-center px-[12px] py-[20px] text-[13px] ${isDanger ? 'text-[#dc2626] font-[700]' : 'text-[#334155]'}`}>
                                                {val || '--'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div> */}

            <div className="grid grid-cols-12 gap-[24px]">

                <div className="col-span-12 bg-white rounded-[18px] border border-[#d9e1ee] overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 px-[24px] py-[20px] border-b border-[#eef2f7]">
                        <LocalShippingOutlined className="text-[#0f172a]" />
                        <h3 className="text-[15px] font-[700] uppercase tracking-wide text-[#0f172a]">Inspections</h3>
                    </div>
                    <div className="p-[24px]">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#eef2f7]">
                                    <th className="text-left py-[14px] text-[10px] font-[800] text-[#64748b] uppercase">Category</th>
                                    <th className="text-center py-[14px] text-[10px] font-[800] text-[#64748b] uppercase">Vehicle</th>
                                    <th className="text-center py-[14px] text-[10px] font-[800] text-[#64748b] uppercase">Driver</th>
                                    <th className="text-center py-[14px] text-[10px] font-[800] text-[#64748b] uppercase">Hazmat</th>
                                </tr>
                            </thead>
                                <tbody>

                                    <tr className="border-b border-[#eef2f7]">
                                        <td className="py-[18px] text-[13px] text-[#334155]">
                                            Inspections
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.vehicle?.inspections ?? 'NA'}
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.driver?.inspections ?? 'NA'}
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.hazmat?.inspections ?? 'NA'}
                                        </td>
                                    </tr>

                                    <tr className="border-b border-[#eef2f7]">
                                        <td className="py-[18px] text-[13px] text-[#334155]">
                                            Out Of Service
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.vehicle?.oos_inspections ?? 'NA'}
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.driver?.oos_inspections ?? 'NA'}
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.hazmat?.oos_inspections ?? 'NA'}
                                        </td>
                                    </tr>

                                    <tr className="border-b border-[#eef2f7]">
                                        <td className="py-[18px] text-[13px] text-[#334155]">
                                            OOS %
                                        </td>

                                        <td className="text-center">
                                            <span className="text-center text-[13px] text-[#334155]">
                                                {data?.inspection_summary?.vehicle?.oos_pct != null
                                                    ? `${data.inspection_summary.vehicle.oos_pct}%`
                                                    : 'NA'}
                                            </span>
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.driver?.oos_pct != null
                                                ? `${data.inspection_summary.driver.oos_pct}%`
                                                : 'NA'}
                                        </td>

                                        <td className="text-center text-[13px] text-[#334155]">
                                            {data?.inspection_summary?.hazmat?.oos_pct != null
                                                ? `${data.inspection_summary.hazmat.oos_pct}%`
                                                : 'NA'}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className="py-[18px] text-[13px] text-[#334155]">
                                            OOS % Nat'l Avg
                                        </td>

                                        <td className="text-center text-[13px] text-[#64748b]">
                                            NA
                                        </td>

                                        <td className="text-center text-[13px] text-[#64748b]">
                                            NA
                                        </td>

                                        <td className="text-center text-[13px] text-[#64748b]">
                                            NA
                                        </td>
                                    </tr>

                                </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between px-[24px] py-[20px] border-t border-[#eef2f7]">

                        <div>

                            <p className="text-[10px] font-[700] uppercase tracking-wide text-[#64748b]">
                                Safety Rating
                            </p>

                            <div className="mt-2 inline-flex items-center gap-1 rounded-[6px] bg-[#dcfce7] px-3 py-2">

                                <CheckCircleOutlined className="!text-[16px] text-[#15803d]" />

                                <span className="text-[12px] font-[700] text-[#15803d]">
                                    {inspections?.safetyRating || 'N/A'}
                                </span>

                            </div>

                        </div>

                        <div className="text-right">

                            <p className="text-[10px] font-[700] uppercase tracking-wide text-[#64748b]">
                                Last Inspection
                            </p>

                            <p className="mt-2 text-[15px] font-[700] text-[#0f172a]">
                               {data?.computed?.last_inspection_date || '--'}
                            </p>

                        </div>

                    </div>

               
                </div>

                {/* CRASHES */}
                {/* <div className="col-span-6 bg-white rounded-[18px] border border-[#d9e1ee] overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 px-[24px] py-[20px] border-b border-[#eef2f7]">
                        <CarCrashOutlined className="text-[#0f172a]" />
                        <h3 className="text-[15px] font-[700] uppercase tracking-wide text-[#0f172a]">Crashes</h3>
                    </div>
                    <div className="p-[24px] grid grid-cols-2 gap-[16px]">
                        {[
                            {label: 'Fatal',value: fatalCount,subText: '— No change'},
                            {label: 'Injury',value: injuryCount,subText: '+1 vs prev.'},
                            {label: 'Tow',value: 'NA',subText: '-2 vs prev.'},
                            {label: 'Total Crashes',value: totalCrashes,subText: '-8% MoM',danger: true}
                        ].map((item, index) => (
                            <div key={index} className={`rounded-[14px] border p-[20px] ${item.danger ? 'bg-[#cf1515] border-[#cf1515] text-white' : 'bg-[#f8fafc] border-[#e2e8f0]'}`}>
                                <p className={`text-[10px] font-[700] uppercase tracking-wide ${item.danger ? 'text-white/80' : 'text-[#64748b]'}`}>{item.label}</p>
                                <h3 className={`mt-2 text-[36px] leading-none font-[500] ${item.danger ? 'text-white' : 'text-[#0f172a]'}`}>{item.value}</h3>
                                <p className={`mt-3 text-[11px] ${item.danger ? 'text-white/80' : 'text-[#64748b]'}`}>{item.subText}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between px-[24px] py-[20px] border-t border-[#eef2f7]">
                        <div>
                            <p className="text-[10px] font-[700] uppercase tracking-wide text-[#64748b]">Last Crash</p>
                            <p className="mt-2 text-[15px] font-[700] text-[#0f172a]">{data?.computed?.last_crash_date || '--'}</p>
                        </div>
                        <button className="h-[42px] rounded-[10px] bg-[#dbeafe] px-5 text-[13px] font-[600] text-[#2563eb] transition-all hover:bg-[#bfdbfe]">View Report</button>
                    </div>
                </div> */}
            </div>
        </div>
    );
}

export default Overview;