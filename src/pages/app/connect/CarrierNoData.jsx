import React from 'react';

import GppBad from '@mui/icons-material/GppBad';
import PhoneAndroid from '@mui/icons-material/PhoneAndroid';
import Email from '@mui/icons-material/Email';

export default function CarrierNoData() {

    return (
        <div className="min-h-screen bg-white font-sans text-[#1A1A1A] flex flex-col items-center py-10 px-4 select-none">

            <div className="bg-[#EFF6FF] text-red-400 font-bold text-[11px] tracking-widest px-4 py-1.5 rounded-full mb-4 uppercase">
                Access Expired
            </div>

            <div className="flex items-center justify-center">

                <GppBad style={{fontSize:200}} className="text-[#E2E8F0]" />
            </div>
            
            <p className="text-sm text-[#4B5563] mb-12 text-center">
                Dear user, your access to application signup has been expired.
            </p>

            <div>

                <div className="flex items-center justify-center">
                    <span className="text-xs text-[#4B5563] font-bold">Feel free to reach us for any support.</span>
                </div>

                <div className="w-full h-[1px] bg-[#E5E7EB] my-6" />

                <div className="flex items-center gap-5">
                    <div className="flex items-center">
                        <PhoneAndroid className='text-[#E2E8F0]' />
                        <span className='text-xs'>{import.meta.env.VITE_GLOBAL_SUPPORT_CONTACT}</span>
                    </div>
                    <div className="flex items-center">
                        <Email className='text-[#E2E8F0]' />
                        <span className='text-xs'>{import.meta.env.VITE_GLOBAL_SUPPORT_EMAIL}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}