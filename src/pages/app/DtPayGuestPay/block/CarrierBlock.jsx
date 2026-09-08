
import React, { useState, useRef, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import Search from '@mui/icons-material/Search'
import LocalShippingOutlined from '@mui/icons-material/LocalShippingOutlined'
import ArrowRightAlt from '@mui/icons-material/ArrowRightAlt'

import Button from '@mui/material/Button';

import { Card, inputCls, Field } from '../../DtPay/components/ui';

import { API_BASE } from 'lib/api';

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

export default function CarrierBlock() {

    const navigate = useNavigate();

    const [carrierSearch, setCarrierSearch] = useState('');
    const [searchType, setSearchType] = useState('dot');

    const [activeTab, setActiveTab] = useState('dot');

    const [searchingCarrier, setSearchingCarrier] = useState(false);
    const [carrierSearchError, setCarrierSearchError] = useState('');
    const [carrierResults, setCarrierResults] = useState([]);
    const [selectedCarrier, setSelectedCarrier] = useState(null);
    const [updatingCarrier, setUpdatingCarrier] = useState(false);

    const [initingTransaction, setInitingTransaction] = useState(false)

    const actionsRef = useRef(null);

    const activeTabData = SEARCH_TABS.find(t => t.key === activeTab) || SEARCH_TABS[0];

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

        fetch(`${API_BASE}/guest-pay/carrier/search?${params.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        })
            .then(function (response) {

                return response.json();
            })
            .then(function (res) {

                if(res?.total && res?.total > 0){

                    setCarrierResults(Array.isArray(res.data) ? res.data : [] || []);
                }else{

                    setCarrierResults([]);
                    setCarrierSearchError(res?.message || 'Carrier not found.');
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

    function updateCarrier(){

        setInitingTransaction(true);

        fetch(`${API_BASE}/guest-pay/payment/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ carrier_id: selectedCarrier.dot_number }),
        })
            .then(function (response) {

                return response.json();
            })
            .then(function (data) {

                if(data?.status){

                    navigate(`/guest-pay/load/${data.row_id}`)
                }

                setInitingTransaction(false);
            })
            .catch(function () {

                setInitingTransaction(false);
            });
    }

    return (
        <Card className="p-9">
            <h1 className="text-xl text-center font-bold text-gray-900">Pay any carrier — no account needed</h1>
          
            <p className="text-center text-gray-500 text-[13px] my-1.5 mb-5">Funds are held until delivery is proven, then released. Used by brokers and shippers without a DT Pay subscription.</p>
          
            <Field label="Carrier MC or DOT number" required>

                <div
                    role="tablist"
                    aria-label="Search by"
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start',
                        gap: 6,
                        marginBottom: 16,
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
                                    padding: '2px 16px',
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

                    <Button size="small" loading={searchingCarrier} disabled={searchingCarrier} onClick={() => {
                        
                        searchCarrier()
                    }} startIcon={<Search size={14} />}>
                        <span>{searchingCarrier ? 'Finding...' : 'Find'}</span>
                    </Button>
                </div>

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
                                    actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
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

                <div ref={actionsRef} className='w-full flex pb-9'>
                
                    {selectedCarrier &&
                
                        <Button endIcon={<ArrowRightAlt />} className="flex items-center justify-center gap-2 rounded-xl! border border-slate-200 bg-blue-500! cursor-pointer px-6! py-2! text-[13px]! capitalize! font-semibold text-white! shadow-sm! hover:bg-blue-700! transition disabled:bg-gray-300! w-full" loading={initingTransaction} onClick={() => updateCarrier()}>
                            Continue
                        </Button>
                    }
                </div>
            </Field>
        </Card>
    );
}
