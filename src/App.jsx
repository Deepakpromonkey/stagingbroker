import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import BillingSuccess from './pages/app/subscription/BillingSuccess'

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

// Paths that should render full-page, without the app header/nav chrome.
// /subscribe is one of these: it's shown as a forced, standalone step
// (right after signup, or when RouteGuard redirects here for not having
// a plan yet) and shouldn't look like a page nested inside the app shell.
const NO_HEADER_PATHS = ['/subscribe'];

// Needs to live inside <BrowserRouter> so it can call useLocation() —
// App() itself renders BrowserRouter, so it isn't inside the router
// context yet and can't read the current path directly.
function AppShell() {
  const location = useLocation();
  const hideHeader = NO_HEADER_PATHS.includes(location.pathname);

  return (
    <RouteGuard>
      {!hideHeader && <AppHeader />}

      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(180deg, #F5F2E9 0%, #F8F7F4 30%, #FBFBF8 100%)",
        }}
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
          <Route path="/load-search" element={<LoadSearch />} />
          <Route path="/search-vet" element={<SearchVet />} />
          <Route path="/risk-alerts" element={<RiskAlerts />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/profile" element={<ProfileUpdate />} />
          <Route path="/settings/carrier" element={<CarrierSettings />} />
          <Route path="/subscribe" element={<Subscription />} />

          {/* Where Stripe sends the customer back to. The paths are the API's
              success_path / cancel_path (config/subscriptions.php), not ours —
              cancelling just returns to the pricing table. */}
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/plans" element={<Navigate to="/subscribe" replace />} />

          <Route path="/carrier-questions" element={<CarrierQuestions />} />

          <Route path="/control-tower" element={<ControlTowerList />} />
          <Route path="/shipment/:row_id" element={<ControlTowerShipment />} />
          <Route path="/profile/carriers/shortlisted" element={<ShortlistedCarriers />} />

          {/* The header's Carriers link points here; before this it fell
              through to the catch-all and bounced back to login. */}
          <Route path="/carriers" element={<ConnectedCarriers />} />
          <Route path="/carriers/search" element={<CarrierSearch />} />
          <Route path="/carriers/:row_id" element={<CarrierProfile />} />

          <Route path="/profile/scoring-weights" element={<ScoringWeights />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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