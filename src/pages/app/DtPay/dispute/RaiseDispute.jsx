import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Link } from "react-router";

import { useFormik } from 'formik';
import * as Yup from 'yup';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';

import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import ArrowBack from '@mui/icons-material/ArrowBack';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import FlagOutlined from '@mui/icons-material/FlagOutlined';

import NoData from "components/NoData";

import { apiFetch } from 'lib/api';

import { ScrId, PH, Card, Field, inputCls, inputErrCls, Callout } from '../components/ui';

const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const disputeInitialValues = {
    payment: '',
    dispute_type: '',
    reason: '',
    evidence: null,
};

const disputeValidationSchema = Yup.object().shape({
    payment: Yup.string().required('Please select a payment'),
    dispute_type: Yup.string().required('Please select a dispute type'),
    reason: Yup.string().trim().required('Please describe the reason for this dispute'),
    evidence: Yup.mixed()
        .nullable()
        .test('fileType', 'Only PDF or Word documents are allowed', (value) => !value || ALLOWED_DOC_TYPES.includes(value.type)),
});

function DisputeFileDropzone({ label, hint, name, form }){

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

export default function RaiseDispute() {

    const navigate = useNavigate();
    const { transaction_id } = useParams();

    const [initing, setIniting] = useState(true);
    const [no_data, setNoData] = useState(false);

    const [no_cases, setNoCases] = useState(false);

    const [statuses, setStatuses] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [payments, setPayments] = useState([]);
    const [disputeReasons, setDisputeReasons] = useState([]);
    const [cases, setCases] = useState([]);

    const [submittingDispute, setSubmittingDispute] = useState(false);

    const [error_message, setErrorMessage] = useState('');
    const [success_message, setSuccessMessage] = useState('');

    useEffect(function () {

        init()

    }, []);

    function init(){

        setIniting(true);

        apiFetch('/dt-pay/disputes/init', { method: 'POST' })
            .then((data) => {

                if(data.status){

                    setPayments(data.payments)
                    setDisputeReasons(data.dispute_reasons)
                    setCases(data.cases)

                    if(transaction_id && data.payments.some((_payment) => (_payment.uuid ?? _payment.key) === transaction_id)){

                        disputeForm.setFieldValue('payment', transaction_id)
                    }

                    if(data.cases.length <= 0){

                        setNoCases(true)
                    }else{

                        setNoCases(false)
                    }
                }

                setIniting(false);
            })
            .catch((err) => console.error('Dispute init error:', err));
    }

    const disputeForm = useFormik({
        initialValues: disputeInitialValues,
        validationSchema: disputeValidationSchema,
        onSubmit: submitDispute,
    });

    function submitDispute(values){

        setSubmittingDispute(true);

        const formData = new FormData();

        Object.keys(values).forEach((key) => {

            if(values[key] !== null && values[key] !== undefined){

                formData.append(key, values[key]);
            }
        });

        apiFetch('/dt-pay/disputes/submit', { method: 'POST', body: formData })
            .then((data) => {

                if(data.status){

                    setSuccessMessage(data.message);
                    init()
                    disputeForm.resetForm();

                }else{

                    setErrorMessage(data.message);
                }

                setSubmittingDispute(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function disputeFieldError(name){

        return disputeForm.touched[name] && disputeForm.errors[name] ? disputeForm.errors[name] : '';
    }

    function disputeFieldCls(name){

        return disputeFieldError(name) ? `${inputCls} ${inputErrCls}` : inputCls;
    }

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">
            
            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>

                    <ScrId id="B-13" name="Disputes" />

                    <PH
                        crumb={<>Dispute</>}
                        title="Raise a dispute"
                        desc="Disputing re-holds the funds immediately (or reverses the transfer if already released but not paid out). Admin reviews evidence from both sides."
                        back="/dt-pay"
                    />
                </Grid>
                <Grid size={8}>

                    <Card
                        bodyClass="pt-9"
                        loading={initing}
                    >
                        <div className="grid grid-cols-2 gap-3">

                            <Field label="Payment" required hint="The payment this dispute applies to" error={disputeFieldError('payment')}>
                                <select name="payment" className={disputeFieldCls('payment')} value={disputeForm.values.payment} onChange={disputeForm.handleChange} onBlur={disputeForm.handleBlur}>
                                    <option value="">Select a payment</option>
                                    {payments.map((_payment) => {

                                        return (
                                            <option key={`_payment_${_payment.uuid ?? _payment.key}`} value={_payment.uuid ?? _payment.key}>
                                                {_payment.payment_ref ?? _payment.value ?? _payment.label}{_payment.amount_formatted ? ` — ${_payment.amount_formatted}` : ''}
                                            </option>
                                        )
                                    })}
                                </select>
                            </Field>

                            <Field label="Dispute type" required error={disputeFieldError('dispute_type')}>
                                <select name="dispute_type" className={disputeFieldCls('dispute_type')} value={disputeForm.values.dispute_type} onChange={disputeForm.handleChange} onBlur={disputeForm.handleBlur}>
                                    <option value="">Select a dispute type</option>
                                    {disputeReasons.map((_dispute_type) => {

                                        return (
                                            <option key={`_dispute_type_${_dispute_type.key}`} value={_dispute_type.key}>
                                                {_dispute_type.value ?? _dispute_type.label}
                                            </option>
                                        )
                                    })}
                                </select>
                            </Field>

                            <div className="col-span-2">
                                <Field label="What happened" required hint="Shared with the carrier and admin during review" error={disputeFieldError('reason')}>
                                    <textarea name="reason" className={`${disputeFieldCls('reason')} h-[100px] pt-2`} rows="6" placeholder="Describe what happened" value={disputeForm.values.reason} onChange={disputeForm.handleChange} onBlur={disputeForm.handleBlur} />
                                </Field>
                            </div>

                            <div className="col-span-2">
                                <DisputeFileDropzone label="Evidence" hint="PDF or Word document" name="evidence" form={disputeForm} />
                            </div>

                            <div className="col-span-2">
                                <Callout tone="amber" icon="alert"><b>What happens next</b>Funds re-hold now → carrier notified &amp; gets 48h to counter → admin resolves within 5 business days: release to carrier, refund to you, or a partial split you both approve.</Callout>
                            </div>

                            <div className="col-span-2">
                                <div className="flex items-end justify-end mb-4 gap-6">
                                    <Link to="/dt-pay" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2 text-[13px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                                        <ArrowBack style={{fontSize:15}} />
                                        Cancel
                                    </Link>

                                    <Button className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300!" loading={submittingDispute} onClick={() => {

                                        disputeForm.handleSubmit()

                                    }}>
                                        Submit dispute
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Grid>
                <Grid size={4}>
                    <Card
                        title="Your open cases"
                        titleClass="text-gray-800"
                    >
                        <div className="pb-9">

                            {cases.length > 0 &&
                            
                                cases.map((_case) => {

                                    return (
                                        <div key={`case_${_case.row_id}`} className="flex items-center justify-between p-2 border-b border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-red-50 p-2 rounded-md flex items-center justify-center">
                                                    <FlagOutlined className="text-red-700" style={{fontSize:20}} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <strong className="text-xs">{_case.dispute_ref} · {_case.dispute_label}</strong>
                                                    <span className="text-[10px]">{_case.transaction.payment_ref} · {_case.status_label}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            }

                            {initing &&

                                <Stack spacing={1}>
                                    <Skeleton width="100%" height={60} variant="rounded" />
                                    <Skeleton width="100%" height={60} variant="rounded" />
                                    <Skeleton width="100%" height={60} variant="rounded" />
                                    <Skeleton width="100%" height={60} variant="rounded" />
                                    <Skeleton width="100%" height={60} variant="rounded" />
                                </Stack>
                            }

                            {no_cases &&
                            
                                <NoData size="small" message="No open cases found" />
                            }
                        </div>
                    </Card>
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