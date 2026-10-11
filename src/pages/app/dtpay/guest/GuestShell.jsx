import { TestModeBanner } from '../ui';

/* The public Guest Pay frame: no app header, DollarTraq branding, trust line. */
export default function GuestShell({ title, subtitle, testMode, children }) {
    return (
        <div className='min-h-screen bg-[#F8FAFC]'>
            <div className='mx-auto w-full max-w-[680px] px-4 py-8 sm:py-12'>
                <p className='m-0 mb-6 text-center text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#175CD3]'>DollarTraq · Guest Pay</p>
                {testMode && <TestModeBanner />}
                <h1 className='m-0 text-center text-[24px] font-extrabold text-[#101828]'>{title}</h1>
                {subtitle && <p className='m-0 mt-1 text-center text-[14px] text-[#667085]'>{subtitle}</p>}
                <div className='mt-6'>{children}</div>
                <p className='m-0 mt-8 text-center text-[11.5px] leading-5 text-[#98A2B3]'>
                    Payments are processed by Stripe. Your money is held until you release it to the carrier after delivery.
                    Card details never reach DollarTraq.
                </p>
            </div>
        </div>
    );
}
