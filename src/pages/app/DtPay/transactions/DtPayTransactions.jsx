import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Grid from '@mui/material/Grid';

import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

import Chip from '@mui/material/Chip';

import NoData from 'components/NoData';

import { apiFetch } from 'lib/api';

import { ScrId, PH, Card } from '../components/ui';

export default function DtPayTransactions() {

    const navigate = useNavigate();
    
    const [initing, setIniting] = useState(false);
    const [loading, setLoading] = useState(false);

    const [no_data, setNoData] = useState(false);

    const [statuses, setStatuses] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [appliedFilters, setAppliedFilters] = useState({status: 'all'});

    function initTransactions(_loading, _filters){

        if(_loading){

            setLoading(true)
        }else{

            setIniting(true);
        }

        apiFetch('/dt-pay/transactions', { method: 'POST', body: JSON.stringify(_filters || appliedFilters) })
            .then((data) => {

                if(data.status){

                    setStatuses(data.statuses)
                    setTransactions(data.transactions)

                    if(data.transactions.length <= 0){

                        setNoData(true)
                    }else{

                        setNoData(false)
                    }
                }

                setIniting(false);
                setLoading(false);
            })
            .catch((err) => console.error('Loads init error:', err));
    }

    useEffect(function () {

        initTransactions(false)

    }, []);

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">
            
            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>

                    <ScrId id="B-09" name="Transactions" />

                    <PH
                        crumb={<>Transactions</>}
                        title="Transaction history"
                        back="/dt-pay"
                    />
                </Grid>
                <Grid size={12}>
                    
                    <Card
                        title="All Payments"
                        titleClass="text-gray-900"
                        bodyClass="!p-0"
                        loading={loading}
                        tilleAction={
                            
                            <div
                                role="tablist"
                                aria-label="Search by"
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'flex-start',
                                    gap: 6,
                                    marginBottom: 2,
                                    marginTop: 2,
                                }}
                            >
                                <button role="tab" aria-selected={appliedFilters.status === 'all'} onClick={() => {

                                    const newFilters = { ...appliedFilters, status: 'all' };

                                    setAppliedFilters(newFilters);
                                    initTransactions(true, newFilters);
                                }} style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: '0.04em',
                                        textTransform: 'capitalize',
                                        padding: '8px 16px',
                                        borderRadius: 999,
                                        border: appliedFilters.status === 'all' ? '1px solid #4F8EF7' : '1px solid rgba(255,255,255,0.12)',
                                        backgroundColor: appliedFilters.status === 'all' ? 'rgba(79, 142, 247, 0.16)' : 'rgba(0,0,0,.1)',
                                        color: appliedFilters.status === 'all' ? '#1957bb' : 'rgba(0,0,0,.6)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    All
                                </button>

                                {statuses.map((_status) => {

                                    const active = appliedFilters.status === _status.key;

                                    return (
                                        <button
                                            key={`status_${_status.key}`}
                                            role="tab"
                                            aria-selected={active}
                                            onClick={() => {

                                                const newFilters = { ...appliedFilters, status: _status.key };

                                                setAppliedFilters(newFilters);
                                                initTransactions(true, newFilters);
                                            }}
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                letterSpacing: '0.04em',
                                                textTransform: 'capitalize',
                                                padding: '8px 16px',
                                                borderRadius: 999,
                                                border: active ? '1px solid #4F8EF7' : '1px solid rgba(255,255,255,0.12)',
                                                backgroundColor: active ? 'rgba(79, 142, 247, 0.16)' : 'rgba(0,0,0,.1)',
                                                color: active ? '#1957bb' : 'rgba(0,0,0,.6)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {_status.value}
                                        </button>
                                    )
                                })}
                            </div>
                        }
                    >
                        <Table size="small">
                            <TableHead>
                                <TableRow className='bg-gray-50 border-t border-gray-100'>
                                    <TableCell width="10%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>Date</span>
                                    </TableCell>
                                    <TableCell width="12%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>Load</span>
                                    </TableCell>
                                    <TableCell width="15%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>Carrier</span>
                                    </TableCell>
                                    <TableCell width="12%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>Source</span>
                                    </TableCell>
                                    <TableCell width="12%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>Funding</span>
                                    </TableCell>
                                    <TableCell width="8%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>Amount</span>
                                    </TableCell>
                                    <TableCell width="8%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>Fee</span>
                                    </TableCell>
                                    <TableCell width="12%">
                                        <span className='font-bold text-[11px] uppercase text-gray-400'>State</span>
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            {transactions.length > 0 &&
                            
                                <TableBody>

                                    {transactions.map((_transaction, index) => {

                                        return (

                                            <TableRow key={`_transaction_${index}`} sx={{cursor:'pointer', paddingTop:3, paddingBottom:3, borderBottom:'1px solid rgba(0,0,0,.05)', background:'#fff', '&:hover': {background:'#f0fdf4'}}} onClick={() => {

                                                navigate(`/dt-pay/transactions/view/${_transaction.uuid}`)
                                            }}>
                                                <TableCell>
                                                    <span className="text-xs text-gray-700">{_transaction.payment_date_formatted}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-700">
                                                        {_transaction.source === 'AUTO'
                                                            ?
                                                                _transaction?.shipment?.shipment_no
                                                            :
                                                                _transaction?.payment_load?.load_ref
                                                        }
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-700">{_transaction?.carrier?.legal_name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-700">{_transaction.source}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-700">{_transaction.payment_method_label}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-700">{_transaction.amount_formatted}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-gray-700">{_transaction.fee_formatted}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex">
                                                        <span className="text-xs text-gray-700 flex items-center gap-1 py-1 px-4 rounded-full" style={{backgroundColor:`${_transaction.status_bg}`}}>
                                                            <span className="w-[7px] h-[7px] rounded-full" style={{backgroundColor:`${_transaction.status_color}`}}></span>
                                                            <span className={`font-bold`} style={{color:`${_transaction.status_color}`}}>{_transaction.status_label}</span>
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            }

                            {no_data &&
                                
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={8}>
                                            <NoData message="Transactions not found!" size="small" />
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            }
                            
                        </Table>
                    </Card>

                    {initing &&
                    
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
            </Grid>
        </div>
    )
}