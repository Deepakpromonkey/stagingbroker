import React, { useEffect, useState } from 'react';

import {
    CheckCircle,
    Cancel,
    ErrorOutlineOutlined
} from '@mui/icons-material';

import Skeleton from '@mui/material/Skeleton';

import { apiFetch } from '../lib/api';

function RiskFactorCard(props) {

    const isRisk =
        props.type === 'risk';

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

useEffect(function () {

        const dotNumber = props.dotNumber;

        if (!dotNumber) {
            return;
        }

        // unique key per carrier + type (risk vs strength)
        const cacheKey = `risk_factor_${dotNumber}_${isRisk ? 'risk' : 'strength'}`;

        // 1. Check localStorage first — if present, use it and skip API entirely
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            try {
                const parsedData = JSON.parse(cached);
                setItems(parsedData);
                return; // no API call, no timer
            } catch (err) {
                console.error('Failed to parse cached risk factors:', err);
                localStorage.removeItem(cacheKey);
                // falls through to fetch fresh data below
            }
        }

        setLoading(true);
        setError('');

        // 2. No cache found -> wait 2s, then call the API
        const timer = setTimeout(function () {

            apiFetch(`/carriers/${dotNumber}/risk`)

                .then(function (data) {

                    console.log('Risk factors API response:', data);

                    const payload = data?.data || data;

                    const list = isRisk
                        ? (payload?.weaknesses || [])
                        : (payload?.strengths || []);

                    setItems(list);

                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(list));
                    } catch (err) {
                        console.error('Failed to cache risk factors:', err);
                    }

                })

                .catch(function (err) {

                    console.error('Risk factors fetch error:', err.message);

                    setError(
                        err.message || 'Failed to load risk factors.'
                    );

                })

                .finally(function () {

                    setLoading(false);

                });

        }, 2000);

        return function () {
            clearTimeout(timer);
        };

    }, [props.dotNumber, isRisk]);

    const styles = {
        icon: isRisk
            ? <ErrorOutlineOutlined className='!text-[20px]' />
            : <CheckCircle className='!text-[20px]' />,

        iconWrapper: isRisk 
            ? 'bg-[#fff5f5] text-[#ef4444]'
            : 'bg-[#ecfbf2] text-[#2f9e55]',

        badge: isRisk
            ? 'bg-[#fff5f5] text-[#ef4444]'
            : 'bg-[#ecfbf2] text-[#2f9e55]',

        bullet: isRisk
            ? (
                <Cancel className='!text-[18px] text-[#ef4444]' />
            )
            : (
                <CheckCircle className='!text-[18px] text-[#2ecc71]' />
            )
    };

    return (

        <div className='rounded-[16px] border border-[#d9e1ef] bg-white shadow-sm'>

            <div className='flex flex-col gap-[16px] border-b border-[#f1f5f9] px-[18px] py-[20px] sm:px-[24px] sm:py-[22px] xl:flex-row xl:items-center xl:justify-between xl:px-[32px] xl:py-[24px]'>

                <div className='flex items-center gap-[12px]'>

                    <div
                        className={`grid h-[40px] w-[40px] shrink-0 place-items-center rounded-full ${styles.iconWrapper}`}
                    >

                        {styles.icon}

                    </div>

                    <h3 className='text-[15px] font-[800] uppercase tracking-tight text-[#334155] sm:text-[16px] xl:text-[18px]'>

                        {props.title ?? 'NA'}

                    </h3>

                </div>

               

            </div>

            <div className='px-[18px] pb-[10px] sm:px-[24px] xl:px-[32px] xl:pb-[16px]'>

                {loading ? (

                    <div className='space-y-[12px] py-[20px]'>

                        {[1, 2, 3].map(function (i) {

                            return (

                                <div
                                    key={i}
                                    className='flex items-center gap-[12px]'
                                >

                                    <Skeleton
                                        variant='circular'
                                        width={18}
                                        height={18}
                                        className='shrink-0'
                                    />

                                    <Skeleton
                                        variant='text'
                                        width='70%'
                                        height={20}
                                    />

                                </div>

                            );

                        })}

                    </div>

                ) : error ? (

                    <div className='py-[24px] text-[14px] font-[500] text-[#ef4444]'>

                        {error}

                    </div>

                ) : (

                    <div className='grid grid-cols-1 gap-x-[40px] sm:grid-cols-2'>

                        {items.length > 0 ? (

                            items.map(function (item, idx) {

                                const text =
                                    typeof item === 'string'
                                        ? item
                                        : (item?.label || item?.value || 'NA');

                                return (

                                    <div
                                        key={item?.key ?? idx}
                                        className='flex items-start gap-[12px] border-b border-[#f1f5f9] py-[18px] sm:items-center sm:py-[20px]'
                                    >

                                        <div className='flex shrink-0 items-center'>

                                            {styles.bullet}

                                        </div>

                                        <span className='text-[13px] font-[500] leading-[1.5] text-[#4b5563] sm:text-[14px] sm:leading-none'>

                                            {text}

                                        </span>

                                    </div>

                                );
                            })

                        ) : (

                            <div className='py-[24px] text-[14px] font-[500] text-[#64748b]'>

                                NA

                            </div>

                        )}

                    </div>

                )}

            </div>

        </div>

    );
}

export default RiskFactorCard;