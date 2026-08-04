import React, { useEffect, useMemo, useState } from 'react';

import {
    ShieldOutlined
} from '@mui/icons-material';

import Skeleton from '@mui/material/Skeleton';

import { apiFetch } from '../lib/api';

// The OCR payload stores limits as a free-form label -> amount map, so pick the
// most representative one rather than assuming a fixed key.
const PREFERRED_LIMIT_KEYS = [
    'COMBINED SINGLE LIMIT (Ea accident)',
    'EACH OCCURRENCE',
    'GENERAL AGGREGATE'
];

function pickHeadlineLimit(limits) {
    if (!limits || typeof limits !== 'object') {
        return null;
    }

    const preferred = PREFERRED_LIMIT_KEYS.find((key) => limits[key]);
    if (preferred) {
        return { label: preferred, amount: limits[preferred] };
    }

    const [label, amount] = Object.entries(limits)[0] || [];
    return label ? { label, amount } : null;
}

// Newest extraction that actually produced coverages wins - rows come back
// ordered by extracted_at desc, but a failed run still has a row.
function extractCoverages(rows) {
    if (!Array.isArray(rows)) {
        return [];
    }

    for (const row of rows) {
        const coverages = row?.extracted_json?.data?.COVERAGES;
        if (Array.isArray(coverages) && coverages.length > 0) {
            return coverages;
        }
    }

    return [];
}

function InsuranceCard(props) {

    const dotNumber = props.data?.dot_number;

    const insuranceFilings = Array.isArray(
        props.data?.insurance_filings
    )
        ? props.data.insurance_filings
        : [];

    const [ocrCoverages, setOcrCoverages] = useState([]);
    const [isLoadingOcr, setIsLoadingOcr] = useState(false);

    useEffect(function () {

        if (!dotNumber) {
            setOcrCoverages([]);
            return;
        }

        let cancelled = false;
        setIsLoadingOcr(true);

        apiFetch('/ocr-data', {
            method: 'POST',
            body: JSON.stringify({ dot_number: dotNumber })
        })
            .then(function (result) {
                if (cancelled) return;
                setOcrCoverages(extractCoverages(result?.data));
            })
            .catch(function (err) {
                if (cancelled) return;

                // 404 is the documented "no OCR data for this DOT" response, not
                // a failure - fall back to the FMCSA filings below.
                if (err.status !== 404) {
                    console.error('InsuranceCard OCR fetch error:', err);
                }
                setOcrCoverages([]);
            })
            .finally(function () {
                if (!cancelled) {
                    setIsLoadingOcr(false);
                }
            });

        return function () {
            cancelled = true;
        };

    }, [dotNumber]);

    const coverageRows = useMemo(function () {

        return ocrCoverages.map(function (coverage, index) {
            const limit = pickHeadlineLimit(coverage?.LIMITS);

            return {
                key: coverage?.['POLICY NUMBER'] || `coverage-${index}`,
                title: coverage?.['TYPE OF INSURANCE'],
                policyNumber: coverage?.['POLICY NUMBER'],
                expires: coverage?.['POLICY EXP'],
                limitLabel: limit?.label,
                amount: limit?.amount
            };
        });

    }, [ocrCoverages]);

    function renderValue(value) {

        return (
            value !== null &&
            value !== undefined &&
            value !== ''
        )
            ? value
            : 'NA';
    }

    return (

        <div className='relative overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-[#e8f1ff] p-[16px] shadow-[0_2px_8px_rgba(16,24,40,0.04)] sm:p-[18px] xl:p-[20px]'>

            <div className='absolute right-0 top-0 h-[50px] w-[50px] bg-[#0f57c8] [clip-path:polygon(100%_0,0_0,100%_100%)]' />

            <div className='mb-[20px] flex items-center gap-[12px] xl:mb-[24px]'>

                <ShieldOutlined className='text-[#185abc] !text-[22px] xl:!text-[24px]' />

                <h3 className='text-[16px] font-[500] tracking-tight text-[#111827] sm:text-[17px] xl:text-[18px]'>
                    Insurance
                </h3>

            </div>

            <div className='space-y-[12px] max-h-[260px] overflow-y-auto pr-[4px]'>

                {isLoadingOcr && coverageRows.length === 0 && insuranceFilings.length === 0 ? (

                    [1, 2, 3].map(function (i) {
                        return (
                            <Skeleton
                                key={i}
                                variant='rounded'
                                height={54}
                                sx={{ borderRadius: '10px' }}
                            />
                        );
                    })

                ) : coverageRows.length > 0 ? (

                    coverageRows.map(function (row) {

                        return (

                            <div
                                key={row.key}
                                className='flex items-center justify-between gap-[14px] rounded-[10px] bg-white/80 px-[14px] py-[12px] backdrop-blur-sm sm:px-[16px] xl:px-[18px]'
                            >

                                <div className='min-w-0 flex-1'>

                                    <p className='truncate text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8] sm:text-[11px]'>
                                        {renderValue(row.title)}
                                    </p>

                                    <p className='mt-[3px] truncate text-[10px] font-[500] text-[#94a3b8]'>
                                        {renderValue(row.policyNumber)}
                                        {row.expires ? ` • exp ${row.expires}` : ''}
                                    </p>

                                </div>

                                <span className='shrink-0 text-right text-[15px] font-[800] text-[#111827] xl:text-[17px]'>
                                    ${renderValue(row.amount)}
                                </span>

                            </div>

                        );
                    })

                ) : (
                    insuranceFilings.length > 0
                        ? insuranceFilings.map(function (item, index) {

                            return (

                                <div
                                    key={item.id || index}
                                    className='flex items-center justify-between gap-[14px] rounded-[10px] bg-white/80 px-[14px] py-[12px] backdrop-blur-sm sm:px-[16px] xl:px-[18px]'
                                >

                                    <div className='min-w-0 flex-1'>

                                        <p className='truncate text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8] sm:text-[11px]'>
                                            {renderValue(item.ins_type_desc)}
                                        </p>


                                    </div>

                                    <span className='shrink-0 text-right text-[15px] font-[800] text-[#111827] xl:text-[17px]'>
                                        ${renderValue(item.min_cov_amount)}
                                    </span>

                                </div>

                            );
                        })

                        : (

                            <div className='flex items-center justify-center rounded-[10px] bg-white/70 py-[40px]'>

                                <p className='text-[13px] font-[500] text-[#94a3b8]'>
                                    No insurance filings available
                                </p>

                            </div>

                        )
                )}

            </div>

        <a
    href="https://dollartraq.s3.us-east-2.amazonaws.com/coi/2560697_DOT++Cert+20240517054028.pdf"
    target="_blank"
    rel="noopener noreferrer"
    className="mt-[18px] flex w-full items-center justify-center rounded-[10px] bg-white py-[14px] text-[14px] font-[700] text-[#334155] shadow-sm transition-all hover:underline xl:mt-[20px] xl:py-[16px] xl:text-[15px]"
>
    View COI Document
</a>

        </div>

    );
}

export default InsuranceCard;