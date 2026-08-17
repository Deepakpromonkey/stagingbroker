import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Skeleton from '@mui/material/Skeleton';

import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DnsOutlinedIcon from '@mui/icons-material/DnsOutlined';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ShareIcon from '@mui/icons-material/Share';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckIcon from '@mui/icons-material/Check';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';

import ShipmentDetails from './ShipmentDetails';
import ShipmentStops from './ShipmentStops';
import LocationHistory from './LocationHistory';
import DriverActivity from './DriverActivity';
import ShipmentChat from '../../../components/ShipmentChat';
import { GoogleMap, Polyline, Marker, InfoWindow } from '@react-google-maps/api';

import { apiFetch } from '../../../lib/api';

const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '380px'
};

// Where the map sits when a load has neither stops nor a single driver ping.
const FALLBACK_CENTER = { lat: 39.8283, lng: -98.5795 };

/**
 * True once the Google Maps API is on the page.
 *
 * index.html loads Maps (with the places library) for the address autocomplete
 * on the trip sheet, so the script is already coming. Waiting for that global
 * rather than injecting a second loader here avoids the "Loader must not be
 * called again with different options" clash between the two — and does not
 * depend on a VITE_GOOGLE_API_KEY that may not be set.
 */
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

function EmptyState({ message, icon }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#94A3B8]">
            <span className="flex items-center justify-center">
                {icon || <InboxOutlinedIcon sx={{ fontSize: 28 }} />}
            </span>
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
}

/**
 * The driver's replies to the custom events on a stop.
 *
 * Renders nothing until the driver has actually answered — an empty block on
 * every stop of every load would just be noise.
 */
function StopEventAnswers({ answers }) {
    if (!answers || answers.length === 0) return null;

    return (
        <div className="mt-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                Driver Answers
            </p>
            <div className="space-y-2">
                {answers.map((answer) => (
                    <div key={answer.id}>
                        <p className="text-[11px] font-semibold text-[#475569]">
                            {answer.question}
                        </p>
                        {answer.answer_image_url ? (
                            <a
                                href={answer.answer_image_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block"
                            >
                                <img
                                    src={answer.answer_image_url}
                                    alt={answer.question}
                                    className="h-16 w-16 rounded border border-[#E2E8F0] object-cover"
                                />
                            </a>
                        ) : (
                            <p className="text-[11px] font-medium text-[#0F172A]">
                                {answer.answer_value || <span className="text-[#94A3B8]">No answer</span>}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// The route the broker planned: stop to stop, dashed, deliberately quiet so the
// road the driver actually took reads on top of it.
const plannedRouteOptions = {
    strokeColor: '#94A3B8',
    strokeOpacity: 0,
    strokeWeight: 2,
    clickable: false,
    zIndex: 1,
    icons: [
        {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.7, scale: 3 },
            offset: '0',
            repeat: '14px'
        }
    ]
};

// Where the truck has actually been, from the driver app's GPS pings.
const driverTrailOptions = {
    strokeColor: '#2563EB',
    strokeOpacity: 0.9,
    strokeWeight: 4,
    clickable: false,
    zIndex: 3
};

const TAB_TRIPSHEET = 0;
const TAB_LOCATIONS = 1;
const TAB_DRIVER = 2;
const TAB_LOAD = 3;
const TAB_NOTES = 4;
const TAB_CHAT = 5;
const TAB_DOCS = 6;

function ControlTowerShipment() {
    const { row_id: paramRowId } = useParams();

    const [loading, setLoading] = useState(true);
    const [redirect, setRedirect] = useState(false);
    const [shipment, setShipment] = useState(false);
    const [activeTab, setActiveTab] = useState(TAB_TRIPSHEET);

    // The point the broker asked to see. Drives the map camera and the info
    // bubble; null means "frame the whole load".
    const [focused, setFocused] = useState(null);

    const loadTimerRef = useRef(null);
    const mapRef = useRef(null);
    const mapWrapRef = useRef(null);
    const hasFramedRef = useRef(false);

    const isLoaded = useGoogleMapsReady();

    const init = async (row_id, initing) => {
        setLoading(initing);

        try {
            const data = await apiFetch(`/shipments/${row_id}`);

            if (data.status) {
                setShipment(data.data);

                // Keep a live load refreshing itself — the driver's pings and
                // stop check-ins land while this page is open.
                const status = data.data.status;
                if ((status === 'in_transit' || status === 'draft') && loadTimerRef.current === null) {
                    loadTimerRef.current = setInterval(() => init(row_id, false), 10000);
                } else if (status === 'delivered' && loadTimerRef.current) {
                    clearInterval(loadTimerRef.current);
                    loadTimerRef.current = null;
                }
            }
        } catch (error) {
            console.error('Failed to load shipment:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (paramRowId) {
            init(paramRowId, true);
        } else {
            setRedirect('/control-tower');
        }

        return () => {
            if (loadTimerRef.current) clearInterval(loadTimerRef.current);
            loadTimerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const orderedStops = useMemo(
        () => [...(shipment.stops || [])].sort((a, b) => a.stop_number - b.stop_number),
        [shipment.stops]
    );

    // The stops the broker planned, as map points.
    const stopPoints = useMemo(
        () =>
            orderedStops
                .filter((stop) => stop.latitude && stop.longitude)
                .map((stop) => ({
                    id: stop.id,
                    lat: parseFloat(stop.latitude),
                    lng: parseFloat(stop.longitude),
                    stop_number: stop.stop_number,
                    stop_type: stop.stop_type,
                    stop_name: stop.stop_name
                })),
        [orderedStops]
    );

    // The GPS trail from the driver app, oldest first.
    const driverPath = useMemo(
        () =>
            (shipment.location_pings || [])
                .map((ping) => ({ lat: Number(ping.lat), lng: Number(ping.lng) }))
                .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
        [shipment.location_pings]
    );

    // Same pings, shaped for the clickable Location History table.
    const locationHistory = useMemo(
        () =>
            (shipment.location_pings || []).map((ping) => ({
                id: ping.id,
                lat: Number(ping.lat),
                lng: Number(ping.lng),
                accuracy: ping.accuracy,
                date: ping.recorded_at || ping.created_at
            })),
        [shipment.location_pings]
    );

    const latestPing = locationHistory.length > 0 ? locationHistory[locationHistory.length - 1] : null;

    // Where the driver said they arrived at each stop — usually a few metres
    // off the planned pin, which is exactly what a broker wants to compare.
    const arrivalPoints = useMemo(
        () =>
            orderedStops
                .filter((stop) => stop.progress?.arrival_lat && stop.progress?.arrival_lng)
                .map((stop) => ({
                    id: `arrival-${stop.id}`,
                    lat: Number(stop.progress.arrival_lat),
                    lng: Number(stop.progress.arrival_lng),
                    stop_number: stop.stop_number,
                    stop_type: stop.stop_type,
                    arrived_at: stop.progress.arrived_at
                }))
                .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
        [orderedStops]
    );

    const mapCenter = focused || latestPing || stopPoints[0] || FALLBACK_CENTER;

    /**
     * Put a coordinate under the broker's nose.
     *
     * Called from the Location History rows and from every recorded coordinate
     * in the Driver tab. The map lives above the tabs, so it is scrolled back
     * into view — clicking a row and seeing nothing move would feel broken.
     */
    const focusLocation = (point) => {
        if (!point || !Number.isFinite(Number(point.lat)) || !Number.isFinite(Number(point.lng))) return;

        const target = {
            ...point,
            lat: Number(point.lat),
            lng: Number(point.lng)
        };

        setFocused(target);

        if (mapRef.current) {
            mapRef.current.panTo({ lat: target.lat, lng: target.lng });
            if ((mapRef.current.getZoom() ?? 0) < 15) mapRef.current.setZoom(16);
        }

        mapWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    /** Frame everything: the planned stops and the road actually driven. */
    const fitToLoad = (map = mapRef.current) => {
        if (!map || !window.google) return;

        const points = [...driverPath, ...stopPoints, ...arrivalPoints];
        if (points.length === 0) return;

        if (points.length === 1) {
            map.setCenter(points[0]);
            map.setZoom(15);
            return;
        }

        const bounds = new window.google.maps.LatLngBounds();
        points.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));
        map.fitBounds(bounds);
    };

    const handleMapLoad = (map) => {
        mapRef.current = map;
        if (!focused) fitToLoad(map);
    };

    // Frame the load once its data has arrived — on first load the map mounts
    // before the fetch resolves, so onLoad alone has nothing to fit.
    useEffect(() => {
        if (hasFramedRef.current || focused) return;
        if (driverPath.length === 0 && stopPoints.length === 0) return;

        fitToLoad();
        hasFramedRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [driverPath.length, stopPoints.length]);

    if (redirect !== false) {
        return <Navigate to={redirect} />;
    }

    // The driver app knows who is actually running the load; the shipment only
    // holds the phone number the broker typed. Prefer the former.
    const driverName =
        shipment.driver?.name ||
        (shipment.driver_phone_1
            ? shipment.driver_type === 'company_driver'
                ? 'Company Driver'
                : 'Driver'
            : 'Unassigned');
    const driverPhone =
        shipment.driver?.phone || `${shipment.country_code || ''} ${shipment.driver_phone_1 || ''}`.trim();
    const latestStatusLabel = shipment.status
        ? shipment.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Unknown Status';

    return (
        <div className="min-h-screen bg-[#F4F5F1] px-8 py-5 md:px-14 antialiased text-[#1E293B]">

            <div className="mb-6">
                <h1 className="text-[32px] font-semibold tracking-tight text-slate-900">Control Tower</h1>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                    Enter carrier details to activate live telemetry and predictive delivery windows.
                </p>
            </div>

            {loading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <Skeleton variant="rounded" height={140} className="rounded-2xl" />
                        <Skeleton variant="rounded" height={140} className="rounded-2xl" />
                        <Skeleton variant="rounded" height={140} className="rounded-2xl" />
                        <Skeleton variant="rounded" height={140} className="rounded-2xl" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Skeleton variant="rounded" height={400} className="lg:col-span-1 rounded-2xl" />
                        <Skeleton variant="rounded" height={400} className="lg:col-span-2 rounded-2xl" />
                    </div>
                </div>
            ) : (
                <div className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">

                        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm md:col-span-5 flex flex-col justify-between min-h-[180px]">
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h2 className="text-xl font-bold text-[#0F172A]">
                                        #{shipment.shipment_no}
                                    </h2>

                                    <span className="inline-flex items-center gap-2 px-5.5 py-1.5 rounded-full text-xs font-bold bg-[#EEF2FF] text-[#4F46E5]">
                                        <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                                        {latestStatusLabel}
                                    </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs text-[#64748B] font-medium">
                                    <span>Primary Freight Route</span>
                                    <span className="w-1 h-1 rounded-full bg-[#CBD5E1]"></span>
                                    <span>Priority High</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <button className="bg-[#001A48] hover:bg-[#1E293B] text-white text-xs font-bold py-3 px-6 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm">
                                    <ShareIcon style={{ fontSize: '15px' }} /> Share Tracking
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm md:col-span-2 flex flex-col justify-between min-h-[150px]">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Carrier</span>
                                <h3 className="text-sm font-bold text-[#0F172A] mt-1.5 leading-snug">
                                    {shipment.carrier_name || shipment.driver?.carrier_name || 'Unassigned'}
                                </h3>
                            </div>
                            <div className="text-[#94A3B8] flex justify-start">
                                <LocalShippingOutlinedIcon style={{ fontSize: '22px', strokeWidth: '1.5' }} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm md:col-span-3 flex flex-col justify-between min-h-[150px]">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Driver Contact</span>
                                <h3 className="text-sm font-bold text-[#0F172A] mt-1.5">{driverName}</h3>
                                <p className="text-xs text-[#64748B] mt-1.5 font-medium">
                                    {driverPhone || 'No Phone Link'}
                                </p>
                                {shipment.tracking_number && (
                                    <p className="text-[11px] text-[#94A3B8] mt-1 font-medium">
                                        Tracking #{shipment.tracking_number}
                                    </p>
                                )}
                            </div>
                            <div className="text-[#94A3B8] flex justify-start">
                                <PhoneIphoneIcon style={{ fontSize: '22px' }} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm md:col-span-2 flex flex-col justify-between min-h-[150px]">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Last Position</span>
                                {latestPing ? (
                                    <>
                                        <h3 className="text-sm font-bold text-[#0F172A] mt-1.5 leading-snug">
                                            {latestPing.date}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => focusLocation({ ...latestPing, title: 'Latest position' })}
                                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB]"
                                        >
                                            <MyLocationIcon sx={{ fontSize: 13 }} /> Show on map
                                        </button>
                                        <p className="text-[11px] text-[#94A3B8] mt-1 font-medium">
                                            {shipment.location_ping_count} ping{shipment.location_ping_count === 1 ? '' : 's'}
                                        </p>
                                    </>
                                ) : (
                                    <h3 className="text-sm font-bold text-[#94A3B8] mt-1.5 leading-snug">No pings yet</h3>
                                )}
                            </div>
                            <div className="text-[#94A3B8] flex justify-start">
                                <FlagOutlinedIcon style={{ fontSize: '22px' }} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm lg:col-span-4 flex flex-col sticky top-6 self-start">
                            <h3 className="text-base font-bold text-[#0F172A] mb-6 tracking-tight">Progress Tracker</h3>

                            {orderedStops.length === 0 ? (
                                <EmptyState message="Stop data not available." icon={<ListAltOutlinedIcon sx={{ fontSize: 28 }} />} />
                            ) : (
                                <div className="relative pl-8 border-l border-[#E2E8F0] space-y-6 ml-4 my-auto">
                                    {orderedStops.map((stop) => {
                                        // The driver app is the source of truth here: a stop is
                                        // done when they completed it, and current when they have
                                        // arrived but not finished.
                                        const isCompleted = Boolean(stop.progress?.completed_at);
                                        const isActive = Boolean(stop.progress?.arrived_at) && !isCompleted;

                                        return (
                                            <div className="relative" key={stop.id}>
                                                {isCompleted ? (
                                                    <div className="absolute -left-[45px] top-0 w-6 h-6 rounded-full bg-[#001A48] flex items-center justify-center z-10 border border-[#001A48]">
                                                        <CheckIcon style={{ fontSize: '14px', color: '#FFFFFF' }} />
                                                    </div>
                                                ) : isActive ? (
                                                    <div className="absolute -left-[45px] top-0 w-6 h-6 rounded-full bg-[#6366F1] flex items-center justify-center z-10 border border-[#6366F1] ring-4 ring-[#EEF2FF]">
                                                        <LocalShippingIcon style={{ fontSize: '12px', color: '#FFFFFF' }} />
                                                    </div>
                                                ) : (
                                                    <div className="absolute -left-[41px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#CBD5E1] z-10"></div>
                                                )}

                                                <div>
                                                    <span className={`text-xs font-bold uppercase tracking-wider block ${isActive ? 'text-[#6366F1]' : 'text-[#0F172A]'}`}>
                                                        Stop {stop.stop_number} — {stop.stop_type}
                                                    </span>
                                                    <span className={`text-xs mt-0.5 block font-semibold ${isActive ? 'text-[#334155]' : 'text-[#64748B]'}`}>
                                                        {stop.stop_name}
                                                    </span>
                                                    <span className="text-[11px] mt-0.5 block text-[#94A3B8] font-medium">
                                                        {stop.city}, {stop.state} {stop.zipcode}
                                                    </span>
                                                    {stop.start_date && (
                                                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#94A3B8] font-medium">
                                                            <CalendarMonthIcon style={{ fontSize: '13px', color: '#CBD5E1' }} />
                                                            <span>
                                                                {stop.start_date} {stop.start_time}
                                                                {stop.end_date ? ` → ${stop.end_date} ${stop.end_time || ''}` : ''}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* When the driver actually got there, against the plan above. */}
                                                    {stop.progress?.arrived_at && (
                                                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                            <span className="rounded bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#15803D]">
                                                                Arrived {stop.progress.arrived_at}
                                                            </span>
                                                            {stop.progress.arrival_lat && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        focusLocation({
                                                                            lat: stop.progress.arrival_lat,
                                                                            lng: stop.progress.arrival_lng,
                                                                            title: `Stop ${stop.stop_number} arrival`,
                                                                            subtitle: stop.progress.arrived_at
                                                                        })
                                                                    }
                                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2563EB]"
                                                                >
                                                                    <MyLocationIcon sx={{ fontSize: 12 }} /> Locate
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* What the driver answered to the custom
                                                        events added to this stop. Absent until
                                                        they reach it. */}
                                                    <StopEventAnswers answers={stop.event_answers} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-8 space-y-6">

                            <div
                                ref={mapWrapRef}
                                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden relative h-[440px]"
                            >
                                {isLoaded ? (
                                    <>
                                        <GoogleMap
                                            mapContainerStyle={containerStyle}
                                            center={mapCenter}
                                            zoom={driverPath.length > 1 || stopPoints.length > 1 ? 10 : 14}
                                            onLoad={handleMapLoad}
                                            options={{ streetViewControl: false, mapTypeControl: false }}
                                        >
                                            {/* The plan */}
                                            {stopPoints.length > 1 && (
                                                <Polyline path={stopPoints} options={plannedRouteOptions} />
                                            )}

                                            {/* What actually happened */}
                                            {driverPath.length > 1 && (
                                                <Polyline path={driverPath} options={driverTrailOptions} />
                                            )}

                                            {stopPoints.map((stop) => (
                                                <Marker
                                                    key={stop.id}
                                                    position={{ lat: stop.lat, lng: stop.lng }}
                                                    label={{
                                                        text: String(stop.stop_number),
                                                        color: '#FFFFFF',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title={`${stop.stop_type}: ${stop.stop_name || ''}`}
                                                    onClick={() =>
                                                        focusLocation({
                                                            lat: stop.lat,
                                                            lng: stop.lng,
                                                            title: `Stop ${stop.stop_number} — ${stop.stop_type}`,
                                                            subtitle: stop.stop_name
                                                        })
                                                    }
                                                />
                                            ))}

                                            {/* Where the driver checked in */}
                                            {arrivalPoints.map((point) => (
                                                <Marker
                                                    key={point.id}
                                                    position={{ lat: point.lat, lng: point.lng }}
                                                    title={`Arrived at stop ${point.stop_number}: ${point.arrived_at}`}
                                                    icon={{
                                                        path: window.google.maps.SymbolPath.CIRCLE,
                                                        scale: 7,
                                                        fillColor: '#16A34A',
                                                        fillOpacity: 1,
                                                        strokeColor: '#FFFFFF',
                                                        strokeWeight: 2
                                                    }}
                                                    onClick={() =>
                                                        focusLocation({
                                                            lat: point.lat,
                                                            lng: point.lng,
                                                            title: `Stop ${point.stop_number} arrival`,
                                                            subtitle: point.arrived_at
                                                        })
                                                    }
                                                />
                                            ))}

                                            {/* Latest reported position */}
                                            {latestPing && (
                                                <Marker
                                                    position={{ lat: latestPing.lat, lng: latestPing.lng }}
                                                    title={`Last seen ${latestPing.date}`}
                                                    zIndex={999}
                                                    icon={{
                                                        path: window.google.maps.SymbolPath.CIRCLE,
                                                        scale: 9,
                                                        fillColor: '#2563EB',
                                                        fillOpacity: 1,
                                                        strokeColor: '#FFFFFF',
                                                        strokeWeight: 3
                                                    }}
                                                    onClick={() =>
                                                        focusLocation({ ...latestPing, title: 'Latest position' })
                                                    }
                                                />
                                            )}

                                            {focused && (
                                                <InfoWindow
                                                    position={{ lat: focused.lat, lng: focused.lng }}
                                                    onCloseClick={() => setFocused(null)}
                                                >
                                                    <div className="min-w-[150px] px-0.5 py-0.5">
                                                        <p className="text-[12px] font-bold text-[#0F172A]">
                                                            {focused.title || 'Reported position'}
                                                        </p>
                                                        {focused.subtitle && (
                                                            <p className="mt-0.5 text-[11px] font-medium text-[#475569]">
                                                                {focused.subtitle}
                                                            </p>
                                                        )}
                                                        {focused.date && (
                                                            <p className="mt-0.5 text-[11px] font-medium text-[#475569]">
                                                                {focused.date}
                                                            </p>
                                                        )}
                                                        <p className="mt-1 font-mono text-[10px] text-[#64748B]">
                                                            {focused.lat.toFixed(6)}, {focused.lng.toFixed(6)}
                                                        </p>
                                                        {focused.accuracy != null && (
                                                            <p className="text-[10px] font-medium text-[#94A3B8]">
                                                                accurate to ±{Math.round(focused.accuracy)} m
                                                            </p>
                                                        )}
                                                    </div>
                                                </InfoWindow>
                                            )}
                                        </GoogleMap>

                                        {/* Legend, plus a way back out of a focused point. */}
                                        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                                                <span className="h-0.5 w-4 bg-[#2563EB]" /> Driver trail
                                            </span>
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                                                <span className="h-0.5 w-4 border-t-2 border-dashed border-[#94A3B8]" /> Planned
                                            </span>
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#475569]">
                                                <span className="h-2 w-2 rounded-full bg-[#16A34A]" /> Arrival
                                            </span>
                                        </div>

                                        {focused && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFocused(null);
                                                    fitToLoad();
                                                }}
                                                className="absolute top-3 right-3 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-bold text-[#0F172A] shadow-sm backdrop-blur hover:bg-white"
                                            >
                                                Fit whole route
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-[#F1F5F9] animate-pulse" />
                                )}
                            </div>

                            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden w-full">
                                <div className="border-b border-[#F1F5F9] p-3 bg-[#F8F9FA]">
                                    <Tabs
                                        value={activeTab}
                                        onChange={(e, value) => setActiveTab(value)}
                                        variant="scrollable"
                                        scrollButtons={false}
                                        sx={{
                                            background: '#F1F5F9',
                                            borderRadius: '999px',
                                            padding: '4px',
                                            minHeight: '44px',
                                            '& .MuiTabs-indicator': {
                                                display: 'none'
                                            },
                                            '& .MuiTab-root': {
                                                minHeight: '36px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                textTransform: 'none',
                                                color: '#475569',
                                                borderRadius: '999px',
                                                padding: '6px 16px',
                                                marginRight: '6px'
                                            },
                                            '& .MuiTab-root.Mui-selected': {
                                                backgroundColor: '#FFFFFF',
                                                color: '#013178',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                                            },
                                        }}
                                    >
                                        <Tab label="Tripsheet" icon={<ListAltOutlinedIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                        <Tab
                                            label={`Location History${locationHistory.length ? ` (${locationHistory.length})` : ''}`}
                                            icon={<ReceiptIcon style={{ fontSize: '16px' }} />}
                                            iconPosition="start"
                                        />
                                        <Tab label="Driver App" icon={<BadgeOutlinedIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                        <Tab label="Load Details" icon={<DnsOutlinedIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                        <Tab label="Notes" icon={<RateReviewOutlinedIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                        <Tab label="Driver Chat" icon={<ChatBubbleOutlineIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                        <Tab label="Documents" icon={<ReceiptLongIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                    </Tabs>
                                </div>

                                <div className="p-6">
                                    {activeTab === TAB_TRIPSHEET && <ShipmentStops shipment={shipment} />}

                                    {activeTab === TAB_LOCATIONS && (
                                        <LocationHistory
                                            location_history={locationHistory}
                                            onSelect={(point) => focusLocation({ ...point, title: 'Reported position' })}
                                            selectedId={focused?.id}
                                        />
                                    )}

                                    {activeTab === TAB_DRIVER && (
                                        <DriverActivity shipment={shipment} onFocusLocation={focusLocation} />
                                    )}

                                    {activeTab === TAB_LOAD && (
                                        <Box className="p-1">
                                            <ShipmentDetails shipment={shipment} />
                                        </Box>
                                    )}

                                    {activeTab === TAB_NOTES && (
                                        <Box className="p-1">
                                            {shipment.notes ? (
                                                <p className="text-sm text-[#475569] bg-[#F8F9FA] p-5 rounded-xl border border-[#E2E8F0] leading-relaxed font-medium">
                                                    {(shipment.notes || '').replace(/<[^>]*>/g, '').trim()}
                                                </p>
                                            ) : (
                                                <EmptyState message="Notes not available." icon={<RateReviewOutlinedIcon sx={{ fontSize: 28 }} />} />
                                            )}
                                        </Box>
                                    )}

                                    {activeTab === TAB_CHAT && (
                                        <Box className="p-1">
                                            <ShipmentChat
                                                shipmentUuid={shipment.uuid}
                                                driverName={driverName}
                                            />
                                        </Box>
                                    )}

                                    {activeTab === TAB_DOCS && (
                                        <Box className="p-1">
                                            {shipment.documents?.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                                    {shipment.documents.map((doc, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={doc.document_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex flex-col items-center justify-center p-5 bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl hover:bg-[#F1F5F9] transition text-[#94A3B8] hover:text-[#475569]"
                                                        >
                                                            <AttachFileIcon className="mb-1.5" style={{ fontSize: '20px' }} />
                                                            <span className="text-[11px] font-bold text-[#64748B]">Document {idx + 1}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <EmptyState message="Documents not available." icon={<ReceiptLongIcon sx={{ fontSize: 28 }} />} />
                                            )}
                                        </Box>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            )}
        </div>
    );
}

export default ControlTowerShipment;
