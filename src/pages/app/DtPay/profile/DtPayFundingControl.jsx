import { useEffect, useRef, useState } from "react";

import Grid from '@mui/material/Grid';

import Modal from '@mui/material/Modal';

import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined'
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined'

import Button from "@mui/material/Button";

import NoData from "components/NoData";

import Loader from "components/Loader";

import { apiFetch } from 'lib/api';

import {loadStripe} from "@stripe/stripe-js";

import {
    Elements,
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements
} from "@stripe/react-stripe-js";

import { ScrId, PH, Card } from '../components/ui';

const stripePromise = loadStripe('pk_test_51TP2bME8lGA6s4DIvkKRuCU1crMqEo0NgiAfoWYTlyuLUNAlvIh6Zhqj8a3iRqLwWRlj0JO7Vfq8lXUzcEh021yQ00E3ArEngX');

export default function DtPayFundingControl() {

    const [clientSecret, setClientSecret] = useState(null);

    const [showAddCard, setShowAddCard] = useState(false);

    const [loading, setLoading] = useState(false);
    const [initing, setIniting] = useState(false);

    const [methods, setMethods] = useState(false);
    const [no_methods, setNoMethods] = useState(false);

    const [success_message, setSuccessMessage] = useState("");
    const [count, setCount] = useState(0);

    const [user, setUser] = useState(null);

    useEffect(() => {

        async function init() {

            const storedUser = localStorage.getItem('crm_user');

            if(storedUser){

                setUser(JSON.parse(storedUser));
            }
        }

        init();
        fetchMethods();

    }, []);

    function fetchMethods(){

        setIniting(true);

        apiFetch('/dt-pay/profile/init', { method: 'POST' })
            .then((data) => {

                if (data?.status) {
                    
                    setMethods(data.sources)        
                    
                    if(data.sources.length <= 0){

                        setNoMethods(true)
                    }else{

                        setNoMethods(false)
                    }
                }

                setIniting(false);
            })
            .catch((err) => console.error('Control tower init error:', err));        
    }

    async function openAddCard(){

        setLoading(true)

        apiFetch('/dt-pay/profile/methods/attach', { method: 'POST', body: JSON.stringify({ type: 'card' }) })
            .then((data) => {

                if(data.status){

                    setClientSecret(data.clientSecret);
                    setShowAddCard(true);
                }

                setLoading(false)
            })
            .catch((err) => console.error('Control tower init error:', err));
    }

    async function openAddBank(){

        setLoading(true)

        apiFetch('/dt-pay/profile/methods/attach', { method: 'POST', body: JSON.stringify({ type: 'bank' }) })
            .then(async function (data) {

                if(data.status){

                    setLoading(false)
                    await connectBank(data.clientSecret);
                }

                setLoading(false)
            })
            .catch((err) => console.error('Control tower init error:', err));

        // Api.post('dt-pay/profile/methods/attach', {type: 'bank'}, async function (data) {

        //     if(data.status){

        //         setLoading(false)
        //         await connectBank(data.clientSecret);
        //     }
        // });
    }

    async function connectBank(clientSecret){

        const stripe = await stripePromise;

        setLoading(true)

        const {setupIntent, error} = await stripe.collectBankAccountForSetup({
            clientSecret,
            params: {
                payment_method_type: "us_bank_account",
                payment_method_data: {
                    billing_details: {
                        name: `${user.first_name} ${user.last_name}`,
                        email: user.email,
                    }
                }
            }
        });

        const {setupIntent: confirmedSetupIntent, error: confirmError} = await stripe.confirmUsBankAccountSetup(
            clientSecret
        );

        if(confirmError){

            alert(confirmError.message);
            return;
        }

        // if(error){

        //     alert(error.message);
        //     return;
        // }

        if(confirmedSetupIntent.status === "succeeded" || confirmedSetupIntent.status === 'processing'){

            setLoading(false)
            fetchMethods()
            setSuccessMessage("Bank Account Added Successfully")
        }
    }

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14">
            
            <Grid container spacing={3} className="pt-9">

                <Grid size={12}>

                    <ScrId id="B-12" name="Funding sources & controls" />
                    <PH
                        crumb={<><b>{user && (`${user.first_name} ${user.last_name}`)}</b> → Settings</>}
                        title="Funding & controls"
                    />
                </Grid>

                <Grid size={6}>

                    <Card
                        title="Funding sources"
                        titleClass="text-gray-800"
                    >

                        {methods && methods.map((_method) => {

                            return (
                                <div key={`method_${_method.key}`} className="border-b border-gray-200 pb-2 mb-2">
                                    <div className="flex items-center">
                                        <span className="bg-blue-50 p-2 rounded-lg flex items-center justify-center">
                                            {_method.type === 'card' &&
                                            
                                                <CreditCardOutlined className="text-blue-800" />
                                            }

                                            {_method.type === 'bank' &&
                                            
                                                <AccountBalanceOutlined className="text-blue-800" />
                                            }
                                        </span>

                                        <div className="ml-3 flex flex-col">
                                            <strong className="text-xs text-gray-800">{_method.label}</strong>
                                            <span className="text-xs text-gray-600">{_method.sub_label}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {no_methods &&
                        
                            <NoData size="small" hide_image={true}>
                                <div className="bg-blue-50 flex p-9 items-center rounded-2xl">
                                    <CreditCardOutlined className="text-blue-200" style={{fontSize:60}} />
                                    <span className="text-7xl text-blue-100 mx-2">/</span>
                                    <AccountBalanceOutlined className="text-blue-200" style={{fontSize:60}} />
                                </div>
                                <p className="text-md text-gray-400 font-semibold mt-4">Card or bank account not connected</p>
                            </NoData>
                        }

                        {initing &&
                        
                            <Stack spacing={2}>
                                <Skeleton width={'100%'} height={50} variant="rounded" />
                                <Skeleton width={'100%'} height={50} variant="rounded" />
                                <Skeleton width={'100%'} height={50} variant="rounded" />
                                <Skeleton width={'100%'} height={50} variant="rounded" />
                                <Skeleton width={'100%'} height={50} variant="rounded" />
                            </Stack>
                        }

                        {!initing &&
                        
                            <div className="mt-5 pt-5 gap-5 flex items-end justify-end">
                                <Button startIcon={<CreditCardOutlined />} size="small" variant="outlined" loading={loading} onClick={openAddCard}>
                                    Add Card
                                </Button>

                                <Button startIcon={<AccountBalanceOutlined />} size="small" variant="outlined" loading={loading} onClick={openAddBank}>
                                    Link Bank
                                </Button>
                            </div>
                        }
                    </Card>
                </Grid>
            </Grid>

            {showAddCard && clientSecret &&

                <Modal
                    open={showAddCard}
                    onClose={() => {

                        setShowAddCard(false);

                        setClientSecret(null);
                    }}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <div className="bg-white border-4 border-blue-500/[.5] w-[500px] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-lg">

                        <div className="border-b border-gray-300 p-2 px-4 flex items-center">
                            <div className="bg-blue-50 p-2 rounded-lg flex items-center justify-center">
                                <CreditCardOutlined className="text-blue-400" />
                            </div>
                            <strong className="text-blue-700 text-xs ml-3">Add New Card</strong>
                        </div>

                        <div className="p-4">
                            <Elements
                                stripe={stripePromise}
                                options={{
                                    clientSecret
                                }}
                            >
                                <AddCardForm
                                    clientSecret={clientSecret}
                                    close={(message) => {

                                        setShowAddCard(false);
                                        setClientSecret(null);
                                        fetchMethods()

                                        setSuccessMessage(message)
                                    }}
                                />
                            </Elements>
                        </div>
                    </div>
                </Modal>
            }

            <Snackbar
                open={success_message !== '' ? true : false}
                autoHideDuration={6000}
                onClose={() => {

                    setSuccessMessage('')
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
            >
                <Alert severity="success" variant="filled">{success_message}</Alert>
            </Snackbar>
        </div>
    );
}

function AddCardForm({clientSecret, close}){

    const stripe = useStripe();

    const elements = useElements();

    const [saving, setSaving] = useState(false);

    async function save(e){

        e.preventDefault();

        if(!stripe || !elements){

            return;
        }

        setSaving(true);

        const card = elements.getElement(CardNumberElement);

        const {error, setupIntent} = await stripe.confirmCardSetup(
            clientSecret,
            {
                payment_method: {
                    card
                }
            }
        );

        setSaving(false);

        if(error){
            alert(error.message);
            return;
        }

        if(setupIntent.status === "succeeded"){
            
            close("Card added successfully.");
        }
    }

    return(

        <form onSubmit={save}>

            <div>
                <label className="text-blue-800 font-semibold text-xs">Card Number</label>
                <div className="border p-2 border-gray-300 rounded-lg">
                    <div className="stripe-input">
                        <CardNumberElement
                            options={{
                                disableLink: true
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 mt-5 gap-6">

                <div className="col-span-1">
                    <label className="text-blue-800 font-semibold text-xs">Expiry</label>

                    <div className="border p-2 border-gray-300 rounded-lg">
                        <div className="stripe-input">
                            <CardExpiryElement />
                        </div>
                    </div>
                </div>

                <div className="col-span-1">

                    <label className="text-blue-800 font-semibold text-xs">CVC</label>

                    <div className="border p-2 border-gray-300 rounded-lg">
                        <div className="stripe-input">
                            <CardCvcElement />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-end justify-end mt-9 gap-3">
                <Button size="small" onClick={() => {

                    close();
                }}>Cancel</Button>
                <Button
                    type="submit"
                    disabled={saving}
                    loading={saving}
                    variant="contained"
                    size="small"
                >
                    {saving ? "Saving..." : "Save Card"}
                </Button>
            </div>
        </form>

    );

}