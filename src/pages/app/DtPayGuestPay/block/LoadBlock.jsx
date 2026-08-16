
import React, { useState, useRef, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { useFormik } from 'formik';
import * as Yup from 'yup';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'

import Button from '@mui/material/Button';

import { Card, inputCls, inputErrCls, Field } from '../../DtPay/components/ui';

import { API_BASE } from 'lib/api';

const ALLOWED_RATE_CONFIRMATION_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const EQUIPMENT_OPTIONS = [
    'Dry Van',
    'Reefer',
    'Flatbed',
    'Step Deck',
    'Power Only',
    'Box Truck',
    'Other',
];

const loadInitialValues = {
    load_ref: '',
    carrier_invoice: '',
    origin: '',
    destination: '',
    delivery_date: '',
    equipment: '',
    amount_to_carrier: '',
    rate_confirmation: null,
};

const loadValidationSchema = Yup.object().shape({
    load_ref: Yup.string().trim().required('Load / reference # is required'),
    carrier_invoice: Yup.string().trim(),
    origin: Yup.string().trim().required('Origin is required'),
    destination: Yup.string().trim().required('Destination is required'),
    delivery_date: Yup.date().required('Delivery date is required'),
    equipment: Yup.string().required('Please select an equipment type'),
    amount_to_carrier: Yup.number().typeError('Amount must be a number').positive('Amount must be greater than 0').required('Amount to carrier is required'),
    rate_confirmation: Yup.mixed()
        .nullable()
        .test('fileType', 'Only PDF or Word documents are allowed', (value) => !value || ALLOWED_RATE_CONFIRMATION_TYPES.includes(value.type)),
});

function RateConfirmationDropzone({ label, hint, name, form }){

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

export default function LoadBlock({step, transaction_id, transaction}){

    const navigate = useNavigate();

    const [submittingLoad, setSubmittingLoad] = useState(false);
    const [loadErrorMessage, setLoadErrorMessage] = useState(null);

    function submitLoad(values){

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

            fetch(`${API_BASE}/guest-pay/load/submit`, {
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

                        navigate(`/guest-pay/you/${transaction_id}`)
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

    const loadForm = useFormik({
        initialValues: loadInitialValues,
        validationSchema: loadValidationSchema,
        onSubmit: submitLoad,
    });

    function loadFieldError(name){

        return loadForm.touched[name] && loadForm.errors[name] ? loadForm.errors[name] : '';
    }

    function loadFieldCls(name){

        return loadFieldError(name) ? `${inputCls} ${inputErrCls}` : inputCls;
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

            <h1 className="text-xl text-center font-bold text-gray-900">Load & payment details</h1>
          
            <p className="text-center text-gray-500 text-[13px] my-1.5 mb-5">Paying {transaction?.legal_name}. These details become the payment record and dispute evidence.</p>

            <div className="grid grid-cols-2 gap-3">

                <Field label="Load / reference #" required error={loadFieldError('load_ref')}>
                    <input name="load_ref" className={loadFieldCls('load_ref')} placeholder="Your TMS or internal ref" value={loadForm.values.load_ref} onChange={loadForm.handleChange} onBlur={loadForm.handleBlur} />
                </Field>

                <Field label="Carrier invoice #" error={loadFieldError('carrier_invoice')}>
                    <input name="carrier_invoice" className={loadFieldCls('carrier_invoice')} placeholder="INV-0000" value={loadForm.values.carrier_invoice} onChange={loadForm.handleChange} onBlur={loadForm.handleBlur} />
                </Field>

                <Field label="Origin" required hint="City, State" error={loadFieldError('origin')}>
                    <input name="origin" className={loadFieldCls('origin')} placeholder="City, State" value={loadForm.values.origin} onChange={loadForm.handleChange} onBlur={loadForm.handleBlur} />
                </Field>

                <Field label="Destination" required hint="City, State" error={loadFieldError('destination')}>
                    <input name="destination" className={loadFieldCls('destination')} placeholder="City, State" value={loadForm.values.destination} onChange={loadForm.handleChange} onBlur={loadForm.handleBlur} />
                </Field>

                <Field label="Delivery date" required error={loadFieldError('delivery_date')}>
                    <input type="date" name="delivery_date" className={loadFieldCls('delivery_date')} value={loadForm.values.delivery_date} onChange={loadForm.handleChange} onBlur={loadForm.handleBlur} />
                </Field>

                <Field label="Equipment" required error={loadFieldError('equipment')}>
                    <select name="equipment" className={loadFieldCls('equipment')} value={loadForm.values.equipment} onChange={loadForm.handleChange} onBlur={loadForm.handleBlur}>
                        <option value="">Select equipment type</option>
                        {EQUIPMENT_OPTIONS.map((_equipment) => {

                            return (
                                <option key={`_equipment_${_equipment}`} value={_equipment}>{_equipment}</option>
                            )
                        })}
                    </select>
                </Field>

                <Field label="Amount to carrier" required error={loadFieldError('amount_to_carrier')}>
                    <input type="number" min="0" step="0.01" name="amount_to_carrier" className={loadFieldCls('amount_to_carrier')} placeholder="0.00" value={loadForm.values.amount_to_carrier} onChange={loadForm.handleChange} onBlur={loadForm.handleBlur} />
                </Field>

                <RateConfirmationDropzone label="Rate confirmation / agreement" hint="PDF or Word document" name="rate_confirmation" form={loadForm} />

                {loadErrorMessage !== '' &&

                    <div className="col-span-2">
                        <p className="text-xs text-red-600">{loadErrorMessage}</p>
                    </div>
                }

                <div className="col-span-2 flex items-center justify-end mt-2">
                    <Button variant="contained" size="small" loading={submittingLoad} onClick={() => {

                        loadForm.handleSubmit()
                    }}>Continue</Button>
                </div>
            </div>
        </Card>
    );
}
