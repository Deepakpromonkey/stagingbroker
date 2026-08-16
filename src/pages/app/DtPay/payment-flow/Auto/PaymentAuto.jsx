import { useEffect, useRef, useState } from 'react';

import { Link } from 'react-router';
import { useParams, useNavigate } from 'react-router-dom';

import Grid from '@mui/material/Grid';

import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

import Button from '@mui/material/Button';

import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import Chip from '@mui/material/Chip';

import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined'
import ArrowBack from '@mui/icons-material/ArrowBack'

import Done from '@mui/icons-material/Done'

import NoData from 'components/NoData';

import { apiFetch } from 'lib/api';

import { ScrId, PH, Steps, Card, Sum, SumRow, Callout, Tml, Te } from '../../components/ui';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

function CheckoutForm() {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
    
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/payment-success`,
            },
        });

        if(error.type === "card_error" || error.type === "validation_error"){
      
            setMessage(error.message);
        }else{
      
            setMessage("An unexpected error occurred.");
        }

        setIsProcessing(false);
    };

    return (
        <form onSubmit={handleSubmit} className="mx-auto p-4 rounded">
      
            <PaymentElement />
            
            <button disabled={isProcessing || !stripe || !elements} className="mt-4 w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">
                {isProcessing ? "Processing..." : "Pay Now"}
            </button>
      
            {message && <div className="text-red-500 mt-2 text-sm">{message}</div>}
        </form>
    );
}

export default function PaymentAuto() {

    const navigate = useNavigate();
    const { step, transaction_id } = useParams();

    const [loads, setLoads] = useState([]);
    const [loading, setLoading] = useState(false);

    const [currentNum, setCurrentNum] = useState(1);

    const [error, setError] = useState(false);
    const [no_data, setNoData] = useState(false);

    const [selectedLoad, setSelectedLoad] = useState(null);

    const [initingTransaction, setInitingTransaction] = useState(false)

    const [error_message, setErrorMessage] = useState('');
    const [success_message, setSuccessMessage] = useState('');

    /*
    Step two
    */
    const [load, setLoad] = useState(null)
    const [selectedPaymentSource, setSelectedPaymentSource] = useState(null)
    const [selectedPaymentType, setSelectedPaymentType] = useState('bank')
    const [stripPaymentSources, setStripPaymentSources] = useState([])

    const [amounts, setAmounts] = useState([]);
    const [progress, setProgress] = useState({});

    const actionsRef = useRef(null);

    const containerRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [stripe, setStripe] = useState(null);
    const [elements, setElements] = useState(null);
    const [paymentElement, setPaymentElement] = useState(null);

    const [client_secret, setClientSecret] = useState(null);

    const stepper = [
        { key: 'load', lable: 'Select Load', num: 1 },
        { key: 'fund', lable: 'Review & fund', num: 2 },
        { key: 'done', lable: 'Done', num: 3 },
    ];

    useEffect(function () {

        setCurrentNum(stepper.find(s => s.key === step)?.num ?? 1);

        if(step === 'load'){

            fetchLoads();
        }

        if(step === 'fund'){

            initFunds(transaction_id)
        }

        if(step === 'done'){

            finishPayment(transaction_id)
        }

    }, [step]);

    function fetchLoads(){

        setLoading(true);

        apiFetch('/dt-pay/payment/auto/loads', { method: 'POST' })
            .then((data) => {

                if(data.status){

                    setLoads(data?.loads?.data || []);

                    if(data?.loads?.data.length === 0){

                        setNoData(true)
                    }else{

                        setNoData(false)
                    }
                }

                setLoading(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function initFunds(transaction_id){

        setLoading(true);

        apiFetch('/dt-pay/payment/auto/fund', { method: 'POST', body: JSON.stringify({ transaction_id: transaction_id }) })
            .then((data) => {

                if(data.status){

                    setLoad(data.load)
                    setStripPaymentSources(data.sources)
                    setAmounts(data.amounts)

                    if(data.sources.length <= 0){

                        initStripe(transaction_id);
                    }
                }

                setLoading(false);
            })
            .catch((err) => console.error('Init funds error:', err));
    }

    async function initStripe(transaction_id){
      
        const stripeInstance = await stripePromise;
        setStripe(stripeInstance);

        apiFetch('/dt-pay/payment/intent', { method: 'POST', body: JSON.stringify({ transaction_id: transaction_id }) })
            .then((data) => {

                if(data.status){

                    setClientSecret(data.client_secret)
                }
            })
            .catch((err) => console.error('Init funds error:', err));
    }

    function finishPayment(transaction_id){

        setLoading(true);

        apiFetch('/dt-pay/payment/auto/finish', { method: 'POST', body: JSON.stringify({ transaction_id: transaction_id }) })
            .then((data) => {

                if(data.status){

                    setLoad(data.load)
                    setProgress(data.progress)
                }

                setLoading(false);
            })
            .catch((err) => console.error('Init funds error:', err));
    }

    function initTransaction(){

        if(selectedLoad){

            setInitingTransaction(true);

            apiFetch('/dt-pay/transactions/init', { method: 'POST', body: JSON.stringify({ load_id: selectedLoad, transaction_id: transaction_id }) })
            .then((data) => {

                if(data.status){

                    setCurrentNum(2)
                    navigate(`/dt-pay/payment/auto/fund/${data.row_id}`)
                }else{

                    setErrorMessage(data.message)
                }

                setInitingTransaction(false);
            })
            .catch((err) => console.error('Transaction init error:', err));
        }
    }

    function calculateAmounts(method){

        setInitingTransaction(true);

        const _post = {
            method_type: method.type,
            method_id: method.key,
            mode: 'auto',
            transaction_id: transaction_id,
        }

        apiFetch('/dt-pay/payment/calculate', { method: 'POST', body: JSON.stringify(_post) })
            .then((data) => {

                if(data.status){

                    setAmounts(data.amounts)
                }

                setInitingTransaction(false);
            })
            .catch((err) => console.error('Transaction init error:', err));
    }

    function makePayment(){

        setInitingTransaction(true);

        apiFetch('/dt-pay/payment/pay', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){

                    setSuccessMessage(data.message);
                    localStorage.setItem('flash_success_message', data.message)

                    setCurrentNum(3)
                    navigate(`/dt-pay/payment/auto/done/${transaction_id}`)
                }

                setInitingTransaction(false);
            })
            .catch((err) => console.error('Transaction init error:', err));
    }

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">

            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>
                    <ScrId id="B-03" name="Automated — select load" />
                </Grid>

                <Grid size={12}>

                    {(currentNum === 1 || currentNum === 2) &&
                    
                        <Steps
                            list={stepper.map(s => s.lable)}
                            cur={currentNum}
                        />
                    }

                    {currentNum === 1 &&
                        
                        <div className='mt-4'>
                            <PH
                                crumb={<><b>Pay a carrier</b> → Method</>}
                                title="How do you want to pay?"
                                desc="Automated pulls everything from a load already in Dollar Traq. Manual lets you pay against any load — even one managed outside the platform."
                            />
                        </div>
                    }

                    {currentNum === 2 &&
                        <div className='mt-4'>    
                            <PH
                                crumb={<><b>Automated payment</b> → Funding</>}
                                title="Fund the payment"
                            />
                        </div>
                    }
                </Grid>

                {currentNum === 1 &&

                    <Grid size={12}>

                        {loads.length > 0 &&
                        
                            <div className="bg-white border-2 border-gray-500/[.1] rounded-lg">
                                <div className='p-3 px-4'>
                                    <strong className='font-bold text-gray-800 text-sm'>Payable loads</strong>
                                </div>
                                <div>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow className='bg-gray-50 border-t border-gray-100'>
                                                <TableCell width="2%"></TableCell>
                                                <TableCell width="10%">
                                                    <span className='font-bold text-[11px] uppercase text-gray-400'>Load</span>
                                                </TableCell>
                                                <TableCell width="30%">
                                                    <span className='font-bold text-[11px] uppercase text-gray-400'>Lane</span>
                                                </TableCell>
                                                <TableCell width="20%">
                                                    <span className='font-bold text-[11px] uppercase text-gray-400'>Carrier</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className='font-bold text-[11px] uppercase text-gray-400'>Rate</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className='font-bold text-[11px] uppercase text-gray-400'>Status</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className='font-bold text-[11px] uppercase text-gray-400'>POD</span>
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>

                                            {loads.map((_load, index) => {

                                                return (

                                                    <TableRow key={`load_${index}`} sx={{cursor:'pointer', borderBottom:'1px solid rgba(0,0,0,.05)', background:selectedLoad === _load.uuid ? '#f0fdf4' : '#fff', '&:hover': {background:selectedLoad === _load.uuid ? '#f0fdf4' : '#fff'}}} onClick={() => {

                                                        setSelectedLoad(_load.uuid)

                                                        actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
                                                    }}>

                                                        <TableCell sx={{borderBottom:'0 none'}}>
                                                            <div className={`w-[16px] h-[16px] rounded-full ${selectedLoad === _load.uuid ? 'border-4 border-green-600' : 'border border-gray-300'}`}></div>
                                                        </TableCell>
                                                        <TableCell sx={{borderBottom:'0 none'}}>
                                                            <span className='text-xs text-blue-600 font-semibold'>{_load.shipment_no}</span>
                                                        </TableCell>
                                                        <TableCell sx={{display:'flex', flexDirection:'column', padding:'12px', borderBottom:'0 none'}}>
                                                            <span className='text-xs text-slate-900'>{_load?.stops.length > 0 && _load?.stops[0].stop_name} → {_load?.stops.length > 1 && _load?.stops[1].stop_name}</span>
                                                            <span className='text-xs text-gray-500/[.8]'>{_load.tracking_method_label}</span>
                                                        </TableCell>
                                                        <TableCell sx={{borderBottom:'0 none'}}>
                                                            <span className='text-xs text-gray-600'>{_load.carrier_name}</span>
                                                        </TableCell>
                                                        <TableCell sx={{borderBottom:'0 none'}}>
                                                            <span className='text-xs text-gray-600 font-semibold'>{_load.amount_formatted}</span>
                                                        </TableCell>
                                                        <TableCell sx={{borderBottom:'0 none'}}>
                                                            <Chip label={_load.status_label} size="small" sx={{fontSize:10}} color={_load.status_color} />
                                                        </TableCell>
                                                        <TableCell sx={{borderBottom:'0 none'}}>
                                                            <Chip label={_load.pod_label} size="small" sx={{fontSize:10}} />
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        }

                        {no_data &&
                        
                            <NoData message="Active loads not found!" size="small" />
                        }

                        {loading &&
                        
                            <Stack spacing={1}>
                                <Skeleton width="100%" height={80} variant='rounded' />
                                <Skeleton width="100%" height={80} variant='rounded' />
                                <Skeleton width="100%" height={80} variant='rounded' />
                                <Skeleton width="100%" height={80} variant='rounded' />
                                <Skeleton width="100%" height={80} variant='rounded' />
                                <Skeleton width="100%" height={80} variant='rounded' />
                            </Stack>
                        }
                    </Grid>
                }

                {currentNum === 2 &&

                    <>
                
                        {load &&
                        
                            <Grid size={12}>

                                <Grid container spacing={4}>

                                    <Grid size={8}>

                                        <Card
                                            title="Paying"
                                        >
                                            <div className='border border-gray-200 rounded-lg p-2 w-full flex items-center'>
                                                <div className='flex flex-1'>
                                                    <span className='bg-green-50 p-3 rounded-lg flex items-center justify-center'>
                                                        <LocalShippingOutlined style={{fontSize:18}} className='text-green-800' />
                                                    </span>
                                                    <div className="ml-2">
                                                        <strong className='text-xs text-gray-600'>{load.carrier_name}</strong>
                                                        <p className='text-xs text-gray-600'>{load.shipment_no} - {load?.stops.length > 0 && load?.stops[0].stop_name} → {load?.stops.length > 1 && load?.stops[1].stop_name}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <strong className='text-sm font-bold'>{load.amount_formatted}</strong>
                                                </div>
                                            </div>

                                            {client_secret && (

                                                <Elements stripe={stripePromise} options={{clientSecret: client_secret}}>
                                                    <CheckoutForm />
                                                </Elements>
                                            )}

                                            {stripPaymentSources.length > 0 &&
                                            
                                                <div className='mt-5'>
                                                    <h4 className="font-bold text-gray-400 uppercase text-xs border-b border-gray-100 pb-1 mb-4">Funding source</h4>

                                                    {stripPaymentSources.map((_strip_payment_sources, index) => {

                                                        return (
                                                            <div className={`border-2 rounded-lg p-2 mb-2 w-full flex items-center ${selectedPaymentSource === _strip_payment_sources.key ? 'border-green-600 bg-green-50' : 'border border-gray-200'}`} key={`_strip_payment_sources_${index}`} onClick={() => {

                                                                setSelectedPaymentSource(_strip_payment_sources.key)
                                                                calculateAmounts(_strip_payment_sources)
                                                                setSelectedPaymentType(_strip_payment_sources.type)
                                                            }}>
                                                                <div className='flex flex-1'>
                                                                    <span className='bg-green-50 p-3 rounded-lg flex items-center justify-center'>
                                                                        {_strip_payment_sources.type === 'card' &&
                                                                        
                                                                            <CreditCardOutlined />
                                                                        }
                                                                        
                                                                        {_strip_payment_sources.type === 'bank' &&
                                                                        
                                                                            <AccountBalanceOutlined />
                                                                        }
                                                                    </span>
                                                                    <div className="ml-2">
                                                                        <strong className='text-xs text-gray-600'>{_strip_payment_sources.label}</strong>
                                                                        <p className='text-xs text-gray-600'>{_strip_payment_sources.sub_label}</p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className={`w-[16px] h-[16px] rounded-full ${selectedPaymentSource === _strip_payment_sources.key ? 'border-4 border-green-600' : 'border border-gray-300'}`}></div>
                                                                </div>
                                                            </div>   
                                                        )
                                                    })}
                                                </div>
                                            }

                                            <div ref={actionsRef} className='flex items-end justify-end mb-1 mt-2 gap-6'>

                                                <Link to={`/dt-pay/payment/auto/load/${transaction_id}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                                    <ArrowBack style={{fontSize:15}} />
                                                    Back
                                                </Link>

                                                <Button className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300!" disabled={selectedPaymentSource === null} loading={initingTransaction} onClick={() => {

                                                    makePayment()

                                                }}>Fund & hold {load.amount_formatted}</Button>
                                            </div>
                                        </Card>
                                    </Grid>
                                    <Grid size={4}>
                                        <Card
                                            title="Quote"
                                        >
                                            <Sum className="my-2">
                                                <SumRow>
                                                    <span>Carrier rate</span><span className="text-gray-800">{amounts.carrier_rate_formatted}</span>
                                                </SumRow>

                                                {selectedPaymentType === 'card'
                                                    ?
                                                        <SumRow sub>
                                                            <span>Card funding fee (2.9%)</span>
                                                            <span className="text-gray-800">+{amounts.ach_funding_fee_formatted}</span>
                                                        </SumRow>
                                                    :
                                                        <SumRow sub>
                                                            <span>ACH funding</span>
                                                            <span className="text-gray-800">Free</span>
                                                        </SumRow>
                                                }
                                                
                                                <SumRow tot>
                                                    <span>You're charged</span>
                                                    <span className="text-gray-800">{amounts.total_chargeable_formatted}</span>
                                                </SumRow>
                                                <SumRow sub className="mt-2">
                                                    <span>Platform fee (1.2%, netted)</span>
                                                    <span className="text-gray-800">−{amounts.platform_fee_formatted}</span>
                                                </SumRow>
                                                <SumRow>
                                                    <span>Carrier receives</span>
                                                    <span className="text-green-700 font-bold">{amounts.carrier_receives_formatted}</span>
                                                </SumRow>
                                                <SumRow sub>
                                                    <span>Release condition</span>
                                                    {/* <span>{s.draft.release === 'date' ? 'On delivery date' : s.draft.release === 'clear' ? 'On funds clearing' : 'POD verified'}</span> */}
                                                </SumRow>
                                            </Sum>
                                            
                                            <Callout tone="green" icon="lock" className="mt-2.5 mb-0">
                                                <b>Held, not paid</b>Funds sit in a payment hold with Stripe (our licensed payment partner). Nothing reaches the carrier until the release condition is met — and you can hold or refund any time before release.
                                            </Callout>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Grid>
                        }

                        {loading &&
                        
                            <Grid size={12}>

                                <Grid container spacing={4}>

                                    <Grid size={8}>
                                        <Skeleton width="100%" height={600} variant='rounded' />
                                    </Grid>

                                    <Grid size={4}>
                                        <Skeleton width="100%" height={600} variant='rounded' />
                                    </Grid>
                                </Grid>
                            </Grid>
                        }
                    </>
                }

                {currentNum === 3 &&
                
                    <>
                        {load && (Object.keys(progress).length > 0) &&

                            <Grid size={12}>
                        
                                <div className="max-w-[620px] mx-auto text-center">
                                    <div className="w-19 h-19 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4.5">
                                        <Done />
                                    </div>
                                
                                    <h1 className="text-2xl font-bold text-gray-900">Payment funded &amp; held</h1>
                                    <p className="text-gray-500 my-2 mb-5.5 text-sm">
                                        {progress.label} · holding for <b>{load.carrier_name}</b> · load <b className="font-mono">{load.shipment_no}</b>
                                    </p>
                    
                                    <Card className="text-left p-5">
                                        <Tml>
                                            {progress.steps.map((_step, index) => {

                                                return <Te key={`step_${index}`} tone={index < 2 ? 'g' : ''} date={_step.step} ev={_step.label} meta={_step.text} />
                                            })}
                                        </Tml>
                                    </Card>
                                    <div className="flex gap-2.5 justify-center mt-4.5">
                                        <Link to="/dt-pay/transactions" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                            View Transactions
                                        </Link>

                                        <Link to="/dt-pay/init" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                            Pay another carrier
                                        </Link>
                                    </div>
                                </div>
                            </Grid>
                        }
                    </>
                }

                <Grid size={12}>

                    {currentNum === 1 &&

                        <div ref={actionsRef} className='flex items-end justify-end mb-9 pb-9 gap-6'>
                            <Link to="/dt-pay/init" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                <ArrowBack style={{fontSize:15}} />
                                Back
                            </Link>

                            <Button className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300!" disabled={selectedLoad === null} loading={initingTransaction} onClick={() => {

                                initTransaction()
                            }}>
                                Continue → Review & Fund
                            </Button>
                        </div>
                    }
                </Grid>
            </Grid>

            <Snackbar
                open={error_message !== ''}
                autoHideDuration={6000}
                onClose={() => {

                    setErrorMessage('')
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert severity="error">
                    {error_message}
                </Alert>
            </Snackbar>

            <Snackbar
                open={success_message !== ''}
                autoHideDuration={6000}
                onClose={() => {

                    setSuccessMessage('')
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert severity="success">
                    {success_message}
                </Alert>
            </Snackbar>
        </div>
    )
}