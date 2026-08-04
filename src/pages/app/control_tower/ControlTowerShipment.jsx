import React, { useState, useEffect, useRef } from 'react';
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
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ShareIcon from '@mui/icons-material/Share';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckIcon from '@mui/icons-material/Check';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

import ShipmentDetails from './ShipmentDetails';
import ShipmentStops from './ShipmentStops';
import LocationHistory from './LocationHistory';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';

import { apiFetch } from '../../../lib/api';

const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: '380px'
};

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

const polylineOptions = {
    strokeColor: '#2563EB',
    strokeOpacity: 0.8,
    strokeWeight: 4,
    fillColor: '#2563EB',
    fillOpacity: 0.35,
    clickable: false,
    draggable: false,
    editable: false,
    visible: true,
    radius: 30000,
    zIndex: 1
};

function ControlTowerShipment() {
    const { row_id: paramRowId } = useParams();

    const [loading, setLoading] = useState(true);
    const [redirect, setRedirect] = useState(false);
    const [shipment, setShipment] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [route, setRoute] = useState([
        { lat: 46.65725559308588, lng: -105.68787278650479 }
    ]);
    const [locationHistory, setLocationHistory] = useState([]);

    const loadTimerRef = useRef(null);
    const pulseTimerRef = useRef(null);
    const lastPulseRef = useRef(false);
    const mapRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY
    });

    const init = async (row_id, initing) => {
        setLoading(initing);

        try {
            const data = await apiFetch(`/shipments/${row_id}`);

            if (data.status) {
                const shipmentData = data.data;
                setShipment(shipmentData);

                if (shipmentData.stops && shipmentData.stops.length > 0) {
                    const orderedStops = [...shipmentData.stops].sort(
                        (a, b) => a.stop_number - b.stop_number
                    );

                    const stopCoords = orderedStops
                        .filter((stop) => stop.latitude && stop.longitude)
                        .map((stop) => ({
                            lat: parseFloat(stop.latitude),
                            lng: parseFloat(stop.longitude)
                        }));

                    if (stopCoords.length > 0) {
                        setRoute(stopCoords);
                    }

                    const stopLocationHistory = orderedStops
                        .filter((stop) => stop.latitude && stop.longitude)
                        .map((stop) => ({
                            lat: parseFloat(stop.latitude),
                            lng: parseFloat(stop.longitude),
                            date: `${stop.start_date} ${stop.start_time}`
                        }));

                    setLocationHistory(stopLocationHistory);
                }

                if (shipmentData.status === 'in_transit' || shipmentData.status === 'draft') {
                    if (loadTimerRef.current === null) {
                        reloadShipment(row_id);
                    }
                } else if (shipmentData.status === 'delivered') {
                    if (loadTimerRef.current) clearInterval(loadTimerRef.current);
                    loadTimerRef.current = null;
                    if (pulseTimerRef.current === null) {
                        reloadPulses(row_id);
                    }
                }

                setLoading(false);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to load shipment:', error);
            setLoading(false);
        }
    };

    const loadPulses = (row_id, initing) => {
        setLoading(initing);

        const params = new URLSearchParams({ row_id });
        if (lastPulseRef.current !== false) {
            params.append('last_pulse', lastPulseRef.current);
        }

        apiFetch(`/shipment/tracking/pulses?${params.toString()}`)
            .then((data) => {
                if (!data.status) {
                    setLoading(false);
                    return;
                }

                const numericCoords = data.coords.map((item) => ({
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lng)
                }));

                if (lastPulseRef.current !== false) {
                    setRoute((prev) => [...prev, ...numericCoords]);
                } else {
                    setRoute(numericCoords);
                }

                if (data.pulses.length > 0) {
                    lastPulseRef.current = data.pulses[data.pulses.length - 1]['id'];
                }

                const location_history_coords = data.coords.map((item) => ({
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lng),
                    date: item.date
                }));

                if (lastPulseRef.current !== false) {
                    setLocationHistory((prev) => [...prev, ...location_history_coords]);
                } else {
                    setLocationHistory(location_history_coords);
                }

                if (data.shipment.status == '4') {
                    init(row_id, false);
                    clearInterval(pulseTimerRef.current);
                    pulseTimerRef.current = null;
                }
            })
            .catch((err) => {
                console.error('Failed to load pulses:', err);
                setLoading(false);
            });
    };

    const reloadShipment = (row_id) => {
        loadTimerRef.current = setInterval(() => {
            init(row_id, false);
        }, 10000);
    };

    const reloadPulses = (row_id) => {
        pulseTimerRef.current = setInterval(() => {
            loadPulses(row_id, false);
        }, 10000);
    };

    useEffect(() => {
        if (paramRowId) {
            init(paramRowId, true);
        } else {
            setRedirect('/control-tower');
        }

        return () => {
            if (loadTimerRef.current) clearInterval(loadTimerRef.current);
            if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
            loadTimerRef.current = null;
            pulseTimerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMapLoad = (map) => {
        mapRef.current = map;
        if (route.length > 1 && window.google) {
            const bounds = new window.google.maps.LatLngBounds();
            route.forEach((point) => bounds.extend(point));
            map.fitBounds(bounds);
        }
    };

    if (redirect !== false) {
        return <Navigate to={redirect} />;
    }

    let matchedDriverName = shipment.driver_phone_1
        ? (shipment.driver_type === 'company_driver' ? 'Company Driver' : 'Driver')
        : 'Unassigned';
    let latestStatusLabel = shipment.status
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
                                    {shipment.carrier_name || 'Unassigned'}
                                </h3>
                            </div>
                            <div className="text-[#94A3B8] flex justify-start">
                                <LocalShippingOutlinedIcon style={{ fontSize: '22px', strokeWidth: '1.5' }} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm md:col-span-3 flex flex-col justify-between min-h-[150px]">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Driver Contact</span>
                                <h3 className="text-sm font-bold text-[#0F172A] mt-1.5">{matchedDriverName}</h3>
                                <p className="text-xs text-[#64748B] mt-1.5 font-medium">
                                    {shipment.country_code || ''} {shipment.driver_phone_1 || 'No Phone Link'}
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
                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Tracking Method</span>
                                <h3 className="text-sm font-bold text-[#0F172A] mt-1.5 leading-snug">
                                    {shipment.tracking_method
                                        ? shipment.tracking_method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                                        : 'Not Set'}
                                </h3>
                                {shipment.truck_number && (
                                    <p className="text-xs text-[#64748B] mt-1.5 font-medium">Truck: <span className="text-[#334155] font-semibold">{shipment.truck_number}</span></p>
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

                            {!shipment.stops || shipment.stops.length === 0 ? (
                                <EmptyState message="Stop data not available." icon={<ListAltOutlinedIcon sx={{ fontSize: 28 }} />} />
                            ) : (
                                <div className="relative pl-8 border-l border-[#E2E8F0] space-y-6 ml-4 my-auto">
                                    {[...shipment.stops]
                                        .sort((a, b) => a.stop_number - b.stop_number)
                                        .map((stop, index, sortedStops) => {
                                            const isCompleted =
                                                shipment.status === 'delivered' ||
                                                (shipment.status === 'in_transit' && index < sortedStops.length - 1);
                                            const isActive =
                                                shipment.status === 'in_transit' && index === sortedStops.length - 1;

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
                                                                <span>{stop.start_date} {stop.start_time}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-8 space-y-6">

                            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden relative h-[440px]">
                                {isLoaded ? (
                                    <GoogleMap
                                        mapContainerStyle={containerStyle}
                                        center={route[0]}
                                        zoom={route.length > 1 ? 10 : 14}
                                        onLoad={handleMapLoad}
                                    >
                                        <Polyline
                                            path={route}
                                            options={polylineOptions}
                                        />
                                        {shipment.stops && [...shipment.stops]
                                            .sort((a, b) => a.stop_number - b.stop_number)
                                            .filter((stop) => stop.latitude && stop.longitude)
                                            .map((stop) => (
                                                <Marker
                                                    key={stop.id}
                                                    position={{
                                                        lat: parseFloat(stop.latitude),
                                                        lng: parseFloat(stop.longitude)
                                                    }}
                                                    label={{
                                                        text: String(stop.stop_number),
                                                        color: '#FFFFFF',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold'
                                                    }}
                                                    title={`${stop.stop_type}: ${stop.stop_name}`}
                                                />
                                            ))}
                                    </GoogleMap>
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
                                        <Tab label="Location History" icon={<ReceiptIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                        <Tab label="Load Details" icon={<DnsOutlinedIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                        <Tab label="Notes" icon={<RateReviewOutlinedIcon style={{ fontSize: '16px' }} />} iconPosition="start" />
                                    </Tabs>
                                </div>

                                <div className="p-6">
                                    {activeTab === 0 && (
                                        <ShipmentStops shipment={shipment} />
                                    )}

                                    {activeTab === 1 && (
                                        <>
                                            {locationHistory.length > 0 ? (
                                                <LocationHistory location_history={locationHistory} />
                                            ) : (
                                                <NoData size="small" message="Data not available." icon={<ReceiptIcon />} />
                                            )}
                                        </>
                                    )}

                                    {activeTab === 2 && (
                                        <Box className="p-1">
                                            <ShipmentDetails shipment={shipment} />
                                        </Box>
                                    )}

                                    {activeTab === 3 && (
                                        <Box className="p-1">
                                            {shipment.notes ? (
                                                <p className="text-sm text-[#475569] bg-[#F8F9FA] p-5 rounded-xl border border-[#E2E8F0] leading-relaxed font-medium">
                                                    {(shipment.notes || '').replace(/<[^>]*>/g, '').trim()}
                                                </p>
                                            ) : (
                                                <NoData size="small" message="Notes not available." icon={<RateReviewOutlinedIcon />} />
                                            )}
                                        </Box>
                                    )}

                                    {activeTab === 4 && (
                                        <NoData size="small" message="Status data not available." icon={<ChecklistOutlinedIcon />} />
                                    )}

                                    {activeTab === 5 && (
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
                                                <NoData size="small" message="Documents not available." icon={<ReceiptLongIcon />} />
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