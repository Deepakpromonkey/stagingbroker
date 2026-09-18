import React from 'react';

import SensorsOff from '@mui/icons-material/SensorsOff';
import PhoneAndroid from '@mui/icons-material/PhoneAndroid';
import Email from '@mui/icons-material/Email';

/*
| Where Terminal sends a carrier whose ELD provider we cannot connect to —
| either one Terminal does not support, or one we have blocked because our
| application with that provider has not been approved yet.
|
| Its own page rather than reusing the expired-access one: that says the
| carrier's link is broken, which would send them chasing a new invitation for
| a problem that is not theirs and that they cannot fix. Nothing is wrong with
| their onboarding — they simply need to carry on past this step.
|
| Terminal redirects here without the invitation token, so this page cannot
| link back into the wizard. It points them at their email instead, which is
| where the link they arrived on came from.
*/
export default function EldNotSupported() {

    return (
        <div className="min-h-screen bg-white font-sans text-[#1A1A1A] flex flex-col items-center py-10 px-4 select-none">

            <div className="bg-[#FFF7ED] text-amber-600 font-bold text-[11px] tracking-widest px-4 py-1.5 rounded-full mb-4 uppercase">
                ELD not supported yet
            </div>

            <div className="flex items-center justify-center">
                <SensorsOff style={{ fontSize: 180 }} className="text-[#E2E8F0]" />
            </div>

            <p className="text-sm text-[#4B5563] mt-4 mb-2 text-center max-w-md">
                We cannot connect to your ELD provider at the moment.
            </p>

            <p className="text-sm text-[#4B5563] mb-10 text-center max-w-md">
                Nothing is wrong with your application. Go back to the onboarding
                link in your email and choose
                <span className="font-semibold"> &ldquo;Skip for now&rdquo; </span>
                on the ELD step &mdash; you can finish everything else, and connect
                your ELD later once we support your provider.
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
