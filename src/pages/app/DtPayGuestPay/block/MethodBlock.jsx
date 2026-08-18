
import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import Button from '@mui/material/Button';

import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import LockOutlined from '@mui/icons-material/LockOutlined'

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

import { Card } from '../../DtPay/components/ui';

import { API_BASE } from 'lib/api';

const stripePromise = loadStripe('pk_test_51TP2bME8lGA6s4DIvkKRuCU1crMqEo0NgiAfoWYTlyuLUNAlvIh6Zhqj8a3iRqLwWRlj0JO7Vfq8lXUzcEh021yQ00E3ArEngX');

function formatAmount(amount){

    const value = Number(amount || 0);

    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function CardPaymentForm({transaction_id, onPaid}){

    const stripe = useStripe();
    const elements = useElements();

    const [paying, setPaying] = useState(false);
    const [payErrorMessage, setPayErrorMessage] = useState('');

    function confirmPaymentOnServer(payment_intent_id){

        fetch(`${API_BASE}/guest-pay/payment/confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ transaction_id: transaction_id, payment_intent_id: payment_intent_id }),
        })
            .then(function (response) {

                return response.json();
            })
            .then(function (data) {

                if(data?.status){

                    onPaid();
                }else{

                    setPayErrorMessage(data?.message || 'Payment could not be confirmed. Please contact support.');
                }

                setPaying(false);
            })
            .catch(function () {

                setPayErrorMessage('Payment could not be confirmed. Please contact support.');
                setPaying(false);
            });
    }

    async function submitPayment(){

        if(!stripe || !elements){

            return;
        }

        setPaying(true);
        setPayErrorMessage('');

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
        });

        if(error){

            setPayErrorMessage(error.message || 'Your card could not be charged. Please try again.');
            setPaying(false);
            return;
        }

        if(paymentIntent?.status === 'succeeded'){

            confirmPaymentOnServer(paymentIntent.id);
        }else{

            setPayErrorMessage('Your payment is still processing. Please try again in a moment.');
            setPaying(false);
        }
    }

    return (
        <div>
            <PaymentElement options={{ layout: 'tabs' }} />

            {payErrorMessage !== '' &&

                <p className="text-xs text-red-600 mt-3">{payErrorMessage}</p>
            }

            <Button className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300! w-full mt-5" loading={paying} disabled={!stripe || !elements} onClick={() => {

                submitPayment()
            }}>
                Pay & hold funds
            </Button>
        </div>
    );
}

export default function MethodBlock({transaction_id, transaction}){

    const navigate = useNavigate();

    const [initingPayment, setInitingPayment] = useState(true);
    const [clientSecret, setClientSecret] = useState(null);
    const [initErrorMessage, setInitErrorMessage] = useState('');

    const initedForRef = useRef(null);

    useEffect(() => {

        if(transaction_id && initedForRef.current !== transaction_id){

            initedForRef.current = transaction_id;

            initPaymentIntent(transaction_id);
        }

    }, [transaction_id]);

    function initPaymentIntent(transaction_id){

        setInitingPayment(true);
        setInitErrorMessage('');

        fetch(`${API_BASE}/guest-pay/payment/intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ transaction_id: transaction_id }),
        })
            .then(function (response) {

                return response.json();
            })
            .then(function (data) {

                if(data?.status){

                    setClientSecret(data.client_secret);
                }else{

                    setInitErrorMessage(data?.message || 'Unable to start payment. Please try again.');
                }

                setInitingPayment(false);
            })
            .catch(function () {

                setInitErrorMessage('Unable to start payment. Please try again.');
                setInitingPayment(false);
            });
    }

    return (
        <Card className="p-9">

            <Snackbar
                open={initErrorMessage !== ''}
                autoHideDuration={6000}
                onClose={() => {

                    setInitErrorMessage('')
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert
                    severity="error"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {initErrorMessage}
                </Alert>
            </Snackbar>

            <h1 className="text-xl text-center font-bold text-gray-900">Pay with credit card</h1>

            <p className="text-center text-gray-500 text-[13px] my-1.5 mb-5">Your card is charged now and funds are held until delivery is proven, then released to the carrier.</p>

            <div className="border border-gray-200 rounded-lg p-2 w-full flex items-center mb-5">
                <div className="flex flex-1">
                    <span className="bg-green-50 p-3 rounded-lg flex items-center justify-center">
                        <LocalShippingOutlined style={{fontSize:18}} className="text-green-800" />
                    </span>
                    <div className="ml-2">
                        <strong className="text-xs text-gray-600">{transaction?.carrier?.legal_name || transaction?.carrier?.dba_name || 'Carrier'}</strong>
                        <p className="text-xs text-gray-600">{transaction?.load_id}</p>
                    </div>
                </div>
                <div>
                    <strong className="text-sm font-bold">{formatAmount(transaction?.amount)}</strong>
                </div>
            </div>

            {initingPayment &&

                <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">Preparing secure payment…</div>
            }

            {!initingPayment && clientSecret &&

                <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CardPaymentForm
                        transaction_id={transaction_id}
                        onPaid={() => navigate(`/guest-pay/track/${transaction_id}`)}
                    />
                </Elements>
            }

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-5">
                <LockOutlined style={{fontSize:13}} />
                Secured by Stripe · card details never touch our servers
            </div>
        </Card>
    );
}
