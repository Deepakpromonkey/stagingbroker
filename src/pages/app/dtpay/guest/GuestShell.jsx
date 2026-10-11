import logo from '../../../../assets/images/logo.webp';
import { TestModeBanner } from '../ui';

/* The public Guest Pay frame: no app header, DollarTraq branding, trust line. */
export default function GuestShell({ title, subtitle, testMode, children, wide = false }) {
    return (
        <div className='min-h-screen' style={{ background: 'linear-gradient(180deg, #F5F2E9 0%, #F8F7F4 30%, #FBFBF8 100%)' }}>
            <header className='mx-auto flex w-full max-w-[1040px] items-center justify-between px-4 pt-6 sm:px-8'>
                <img src={logo} alt='DollarTraq' className='h-[28px] w-auto' />
                <span className='text-[13px] font-semibold text-[#475467]'>Guest Pay</span>
            </header>
            <main className={`mx-auto w-full px-4 pb-14 pt-10 sm:px-8 sm:pt-14 ${wide ? 'max-w-[1040px]' : 'max-w-[640px]'}`}>
                {testMode && <TestModeBanner />}
                <h1 className='m-0 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#101828] sm:text-[32px]'>{title}</h1>
                {subtitle && <p className='m-0 mt-2 max-w-[560px] text-[15px] leading-6 text-[#475467]'>{subtitle}</p>}
                <div className='mt-7'>{children}</div>
                <p className='m-0 mt-10 max-w-[560px] text-[12.5px] leading-5 text-[#98A2B3]'>
                    Payments are processed by Stripe. DollarTraq holds your money until you release it to the carrier,
                    and card details never reach DollarTraq.
                </p>
            </main>
        </div>
    );
}
