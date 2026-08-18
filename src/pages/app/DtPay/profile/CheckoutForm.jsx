import {useState} from "react";
import {
    PaymentElement,
    useStripe,
    useElements
} from "@stripe/react-stripe-js";

export default function CheckoutForm({onClose,onSaved}){

    const stripe = useStripe();

    const elements = useElements();

    const [saving,setSaving]=useState(false);

    async function submit(e){

        e.preventDefault();

        if(!stripe || !elements){
            return;
        }

        setSaving(true);

        const {error,setupIntent}=await stripe.confirmSetup({

            elements,

            redirect:"if_required"

        });

        setSaving(false);

        if(error){

            alert(error.message);

            return;
        }

        if(setupIntent.status==="succeeded"){

            onSaved();

            onClose();

        }

    }

    return(

        <form onSubmit={submit}>

            <PaymentElement/>

            <button
                disabled={saving}
                type="submit"
            >
                {saving ? "Saving..." : "Save Payment Method"}
            </button>

        </form>

    );

}