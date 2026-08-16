
import React, { useState, useRef, useEffect } from 'react';

import { useParams, useNavigate } from 'react-router-dom';

import { useSearchParams } from 'react-router-dom';

import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

import CarrierBlock from './block/CarrierBlock';
import LoadBlock from './block/LoadBlock';
import YouBlock from './block/YouBlock';

import { API_BASE } from 'lib/api';

export default function DtPayGuestPay() {

    const [searchParams] = useSearchParams();
    const { step, transaction_id } = useParams();

    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState('carrier');
    const [currentStepNum, setCurrentStepNum] = useState(0);

    const [initingTransaction, setInitingTransaction] = useState(true)

    const [transactionId, setTransactionId] = useState(null);
    const [transaction, setTransaction] = useState(null);

    const PILLS = {
        'carrier': {label: 'Carrier', name: 'Guest — find carrier', num: 0},
        'load': {label: 'Load', name: 'Guest — find carrier', num: 1},
        'you': {label: 'You', name: 'Guest — find carrier', num: 2},
        'method': {label: 'Method', name: 'Guest — find carrier', num: 3},
        'pay': {label: 'Pay', name: 'Guest — find carrier', num: 4},
        'track': {label: 'Track', name: 'Guest — find carrier', num: 5}
    }

    useEffect(() => {
    
        if(step){

            if(!(step in PILLS)){

                navigate('/guest-pay');
                return;
            }

            setCurrentStep(step)
            setCurrentStepNum(Object.keys(PILLS).indexOf(step))

            if(transaction_id){

                setTransactionId(transaction_id)

                loadTranaction(transaction_id);
            }else{

                setInitingTransaction(false)
            }
        }else{

            setInitingTransaction(false)
        }

    }, [step, transaction_id]);

    function loadTranaction(transaction_id){

        setInitingTransaction(true);

        fetch(`${API_BASE}/guest-pay/transaction/load`, {
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

                    setTransaction(data.transaction);
                }else{

                    navigate('/guest-pay');
                }

                setInitingTransaction(false);
            })
            .catch(function () {

                navigate('/guest-pay');
                setInitingTransaction(false);
            });
    }

    return (
        <div className="min-h-screen font-sans text-[#1A1A1A] flex flex-col items-center py-10 px-4 select-none relative bg-gray-50">

            <div className="min-h-[calc(100vh-46px)] px-5 pt-9 pb-20">
                <div className="max-w-[560px] mx-auto">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 font-bold text-base mb-3.5">
                            <div className="w-6.5 h-6.5 bg-green-500 rounded-md flex items-center justify-center text-xs font-bold text-green-950">DT</div> DT Pay
                        </div>
          
                        <div className="flex justify-center gap-1.5 mb-2">
        
                            {Object.entries(PILLS).map(([key, data]) => {
                                
                                return (
                                    <span key={key} className={'text-[11px] font-semibold px-3 py-1 rounded-full ' + (data.num < currentStepNum ? 'bg-green-100 text-green-700' : data.num === currentStepNum ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400')}>
                    
                                        {data.num < currentStepNum ? '✓ ' : ''} {data.label}
                                    </span>
                                )
                            })}
                        </div>
        
                        <div className="text-[11px] text-gray-400">

                            {/* <ScrId id={sid} name={name} /> */}
                        </div>
                    </div>

                    {initingTransaction
                        ?
                            <Stack spacing={1}>
                                <Skeleton width="100%" height={50} variant='rounded' />
                                <Skeleton width="100%" height={80} variant='rounded' />
                                <Skeleton width="100%" height={400} variant='rounded' />
                            </Stack>
                        :
                            <>
                                {currentStepNum === 0 &&
                    
                                    <CarrierBlock
                                        step={step}
                                        transaction_id={transaction_id}

                                        transaction={transaction}
                                    />
                                }

                                {currentStepNum === 1 &&
                                
                                    <LoadBlock
                                        step={step}
                                        transaction_id={transaction_id}

                                        transaction={transaction}
                                    />
                                }

                                {currentStepNum === 2 &&
                                
                                    <YouBlock
                                        step={step}
                                        transaction_id={transaction_id}

                                        transaction={transaction}
                                    />
                                }
                            </>
                    }
                </div>
            </div>

            {/* <Snackbar
                open={success_message}
                autoHideDuration={6000}
                onClose={() => {

                    setSuccessMessage(null)
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert
                    severity="success"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {success_message}
                </Alert>
            </Snackbar>

            <Snackbar
                open={error_message}
                autoHideDuration={6000}
                onClose={() => {

                    setErrorMessage(null)
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert
                    severity="error"
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {error_message}
                </Alert>
            </Snackbar> */}

            {/* <Loader loading={screen_loading} /> */}
        </div>
    );
}
