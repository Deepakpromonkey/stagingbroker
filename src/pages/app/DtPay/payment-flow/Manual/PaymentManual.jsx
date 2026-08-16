import { useEffect, useRef, useState } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router';

import { useFormik } from 'formik';
import * as Yup from 'yup';

import Grid from '@mui/material/Grid';

import Skeleton from '@mui/material/Skeleton';

import Button from '@mui/material/Button';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import SearchOutlined from '@mui/icons-material/SearchOutlined'

import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined'
import ArrowBack from '@mui/icons-material/ArrowBack'

import Done from '@mui/icons-material/Done'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'

import Icon from '@mui/material/Icon';

import { ScrId, PH, Steps, Card, Sum, SumRow, Callout, Tml, Te, Field, inputCls, inputErrCls } from '../../components/ui';

import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

import { apiFetch } from 'lib/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_KEY);

const SEARCH_TYPES = ['mc', 'dot', 'company', 'phone', 'address', 'email', 'ein'];

const SEARCH_PARAM_MAP = {
    mc: 'mc_number',
    dot: 'dot_number',
    company: 'legal_name',
    phone: 'phone',
    address: 'address',
    email: 'email',
    ein: 'ein',
};

const SEARCH_TABS = [
    { key: 'mc', label: 'MC', placeholder: 'Enter MC number (e.g., 123456)' },
    { key: 'dot', label: 'DOT', placeholder: 'Enter DOT number (e.g., 1234567)' },
    { key: 'company', label: 'Company', placeholder: 'Enter company name' },
    { key: 'phone', label: 'Phone', placeholder: 'Enter phone number' },
    // { key: 'address', label: 'Address', placeholder: 'Enter address' },
    { key: 'email', label: 'Email', placeholder: 'Enter email address' },
    // { key: 'ein', label: 'EIN', placeholder: 'Enter EIN' },
];

const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const docFileSchema = Yup.mixed()
    .nullable()
    .test('fileType', 'Only PDF or Word documents are allowed', (value) => !value || ALLOWED_DOC_TYPES.includes(value.type));

const manualLoadInitialValues = {
    load_ref: '',
    carrier_invoice: '',
    origin: '',
    destination: '',
    pickup_date: '',
    delivery_date: '',
    equipment: '',
    weight: '',
    linehaul_rate: '',
    total_to_carrier: '',
    rate_confirmation: null,
    pod: null,
    memo: '',
};

const manualLoadValidationSchema = Yup.object().shape({
    load_ref: Yup.string().trim().required('Load / reference # is required'),
    carrier_invoice: Yup.string().trim(),
    origin: Yup.string().trim().required('Origin is required'),
    destination: Yup.string().trim().required('Destination is required'),
    pickup_date: Yup.date().required('Pickup date is required'),
    delivery_date: Yup.date()
        .required('Delivery date is required')
        .min(Yup.ref('pickup_date'), 'Delivery date cannot be before the pickup date'),
    equipment: Yup.string().trim().required('Equipment type is required'),
    weight: Yup.number().typeError('Weight must be a number').positive('Weight must be greater than 0').required('Weight is required'),
    linehaul_rate: Yup.number().typeError('Linehaul rate must be a number').positive('Linehaul rate must be greater than 0').required('Linehaul rate is required'),
    total_to_carrier: Yup.number().typeError('Total to carrier must be a number').positive('Total to carrier must be greater than 0').required('Total to carrier is required'),
    rate_confirmation: docFileSchema,
    pod: docFileSchema,
});

function formatDateForInput(dateStr){

    if(!dateStr){

        return '';
    }

    return dateStr.slice(0, 10);
}

function ManualFileDropzone({ label, hint, name, form }){

    const inputRef = useRef(null);

    const file = form.values[name];
    const error = form.touched[name] && form.errors[name] ? form.errors[name] : '';

    return (
        <Field label={label} hint={hint} error={error}>
            <input
                ref={inputRef}
                type="file"
                name={name}
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {

                    form.setFieldValue(name, e.currentTarget.files[0] || null);
                    form.setFieldTouched(name, true);
                }}
            />

            <div
                onClick={() => inputRef.current?.click()}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed bg-gray-50 hover:bg-gray-100 cursor-pointer transition ${error ? 'border-red-300' : 'border-gray-300'}`}
            >
                <UploadFileOutlined style={{ fontSize: 18 }} className="text-gray-400 shrink-0" />

                {file
                    ?
                        <span className="text-xs font-medium text-gray-700 truncate">{file.name}</span>
                    :
                        <span className="text-xs text-gray-400">Click to upload</span>
                }
            </div>
        </Field>
    );
}

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


export default function PaymentManual() {

    const navigate = useNavigate();
    const { step, transaction_id } = useParams();

    const [initing, setIniting] = useState(false);

    const [conditions, setConditions] = useState([]);
    const [selectedCondition, setSelectedCondition] = useState('bank')

    const [loading, setLoading] = useState(false);

    const [currentNum, setCurrentNum] = useState(1);

    const [no_data, setNoData] = useState(false);

    const [selectedLoad, setSelectedLoad] = useState(null);

    const [initingTransaction, setInitingTransaction] = useState(false)

    const [error_message, setErrorMessage] = useState('');
    const [success_message, setSuccessMessage] = useState('');

    /*
    Step two
    */
    const [carrierSearch, setCarrierSearch] = useState('');
    const [searchType, setSearchType] = useState('dot');

    const [activeTab, setActiveTab] = useState('dot');

    const [searchingCarrier, setSearchingCarrier] = useState(false);
    const [carrierSearchError, setCarrierSearchError] = useState('');
    const [carrierResults, setCarrierResults] = useState([]);
    const [selectedCarrier, setSelectedCarrier] = useState(null);
    const [updatingCarrier, setUpdatingCarrier] = useState(false);

    const [transaction, setTransaction] = useState(null)
    
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
        { key: 'load', lable: 'Load Details', num: 1 },
        { key: 'verify', lable: 'Verify Carrier', num: 2 },
        { key: 'fund', lable: 'Funding & Review', num: 3 },
        { key: 'done', lable: 'Done', num: 4 },
    ];

    const activeTabData = SEARCH_TABS.find(t => t.key === activeTab) || SEARCH_TABS[0];

    useEffect(function () {

        setCurrentNum(stepper.find(s => s.key === step)?.num ?? 1);

        if(step === 'load'){

            init(transaction_id);
        }

        if(step === 'fund'){

            initFunds(transaction_id)
        }

        if(step === 'done'){

            finishPayment(transaction_id)
        }

    }, [step]);

    function init(transaction_id){

        setIniting(true);

        apiFetch('/dt-pay/payment/manual/init', { method: 'POST', body: JSON.stringify({ transaction_id: transaction_id }) })
            .then((data) => {

                if(data.status){

                    setConditions(data.conditions);

                    if(data.conditions.length > 0){

                        const _condition = data.conditions[0]

                        if(_condition){

                            setSelectedCondition(_condition.key)
                        }
                    }

                    if(data.transaction){

                        const _transaction = data.transaction;
                        const _load = _transaction.payment_load || {};

                        manualLoadForm.setValues({
                            ...manualLoadInitialValues,
                            load_ref: _load.load_ref || '',
                            carrier_invoice: _load.carrier_invoice || '',
                            origin: _load.origin || '',
                            destination: _load.destination || '',
                            pickup_date: formatDateForInput(_load.pickup_date),
                            delivery_date: formatDateForInput(_load.delivery_date),
                            equipment: _load.equipment || '',
                            weight: _load.weight ?? '',
                            linehaul_rate: _load.linehaul_rate ?? '',
                            total_to_carrier: _load.total_to_carrier ?? '',
                            memo: _transaction.notes || '',
                        });

                        if(_transaction.stage){

                            setSelectedCondition(_transaction.stage)
                        }
                    }
                }

                setIniting(false);
            })
            .catch((err) => console.error('Manual init error:', err));
    }

    function searchCarrier(){

        if(carrierSearch.trim() === ''){

            return;
        }

        setSearchingCarrier(true);
        setCarrierSearchError('');
        setSelectedCarrier(null);

        const params = new URLSearchParams();

        const searchedByValue = SEARCH_PARAM_MAP[searchType] || 'legal_name';
        params.append('query', carrierSearch);
        params.append('searched_by', searchedByValue);

        params.append('per_page', 10);
        params.append('page', 1);

        apiFetch(`/carrier/search?${params.toString()}`)
            .then(function (res) {

                if(res?.total && res?.total > 0){

                    setCarrierResults(Array.isArray(res.data) ? res.data : [] || []);
                }else{

                    setCarrierResults([]);
                    setCarrierSearchError(data.message || 'Carrier not found.');
                }

                setSearchingCarrier(false);
            })
            .catch(function (err) {

                setSearchingCarrier(false);

                setCarrierSearchError('Carrier not found.');
                setCarrierResults([]);
            })
            .finally(function () {
                
                setSearchingCarrier(false);
            });

    }

    function initFunds(transaction_id){

        setLoading(true);

        apiFetch('/dt-pay/payment/manual/fund', { method: 'POST', body: JSON.stringify({ transaction_id: transaction_id }) })
            .then((data) => {

                if(data.status){

                    setTransaction(data.transaction)
                    setStripPaymentSources(data.sources)
                    setAmounts(data.amounts)

                    if(data.sources.length <= 0){

                        initStripe(transaction_id);
                    }
                }

                setLoading(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function updateCarrier(transaction_id){

        setUpdatingCarrier(true);

        apiFetch('/dt-pay/payment/manual/carrier/update', { method: 'POST', body: JSON.stringify({ transaction_id: transaction_id, carrier: selectedCarrier?.dot_number }) })
            .then((data) => {

                if(data.status){

                    setCurrentNum(3)
                    navigate(`/dt-pay/payment/manual/fund/${transaction_id}`)
                }

                setUpdatingCarrier(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function submitManualTransaction(values){

        setInitingTransaction(true);

        const formData = new FormData();

        Object.keys(values).forEach((key) => {

            if(values[key] !== null && values[key] !== undefined){

                formData.append(key, values[key]);
            }
        });

        formData.append('release_condition', selectedCondition);
        formData.append('transaction_id', transaction_id);

        apiFetch('/dt-pay/payment/manual/submit', { method: 'POST', body: formData })
            .then((data) => {

                if(data.status){

                    setCurrentNum(2)
                    navigate(`/dt-pay/payment/manual/verify/${data.row_id}`)
                }else{

                    setErrorMessage(data.message)
                }

                setInitingTransaction(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function calculateAmounts(method){
    
        setInitingTransaction(true);

        const _post = {
            method_type: method.type,
            method_id: method.key,
            mode: 'manual',
            transaction_id: transaction_id,
        }

        apiFetch('/dt-pay/payment/calculate', { method: 'POST', body: JSON.stringify(_post) })
            .then((data) => {

                if(data.status){

                    setAmounts(data.amounts)
                }

                setInitingTransaction(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function makePayment(){

        setInitingTransaction(true);

        apiFetch('/dt-pay/payment/pay', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){

                    setSuccessMessage(data.message);
                    localStorage.setItem('flash_success_message', data.messsge)

                    setCurrentNum(3)
                    navigate(`/dt-pay/payment/manual/done/${transaction_id}`)
                }

                setInitingTransaction(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function finishPayment(transaction_id){

        setLoading(true);

        apiFetch('/dt-pay/payment/manual/finish', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){
                    
                    setTransaction(data.transaction)
                    setProgress(data.progress)
                }else{

                    setErrorMessage(data.message)
                }

                setLoading(false);
            })
            .catch((err) => console.error('Loads init error:', err));

    }

    async function initStripe(transaction_id){
      
        const stripeInstance = await stripePromise;
        setStripe(stripeInstance);

        apiFetch('/dt-pay/payment/intent', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){

                    setClientSecret(data.client_secret)
                }

                setLoading(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    const manualLoadForm = useFormik({
        initialValues: manualLoadInitialValues,
        validationSchema: manualLoadValidationSchema,
        onSubmit: submitManualTransaction,
    });

    function manualFieldError(name){

        return manualLoadForm.touched[name] && manualLoadForm.errors[name] ? manualLoadForm.errors[name] : '';
    }

    function manualFieldCls(name){

        return manualFieldError(name) ? `${inputCls} ${inputErrCls}` : inputCls;
    }

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">

            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>

                    {currentNum === 1 &&
                    
                        <ScrId id="B-06" name="Manual — Load details" />
                    }

                    {currentNum === 2 &&
                    
                        <ScrId id="B-06" name="Manual — verify carrier" />
                    }

                    {currentNum === 3 &&
                    
                        <ScrId id="B-06" name="Funding & review (shared composer)" />
                    }

                    {currentNum === 4 &&
                    
                        <ScrId id="B-06" name="Confirmation" />
                    }
                    
                </Grid>

                <Grid size={12}>

                    {(currentNum === 1 || currentNum === 2 || currentNum === 3) &&
                    
                        <Steps
                            list={stepper.map(s => s.lable)}
                            cur={currentNum}
                        />
                    }

                    {currentNum === 1 &&

                        <div className='mt-4'>
                            <PH
                                back="/dt-pay/init"
                                crumb={<><b>Manual payment </b> → Step 1 of 4</>}
                                title="Enter load details"
                                desc="Fields marked * are required. Everything else strengthens the payment record for disputes and audit."
                            />
                        </div>
                    }

                    {currentNum === 2 &&
                        
                        <div className='mt-4'>
                            <PH
                                crumb={<><b>Manual payment </b> → Step 2 of 4</>}
                                title="Who are you paying?"
                                desc={`Enter the carrier's MC or DOT number. We pull FMCSA SAFER live, check their DT Trust Score, and detect factoring assignments before any money moves.`}
                            />
                        </div>
                    }

                    {currentNum === 3 &&
                        <div className='mt-4'>
                            <PH
                                crumb={<><b>Manual payment </b> → Funding</>}
                                title="Fund the payment"
                            />
                        </div>
                    }
                </Grid>

                {currentNum === 1 &&

                    <Grid size={8}>
                        
                        <Card
                            title="Load identification"
                        >
                            <div className="grid grid-cols-2 gap-3">

                                <Field label="Load / reference #" required hint="Shown to the carrier and on receipts" error={manualFieldError('load_ref')}>
                                    <input name="load_ref" className={manualFieldCls('load_ref')} placeholder="Your TMS or internal ref" value={manualLoadForm.values.load_ref} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Carrier invoice #" hint="Matches the payment to the carrier's AR" error={manualFieldError('carrier_invoice')}>
                                    <input name="carrier_invoice" className={manualFieldCls('carrier_invoice')} placeholder="INV-0000" value={manualLoadForm.values.carrier_invoice} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Origin" required error={manualFieldError('origin')}>
                                    <input name="origin" className={manualFieldCls('origin')} placeholder="City, State" value={manualLoadForm.values.origin} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Destination" required error={manualFieldError('destination')}>
                                    <input name="destination" className={manualFieldCls('destination')} placeholder="City, State" value={manualLoadForm.values.destination} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Pickup date" required error={manualFieldError('pickup_date')}>
                                    <input type="date" name="pickup_date" className={manualFieldCls('pickup_date')} value={manualLoadForm.values.pickup_date} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Delivery date" required error={manualFieldError('delivery_date')}>
                                    <input type="date" name="delivery_date" className={manualFieldCls('delivery_date')} value={manualLoadForm.values.delivery_date} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Equipment" required hint="e.g. Dry van, Reefer, Flatbed" error={manualFieldError('equipment')}>
                                    <input name="equipment" className={manualFieldCls('equipment')} placeholder="Dry van" value={manualLoadForm.values.equipment} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Weight (lbs)" required error={manualFieldError('weight')}>
                                    <input type="number" min="0" step="1" name="weight" className={manualFieldCls('weight')} placeholder="0" value={manualLoadForm.values.weight} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Linehaul rate" required hint="Amount agreed with the carrier" error={manualFieldError('linehaul_rate')}>
                                    <input type="number" min="0" step="0.01" name="linehaul_rate" className={manualFieldCls('linehaul_rate')} placeholder="0.00" value={manualLoadForm.values.linehaul_rate} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <Field label="Total to carrier" required hint="Linehaul + accessorials, before platform fee" error={manualFieldError('total_to_carrier')}>
                                    <input type="number" min="0" step="0.01" name="total_to_carrier" className={manualFieldCls('total_to_carrier')} placeholder="0.00" value={manualLoadForm.values.total_to_carrier} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                </Field>

                                <ManualFileDropzone label="Rate confirmation" hint="PDF or Word document" name="rate_confirmation" form={manualLoadForm} />

                                <ManualFileDropzone label="POD" hint="PDF or Word document" name="pod" form={manualLoadForm} />

                                {conditions.length > 0 &&
                                            
                                    <div className='col-span-2'>
                                        <h4 className="font-bold text-gray-400 uppercase text-xs border-b border-gray-100 pb-1 mb-4">Funding source</h4>

                                        {conditions.map((_condition) => {

                                            return (
                                                <div className={`border-2 rounded-lg p-2 mb-2 w-full flex items-center ${selectedCondition === _condition.key ? 'border-green-600 bg-green-50' : 'border border-gray-200'}`} key={`_release_condition_${_condition.key}`} onClick={() => {

                                                    setSelectedCondition(_condition.key)
                                                }}>
                                                    <div className='flex flex-1'>
                                                        <span className='bg-green-50 p-3 rounded-lg flex items-center justify-center'>
                                                            <Icon className='text-green-700' style={{fontSize:16}}>{_condition.icon}</Icon>
                                                        </span>
                                                        <div className="ml-2">
                                                            <strong className='text-xs text-gray-600'>{_condition.value}</strong>
                                                            <p className='text-xs text-gray-600'>{_condition.label}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className={`w-[16px] h-[16px] rounded-full ${selectedCondition === _condition.key ? 'border-4 border-green-600' : 'border border-gray-300'}`}></div>
                                                    </div>
                                                </div>   
                                            )
                                        })}
                                    </div>
                                }

                                <div className='col-span-2'>
                                    <Field label="Memo to carrier" error={manualFieldError('memo')}>
                                        <textarea name="memo" className={`w-full border border-gray-200 text-xs p-2 rounded-lg`} rows="3" placeholder="Optional note shown on the carrier's payout" value={manualLoadForm.values.memo} onChange={manualLoadForm.handleChange} onBlur={manualLoadForm.handleBlur} />
                                    </Field>
                                </div>

                                <div className='col-span-2'>
                                    <div ref={actionsRef} className='flex items-end justify-end mb-4 gap-6'>
                                        
                                        <Link to="/dt-pay/init" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                            <ArrowBack style={{fontSize:15}} />
                                            Back
                                        </Link>

                                        <Button className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300!" loading={initingTransaction} onClick={() => {

                                            manualLoadForm.handleSubmit()
                                        }}>
                                            Continue → Review & Fund
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </Grid>
                }

                {currentNum === 2 &&

                    <>
                        <Grid size={8}>
                            <Card>
                                <Field label="Carrier MC or DOT number" required hint="Live check against FMCSA SAFER + Dollar Traq carrier graph">

                                    <div
                                        role="tablist"
                                        aria-label="Search by"
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'flex-start',
                                            gap: 6,
                                            marginBottom: 28,
                                            marginTop: 20,
                                        }}
                                    >
                                        {SEARCH_TABS.map((tab) => {

                                            const active = tab.key === activeTab;
                                            
                                            return (
                                                <button
                                                    key={tab.key}
                                                    role="tab"
                                                    aria-selected={active}
                                                    onClick={() => {

                                                        setActiveTab(tab.key);

                                                        setSearchType(tab.key);
                                                    }}
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 700,
                                                        letterSpacing: '0.04em',
                                                        textTransform: 'uppercase',
                                                        padding: '8px 16px',
                                                        borderRadius: 999,
                                                        border: active ? '1px solid #4F8EF7' : '1px solid rgba(255,255,255,0.12)',
                                                        backgroundColor: active ? 'rgba(79, 142, 247, 0.16)' : 'rgba(0,0,0,.1)',
                                                        color: active ? '#1957bb' : 'rgba(0,0,0,.6)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="flex gap-2.5">
                                        <input
                                            className={inputCls}
                                            placeholder={activeTabData.placeholder}
                                            value={carrierSearch}
                                            onChange={(e) => setCarrierSearch(e.target.value)}
                                            onKeyDown={(e) => {

                                                if(e.key === 'Enter'){

                                                    e.preventDefault();
                                                    searchCarrier();
                                                }
                                            }}
                                        />
                                        <Button sx={{background:'#2563eb', borderRadius:2, color:'#fff', padding:'10px 20px', flexShrink:0, '&.Mui-disabled':{background:'#93c5fd'}}} onClick={searchCarrier} disabled={searchingCarrier} startIcon={<SearchOutlined />} loading={searchingCarrier}>
                                            <span>{searchingCarrier ? 'Searching…' : 'Look up'}</span>
                                        </Button>
                                    </div>
                                </Field>

                                {carrierSearchError !== '' &&

                                    <p className="text-xs text-red-600 mt-2">{carrierSearchError}</p>
                                }

                                {carrierResults.length > 0 &&

                                    <div className='mt-4'>
                                        <h4 className="font-bold text-gray-400 uppercase text-xs border-b border-gray-100 pb-1 mb-4">Search results</h4>

                                        {carrierResults.map((_carrier) => {

                                            return (
                                                <div className={`border-2 rounded-lg p-2 mb-2 w-full flex items-center transition ${selectedCarrier?.dot_number === _carrier.dot_number ? 'border-green-600 bg-green-50' : 'border border-gray-200 hover:bg-blue-50 hover:border-blue-200'}`} key={`_carrier_${_carrier.dot_number}`} onClick={() => {

                                                    setSelectedCarrier(_carrier)
                                                }}>
                                                    <div className='flex flex-1'>
                                                        <span className='bg-green-50 p-3 rounded-lg flex items-center justify-center'>
                                                            <LocalShippingOutlined className='text-green-700' style={{fontSize:16}} />
                                                        </span>
                                                        <div className="ml-2">
                                                            <strong className='text-xs text-gray-600'>{_carrier.company_name}</strong>
                                                            <p className='text-xs text-gray-600'>DOT {_carrier.dot_number} · {_carrier.address}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className={`w-[16px] h-[16px] rounded-full ${selectedCarrier?.dot_number === _carrier.dot_number ? 'border-4 border-green-600' : 'border border-gray-300'}`}></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                }

                                <div className='mt-4'>
                                    <div className='flex items-end justify-end mb-4 gap-6'>

                                        <Link to={`/dt-pay/payment/manual/load/${transaction_id}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                            <ArrowBack style={{fontSize:15}} />
                                            Back
                                        </Link>

                                        <Button className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300!" disabled={selectedCarrier === null} loading={updatingCarrier} onClick={() => {

                                            updateCarrier(transaction_id)

                                        }}>Continue → Funding</Button>
                                    </div>
                                </div>
                            </Card>
                        </Grid>
                        <Grid size={4}>
                            <Callout tone="blue" icon="shield" iconSize={16}>
                                <b>Verification gate — hard block</b>Payment cannot proceed if: authority revoked, active OOS order, insurance lapsed, or Trust Score &lt; 40. Soft warn at 40–69 with an explicit broker acknowledgement checkbox.
                            </Callout>
                        </Grid>
                    </>
                }

                {currentNum === 3 &&
                
                    <>
                
                        {transaction &&
                        
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
                                                        <strong className='text-xs text-gray-600'>{transaction.carrier.legal_name}</strong>
                                                        <p className='text-xs text-gray-600'>{transaction.payment_load.load_ref} - {transaction.payment_load.origin} {`→ ${transaction.payment_load.destination}`}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <strong className='text-sm font-bold'>{transaction.amount_formatted}</strong>
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

                                                <Link to={`/dt-pay/payment/manual/verify/${transaction_id}`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                                    <ArrowBack style={{fontSize:15}} />
                                                    Back
                                                </Link>

                                                <Button className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300!" disabled={selectedPaymentSource === null} loading={initingTransaction} onClick={() => {

                                                    makePayment()

                                                }}>Fund & hold {transaction.amount_formatted}</Button>
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

                {currentNum === 4 &&
                
                    <>
                        {transaction && (Object.keys(progress).length > 0) &&

                            <Grid size={12}>
                        
                                <div className="max-w-[620px] mx-auto text-center">
                                    <div className="w-19 h-19 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-4.5">
                                        <Done />
                                    </div>
                                
                                    <h1 className="text-2xl font-bold text-gray-900">Payment funded &amp; held</h1>
                                    <p className="text-gray-500 my-2 mb-5.5 text-sm">
                                        {progress.label} · holding for <b>{transaction?.carrier?.legal_name}</b> · load <b className="font-mono">{transaction?.payment_load?.load_ref}</b>
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

                        {loading &&
                        
                            <Grid size={12}>

                                <div className="max-w-[620px] mx-auto flex flex-col">
                                    <Skeleton width="100%" height={200} variant='text' />
                                    <Skeleton width="100%" height={200} variant='rounded' />
                                    <Skeleton width="100%" height={200} variant='text' />
                                </div>
                            </Grid>
                        }
                    </>
                }

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