import React from 'react';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';

const NOTICE_KEY_PREFIX = 'crm_fmcsa_notice_ack_at_';
const NOTICE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getNoticeKey(userKey) {
    return `${NOTICE_KEY_PREFIX}${userKey || 'anonymous'}`;
}

export function shouldShowDataUpdateNotice(userKey) {
    try {
        const last = localStorage.getItem(getNoticeKey(userKey));
        if (!last) return true;

        const lastTime = parseInt(last, 10);
        if (Number.isNaN(lastTime)) return true;

        return Date.now() - lastTime > NOTICE_INTERVAL_MS;
    } catch (e) {
        return true;
    }
}

function DataUpdateNotice({ userKey, onAcknowledge }) {
    const handleAcknowledge = () => {
        try {
            localStorage.setItem(getNoticeKey(userKey), String(Date.now()));
        } catch (e) {
        }
        onAcknowledge();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="FMCSA data update notice"
            className="fixed inset-0 z-[999] flex items-center justify-center px-4"
            style={{ background: 'rgba(11, 42, 69, 0.75)', backdropFilter: 'blur(6px)' }}
        >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-7 relative">
                <div className="flex justify-center -mt-14 mb-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B] text-white shadow-lg border-4 border-white">
                        <WarningAmberOutlined style={{ fontSize: 26 }} />
                    </span>
                </div>

                <h2 className="text-center text-[19px] font-bold text-[#1a1a1a] m-0">
                    Data Update — FMCSA Information
                </h2>
                <p className="text-center text-[10px] font-bold tracking-[1px] text-[#dc2626] uppercase mt-1 mb-4">
                    Important Service Notice
                </p>

                <p className="text-[13px] text-[#374151] leading-relaxed text-center mb-4">
                    Due to recent changes in FMCSA data sharing, carrier profiles may show
                    different information than usual. This affects Dollar Traq and other
                    compliance platforms industry-wide.
                </p>

                <div className="bg-[#F9FAFB] border border-[#e5e7eb] rounded-xl p-4 mb-3">
                    <div className="text-[12px] font-bold text-[#1a1a1a] mb-2">What this means</div>
                    <ul className="text-[12px] text-[#4b5563] leading-relaxed pl-4 m-0 list-disc">
                        <li>Carrier scores may fluctuate as data stabilizes</li>
                        <li>Some historical data may be unavailable temporarily</li>
                        <li>We're monitoring for data integrity issues</li>
                    </ul>
                </div>

                <div className="bg-[#F9FAFB] border border-[#e5e7eb] rounded-xl p-4 mb-3">
                    <div className="text-[12px] font-bold text-[#1a1a1a] mb-2">What we're doing</div>
                    <ul className="text-[12px] text-[#4b5563] leading-relaxed pl-4 m-0 list-disc">
                        <li>Validating data against multiple sources</li>
                        <li>Continuing to flag significant safety issues</li>
                        <li>Working with FMCSA on data consistency</li>
                    </ul>
                </div>

                <div className="bg-[#F9FAFB] border border-[#e5e7eb] rounded-xl p-4 mb-5">
                    <div className="text-[12px] font-bold text-[#1a1a1a] mb-2">How to stay informed</div>
                    <p className="text-[12px] text-[#4b5563] leading-relaxed m-0">
                        Use your best judgment when reviewing carriers. Contact support if
                        you notice unexpected score changes.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleAcknowledge}
                    className="w-full bg-[#1d4ed8] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-3 border-none cursor-pointer transition-colors"
                >
                    I Understand
                </button>
            </div>
        </div>
    );
}

export default DataUpdateNotice;