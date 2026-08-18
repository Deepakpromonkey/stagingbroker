
import React, { useState, useRef, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { useFormik } from 'formik';
import * as Yup from 'yup';

import ArrowRightAlt from '@mui/icons-material/ArrowRightAlt'

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import Button from '@mui/material/Button';

import { Card, inputCls, inputErrCls, Field } from '../../DtPay/components/ui';

import { API_BASE } from 'lib/api';

const ROLE_OPTIONS = ['Broker', 'Shipper', 'Freight Forwarder', 'Other'];

const youInitialValues = {
    legal_name: '',
    role: '',
    broker_mc: '',
    ein: '',
    contact_name: '',
    phone: '',
    email: '',
    business_address: '',
};

const youValidationSchema = Yup.object().shape({
    legal_name: Yup.string().trim().required('Business legal name is required'),
    role: Yup.string().required('Please select your role'),
    broker_mc: Yup.string().trim(),
    ein: Yup.string().trim(),
    contact_name: Yup.string().trim().required('Contact name is required'),
    phone: Yup.string().trim().required('Phone is required'),
    email: Yup.string().trim().email('Invalid email address').required('Work email is required'),
    business_address: Yup.string().trim().required('Business address is required'),
});

export default function YouBlock({step, transaction_id, transaction}){

    const navigate = useNavigate();

    const [submittingLoad, setSubmittingLoad] = useState(false);
    const [loadErrorMessage, setLoadErrorMessage] = useState(null);

    function submitForm(values){

        if(transaction_id){

            setSubmittingLoad(true);
            setLoadErrorMessage('');

            const formData = new FormData();

            formData.append('transaction_id', transaction_id);

            Object.keys(values).forEach((key) => {

                if(values[key] !== null && values[key] !== undefined){

                    formData.append(key, values[key]);
                }
            });

            fetch(`${API_BASE}/guest-pay/info/submit`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                },
                body: formData,
            })
                .then(function (response) {

                    return response.json();
                })
                .then(function (data) {

                    if(data?.status){

                        navigate(`/guest-pay/method/${transaction_id}`)
                    }else{

                        setLoadErrorMessage(data?.message || 'Something went wrong. Please try again.');
                    }

                    setSubmittingLoad(false);
                })
                .catch(function () {

                    setLoadErrorMessage('Something went wrong. Please try again.');
                    setSubmittingLoad(false);
                });
        }
    }

    const youForm = useFormik({
        initialValues: youInitialValues,
        validationSchema: youValidationSchema,
        onSubmit: submitForm,
    });

    function youFieldError(name){

        return youForm.touched[name] && youForm.errors[name] ? youForm.errors[name] : '';
    }

    function youFieldCls(name){

        return youFieldError(name) ? `${inputCls} ${inputErrCls}` : inputCls;
    }

    return (
        <Card className="p-9">

            <Snackbar
                open={loadErrorMessage}
                autoHideDuration={6000}
                onClose={() => {

                    setLoadErrorMessage(null)
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert
                    severity="error"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {loadErrorMessage}
                </Alert>
            </Snackbar>

            <h1 className="text-xl text-center font-bold text-gray-900">Tell us who's paying</h1>
          
            <p className="text-center text-gray-500 text-[13px] my-1.5 mb-5">Required for receipts, fraud screening, and so the carrier knows who paid them. No account is created.</p>

            <div className="grid grid-cols-2 gap-3">

                <div className="col-span-2">
                    <Field label="Business legal name" required error={youFieldError('legal_name')}>
                        <input name="legal_name" className={youFieldCls('legal_name')} placeholder="Acme Logistics LLC" value={youForm.values.legal_name} onChange={youForm.handleChange} onBlur={youForm.handleBlur} />
                    </Field>
                </div>

                <div className="col-span-2">
                    <Field label="Your role" required error={youFieldError('role')}>
                        <select name="role" className={youFieldCls('role')} value={youForm.values.role} onChange={youForm.handleChange} onBlur={youForm.handleBlur}>
                            <option value="">Select your role</option>
                            {ROLE_OPTIONS.map((_role) => {

                                return (
                                    <option key={`_role_${_role}`} value={_role}>{_role}</option>
                                )
                            })}
                        </select>
                    </Field>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-3">

                    {youForm.values.role === 'Broker' &&

                        <Field label="Broker MC #" hint="Verified brokers get faster holds released on future payments" error={youFieldError('broker_mc')}>
                            <input name="broker_mc" className={youFieldCls('broker_mc')} placeholder="MC-123456" value={youForm.values.broker_mc} onChange={youForm.handleChange} onBlur={youForm.handleBlur} />
                        </Field>
                    }
                    
                    <Field label="EIN" hint="Optional — appears on receipts" error={youFieldError('ein')}>
                        <input name="ein" className={youFieldCls('ein')} placeholder="12-3456789" value={youForm.values.ein} onChange={youForm.handleChange} onBlur={youForm.handleBlur} />
                    </Field>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-3">
                    <Field label="Contact name" required error={youFieldError('contact_name')}>
                        <input name="contact_name" className={youFieldCls('contact_name')} placeholder="Jane Smith" value={youForm.values.contact_name} onChange={youForm.handleChange} onBlur={youForm.handleBlur} />
                    </Field>

                    <Field label="Phone" required error={youFieldError('phone')}>
                        <input name="phone" className={youFieldCls('phone')} placeholder="(555) 000-0000" value={youForm.values.phone} onChange={youForm.handleChange} onBlur={youForm.handleBlur} />
                    </Field>
                </div>

                <div className="col-span-2">
                    <Field label="Work email" required error={youFieldError('email')}>
                        <input type="email" name="email" className={youFieldCls('email')} placeholder="jane@acmelogistics.com" value={youForm.values.email} onChange={youForm.handleChange} onBlur={youForm.handleBlur} />
                    </Field>
                </div>

                <div className="col-span-2">
                    <Field label="Business address" required error={youFieldError('business_address')}>
                        <textarea name="business_address" className={`${youFieldCls('business_address')} h-[80px]`} rows="3" placeholder="Street, City, State, ZIP" value={youForm.values.business_address} onChange={youForm.handleChange} onBlur={youForm.handleBlur} />
                    </Field>
                </div>

                {loadErrorMessage !== '' &&

                    <div className="col-span-2">
                        <p className="text-xs text-red-600">{loadErrorMessage}</p>
                    </div>
                }

                <div className="col-span-2 flex items-center justify-end mt-2">
                    <Button endIcon={<ArrowRightAlt />} className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300! w-full" size="small" loading={submittingLoad} onClick={() => {

                        youForm.submitForm()
                    }}>
                        Continue
                    </Button>
                </div>
            </div>
        </Card>
    );
}
