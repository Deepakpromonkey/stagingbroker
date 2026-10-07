import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { GoogleMap, Marker } from "@react-google-maps/api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

import { apiFetch } from "../../../lib/api";
import EldMilestones from "../trackshipment-eld/EldMilestones";

/*
| The link a broker hands their customer. No session, no company context —
| the token in the URL is the only thing that authorises this page, so it
| calls the API with skipAuth (see lib/api.js) rather than whatever bearer
| token might happen to be sitting in this browser's localStorage from an
| unrelated broker login.
|
| Styled to match the rest of this app (same cards, same navy/blue accents as
| Step1/Step2/ControlTowerShipment) rather than a separate dark theme — a
| customer opening this should recognise it as the same product a broker
| books through, not a different one.
|
| Deliberately does not show carrier name, DOT #, driver name/phone, or truck
| /trailer numbers — the API itself (PublicShipmentTrackingController) never
| sends them, on purpose: this link can end up anywhere, and a broker's
| carrier relationship isn't this page's to leak. "Carrier details hidden" is
| not a placeholder here, it's the actual policy.
|
| The milestone stepper and ETA calculation from the design reference are
| intentionally not built yet — the backend has no route/geocoding to back
| an honest 4-step progress bar or an arrival estimate, and a permanently
| stuck "Calculating…" would be worse than not showing one.
*/

const trackUrl = (token) => `/public/tracking/${token}`;

// See EldShipmentDetail.jsx for why this is a fixed height, not "100%".
const containerStyle = { width: "100%", height: "280px" };

// See EldShipmentDetail.jsx for the same style — Google's default labels
// every real business/landmark it knows about, which is noise on a load
// tracker and looks especially odd to a customer seeing unrelated business
// names near "their" truck.
const CLEAN_MAP_STYLE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

function useGoogleMapsReady() {
  const [ready, setReady] = useState(() => Boolean(window.google?.maps));
  useEffect(() => {
    if (ready) return undefined;
    const timer = setInterval(() => {
      if (window.google?.maps) {
        setReady(true);
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [ready]);
  return ready;
}

function timeAgo(iso) {
  if (!iso) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

function CenteredMessage({ icon, title, message }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F5F1] px-6 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm border border-slate-200">
        {icon}
      </span>
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      {message && <p className="mt-2 max-w-sm text-sm text-slate-500">{message}</p>}
      <p className="mt-10 text-xs text-slate-400">Powered by Dollar Traq — Freight Visibility Simplified.</p>
    </div>
  );
}

export default function PublicTracking() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const isLoaded = useGoogleMapsReady();

  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // Same reasoning as EldShipmentDetail.jsx: GoogleMap's `center` prop must
  // not be a fresh object on every poll, or the map re-centers (and can go
  // blank) on every refresh. Set once via a guarded setState call during
  // render (React's sanctioned pattern for this — not a ref, which isn't
  // allowed to be mutated mid-render); the Marker's `position` is what's
  // safe to keep updating live.
  const [initialCenter, setInitialCenter] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const load = async () => {
      try {
        const res = await apiFetch(trackUrl(token), { skipAuth: true });
        if (cancelled) return;
        setData(res.data);
        setNotFound(false);

        // Only worth re-polling while something can still change — a
        // delivered/cancelled/pending load has nothing new to report between
        // polls, so there's no reason to keep hitting the API on a page a
        // customer may leave open in a tab for hours.
        //
        // The wait itself follows the shipment's own tracking_interval_seconds
        // rather than a flat number — see EldShipmentDetail.jsx for the same
        // reasoning: asking faster than new data could possibly exist is
        // just wasted requests.
        if (res.data.state === "in_transit") {
          const delay = Math.min(300000, Math.max(30000, ((res.data.tracking_interval_seconds || 300) * 1000) / 3));
          timer = setTimeout(load, delay);
        }
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 404) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  if (loading) {
    return <div className="min-h-screen bg-[#F4F5F1]" />;
  }

  if (notFound || !data) {
    return (
      <CenteredMessage
        icon={<CancelOutlinedIcon sx={{ fontSize: 24 }} />}
        title="Tracking link invalid or expired"
        message="This link no longer works. If you're expecting a shipment, ask your carrier or broker for an updated link."
      />
    );
  }

  const current = data.current;
  const position = current ? { lat: Number(current.latitude), lng: Number(current.longitude) } : null;

  if (position && initialCenter === null) {
    setInitialCenter(position);
  }

  return (
    <div className="min-h-screen bg-[#F4F5F1]">
      {isPreview && (
        <div className="flex items-center border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowBackIcon sx={{ fontSize: 14 }} /> Exit preview
          </button>
          <span className="mx-auto pr-16 text-xs font-medium text-slate-400">
            Tracking powered by Dollar Traq
          </span>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-[#112963]">Live shipment tracking</h1>
          <p className="mt-1 text-sm text-slate-500">Shared by your freight broker</p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,36,84,0.04),0_16px_32px_-24px_rgba(15,36,84,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5 sm:px-8">
            <span className="text-sm text-slate-500">
              Shipment <strong className="font-bold text-[#112963]">{data.shipment_no}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Carrier details hidden
            </span>
          </div>

          <div className="border-t border-slate-100 px-6 py-6 sm:px-8">
            {data.state === "delivered" && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm text-green-700">
                <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
                <span>
                  This shipment has been delivered
                  {data.delivered_at ? ` · ${timeAgo(data.delivered_at)}` : ""}.
                </span>
              </div>
            )}

            {data.state === "cancelled" && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-700">
                <CancelOutlinedIcon sx={{ fontSize: 20 }} />
                <span>This shipment has been cancelled.</span>
              </div>
            )}

            {data.state === "pending" && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-600">
                <ScheduleOutlinedIcon sx={{ fontSize: 20 }} />
                <span>This load hasn't started moving yet. Check back once it's dispatched.</span>
              </div>
            )}

            {data.milestone && (
              <div className="mb-6">
                <EldMilestones
                  milestone={data.milestone}
                  arrivedAtOriginAt={data.arrived_at_origin_at}
                  arrivedAtDestinationAt={data.arrived_at_destination_at}
                  deliveredAt={data.delivered_at}
                />
              </div>
            )}

            {(data.state === "in_transit" || data.state === "pending") && (
              <div className="mb-6 overflow-hidden rounded-xl border border-slate-100" style={{ minHeight: 280 }}>
                {!position ? (
                  <div className="flex h-[280px] flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
                    <LocalShippingOutlinedIcon sx={{ fontSize: 26 }} />
                    <p className="text-sm font-medium">No position reported yet.</p>
                  </div>
                ) : isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={initialCenter}
                    zoom={9}
                    onLoad={(map) => {
                      // Same fix as EldShipmentDetail.jsx — force a
                      // re-measure once the layout has actually settled.
                      setTimeout(() => {
                        window.google.maps.event.trigger(map, "resize");
                        if (initialCenter) map.setCenter(initialCenter);
                      }, 0);
                    }}
                    options={{
                      styles: CLEAN_MAP_STYLE,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      zoomControl: false,
                    }}
                  >
                    <Marker
                      position={position}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#2563EB",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                      }}
                    />
                  </GoogleMap>
                ) : (
                  <div className="h-[280px] animate-pulse bg-slate-100" />
                )}
              </div>
            )}

            {position && (
              <p className="mb-6 text-center text-xs text-slate-400">
                Last position update: {timeAgo(current.last_updated_at)}
              </p>
            )}

            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">From</p>
                <p className="mt-1 text-sm font-bold text-[#112963]">{data.origin || "Origin not entered"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To</p>
                <p className="mt-1 text-sm font-bold text-[#112963]">
                  {data.destination || "Destination not entered"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Powered by Dollar Traq — Freight Visibility Simplified.
        </p>
      </div>
    </div>
  );
}
