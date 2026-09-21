import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import SatelliteAltOutlinedIcon from "@mui/icons-material/SatelliteAltOutlined";
import SatelliteAltIcon from "@mui/icons-material/SatelliteAlt";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";
import EldMilestones from "./EldMilestones";

/*
| Broker-facing ELD shipment detail page. Styled to match the rest of this
| app — see control_tower/ControlTowerShipment.jsx, the equivalent page for a
| phone-tracked load — rather than the dark mockup this was first built from.
*/

const trackUrl = (uuid) => `/shipments/${uuid}/eld/track`;
// A fixed pixel height, not "100%" — Google Maps measures its container the
// instant it initializes, and a percentage height resolved against a parent
// that only declares minHeight can read as zero/ambiguous at that exact
// moment. The map then locks in at the wrong size and never repaints
// correctly on its own, which is what was showing as a blank/grey map.
const containerStyle = { width: "100%", height: "340px" };

// Google's default style labels every real business, gate and landmark it
// knows about — fine for a consumer maps app, noise on a load tracker where
// the only thing that matters is the road network and the truck. Turning
// off POI/transit icons is what keeps a zoomed-in view from turning into a
// wall of unrelated business names.
const CLEAN_MAP_STYLE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

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

const trailOptions = {
  strokeColor: "#2563EB",
  strokeOpacity: 0.9,
  strokeWeight: 4,
  clickable: false,
  zIndex: 3,
};

function timeAgo(iso) {
  if (!iso) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

function formatWindow(date, time, timezone) {
  if (!date) return "Not scheduled";
  const [y, m, d] = date.split("-");
  let label = `${m}/${d}/${y}`;
  if (time) {
    const [h, min] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    label += ` · ${hour12}:${String(min).padStart(2, "0")} ${period}`;
  }
  if (timezone) label += ` ${timezone}`;
  return label;
}

const STATUS_STYLES = {
  draft: { label: "Not Started", className: "bg-slate-100 text-slate-600" },
  active: { label: "In Transit", className: "bg-blue-50 text-blue-600" },
  completed: { label: "Delivered", className: "bg-green-50 text-green-600" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600" },
};

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">{value ?? "—"}</span>
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

  // GoogleMap's `center` prop isn't meant to track live data — passing a new
  // {lat,lng} object on every poll makes the library re-center (and in
  // practice, sometimes blank) the map on every single refresh. It's set
  // once, from the first position seen, and never touched again; the
  // Marker's own `position` prop is what's safe to update live, and the
  // fitBounds/panTo effect below already handles reframing deliberately.
  //
  // Set via a guarded setState call during render, not a ref — React runs
  // this branch, sees the state actually changed, and re-renders immediately
  // before anything commits, so there's no extra paint. A ref mutated here
  // would violate React's own rule against touching refs during render.
  const [initialCenter, setInitialCenter] = useState(null);

  // Checking every 10s made sense only if new data could actually land that
  // often — it can't. A shipment's own tracking_interval_seconds (the same
  // number the "pings every N min" line already shows) is the real limit on
  // how fast anything can change, so the poll rate follows it instead of a
  // flat number: about a third of the real interval, so a fresh position
  // shows up reasonably soon after it lands without asking dozens of times
  // for nothing in between. Floored at 20s (no point being frantic even for
  // a 1-minute shipment) and capped at 5 min (so the page doesn't feel dead
  // on a 6-hour interval).
  const pollDelayFor = (intervalSeconds) =>
    Math.min(300000, Math.max(20000, ((intervalSeconds || 300) * 1000) / 3));

  // A self-scheduling timeout, not setInterval — each run reads the interval
  // from the response it just received, so if a broker edited the shipment's
  // interval elsewhere, the next wait picks that up immediately rather than
  // being locked to whatever was true when polling first started.
  const load = async (showSpinner) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await apiFetch(trackUrl(uuid));
      if (res?.status) {
        setData(res.data);

        if (pollRef.current) {
          clearTimeout(pollRef.current);
          pollRef.current = null;
        }

        if (res.data.status === "active") {
          pollRef.current = setTimeout(() => load(false), pollDelayFor(res.data.tracking_interval_seconds));
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
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid]);

  const current = data?.current;
  const trail = (data?.trail || [])
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({ lat: Number(p.latitude), lng: Number(p.longitude) }));

  if (current && initialCenter === null) {
    setInitialCenter({ lat: Number(current.latitude), lng: Number(current.longitude) });
  }

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
      <div className="min-h-screen bg-[#F4F5F1] px-4 py-5 sm:px-6 md:px-8 lg:px-14">
        <div className="mx-auto max-w-6xl animate-pulse space-y-5">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="h-96 rounded-2xl bg-slate-200 lg:col-span-2" />
            <div className="h-96 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_STYLES[data.status] || { label: data.status, className: "bg-slate-100 text-slate-600" };

  return (
    <div className="min-h-screen bg-[#F4F5F1] px-4 py-5 sm:px-6 md:px-8 lg:px-14 antialiased text-[#1E293B]">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/load-search")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          <ArrowBackIcon sx={{ fontSize: 16 }} /> Back to Load Search
        </button>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-[28px]">{data.shipment_no}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusInfo.className}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
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
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <OpenInNewIcon sx={{ fontSize: 15 }} /> Preview customer link
              </a>
            )}
            <button
              type="button"
              onClick={copyLink}
              disabled={!data.public_tracking_url}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#001A48] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#1E293B] disabled:opacity-50"
            >
              <ContentCopyIcon sx={{ fontSize: 15 }} /> Share tracking link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Route & live position</h2>
              </div>

              <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-slate-100" style={{ minHeight: 340 }}>
                {!current ? (
                  <div className="flex h-[340px] flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
                    <SatelliteAltOutlinedIcon sx={{ fontSize: 28 }} />
                    <p className="text-sm font-medium">
                      {data.status === "draft" ? "Tracking hasn't started yet." : "No position reported by the ELD yet."}
                    </p>
                  </div>
                ) : isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={initialCenter}
                    zoom={9}
                    onLoad={(map) => {
                      mapRef.current = map;
                      // Standard fix for a Google Map that initializes at
                      // the wrong size: force it to re-measure its
                      // container and re-apply the center once the layout
                      // has actually settled, one tick after mount.
                      setTimeout(() => {
                        window.google.maps.event.trigger(map, "resize");
                        if (initialCenter) map.setCenter(initialCenter);
                      }, 0);
                    }}
                    options={{ styles: CLEAN_MAP_STYLE, streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                  >
                    {trail.length > 1 && <Polyline path={trail} options={trailOptions} />}
                    <Marker
                      position={{ lat: Number(current.latitude), lng: Number(current.longitude) }}
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
                  <div className="h-[340px] animate-pulse bg-slate-100" />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5 text-xs text-slate-500">
                <span>
                  Position pings every {Math.round((data.tracking_interval_seconds || 300) / 60)} min via Terminal / ELD
                </span>
                <span>Last ping: {timeAgo(current?.located_at)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                <SatelliteAltIcon sx={{ fontSize: 17 }} className="text-[#1D4ED8]" /> ELD telemetry
              </h2>
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

          <div className="space-y-5">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                <LocalShippingOutlinedIcon sx={{ fontSize: 17 }} className="text-[#1D4ED8]" /> Shipment details
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
                <DetailRow label="Pickup window" value={formatWindow(data.pickup_date, data.pickup_time, data.pickup_timezone)} />
                <DetailRow label="Delivery window" value={formatWindow(data.delivery_date, data.delivery_time, data.delivery_timezone)} />
                <DetailRow label="Dispatched" value={timeAgo(data.tracking_started_at)} />
              </div>
            </div>

            <EldMilestones
              milestone={data.milestone}
              arrivedAtOriginAt={data.arrived_at_origin_at}
              arrivedAtDestinationAt={data.arrived_at_destination_at}
              deliveredAt={data.tracking_stopped_at}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
