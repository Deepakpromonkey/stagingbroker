import React from 'react';

import {
    ShieldOutlined,
    LocalShippingOutlined,
    DirectionsCarOutlined,
    NotificationsNoneOutlined
} from '@mui/icons-material';

function SafetyPerformance(props) {

    if (!props.data) {

        return null;
    }

    function renderValue(value) {

        return (
            value !== null &&
            value !== undefined &&
            value !== ''
        )
            ? value
            : 'NA';
    }

    const metrics = [
{
    label: 'SAFETY RATING',
    value: props.data?.risk_level,
    badge: props.data?.risk_level,
    badgeClass: 'bg-[#ecfbf2] text-[#2f9e55]',
    icon: <ShieldOutlined />,
    iconBg: 'bg-[#eef4ff]',
    iconColor: 'text-[#2563eb]',
    showBadge: true
},
        {
            label: 'VEHICLE OOS',
            value:
                props.data?.computed?.inspections_vehicle_out_of_service_pct != null
                    ? `${props.data.computed.inspections_vehicle_out_of_service_pct}%`
                    : 'NA',
            icon: <LocalShippingOutlined />,
            iconBg: 'bg-[#f3f6fb]',
            iconColor: 'text-[#64748b]'
        },
        {
            label: 'CRASH RATE',
            value: props.data.crash_rate,
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

    return (

        <div className='relative mt-[3px] overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-white p-[18px] shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[24px] xl:p-[30px]'>

            <div className='absolute left-0 top-0 h-full w-[5px] bg-[#1656b8]' />

            <div className='mb-[24px] flex flex-col gap-[14px] sm:flex-row sm:items-center sm:justify-between xl:mb-[32px]'>

                <div className='flex items-center gap-[10px]'>

                    <ShieldOutlined className='text-[#185abc] !text-[22px]' />

                    <h3 className='text-[16px] font-[500] text-[#1f2937] sm:text-[17px] xl:text-[18px]'>
                        Safety & Performance
                    </h3>

                </div>

                {/* <button
                    type='button'
                    className='w-fit cursor-pointer text-[14px] font-[700] text-[#1656b8] hover:underline xl:text-[15px]'
                >
                    Full FMCSA Report
                </button> */}

            </div>

            <div className='grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-4 xl:gap-[16px]'>

                {metrics.map(function (item, index) {

                    return (

                        <div
                            key={index}
                            className='rounded-[12px] border border-[#e5eaf2] p-[16px] sm:p-[18px] xl:p-[20px]'
                        >

                            <div className='mb-[18px] flex items-center justify-between xl:mb-[20px]'>

                                <div
                                    className={`grid h-[42px] w-[42px] place-items-center rounded-[10px] ${item.iconBg} xl:h-[44px] xl:w-[44px]`}
                                >

                                    {
                                        React.cloneElement(item.icon, {
                                            className: `!text-[20px] ${item.iconColor} xl:!text-[22px]`
                                        })
                                    }

                                </div>

                            {
                                item.showBadge && item.badge && (
                                    <span
                                        className={`flex items-center gap-[6px] rounded-[4px] px-[8px] py-[3px] text-[10px] font-[600] uppercase tracking-wide ${item.badgeClass}`}
                                    >
                                        {item.badge}
                                    </span>
                                )
                            }

                            </div>

                            <div className='mb-[6px] text-[10px] font-[700] uppercase tracking-[0.05em] text-[#8b97a8] sm:text-[11px]'>
                                {renderValue(item.label)}
                            </div>

                            <div className='flex items-baseline gap-[4px] text-[20px] font-[700] text-[#111827] xl:text-[22px]'>

                                {renderValue(item.value)}

                                {
                                    item.unit &&
                                    (
                                        <span className='text-[13px] font-[500] text-[#8b97a8] xl:text-[14px]'>
                                            {renderValue(item.unit)}
                                        </span>
                                    )
                                }

                            </div>

                        </div>

                    );
                })}

            </div>

        </div>

    );
}

export default SafetyPerformance;