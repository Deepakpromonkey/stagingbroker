import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

import TimelineIcon          from '@mui/icons-material/Timeline';
import ApartmentIcon         from '@mui/icons-material/Apartment';      
import ReportProblemIcon     from '@mui/icons-material/ReportProblem';   
import WarningAmberIcon      from '@mui/icons-material/WarningAmber';    
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutlineOutlined';

// Fills whatever height the wrapping div is given via Tailwind classes below,
// so the map itself can shrink on mobile/tablet without touching the
// original fixed 480px desktop height.
const containerStyle = {
    width: '100%',
    height: '100%'
};

const MARKER_ICONS = {
    HQ: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: '#1d4ed8',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.5,
        anchor: { x: 12, y: 22 }
    },
    CRASH: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z',
        fillColor: '#dc2626',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.5,
        anchor: { x: 12, y: 22 }
    },
    VIOLATION: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z',
        fillColor: '#f59e0b',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.5,
        anchor: { x: 12, y: 22 }
    },
    CLEAN: {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm-2 11l-3-3 1.41-1.41L10 11.17l4.59-4.58L16 8l-6 6z',
        fillColor: '#10b981',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.5,
        anchor: { x: 12, y: 22 }
    }
};

const TYPE_ICON_MAP = {
    HQ:        <ApartmentIcon         sx={{ fontSize: 14 }} />,
    CRASH:     <ReportProblemIcon     sx={{ fontSize: 14 }} />,
    VIOLATION: <WarningAmberIcon      sx={{ fontSize: 14 }} />,
    CLEAN:     <CheckCircleOutline sx={{ fontSize: 14 }} />
};

const geocodeCache = {};


function OperationalObservations({ data }) {
    const [timeframe, setTimeframe] = useState('6M');

    const [mapPoints,    setMapPoints]    = useState([]);
    const [activeWindow, setActiveWindow] = useState(null);
    const mapRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_API_KEY
    });

    const geocodeAddress = useCallback((addressString) => {
        if (geocodeCache[addressString]) {
            return Promise.resolve(geocodeCache[addressString]);
        }
        return new Promise((resolve, reject) => {
            if (!window.google?.maps) {
                return reject('Google Maps scripts context unavailable');
            }
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: addressString }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const coords = {
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    };
                    geocodeCache[addressString] = coords;
                    resolve(coords);
                } else {
                    reject(status);
                }
            });
        });
    }, []);

    // Stable across renders for a given timeframe so it can safely be an effect dependency
    const filterByTimeframe = useCallback((items, dateField) => {
        const now = new Date();

        return items.filter(item => {
            if (!item[dateField]) return false;

            const itemDate = new Date(item[dateField]);
            const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);

            switch (timeframe) {
                case '7D':
                    return diffDays <= 7;
                case '3M':
                    return diffDays <= 90;
                case '6M':
                    return diffDays <= 180;
                case '1Y':
                    return diffDays <= 365;
                case 'ALL':
                    return true;
                default:
                    return true;
            }
        });
    }, [timeframe]);

    useEffect(() => {
        if (!data || !isLoaded) return;

        const rawPayload = data;
        let cancelled = false;

        const processMapPoints = async () => {
            
            const tasks = [];

            // 1. Headquarters
            if (rawPayload.physical_address) {
                const hq = rawPayload.physical_address;
                const hqAddrString = `${hq.street}, ${hq.city}, ${hq.state} ${hq.zip}`;
                tasks.push(
                    geocodeAddress(hqAddrString)
                        .then((coords) => ({
                            id:       `hq-${rawPayload.id}`,
                            type:     'HQ',
                            position: coords,
                            title:    rawPayload.company_name,
                            subtitle: `${hq.street}, ${hq.city}`,
                            icon:     MARKER_ICONS.HQ,
                            meta: {
                                'DOT Number':   rawPayload.dot_number,
                                'DBA Unit':     rawPayload.dba_name  || 'N/A',
                                'Power Units':  rawPayload.power_unit,
                                'Total Drivers': rawPayload.driver_total
                            }
                        }))
                        .catch((err) => {
                            console.error('Failed to parse Headquarters location data:', err);
                            return null;
                        })
                );
            }

            // 2. Crashes
            const filteredCrashes = filterByTimeframe(
                rawPayload.crash_details || [],
                'transaction_date'
            );

            filteredCrashes.forEach((crashItem) => {
                const crashAddrString = `${crashItem.location}, ${crashItem.city}, ${crashItem.state}`;
                tasks.push(
                    geocodeAddress(crashAddrString)
                        .then((coords) => ({
                            id:       `crash-${crashItem.id}`,
                            type:     'CRASH',
                            position: coords,
                            title:    `Crash Event #${crashItem.crash_id}`,
                            subtitle: `📍 Road: ${crashItem.location}`,
                            icon:     MARKER_ICONS.CRASH,
                            meta: {
                                'Reporting Agency': crashItem.agency,
                                'Fatalities':       crashItem.fatalities,
                                'Injuries':         crashItem.injuries,
                                'Tow Away Status':  crashItem.tow_away ? 'Yes' : 'No',
                                'Impact Sequence':  crashItem.crash_event_seq_id_desc || 'N/A'
                            }
                        }))
                        .catch((err) => {
                            console.error('Failed to parse Crash coordinates:', err);
                            return null;
                        })
                );
            });

            // 3. Inspections
            const filteredInspections = filterByTimeframe(
                rawPayload.inspections || [],
                'insp_date'
            );

            filteredInspections.forEach((insp, i) => {
                const matchingViolations = insp.violation_details || [];
                const hasViolations    = matchingViolations.length > 0;
                const inspAddrString = `${insp.county_code_state || insp.report_state || 'NE'}, USA`;

                tasks.push(
                    geocodeAddress(inspAddrString)
                        .then((baseCoords) => {
                            // Subtle jitter so stacked pins remain distinct
                            const variance = i * 0.025;
                            const adjustedCoords = {
                                lat: baseCoords.lat + (i % 2 === 0 ?  variance : -variance),
                                lng: baseCoords.lng + (i % 2 !== 0 ?  variance : -variance)
                            };

                            return {
                                id:             `insp-${insp.id}`,
                                type:           hasViolations ? 'VIOLATION' : 'CLEAN',
                                position:       adjustedCoords,
                                title:          `Inspection ${insp.report_number}`,
                                subtitle:       `Level ${insp.insp_level_id} • Unit: ${insp.unit_type_desc}`,
                                icon:           hasViolations ? MARKER_ICONS.VIOLATION : MARKER_ICONS.CLEAN,
                                violationsList: matchingViolations,
                                meta: {
                                    'Equipment Make':    insp.unit_make || 'N/A',
                                    'License Plate':     `${insp.unit_license || ''} (${insp.unit_license_state || ''})`,
                                    'Out of Service total': insp.oos_total || 0,
                                    'Violations Found':  matchingViolations.length
                                }
                            };
                        })
                        .catch((err) => {
                            console.error('Failed to parse inspection pinpoint:', err);
                            return null;
                        })
                );
            });

            const settled = await Promise.all(tasks);
            if (cancelled) return;

            const generatedPoints = settled.filter(Boolean);
            setMapPoints(generatedPoints);

            // Auto-fit camera
            if (mapRef.current && generatedPoints.length > 0) {
                const bounds = new window.google.maps.LatLngBounds();
                generatedPoints.forEach(p => bounds.extend(p.position));
                mapRef.current.fitBounds(bounds);
            }
        };

        processMapPoints();

        return () => {
            cancelled = true;
        };
    }, [data, isLoaded, geocodeAddress, filterByTimeframe]);

    const handleMapLoad = useCallback((mapInstance) => {
        mapRef.current = mapInstance;
        if (mapPoints.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            mapPoints.forEach(p => bounds.extend(p.position));
            mapInstance.fitBounds(bounds);
        }
    }, [mapPoints]);

    const carrierData = data || {};

    const stats = useMemo(() => {
    const verifiedInspections = filterByTimeframe(
        carrierData.inspections || [],
        'insp_date'
    );

    const verifiedCrashes = filterByTimeframe(
        carrierData.crash_details || [],
        'transaction_date'
    );

    const totalInspectionsCount = verifiedInspections.length;

    const cleanInspectionsCount = verifiedInspections.filter(
        i => (i.basic_viol ?? 0) === 0
    ).length;

    const violationInspectionsCount = verifiedInspections.filter(
        i => (i.basic_viol ?? 0) > 0
    ).length;

    const combinedOos = verifiedInspections.reduce(
        (sum, i) => sum + (i.oos_total || 0),
        0
    );

    const towAwayCrashesCount = verifiedCrashes.filter(
        c => c.tow_away === true || c.tow_away === 'true'
    ).length;

    const injuryCrashesCount = verifiedCrashes.filter(
        c => (c.injuries ?? 0) > 0
    ).length;

    const cleanRatePercentage =
        totalInspectionsCount > 0
            ? `${Math.round((cleanInspectionsCount / totalInspectionsCount) * 100)}%`
            : '0%';

    return {
        totalInspectionsCount,
        combinedOos,
        cleanInspectionsCount,
        violationInspectionsCount,
        towAwayCrashesCount,
        injuryCrashesCount,
        cleanRatePercentage
    };
}, [carrierData, filterByTimeframe]);

    const {
        totalInspectionsCount,
        combinedOos,
        cleanInspectionsCount,
        violationInspectionsCount,
        towAwayCrashesCount,
        injuryCrashesCount,
        cleanRatePercentage
    } = stats;

    const timeframes = ['7D', '3M', '6M', '1Y', 'ALL'];

    return (
        <div className='overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-white shadow-sm'>

            <div className='flex flex-col gap-[16px] px-[18px] py-[18px] sm:flex-row sm:items-center sm:justify-between sm:px-[24px] sm:py-[22px] xl:px-[32px] xl:py-[24px]'>
                <div className='flex items-center gap-[10px] text-[#1656b8]'>
                    <TimelineIcon sx={{ fontSize: 20 }} />
                    <span className='text-[12px] font-[800] uppercase tracking-tight sm:text-[13px]'>
                        Operational Observations
                    </span>
                </div>

                <div className='flex w-full rounded-[8px] border border-[#d9e1ee] p-[3px] sm:w-fit'>
                    {timeframes.map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`flex-1 rounded-[6px] px-[8px] py-[7px] text-[9.5px] font-[700] transition-all sm:flex-none sm:px-[16px] sm:text-[10px] ${
                                timeframe === tf
                                    ? 'bg-[#3b82f6] text-white shadow-sm'
                                    : 'text-[#64748b] hover:bg-gray-50'
                            }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            <div className='relative border-t border-[#d9e1ee]'>
                <div className='overflow-hidden h-[240px] sm:h-[340px] xl:h-[480px]'>
                    {isLoaded ? (
                       <GoogleMap
                            mapContainerStyle={containerStyle}
                            onLoad={handleMapLoad}
                            onClick={() => setActiveWindow(null)}
                            options={{
                                gestureHandling: 'cooperative'
                            }}
                        >
                            {mapPoints.map((point) => (
                               <MarkerF
                                    key={point.id}
                                    position={point.position}
                                    icon={point.icon}
                                    onClick={() => {
                                        setActiveWindow(point);
                                    }}
                                />
                            ))}

                            {activeWindow && (
                                <InfoWindowF
                                    position={activeWindow.position}
                                    onCloseClick={() => setActiveWindow(null)}
                                >
                                   <div className='w-[250px] sm:w-[310px] rounded-[16px] bg-white text-slate-800 overflow-hidden'>
                                        {/* Type badge */}
                                        <div className='flex items-center gap-1.5 mb-1.5'>
                                            <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider text-white
                                                ${activeWindow.type === 'HQ'        ? 'bg-blue-600'   : ''}
                                                ${activeWindow.type === 'CRASH'     ? 'bg-red-600'    : ''}
                                                ${activeWindow.type === 'VIOLATION' ? 'bg-amber-500'  : ''}
                                                ${activeWindow.type === 'CLEAN'     ? 'bg-emerald-600': ''}
                                            `}>
                                                {TYPE_ICON_MAP[activeWindow.type]}
                                                {activeWindow.type}
                                            </span>
                                        </div>

                                        <h4 className='text-[14px] sm:text-[15px] font-[800] text-slate-900 leading-tight'>
                                            {activeWindow.title}
                                        </h4>
                                       <p className='mt-[4px] text-[11.5px] sm:text-[12px] text-slate-500'>
                                            {activeWindow.subtitle}
                                        </p>

                                        <div className='grid grid-cols-2 gap-[8px] mt-[14px]'>
                                            {Object.entries(activeWindow.meta).map(([key, value]) => (
                                                <div
                                                    key={key}
                                                    className='rounded-[10px] border border-slate-200 bg-slate-50 p-[8px]'
                                                >
                                                    <div className='text-[9px] font-[700] uppercase tracking-wide text-slate-400'>
                                                        {key}
                                                    </div>

                                                    <div className='mt-[2px] text-[12px] font-[700] text-slate-800'>
                                                        {value}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {activeWindow.violationsList?.length > 0 && (
                                            <div className='border-t border-dashed border-slate-200 mt-2 pt-1.5'>
                                                <span className='text-[10px] font-extrabold text-amber-600 uppercase tracking-wide flex items-center gap-1 mb-1'>
                                                    <WarningAmberIcon sx={{ fontSize: 12 }} />
                                                    Violations Breakdown ({activeWindow.violationsList.length})
                                                </span>
                                                <div className='flex flex-col gap-1 max-h-[100px] overflow-y-auto pr-1'>
                                                    {activeWindow.violationsList.map((v) => (
                                                        <div
                                                            key={v.id}
                                                            className='rounded-[10px] border border-amber-200 bg-amber-50 px-[10px] py-[8px]'
                                                        >
                                                        <div className='text-[11px] font-[800] text-amber-900'>
                                                            {v.group_desc}
                                                        </div>

                                                        <div className='mt-[4px] text-[10px] leading-[1.4] text-slate-600'>
                                                            {v.section_desc}
                                                        </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </InfoWindowF>
                            )}
                        </GoogleMap>
                    ) : (
                        <div className='h-full w-full animate-pulse bg-gray-50' />
                    )}
                </div>

                <div className='relative z-10 -mt-[14px] px-[12px] sm:-mt-[18px] sm:px-[18px] lg:absolute lg:inset-x-[24px] lg:top-full lg:z-10 lg:-translate-y-1/2 lg:mt-0 lg:px-0'>
                    <div className='rounded-[14px] border border-[#e5e7eb] bg-[#f8fafc] px-[14px] py-[16px] sm:px-[18px] sm:py-[18px] xl:px-[22px]'>
                        <div className='grid grid-cols-1 gap-[18px] lg:grid-cols-12 lg:items-center'>

                            <div className='lg:col-span-3'>
                                <p className='mb-[12px] text-[10px] font-[800] uppercase tracking-[1.5px] text-[#94a3b8] sm:text-[11px]'>
                                    Inspections Matrix
                                </p>
                                <div className='flex flex-wrap gap-[14px]'>
                                    <span className='flex items-center gap-[6px] text-[11px] font-[700] text-[#475569]'>
                                        <CheckCircleOutline sx={{ fontSize: 10, color: '#10b981' }} />
                                        {cleanInspectionsCount} CLN
                                    </span>
                                    <span className='flex items-center gap-[6px] text-[11px] font-[700] text-[#475569]'>
                                        <WarningAmberIcon sx={{ fontSize: 10, color: '#f59e0b' }} />
                                        {violationInspectionsCount} VIO
                                    </span>
                                    <span className='flex items-center gap-[6px] text-[11px] font-[700] text-[#475569]'>
                                        <ReportProblemIcon sx={{ fontSize: 10, color: '#ef4444' }} />
                                        {combinedOos} OOS
                                    </span>
                                </div>
                            </div>

                            <div className='lg:col-span-3 lg:pl-[10px]'>
                                <p className='mb-[12px] text-[10px] font-[800] uppercase tracking-[1.5px] text-[#94a3b8] sm:text-[11px]'>
                                    Crash Telemetry
                                </p>
                                <div className='flex flex-wrap gap-[14px]'>
                                    <span className='flex items-center gap-[6px] text-[11px] font-[700] text-[#475569]'>
                                        <WarningAmberIcon sx={{ fontSize: 10, color: '#f59e0b' }} />
                                        {towAwayCrashesCount} TOW
                                    </span>
                                    <span className='flex items-center gap-[6px] text-[11px] font-[700] text-[#475569]'>
                                        <ReportProblemIcon sx={{ fontSize: 10, color: '#ef4444' }} />
                                        {injuryCrashesCount} INJ
                                    </span>
                                </div>
                            </div>

                            <div className='lg:col-span-6'>
                                <div className='grid grid-cols-3 items-center rounded-[12px] border border-[#e5e7eb] bg-[#f8fafc] px-[8px] py-[10px] sm:px-[10px]'>
                                    <div className='text-center'>
                                        <p className='text-[18px] font-[800] leading-none text-[#0f172a] sm:text-[20px] xl:text-[24px]'>
                                            {totalInspectionsCount}
                                        </p>
                                        <p className='mt-[4px] text-[8.5px] font-[800] uppercase leading-[1.2] tracking-[0.5px] text-[#94a3b8] sm:text-[9px] xl:text-[10px]'>
                                            Total <br /> Insp
                                        </p>
                                    </div>
                                    <div className='flex items-center justify-center'>
                                        <div className='h-[36px] w-[1px] bg-[#dbe2ea] xl:h-[42px]' />
                                        <div className='mx-auto text-center'>
                                            <p className='text-[18px] font-[800] leading-none text-[#0f172a] sm:text-[20px] xl:text-[24px]'>
                                                {cleanRatePercentage}
                                            </p>
                                            <p className='mt-[4px] text-[8.5px] font-[800] uppercase leading-[1.2] tracking-[0.5px] text-[#94a3b8] sm:text-[9px] xl:text-[10px]'>
                                                Clean <br /> Rate
                                            </p>
                                        </div>
                                        <div className='h-[36px] w-[1px] bg-[#dbe2ea] xl:h-[42px]' />
                                    </div>
                                    <div className='text-center'>
                                        <p className='text-[18px] font-[800] leading-none text-[#f97316] sm:text-[20px] xl:text-[24px]'>
                                            {combinedOos}
                                        </p>
                                        <p className='mt-[4px] text-[8.5px] font-[800] uppercase leading-[1.2] tracking-[0.5px] text-[#94a3b8] sm:text-[9px] xl:text-[10px]'>
                                            Out of <br /> Svc
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div className='hidden lg:block lg:h-[120px]' />
        </div>
    );
}

export default OperationalObservations;