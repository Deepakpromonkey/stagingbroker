import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SatelliteAltOutlinedIcon from "@mui/icons-material/SatelliteAltOutlined";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

const trackUrl = (uuid) => `/shipments/${uuid}/eld/track`;

const containerStyle = { width: "100%", height: "100%", minHeight: "340px" };

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2740" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a1120" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#233247" }] },
];

const trailOptions = {
  strokeColor: "#3B5BFB",
  strokeOpacity: 0.5,
  strokeWeight: 3,
  clickable: false,
  zIndex: 2,
  icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, scale: 3 }, offset: "0", repeat: "14px" }],
};

// See ControlTowerShipment.jsx for why this waits on the global script
// instead of using @react-google-maps/api's own loader — index.html already
// loads Maps once for the whole app, and a second loader with different
// options throws.
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
  if (!iso) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

const STATUS_LABEL = {
  draft: "Not started",
  active: "In transit",
  completed: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_DOT = {
  draft: "bg-slate-400",
  active: "bg-[#3B5BFB]",
  completed: "bg-emerald-400",
  cancelled: "bg-red-400",
};

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] py-3 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-100">{value ?? "—"}</span>
    </div>
  );
}

export default function EldShipmentDetail() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const isLoaded = useGoogleMapsReady();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);
  const mapRef = useRef(null);
  const hasFramedRef = useRef(false);

  const load = async (showSpinner) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await apiFetch(trackUrl(uuid));
      if (res?.status) {
        setData(res.data);

        if (res.data.status === "active" && pollRef.current === null) {
          pollRef.current = setInterval(() => load(false), 10000);
        } else if (res.data.status !== "active" && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch (err) {
      toast.error({ title: "Could not load tracking", message: err?.message });
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid]);

  const current = data?.current;
  const trail = (data?.trail || [])
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));

  useEffect(() => {
    if (!isLoaded || !mapRef.current || hasFramedRef.current) return;
    if (!current && trail.length === 0) return;

    if (trail.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      trail.forEach((p) => bounds.extend(p));
      if (current) bounds.extend({ lat: Number(current.latitude), lng: Number(current.longitude) });
      mapRef.current.fitBounds(bounds, 60);
    } else if (current) {
      mapRef.current.panTo({ lat: Number(current.latitude), lng: Number(current.longitude) });
      mapRef.current.setZoom(11);
    }
    hasFramedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, current, trail.length]);

  const copyLink = async () => {
    if (!data?.public_tracking_url) return;
    try {
      await navigator.clipboard.writeText(data.public_tracking_url);
      toast.success({ title: "Tracking link copied", duration: 2500 });
    } catch {
      toast.error({ title: "Could not copy the link" });
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-8 w-64 rounded bg-white/5" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="h-96 rounded-2xl bg-white/5 lg:col-span-2" />
            <div className="h-96 rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/load-search")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Load Search
        </button>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white sm:text-[28px]">{data.shipment_no}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[data.status] || "bg-slate-400"}`} />
                {STATUS_LABEL[data.status] || data.status}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-400">
              {data.origin || "Origin not entered"} → {data.destination || "Destination not entered"}
              {data.pro_number ? ` · PRO ${data.pro_number}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {data.public_tracking_url && (
              <a
                href={`${data.public_tracking_url}?preview=1`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.08]"
              >
                <OpenInNewIcon sx={{ fontSize: 15 }} /> Preview customer link
              </a>
            )}
            <button
              type="button"
              onClick={copyLink}
              disabled={!data.public_tracking_url}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3B5BFB] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#3B5BFB]/20 transition hover:bg-[#2F4CE0] disabled:opacity-50"
            >
              <ContentCopyIcon sx={{ fontSize: 15 }} /> Share tracking link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0D1526]">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-sm font-bold text-white">Route & live position</h2>
              </div>

              <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-white/5" style={{ minHeight: 340 }}>
                {!current ? (
                  <div className="flex h-[340px] flex-col items-center justify-center gap-2 bg-[#0f1a2e] text-slate-500">
                    <SatelliteAltOutlinedIcon sx={{ fontSize: 28 }} />
                    <p className="text-sm font-medium">
                      {data.status === "draft"
                        ? "Tracking hasn't started yet."
                        : "No position reported by the ELD yet."}
                    </p>
                  </div>
                ) : isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={{ lat: Number(current.latitude), lng: Number(current.longitude) }}
                    zoom={9}
                    onLoad={(map) => { mapRef.current = map; }}
                    options={{
                      styles: DARK_MAP_STYLE,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {trail.length > 1 && <Polyline path={trail} options={trailOptions} />}
                    <Marker
                      position={{ lat: Number(current.latitude), lng: Number(current.longitude) }}
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
                  <div className="h-[340px] animate-pulse bg-[#0f1a2e]" />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3.5 text-xs text-slate-500">
                <span>
                  Position pings every {Math.round((data.tracking_interval_seconds || 300) / 60)} min via
                  Terminal / ELD
                </span>
                <span>Last ping: {timeAgo(current?.located_at)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0D1526] p-5">
              <h2 className="mb-1 text-sm font-bold text-white">🛰️ ELD telemetry</h2>
              <div className="mt-3">
                <DetailRow label="Source" value={`Terminal · ${data.eld_provider || "—"}`} />
                <DetailRow label="Speed" value={current ? `${Math.round(current.speed_mph)} mph` : "—"} />
                <DetailRow
                  label="Heading"
                  value={current && current.heading_degrees !== null ? `${Math.round(current.heading_degrees)}°` : "—"}
                />
                <DetailRow
                  label="Odometer"
                  value={current?.odometer_miles ? `${Number(current.odometer_miles).toLocaleString()} mi` : "—"}
                />
                <DetailRow label="Last position update" value={timeAgo(current?.located_at)} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0D1526] p-5">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
              <LocalShippingOutlinedIcon sx={{ fontSize: 17 }} /> Shipment details
            </h2>
            <div className="mt-3">
              <DetailRow
                label="Carrier"
                value={data.eld_provider ? `${data.carrier_name} (${data.eld_provider})` : data.carrier_name}
              />
              <DetailRow label="DOT #" value={data.carrier_dot} />
              <DetailRow
                label="Truck / Trailer"
                value={[data.truck_number, data.trailer_number].filter(Boolean).join(" / ") || data.truck_number}
              />
              <DetailRow label="Driver" value={data.driver_name} />
              <DetailRow label="Origin" value={data.origin || "Origin not entered"} />
              <DetailRow label="Destination" value={data.destination || "Destination not entered"} />
              <DetailRow label="Dispatched" value={timeAgo(data.tracking_started_at)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
