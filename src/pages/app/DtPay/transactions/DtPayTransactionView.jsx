import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Grid from '@mui/material/Grid';

import Skeleton from '@mui/material/Skeleton';

import Button from '@mui/material/Button';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import Popover from '@mui/material/Popover';

import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import Done from '@mui/icons-material/Done'

import ReportOutlined from '@mui/icons-material/ReportOutlined'
import LockOutlined from '@mui/icons-material/LockOutlined'
import ReplayOutlined from '@mui/icons-material/ReplayOutlined'
import FlagOutlined from '@mui/icons-material/FlagOutlined'

import { apiFetch } from 'lib/api';

import { ScrId, PH, Rail, Card, Tml, Te, Sum, SumRow } from '../components/ui';

export default function DtPayTransactionView() {

    const navigate = useNavigate();
    const { transaction_id } = useParams();
    
    const [initing, setIniting] = useState(true);
    const [no_data, setNoData] = useState(false);

    const [statuses, setStatuses] = useState([]);
    const [transaction, setTransaction] = useState([]);
    const [amounts, setAmounts] = useState([]);
    const [progress, setProgress] = useState([]);

    const [selectedPaymentSource, setSelectedPaymentSource] = useState('card');

    const [appliedFilters, setAppliedFilters] = useState({});
    
    const [acting, setActing] = useState(false);

    const [ele, setEle] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    const [error_message, setErrorMessage] = useState('');
    const [success_message, setSuccessMessage] = useState('');

    useEffect(function () {

        initTransaction()

    }, [appliedFilters]);

    function initTransaction(){

        setIniting(true);

        apiFetch('/dt-pay/transactions/load', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){

                    setTransaction(data.transaction);
                    setAmounts(data.amounts)
                    setProgress(data.progress)
                }

                setIniting(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function refundPayment(){

        setActing(true);

        apiFetch('/dt-pay/transactions/refund', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){

                    setTransaction(data.transaction);
                    setSuccessMessage(data.message)
                }else{

                    setErrorMessage(data.message)
                }

                setActing(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function holdPayment(){

        setActing(true);

        apiFetch('/dt-pay/transactions/hold', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){

                    setTransaction(data.transaction);
                    setSuccessMessage(data.message)
                }else{

                    setErrorMessage(data.message)
                }

                setActing(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    function openConfirm(e, message, action){

        setAlertMessage(message)
        setConfirmAction(() => action)
        setEle(e.currentTarget)
    }

    function releasePayment(){

        setActing(true);

        apiFetch('/dt-pay/transactions/release', { method: 'POST', body: JSON.stringify({transaction_id: transaction_id}) })
            .then((data) => {

                if(data.status){

                    setTransaction(data.transaction);
                    setSuccessMessage(data.message)
                }else{

                    setErrorMessage(data.message)
                }

                setActing(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">
            
            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>

                    <ScrId id="B-09" name="Transactions" />

                    <PH
                        back="/dt-pay/transactions"
                        crumb={<>Transactions</>}
                        title="Transaction history"
                    />
                </Grid>
                <Grid size={12}>

                    {(!initing && transaction) &&
                    
                        <Grid container spacing={3}>

                            <Grid size={12}>
                                
                                <Rail state={transaction.state} />
                            </Grid>
                            <Grid size={8}>
                                <Card
                                    title="Event Log"
                                    titleClass="text-gray-900"
                                >
                                    <div className="text-left p-5">
                                        <Tml>

                                            {progress.map((_step, index) => {

                                                return <Te key={`step_${index}`} tone={_step?.state && _step.state === 'active' ? 'g' : ''} date={_step.step} ev={_step.label} meta={_step.text} />
                                            })}
                                        </Tml>
                                    </div>
                                </Card>

                                {transaction.has_files &&
                                
                                    <div className="mt-6 pb-9">
                                        <Card
                                            title="Documents"
                                            titleClass="text-gray-900"
                                            bodyClass="!p-0"
                                        >
                                            {transaction.rate_confirmation_url &&
                                            
                                                <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3 p-2 px-4">
                                                    <div className="flex items-center">
                                                        <span className="bg-blue-50 p-3 rounded-lg flex items-center justify-center">
                                                            <DescriptionOutlined className="text-blue-700" style={{fontSize:18}} />
                                                        </span>
                                                        <strong className="ml-2 text-sm text-gray-600">Rate Confirmation</strong>
                                                    </div>
                                                    <a href={transaction.rate_confirmation_url} target="_blank" className="text-blue-600 font-semibold text-xs p-2 px-9 hover:bg-blue-50 rounded-lg">View</a>
                                                </div>
                                            }

                                            {transaction.pod_url &&
                                            
                                                <div className="flex items-center justify-between pb-2 mb-3 p-2 px-4">
                                                    <div className="flex items-center">
                                                        <span className="bg-blue-50 p-3 rounded-lg flex items-center justify-center">
                                                            <DescriptionOutlined className="text-blue-700" style={{fontSize:18}} />
                                                        </span>
                                                        <strong className="ml-2 text-sm text-gray-600">Proof of delivery</strong>
                                                    </div>
                                                    <a href={transaction.pod_url} target="_blank" className="text-blue-600 font-semibold text-xs p-2 px-9 hover:bg-blue-50 rounded-lg">View</a>
                                                </div>
                                            }
                                        </Card>
                                    </div>
                                }
                            </Grid>
                            <Grid size={4}>

                                <Card
                                    title="Actions"
                                    titleClass="text-gray-900"
                                >
                                    <div>

                                        {transaction.stage !== 'disputed'
                                            ?
                                                <>
                                                    {transaction.status !== 'refund' &&

                                                        <>
                                                            
                                                            <Button variant="contained" sx={{width:'100%'}} disabled={acting} className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300!" onClick={(e) => {

                                                                openConfirm(e, 'Do you really want to release to the carrier', releasePayment)
                                                            }}>
                                                                <div>
                                                                    <Done />
                                                                    <span>Release {amounts.carrier_receives_formatted} to carrier</span>
                                                                </div>
                                                            </Button>

                                                            <div className="flex justify-evenly items-center gap-3 mt-3">

                                                                {transaction.status !== 'hold' &&
                                                                
                                                                    <Button startIcon={<LockOutlined />} variant="outlined" size="small" sx={{borderRadius:2, flex:1, justifyContent:'flex-start', padding:'6px 10px', border:'1px solid rgba(0,0,0,.15)', fontWeight:'bold'}} disabled={acting} onClick={(e) => {

                                                                        openConfirm(e, 'Do you really want to hold this payment', holdPayment)
                                                                    }}>Hold</Button>
                                                                }

                                                                <Button startIcon={<ReplayOutlined />} variant="outlined" size="small" sx={{borderRadius:2, flex:1, justifyContent:'flex-start', padding:'6px 10px', border:'1px solid rgba(0,0,0,.15)', color:'#cd2222', fontWeight:'bold'}} disabled={acting} onClick={(e) => {

                                                                    openConfirm(e, 'Do you really want to refund this payment', refundPayment)
                                                                }}>Refund</Button>

                                                                <Button startIcon={<FlagOutlined />} variant="outlined" size="small" sx={{borderRadius:2, flex:1, justifyContent:'flex-start', padding:'6px 10px', border:'1px solid rgba(0,0,0,.15)', fontWeight:'bold'}} disabled={acting} onClick={(e) => {

                                                                    openConfirm(e, 'Do you really want to raise a dispute for this transaction', () => navigate(`/dt-pay/raise-a-dispute/${transaction.uuid}`))
                                                                }}>Dispute</Button>
                                                            </div>
                                                        </>
                                                    }
                                                </>
                                            :
                                                <div className="flex items-center justify-center flex-col py-5">
                                                    <ReportOutlined style={{fontSize:50}} className="text-red-300" />
                                                    <strong className="text-red-600">Disputed payment</strong>

                                                    <p className="text-sm text-gray-500 mt-2">This transaction is under review!</p>
                                                </div>
                                        }
                                    </div>
                                </Card>
                                <div className="mt-3">
                                    <Card
                                        title="Quote"
                                        titleClass="text-gray-900"
                                    >
                                        <Sum className="my-2">
                                            <SumRow>
                                                <span>Carrier rate</span><span className="text-gray-800">{amounts.carrier_rate_formatted}</span>
                                            </SumRow>

                                            {selectedPaymentSource === 'card'
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
                                    </Card>
                                </div>
                            </Grid>
                        </Grid>
                    }

                    {initing &&
                    
                        <Grid container spacing={5}>

                            <Grid size={12}>
                                <Skeleton width="100%" height={80} variant='rounded' />
                            </Grid>
                            <Grid size={8}>
                                <Skeleton width="100%" height={500} variant='rounded' />
                            </Grid>
                            <Grid size={4}>
                                <Skeleton width="100%" height={500} variant='rounded' />
                            </Grid>
                        </Grid>
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

            <Popover
                open={ele !== null}
                anchorEl={ele}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
            >
                <div className="w-[400px] rounded-lg">
                    <div className="p-3 border-b border-gray-300 flex gap-1">
                        <ReportOutlined className="text-red-800" style={{fontSize:16}} />
                        <strong className="text-red-600 text-sm">Alert</strong>
                    </div>
                    <div className="p-6">
                        <p className="text-sm">{alertMessage}</p>
                    </div>
                    <div className="p-3 border-t border-gray-300 flex gap-2 items-center justify-end">
                        <Button size="small" className="flex items-center justify-center gap-2 rounded-full! border! border-gray-300! bg-white! cursor-pointer px-6! py-1! text-[12px]! capitalize! font-semibold text-gray-600! shadow-none! transition disabled:bg-gray-300!" onClick={() => {

                            setEle(null)
                            setConfirmAction(null)
                        }}>No</Button>

                        <Button size="small" className="flex items-center justify-center gap-2 rounded-full! border-none! bg-blue-500! cursor-pointer px-6! py-1! text-[12px]! capitalize! font-semibold text-white! shadow-none! hover:bg-blue-700! transition disabled:bg-gray-300!" onClick={() => {

                            if(confirmAction) confirmAction()

                            setEle(null)
                            setConfirmAction(null)
                        }}>Yes</Button>
                    </div>
                </div>
            </Popover>
        </div>
    )
}