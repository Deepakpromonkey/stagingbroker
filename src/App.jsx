import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/auth/Login'
const Signup = lazy(() => import('./pages/auth/Signup'))
const Dashboard = lazy(() => import('./pages/app/Dashboard'))
const TrackShipmentStep1 = lazy(() => import('./pages/app/trackshipment/Step1'))
const TrackShipmentStep2 = lazy(() => import('./pages/app/trackshipment/Step2'))
const TrackShipmentEld = lazy(() => import('./pages/app/trackshipment-eld/EldShipmentForm'))
const EldShipmentDetail = lazy(() => import('./pages/app/trackshipment-eld/EldShipmentDetail'))
const PublicTracking = lazy(() => import('./pages/app/PublicTracking/PublicTracking'))
const SearchVet = lazy(() => import('./pages/app/SearchVet/SearchVet'))
const RiskAlerts = lazy(() => import('./pages/app/riskalert/RiskAlerts'))
const LoadSearch = lazy(() => import('./pages/app/loadsearch/LoadSearch'))
const CarrierSearch = lazy(() => import('./pages/app/carriers/CarrierSearch'))
const CarrierProfile = lazy(() => import('./pages/app/carriers/CarrierProfile'))
const DrayageCarrierFinder = lazy(() => import('./pages/app/drayage-carriers/DrayageCarrierFinder'))
const DtScoreHowItWorks = lazy(() => import('./pages/app/carriers/DtScoreHowItWorks'))
const ConnectedCarriers = lazy(() => import('./pages/app/carriers/ConnectedCarriers'))

const UsersList = lazy(() => import('./pages/app/users/UsersList'))

const ControlTowerList = lazy(() => import('./pages/app/control_tower/ControlTowerList'))
const ControlTowerShipment = lazy(() => import('./pages/app/control_tower/ControlTowerShipment'))


const Subscription = lazy(() => import('./pages/app/subscription/Subscription'))
const BillingSuccess = lazy(() => import('./pages/app/subscription/BillingSuccess'))
const Billing = lazy(() => import('./pages/app/billing/Billing'))

import AppHeader from './components/AppHeader';
import RouteGuard from './RouteGuard'
const ShortlistedCarriers = lazy(() => import('./pages/app/profile/ShortlistedCarriers'))
const BlockedCarriers = lazy(() => import('./pages/app/profile/BlockedCarriers'))

import { ToastContainer } from './components/ui/Toaster'
import './App.css'
const ProfileUpdate = lazy(() => import('./pages/app/profile/ProfileUpdate'))
const CarrierSettings = lazy(() => import('./pages/app/carrier-settings/CarrierSettings'))
const CarrierQuestions = lazy(() => import('./pages/app/carrier-questions/CarrierQuestion'))
const ScoringWeights = lazy(() => import('./pages/app/scoringweight/ScoringWeight'))

const AcceptInvitation = lazy(() => import('./pages/auth/AcceptInvitation'))

const CarrierOnboard = lazy(() => import('./pages/app/connect'))
const CarrierNoData = lazy(() => import('./pages/app/connect/CarrierNoData'))
const EldNotSupported = lazy(() => import('./pages/app/connect/EldNotSupported'))
const EmailApproval = lazy(() => import('./pages/app/connect/EmailApproval'))

/*
DTPay
*/
const DtPayFundingControl = lazy(() => import('./pages/app/DtPay/profile/DtPayFundingControl'))

const PaymentsDashbaord = lazy(() => import('./pages/app/DtPay/PaymentsDashbaord'))
const PaymentInit = lazy(() => import('./pages/app/DtPay/payment-flow/PaymentInit'))

const PaymentAuto = lazy(() => import('./pages/app/DtPay/payment-flow/Auto/PaymentAuto'))
const PaymentManual = lazy(() => import('./pages/app/DtPay/payment-flow/Manual/PaymentManual'))

const DtPayTransactions = lazy(() => import('./pages/app/DtPay/transactions/DtPayTransactions'))
const DtPayTransactionView = lazy(() => import('./pages/app/DtPay/transactions/DtPayTransactionView'))

const RaiseDispute = lazy(() => import('./pages/app/DtPay/dispute/RaiseDispute'))

/*
DTPay Guest Pay
*/
const DtPayGuestPay = lazy(() => import('./pages/app/DtPayGuestPay'))


const NewPartnerCard = lazy(() => import('./pages/app/new-partner/Card'))

const CoiRequest = lazy(() => import('./pages/app/coi-request/CoiRequest'))


// Paths that should render full-page, without the app header/nav chrome.
// /subscribe is one of these: it's shown as a forced, standalone step
// (right after signup, or when RouteGuard redirects here for not having
// a plan yet) and shouldn't look like a page nested inside the app shell.
// /track/:token is the customer-facing public tracking page — whoever opens
// it has no broker session and shouldn't see this app's internal nav at all.
const NO_HEADER_PATHS = ['/subscribe', '/accept-invitation'];
const NO_HEADER_PREFIXES = ['/track/'];

// Shown for the moment a page's chunk is loading. Plain markup rather than MUI,
// so it costs nothing in the initial bundle.
function PageLoading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "96px 0" }}>
      <div className="dt-page-spinner" role="status" aria-label="Loading" />
    </div>
  );
}

// Needs to live inside <BrowserRouter> so it can call useLocation() —
// App() itself renders BrowserRouter, so it isn't inside the router
// context yet and can't read the current path directly.
function AppShell() {
  const location = useLocation();
  const hideHeader =
    NO_HEADER_PATHS.includes(location.pathname) ||
    NO_HEADER_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));

  useEffect(() => {
  window.scrollTo(0, 0);
}, [location.pathname]);

  return (
    <RouteGuard>
      {!hideHeader && <AppHeader />}

      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(180deg, #F5F2E9 0%, #F8F7F4 30%, #FBFBF8 100%)",
        }}
      >
        {/*
          Every page but Login is its own chunk, fetched the first time it is
          opened: the app used to be a single 3.6 MB bundle that had to be
          downloaded and parsed before even the sign-in form could render.
        */}
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Public — opened from the team invitation email by someone who has
              no account yet. Authorised by the token in the query string. */}
          <Route path="/accept-invitation" element={<AcceptInvitation />} />

          {/* Carrier onboarding. Public — reached from the invitation email,
              by a carrier who has no account here. Authorised by the token in
              the URL, not by a session. */}
          <Route path="/carrier/connect/:token" element={<CarrierOnboard />} />
          <Route path="/carrier/invalid-access" element={<CarrierNoData />} />
          <Route path="/carrier/eld-not-supported" element={<EldNotSupported />} />
          <Route path="/carrier/email-approval" element={<EmailApproval />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/trackshipment/step1" element={<TrackShipmentStep1 />} />
          <Route path="/trackshipment/step2" element={<TrackShipmentStep2 />} />
          <Route path="/trackshipment/eld" element={<TrackShipmentEld />} />
          <Route path="/load-search" element={<LoadSearch />} />
          <Route path="/search-vet" element={<SearchVet />} />
        <Route path="/risk-alerts" element={<RiskAlerts />} />
        <Route path="/coi-request" element={<CoiRequest />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/profile" element={<ProfileUpdate />} />
          <Route path="/settings/carrier" element={<CarrierSettings />} />
          <Route path="/subscribe" element={<Subscription />} />

          {/* Where Stripe sends the customer back to. The paths are the API's
              success_path / cancel_path (config/subscriptions.php), not ours —
              cancelling just returns to the pricing table. */}
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/plans" element={<Navigate to="/subscribe" replace />} />

          {/* Billing: plan, invoices and spend. Also the API's
              portal_return_path, so this is where Stripe's hosted portal
              hands the customer back. */}
          <Route path="/billing" element={<Billing />} />

          <Route path="/carrier-questions" element={<CarrierQuestions />} />

          <Route path="/control-tower" element={<ControlTowerList />} />
          <Route path="/shipment/:row_id" element={<ControlTowerShipment />} />
          <Route path="/shipment/eld/:uuid" element={<EldShipmentDetail />} />

          {/* Public — the customer opens this with nothing but a link, no
              account here at all. Authorised by the token in the URL. */}
          <Route path="/track/:token" element={<PublicTracking />} />
          <Route path="/profile/carriers/shortlisted" element={<ShortlistedCarriers />} />
          <Route path="/profile/carriers/blocked" element={<BlockedCarriers />} />

          <Route path="/carriers/new-partner" element={<NewPartnerCard />} />

          {/* The header's Carriers link points here; before this it fell
              through to the catch-all and bounced back to login. */}
          <Route path="/carriers" element={<ConnectedCarriers />} />
          <Route path="/carriers/search" element={<CarrierSearch />} />
          <Route path="/carriers/:row_id" element={<CarrierProfile />} />

          <Route path="/carriers/drayage-finder" element={<DrayageCarrierFinder />} />

          <Route path="/profile/scoring-weights" element={<ScoringWeights />} />

          {/* DT Trust Score explainer — linked from DtScoreHoverCard's
              "See how the DT Trust Score works" and from the AppHeader's
              profile-menu link that sits right after Scoring Weights. */}
          <Route path="/dt-score/how-it-works" element={<DtScoreHowItWorks />} />


          {/* DTPay Payments module */}
          <Route path="/dt-pay/funding-controls" element={<DtPayFundingControl />} />

          <Route path="/dt-pay" element={<PaymentsDashbaord />} />
          <Route path="/dt-pay/init" element={<PaymentInit />} />

          <Route path="/dt-pay/payment/auto" element={<PaymentAuto />}>
            <Route path=":step" element={<PaymentAuto />}>
              <Route path=":transaction_id" element={<PaymentAuto />} />
            </Route>
          </Route>

          <Route path="/dt-pay/payment/manual" element={<PaymentManual />}>
            <Route path=":step" element={<PaymentManual />}>
              <Route path=":transaction_id" element={<PaymentManual />} />
            </Route>
          </Route>

          <Route path="/dt-pay/transactions" element={<DtPayTransactions />} />

          <Route path="/dt-pay/transactions/view" element={<DtPayTransactionView />}>
            <Route path=":transaction_id" element={<DtPayTransactionView />} />
          </Route>

          <Route path="/dt-pay/raise-a-dispute" element={<RaiseDispute />}>
            <Route path=":transaction_id" element={<RaiseDispute />} />
          </Route>

          {/* Public — the carrier pays from an emailed link, with no account here. */}
          <Route path="/guest-pay" element={<DtPayGuestPay />}>
            <Route path=":step" element={<DtPayGuestPay />}>
              <Route path=":transaction_id" element={<DtPayGuestPay />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </div>
    </RouteGuard>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <AppShell />
    </BrowserRouter>
  );
}
export default App