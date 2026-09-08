
import Send from '@mui/icons-material/Send'
import Done from '@mui/icons-material/Done'

import { Card, Rail } from '../../DtPay/components/ui';

function formatAmount(amount){

    const value = Number(amount || 0);

    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function TrackBlock({transaction}){

    return (
        <div>
            <Card className="p-9">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4">
                    <Done />
                </div>

                <h1 className="text-xl text-center font-bold text-gray-900">Payment held — you're protected</h1>

                <p className="text-center text-gray-500 text-[13px] my-1.5 mb-5">Receipt + live tracking link sent to {transaction.email} · ref {transaction.payment_ref}.</p>

                <div className="border border-gray-200 rounded-lg p-2 w-full flex items-center">
                    <div className="flex flex-1">
                        <div className="ml-2">
                            <strong className="text-xs text-gray-600">{transaction?.carrier?.legal_name || transaction?.carrier?.dba_name || 'Carrier'}</strong>
                            <p className="text-xs text-gray-600">{transaction?.load_id} · {transaction?.payment_method_label}</p>
                        </div>
                    </div>
                    <div>
                        <strong className="text-sm font-bold">{formatAmount(transaction?.amount)}</strong>
                    </div>
                </div>
                <div className='mt-4'>
                    <Rail state={'FUNDED_HELD'} />
                </div>

                <div className='mt-6 flex items-center gap-3 mb-8'>
                    <div className='bg-blue-100 w-[32px] h-[32px] flex items-center justify-center rounded-lg'>
                        <Send className='text-blue-700' style={{fontSize:18}} />
                    </div>
                    <div className='flex-1'>
                        <strong className='text-xs'>Track without an account</strong>
                        <p className='text-xs'>The magic link in your email shows this exact status page — funded → POD → released.</p>
                    </div>
                </div>
            </Card>

            <p className='text-[10px] mt-4 text-gray-400'>{`Payments are processed and held by Stripe, a licensed money transmitter. Dollar Traq is a payment instruction platform and does not hold customer funds. Pay-per-use fee 2.0% per transaction · Terms · Subscribe from 1.2%`}</p>
        </div>
    );
}
