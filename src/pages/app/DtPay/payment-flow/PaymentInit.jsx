import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Grid from '@mui/material/Grid';

import Button from '@mui/material/Button';

import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'

import { ScrId, PH, Badge, Kpi, DevNote, Callout, Rail, Steps } from '../components/ui';

export default function PaymentInit() {

    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [count, setCount] = useState(0);

    const cards = [
        {key: 'auto', label: 'Automated load payment', text: `Pick a load generated in Dollar Traq. Carrier, amount, rate con, and POD status prefill — POD verification can auto-trigger the release.`, action_label: '2 Clicks', recommended: true, link: '/dt-pay/payment/auto/load', icon: <LocalShippingOutlined className="text-green-700" size={18} />},
        {key: 'manual', label: 'Manual load payment', text: `Enter load details yourself for freight managed outside Dollar Traq. We still verify the carrier (FMCSA + Trust Score) and hold funds until POD.`, action_label: '-2 min', recommended: false, link: '/dt-pay/payment/manual/load', icon: <DescriptionOutlined className="text-blue-700" size={18} />},
    ]

    useEffect(() => {

        init();

    }, [init]);

    function init(){

        setLoading(true);
    }

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">
            
            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>

                    <ScrId id="B-02" name="New payment — choose method" />

                    <PH
                        crumb={<><b>Pay a carrier</b> → Method</>}
                        title="How do you want to pay?"
                        desc="Automated pulls everything from a load already in Dollar Traq. Manual lets you pay against any load — even one managed outside the platform."
                    />
                </Grid>
                <Grid size={12}>
                    <div className="flex items-start justify-start mt-5">
                        
                        <div className="flex gap-4">

                            {cards.map((_card) => {

                                return (
                                    <div key={`card_${_card.key}`} className="relative transition cursor-pointer p-6 bg-white rounded-xl border-2 border-gray-400/[.5] max-w-[400px] flex flex-col items-start hover:border-blue-500/[.5] hover:shadow-sm" onClick={() => navigate(_card.link)}>
                                        
                                        {_card.key === 'auto' &&
                                        
                                            <span className="absolute right-[20px] top-[-13px] bg-red-200 px-5 rounded-lg flex py-1">
                                                <span className="text-xs uppercase font-bold text-gray-600">Beta</span>
                                            </span>
                                        }

                                        <div className="kpi">
                                            
                                            <div className="bg-green-50 w-[40px] h-[40px] flex items-center justify-center rounded-full p-4">
                                                {_card.icon}
                                            </div>
                                        </div>
                                        
                                        <h3 className="font-bold text-md">{_card.label}</h3>
                
                                        <p className="text-xs text-gray-600 mt-2">{_card.text}</p>
                
                                        <div className="mt-3">
                                            {_card.recommended
                                                ?
                                                    <span className="bg-green-200 p-3 py-[2px] rounded-full text-green-800 font-semibold text-[10px]">Recommended</span>
                                                :
                                                    <span className="bg-blue-200 p-3 py-[2px] rounded-full text-blue-800 font-semibold text-[10px]">Any Load</span>
                                            }
                                            <span className="bg-gray-200 p-3 py-[2px] rounded-full text-gray-800 font-semibold text-[10px] ml-2">{_card.action_label}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Grid>
            </Grid>
        </div>
    )
}