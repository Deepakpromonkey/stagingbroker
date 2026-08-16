import { useEffect, useState, useCallback } from "react";
import { Link } from 'react-router-dom';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';

import Add from '@mui/icons-material/Add'
import LockOutlined from '@mui/icons-material/LockOutlined'
import CreditCard from '@mui/icons-material/CreditCard'
import Payments from '@mui/icons-material/Payments'
import Error from '@mui/icons-material/Error'
import Done from '@mui/icons-material/Done'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import WarningOutlined from '@mui/icons-material/WarningOutlined'

import { ScrId, PH, Kpi } from './components/ui';

import { apiFetch } from 'lib/api';

export default function PaymentsDashbaord() {

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [count, setCount] = useState(0);

    const [user, setUser] = useState(null);

    const [stats, setStats] = useState([
        {key: 'hold', amount: '$0.00', label: 'In payment hold', text: 'across 3 payments', icon: <LockOutlined size={20} className="text-purple-500" />, bg: "bg-purple-50"},
        {key: 'ready', amount: '$0.00', label: 'Ready to release', text: 'POD verified — action needed', icon: <Done size={20} className="text-green-500" />, bg: "bg-green-50"},
        {key: 'released', amount: '$0.00', label: 'Released · 90d', text: '412 payments', icon: <LocalShippingOutlined size={20} className="text-blue-500" />, bg: "bg-blue-50"},
        {key: 'dispute', amount: 0, label: 'In dispute', text: 'funds re-held pending review', icon: <WarningOutlined size={20} className="text-red-500" />, bg: "bg-red-50"}
    ]);

    useEffect(() => {

        async function init() {
        
            setLoading(true);

            const storedUser = localStorage.getItem(import.meta.env.VITE_ACCOUNT_USER);

            if(storedUser){

                setUser(JSON.parse(storedUser));
            }
        }

        init();
        initStats();

    }, []);

    function initStats(){
    
        apiFetch('/dt-pay/stats', { method: 'POST' })
            .then((data) => {

                const _data = data.data;

                const _amounts = {
                    hold: _data.hold_sum,
                    ready: _data.ready_to_release_sum,
                    released: _data.released_sum,
                    dispute: _data.disputes_count
                };

                setStats((prev) => prev.map((_stat) => ({ ..._stat, amount: _amounts[_stat.key] })));

            })
            .catch((err) => console.error('Data init error:', err));
    }

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">
            
            <Grid container spacing={3} className="pt-9">

                <Grid size={6}>

                    <ScrId id="B-01" name="Broker dashboard" />
                    <PH
                        crumb={<><b>{user && (`${user.first_name} ${user.last_name}`)}</b> → DT Pay</>}
                        title="Payments"
                        desc="Pay carriers from your bank (ACH, free) or card (2.9%). Funds sit in a payment hold with our licensed payment partner until POD is verified — then release."
                    />
                </Grid>
                <Grid size={6}>
                    <div className="flex items-end justify-end">
                        <Link to={`/dt-pay/init`} className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-blue-600 px-6 py-4 text-[15px] font-semibold text-white shadow-sm hover:bg-white hover:text-blue-700 transition">
                            <Add />
                            Pay a carrier
                        </Link>
                    </div>
                </Grid>

                <Grid size={12}>

                    <div className="flex gap-5 items-center justify-between">

                        {stats.map((_stat) => {

                            return <Kpi key={`stats_${_stat.key}`} val={_stat.amount} lbl={_stat.label} sub={_stat.text} icon={_stat.icon} bg={_stat.bg} fg={_stat.fg} />
                        })}
                    </div>
                </Grid>

                <Grid size={12}>

                    <div className="flex gap-4">
                        <Link to={`/dt-pay/funding-controls`} className="flex-1 mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-6 text-[15px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                            <CreditCard />
                            Funding & Controls
                        </Link>
                        <Link to={`/dt-pay/transactions`} className="flex-1 mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-6 text-[15px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                            <Payments />
                            Transactions
                        </Link>
                        <Link to={`/dt-pay/raise-a-dispute`} className="flex-1 mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-6 text-[15px] font-semibold text-slate-900 shadow-sm hover:bg-blue-500 hover:text-white transition">
                            <Error />
                            Raise a dispute
                        </Link>
                    </div>
                </Grid>
            </Grid>
        </div>
    );

}