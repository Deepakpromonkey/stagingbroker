import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { GoogleMap, Marker } from "@react-google-maps/api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";

import { apiFetch } from "../../../lib/api";

/*
| The link a broker hands their customer. No session, no company context —
| the token in the URL is the only thing that authorises this page, so it
| calls the API with skipAuth (see lib/api.js) rather than whatever bearer
| token might happen to be sitting in this browser's localStorage from an
| unrelated broker login.
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

const containerStyle = { width: "100%", height: "100%", minHeight: "260px" };

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2740" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1120" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0F1E] px-6 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
        {icon}
      </span>
      <h1 className="text-lg font-bold text-white">{title}</h1>
      {message && <p className="mt-2 max-w-sm text-sm text-slate-400">{message}</p>}
      <p className="mt-10 text-xs text-slate-600">Powered by Dollar Traq — Freight Visibility Simplified.</p>
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
        if (res.data.state === "in_transit") {
          timer = setTimeout(load, 30000);
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
    return <div className="min-h-screen bg-[#0A0F1E]" />;
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

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      {isPreview && (
        <div className="flex items-center border-b border-white/10 bg-[#0D1526] px-4 py-3">
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
          >
            <ArrowBackIcon sx={{ fontSize: 14 }} /> Exit preview
          </button>
          <span className="mx-auto pr-16 text-xs font-medium text-slate-500">
            Tracking powered by Dollar Traq
          </span>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-white">Live shipment tracking</h1>
          <p className="mt-1 text-sm text-slate-500">Shared by your freight broker</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0D1526] shadow-2xl shadow-black/50">
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5 sm:px-8">
            <span className="text-sm text-slate-400">
              Shipment <strong className="font-bold text-white">{data.shipment_no}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-400">
              Carrier details hidden
            </span>
          </div>

          <div className="border-t border-white/10 px-6 py-6 sm:px-8">
            {data.state === "delivered" && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-sm text-emerald-300">
                <CheckCircleOutlineIcon sx={{ fontSize: 20 }} />
                <span>
                  This shipment has been delivered
                  {data.delivered_at ? ` · ${timeAgo(data.delivered_at)}` : ""}.
                </span>
              </div>
            )}

            {data.state === "cancelled" && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 text-sm text-red-300">
                <CancelOutlinedIcon sx={{ fontSize: 20 }} />
                <span>This shipment has been cancelled.</span>
              </div>
            )}

            {data.state === "pending" && (
              <div className="mb-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-slate-300">
                <ScheduleOutlinedIcon sx={{ fontSize: 20 }} />
                <span>This load hasn't started moving yet. Check back once it's dispatched.</span>
              </div>
            )}

            {(data.state === "in_transit" || data.state === "pending") && (
              <div className="mb-6 overflow-hidden rounded-xl border border-white/5" style={{ minHeight: 260 }}>
                {!position ? (
                  <div className="flex h-[260px] flex-col items-center justify-center gap-2 bg-[#0f1a2e] text-slate-500">
                    <LocalShippingOutlinedIcon sx={{ fontSize: 26 }} />
                    <p className="text-sm font-medium">No position reported yet.</p>
                  </div>
                ) : isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={position}
                    zoom={9}
                    options={{
                      styles: DARK_MAP_STYLE,
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
                        fillColor: "#3B5BFB",
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                      }}
                    />
                  </GoogleMap>
                ) : (
                  <div className="h-[260px] animate-pulse bg-[#0f1a2e]" />
                )}
              </div>
            )}

            {position && (
              <p className="mb-6 text-center text-xs text-slate-500">
                Last position update: {timeAgo(current.last_updated_at)}
              </p>
            )}

            <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">From</p>
                <p className="mt-1 text-sm font-bold text-white">{data.origin || "Origin not entered"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">To</p>
                <p className="mt-1 text-sm font-bold text-white">
                  {data.destination || "Destination not entered"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-600">
          Powered by Dollar Traq — Freight Visibility Simplified.
        </p>
      </div>
    </div>
  );
}
