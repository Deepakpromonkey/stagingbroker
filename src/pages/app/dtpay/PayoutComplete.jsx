import { useSearchParams } from 'react-router-dom';
import GuestShell from './guest/GuestShell';
import { Panel } from './ui';

/* Where carriers land after Stripe's payout setup (public). */
export default function PayoutComplete() {
    const [params] = useSearchParams();
    const refresh = params.get('refresh');

    return (
        <GuestShell title={refresh ? 'Setup link expired' : 'Payout setup received'}>
            <Panel>
                <p className='m-0 text-[14.5px] leading-6 text-[#334155]'>
                    {refresh
                        ? 'This setup link has expired. Ask the broker who is paying you to send a new one.'
                        : 'Stripe has your payout details. Once they are verified, payments released to you on DollarTraq go straight to your bank account. You can close this page.'}
                </p>
            </Panel>
        </GuestShell>
    );
}
