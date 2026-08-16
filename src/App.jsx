import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import Dashboard from './pages/app/Dashboard'
import TrackShipmentStep1 from './pages/app/trackshipment/Step1'
import TrackShipmentStep2 from './pages/app/trackshipment/Step2'
import SearchVet from './pages/app/SearchVet/SearchVet'
import RiskAlerts from './pages/app/riskalert/RiskAlerts'
import LoadSearch from './pages/app/loadsearch/LoadSearch'
import CarrierSearch from './pages/app/carriers/CarrierSearch'
import CarrierProfile from './pages/app/carriers/CarrierProfile'
import ConnectedCarriers from './pages/app/carriers/ConnectedCarriers'

import UsersList from './pages/app/users/UsersList'

import ControlTowerList from './pages/app/control_tower/ControlTowerList'
import ControlTowerShipment from './pages/app/control_tower/ControlTowerShipment'


import Subscription from './pages/app/subscription/Subscription'

import AppHeader from './components/AppHeader';
import RouteGuard from './RouteGuard'
import ShortlistedCarriers from './pages/app/profile/ShortlistedCarriers'

import { ToastContainer } from './components/ui/Toaster'
import './App.css'
import ProfileUpdate from './pages/app/profile/ProfileUpdate'
import CarrierSettings from './pages/app/carrier-settings/CarrierSettings'
import CarrierQuestions from './pages/app/carrier-questions/CarrierQuestion'
import ScoringWeights from './pages/app/scoringweight/ScoringWeight'

import CarrierOnboard from './pages/app/connect'
import CarrierNoData from './pages/app/connect/CarrierNoData'
import EmailApproval from './pages/app/connect/EmailApproval'

/*
DTPay
*/
import DtPayFundingControl from './pages/app/DtPay/profile/DtPayFundingControl';

import PaymentsDashbaord from './pages/app/DtPay/PaymentsDashbaord';
import PaymentInit from './pages/app/DtPay/payment-flow/PaymentInit';

import PaymentAuto from './pages/app/DtPay/payment-flow/Auto/PaymentAuto';
import PaymentManual from './pages/app/DtPay/payment-flow/Manual/PaymentManual';

import DtPayTransactions from './pages/app/DtPay/transactions/DtPayTransactions';
import DtPayTransactionView from './pages/app/DtPay/transactions/DtPayTransactionView';

import RaiseDispute from './pages/app/DtPay/dispute/RaiseDispute';

/*
DTPay Guest Pay
*/
import DtPayGuestPay from 'pages/app/DtPayGuestPay';

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <RouteGuard>
        <AppHeader /> 

        <div
          className="min-h-screen"
          style={{
            background:  "linear-gradient(180deg, #F5F2E9 0%, #F8F7F4 30%, #FBFBF8 100%)",  }}
        >
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Carrier onboarding. Public — reached from the invitation email,
                by a carrier who has no account here. Authorised by the token in
                the URL, not by a session. */}
            <Route path="/carrier/connect/:token" element={<CarrierOnboard />} />
            <Route path="/carrier/invalid-access" element={<CarrierNoData />} />
            <Route path="/carrier/email-approval" element={<EmailApproval />} />

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trackshipment/step1" element={<TrackShipmentStep1 />} />
            <Route path="/trackshipment/step2" element={<TrackShipmentStep2 />} />
            <Route path="/load-search" element={<LoadSearch/>}/>
            <Route path="/search-vet" element={<SearchVet/>}/>
            <Route path ="/risk-alerts" element={<RiskAlerts/>}/>
            <Route path="/users" element={<UsersList />} />
            <Route path="/profile" element={<ProfileUpdate/>} />
            <Route path ="/settings/carrier" element={<CarrierSettings/>} />
            <Route path="/subscribe" element={<Subscription />} />
            <Route path ="/carrier-questions" element={<CarrierQuestions />}/>

            <Route path="/control-tower" element={<ControlTowerList />} />
            <Route path="/shipment/:row_id" element={<ControlTowerShipment />} />
            <Route path ="/profile/carriers/shortlisted" element={<ShortlistedCarriers />}/>

            {/* The header's Carriers link points here; before this it fell
                through to the catch-all and bounced back to login. */}
            <Route path="/carriers" element={<ConnectedCarriers />} />
            <Route path="/carriers/search" element={<CarrierSearch />} />
            <Route path="/carriers/:row_id" element={<CarrierProfile />} />

            <Route path ="/profile/scoring-weights" element={<ScoringWeights />}/>

            {/* DTPay Payments module */}
            <Route exact={true} path='/dt-pay/funding-controls' element={<DtPayFundingControl />} />

            <Route exact={true} path='/dt-pay' element={<PaymentsDashbaord />} />
            
            <Route exact={true} path='/dt-pay/init' element={<PaymentInit />} />
            
            <Route exact={true} path='/dt-pay/payment/auto' element={<PaymentAuto />}>
                <Route exact={true} path=':step' element={<PaymentAuto />}>
                    <Route exact={true} path=':transaction_id' element={<PaymentAuto />} />
                </Route>
            </Route>

            <Route exact={true} path='/dt-pay/payment/manual' element={<PaymentManual />}>
                <Route exact={true} path=':step' element={<PaymentManual />}>
                    <Route exact={true} path=':transaction_id' element={<PaymentManual />} />
                </Route>
            </Route>

            <Route exact={true} path='/dt-pay/transactions' element={<DtPayTransactions />} />

            <Route exact={true} path='/dt-pay/transactions/view' element={<DtPayTransactionView />}>
                <Route exact={true} path=':transaction_id' element={<DtPayTransactionView />} />
            </Route>

            <Route exact={true} path='/dt-pay/raise-a-dispute' element={<RaiseDispute />}>
                <Route exact={true} path=':transaction_id' element={<RaiseDispute />} />
            </Route>

            <Route exact={true} path='/guest-pay' element={<DtPayGuestPay />}>
                <Route exact={true} path=':step' element={<DtPayGuestPay />}>
                    <Route exact={true} path=':transaction_id' element={<DtPayGuestPay />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </RouteGuard>
    </BrowserRouter>
  );
}
export default App
