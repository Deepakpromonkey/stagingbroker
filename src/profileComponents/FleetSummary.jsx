import React from 'react';

import {
    Inventory2Outlined,
    LocalShippingOutlined,
    EngineeringOutlined,
    PersonOutlined
} from '@mui/icons-material';

function FleetSummary(props) {

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

    function formatStatus(status) {
    if (!status) return 'NA';
    return status.toLowerCase() === 'tracked' ? 'OBSERVED' : status;
}

    const equipmentList = [
        {
            type: 'Observed Units',
            quantity: props.data?.computed?.observed_units || 0,
           status: formatStatus(props.data?.computed?.observed_units_status),
            statusVariant:
                props.data?.computed?.observed_units_status?.toLowerCase() === 'tracked'
                    ? 'success'
                    : 'default'
        },
        {
            type: 'Observed Trailers',
            quantity: props.data?.computed?.observed_trailers || 0,
           status: formatStatus(props.data?.computed?.observed_trailers_status),
            statusVariant:
                props.data?.computed?.observed_trailers_status?.toLowerCase() === 'tracked'
                    ? 'success'
                    : 'default'
        },
        {
            type: 'Mileage',
            quantity: props.data?.mcs150_mileage || 0,
            status:
                props.data.mcs150_mileage_year
                    ? props.data.mcs150_mileage_year
                    : 'NA',
            statusVariant:
                props.data.mcs150_mileage_year
                    ? 'success'
                    : 'default'
        }
    ];

    const stats = [
        {
            label: 'TOTAL POWER UNITS',
            value: props.data.power_unit,
            icon: <LocalShippingOutlined />,
            color: 'bg-[#eef2ff] text-[#4f46e5]'
        },
        {
            label: 'DRIVERS',
            value: props.data.driver_total,
            icon: <PersonOutlined />,
            color: 'bg-[#f5f3ff] text-[#7c3aed]'
        },
        {
            label: 'TRAILERS',
            value: props.data?.carrier_detail?.owntrail,
            icon: <EngineeringOutlined />,
            color: 'bg-[#f0fdf4] text-[#16a34a]'
        }
    ];

    return (

        <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[18px] shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[24px] xl:p-[30px]'>

            <div className='mb-[24px] flex flex-col gap-[14px] sm:flex-row sm:items-center sm:justify-between xl:mb-[34px]'>

                <div className='flex items-center gap-[10px]'>

                    <Inventory2Outlined className='!text-[22px] text-[#1656b8]' />

                    <h3 className='text-[16px] font-[500] text-[#1f2937] sm:text-[17px] xl:text-[18px]'>
                        Fleet Summary
                    </h3>

                </div>

                <button
    type="button"
    onClick={props.onViewFullDetails}
    className="w-fit cursor-pointer text-[14px] font-[700] text-[#1656b8] transition-all hover:underline xl:text-[15px]"
>
    View Full Details
</button>

            </div>

            <div className='mb-[24px] grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3 xl:mb-[30px] xl:gap-[18px]'>

                {stats.map(function (stat, idx) {

                    return (

                        <div
                            key={idx}
                            className='flex items-center gap-[14px] rounded-[12px] bg-[#f8fafc] p-[16px] xl:gap-[16px] xl:p-[18px]'
                        >

                            <div
                                className={`grid h-[48px] w-[48px] shrink-0 place-items-center rounded-[10px] ${stat.color} xl:h-[52px] xl:w-[52px]`}
                            >

                                {React.cloneElement(stat.icon, {
                                    className: '!text-[22px] xl:!text-[24px]'
                                })}

                            </div>

                            <div className='min-w-0'>

                                <div className='mb-[3px] text-[10px] font-[700] uppercase tracking-[0.08em] text-[#94a3b8] xl:text-[11px]'>
                                    {stat.label}
                                </div>

                                <div className='break-words text-[22px] font-[700] leading-none text-[#111827] xl:text-[26px]'>
                                    {renderValue(stat.value)}
                                </div>

                            </div>

                        </div>
                    );
                })}

            </div>

            <div className='overflow-x-auto rounded-[12px] border border-[#eef2f7]'>

                <table className='min-w-[700px] w-full border-collapse'>

                    <thead>

                        <tr className='bg-[#f8fafc]'>

                            <th className='px-[18px] py-[14px] text-left text-[12px] font-[700] text-[#64748b] xl:px-[24px] xl:py-[16px] xl:text-[13px]'>
                                Equipment Type
                            </th>

                            <th className='px-[18px] py-[14px] text-left text-[12px] font-[700] text-[#64748b] xl:px-[24px] xl:py-[16px] xl:text-[13px]'>
                                Quantity
                            </th>

                            <th className='px-[18px] py-[14px] text-left text-[12px] font-[700] text-[#64748b] xl:px-[24px] xl:py-[16px] xl:text-[13px]'>
                                Status
                            </th>

                        </tr>

                    </thead>

                    <tbody className='text-[14px] font-[500] text-[#111827] xl:text-[15px]'>

                        {equipmentList.map(function (row, index) {

                            const isSuccess =
                                row.statusVariant === 'success';

                            return (

                                <tr
                                    key={index}
                                    className='border-t border-[#f1f5f9]'
                                >

                                    <td className='px-[18px] py-[16px] text-[#4b5563] xl:px-[24px] xl:py-[18px]'>
                                        {renderValue(row.type)}
                                    </td>

                                    <td className='px-[18px] py-[16px] font-[600] text-[#111827] xl:px-[24px] xl:py-[18px]'>
                                        {renderValue(row.quantity)}
                                    </td>

                                    <td className='px-[18px] py-[16px] xl:px-[24px] xl:py-[18px]'>

                                        <span
                                            className={`inline-flex items-center rounded-[5px] px-[10px] py-[4px] text-[10px] font-[800] uppercase tracking-wide xl:px-[12px] xl:text-[11px] ${
                                                isSuccess
                                                    ? 'bg-[#ecfbf2] text-[#2f9e55]'
                                                    : 'bg-[#f1f5f9] text-[#64748b]'
                                            }`}
                                        >
                                            {renderValue(row.status)}
                                        </span>

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

export default FleetSummary;