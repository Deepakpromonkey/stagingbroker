const [showModal,setShowModal]=useState(false);

function refresh(){

    loadPaymentMethods();

}

return(

    <>

        <button
            onClick={()=>setShowModal(true)}
        >
            Add Payment Method
        </button>

        <AddPaymentMethodModal

            open={showModal}

            onClose={()=>setShowModal(false)}

            onSaved={refresh}

        />

    </>

);