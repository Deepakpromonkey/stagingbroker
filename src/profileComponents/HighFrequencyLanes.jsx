import React from 'react';

import { Route } from '@mui/icons-material';
import { LinearProgress } from '@mui/material';

function HighFrequencyLanes(props) {

    const lanes = Array.isArray(props.lanes)
        ? props.lanes
        : [];

    if (lanes.length === 0) {
        return (
            <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[18px] shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[24px] xl:p-[30px]'>

                <div className='mb-[24px] flex items-center gap-[10px] xl:mb-[30px]'>
                    <Route className='!text-[22px] text-[#185abc]' />
                    <h3 className='text-[16px] font-[500] text-[#1f2937] sm:text-[17px] xl:text-[18px]'>
                        High Frequency Lanes
                    </h3>
                </div>

                <div className='flex items-center justify-center py-[40px]'>
                    <p className='text-[13px] font-[500] text-[#94a3b8]'>
                        No lane data available
                    </p>
                </div>

            </div>
        );
    }

    return (
        <div className='rounded-[16px] border border-[#d9e1ee] bg-white p-[18px] shadow-[0_2px_8px_rgba(16,24,40,0.05)] sm:p-[24px] xl:p-[30px]'>

            {/* Header */}
            <div className='mb-[24px] flex items-center gap-[10px] xl:mb-[30px]'>
                <Route className='!text-[22px] text-[#185abc]' />
                <h3 className='text-[16px] font-[500] text-[#1f2937] sm:text-[17px] xl:text-[18px]'>
                    High Frequency Lanes
                </h3>
            </div>

            {/* List */}
            <div className='space-y-[18px]'>

                {lanes.map((lane, index) => {

                    const percentage = Number(lane?.percentage || 0);

                    // if API has route, use it; otherwise fallback
                    const route = lane?.route || `${lane?.state || '--'}`;

                    return (
                        <div key={index}>

                            {/* TOP ROW */}
                            <div className='flex items-center justify-between gap-[12px]'>

                                {/* index badge */}
                                <div className='min-w-[34px] h-[34px] flex items-center justify-center rounded-[8px] bg-[#f1f5f9] text-[12px] font-[700] text-[#334155]'>
                                    {String(index + 1).padStart(2, '0')}
                                </div>

                                {/* route */}
                                <div className='flex-1 text-[13px] font-[600] text-[#334155] truncate'>
                                    {route}
                                </div>

                                {/* percentage */}
                                <div className='text-[12px] font-[700] text-[#64748b]'>
                                    {percentage}%
                                </div>

                            </div>

                            {/* PROGRESS BAR */}
                            <div className='mt-[8px] ml-[44px]'>
                                <LinearProgress
                                    variant='determinate'
                                    value={percentage}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: '#f1f5f9',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: '#1d4ed8',
                                            borderRadius: 3
                                        }
                                    }}
                                />
                            </div>

                        </div>
                    );
                })}

            </div>
        </div>
    );
}

export default HighFrequencyLanes;