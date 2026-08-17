import React, { useState, useEffect, useCallback } from 'react';

import MyLocationIcon from '@mui/icons-material/MyLocation';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import TextSnippetOutlinedIcon from '@mui/icons-material/TextSnippetOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

/*
| Everything the driver's phone recorded, in the order a broker reads it:
| who they are, whether their identity and equipment checked out, then what
| happened at each stop.
|
| Any coordinate the driver captured is a button — it drops the map at the top
| of the page onto that exact point, so "where did he say he arrived?" is one
| click rather than a copy-paste into Google Maps.
|
| Every photo opens in a shared lightbox instead of a bare new tab, so the
| broker can flip between what the driver actually captured without losing
| their place on the page.
*/

const dash = <span className="text-[#CBD5E1]">—</span>;

/* ------------------------------------------------------------------ */
/*  Lightbox — a single shared full-screen viewer for every photo here  */
/* ------------------------------------------------------------------ */

function ImageLightbox({ image, onClose }) {
    useEffect(() => {
        if (!image) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [image, onClose]);

    if (!image) return null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm p-3 sm:p-6 animate-[fadeIn_0.15s_ease-out]"
            onClick={onClose}
        >
            <div
                className="relative flex max-h-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-4 border-b border-[#F1F5F9] px-4 sm:px-5 py-3">
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#0F172A] truncate">{image.label}</p>
                        {image.subtitle && (
                            <p className="text-[11px] font-medium text-[#94A3B8] truncate">{image.subtitle}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <a
                            href={image.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                            title="Open in new tab"
                        >
                            <OpenInNewIcon sx={{ fontSize: 17 }} />
                        </a>
                        {/* <a
                            href={image.url}
                            download
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                            title="Download"
                        >
                            <DownloadOutlinedIcon sx={{ fontSize: 17 }} />
                        </a> */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#FEE2E2] hover:text-[#B91C1C]"
                            title="Close"
                        >
                            <CloseIcon sx={{ fontSize: 18 }} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-center overflow-auto bg-[#0F172A]/[0.03] p-3 sm:p-4">
                    <img
                        src={image.url}
                        alt={image.label}
                        className="max-h-[60vh] sm:max-h-[70vh] w-auto rounded-lg object-contain shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
}

/** A recorded coordinate, clickable straight through to the map. */
function CoordButton({ lat, lng, label, onFocus }) {
    if (lat == null || lng == null || lat === '' || lng === '') return null;

    const point = { lat: Number(lat), lng: Number(lng) };

    if (Number.isNaN(point.lat) || Number.isNaN(point.lng)) return null;

    return (
        <button
            type="button"
            onClick={() => onFocus?.({ ...point, title: label })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DBEAFE] bg-[#EFF6FF] px-2 py-1 font-mono text-[11px] font-semibold text-[#1D4ED8] transition hover:border-[#93C5FD] hover:bg-[#DBEAFE]"
            title="Show this point on the map"
        >
            <MyLocationIcon sx={{ fontSize: 12 }} />
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </button>
    );
}

function Card({ title, icon, children, right }) {
    return (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#F1F5F9] px-4 sm:px-5 py-3">
                <div className="flex items-center gap-2 text-[#0F172A] min-w-0">
                    <span className="text-[#94A3B8] shrink-0">{icon}</span>
                    <h4 className="text-[13px] font-bold tracking-tight truncate">{title}</h4>
                </div>
                {right}
            </div>
            <div className="px-4 sm:px-5 py-4">{children}</div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</p>
            <p className="mt-1 text-[13px] font-semibold text-[#0F172A] break-words">{children || dash}</p>
        </div>
    );
}

function StatusPill({ value }) {
    if (!value) return null;

    const tone = {
        approved: 'bg-[#DCFCE7] text-[#15803D]',
        verified: 'bg-[#DCFCE7] text-[#15803D]',
        completed: 'bg-[#DCFCE7] text-[#15803D]',
        active: 'bg-[#DCFCE7] text-[#15803D]',
        in_review: 'bg-[#FEF3C7] text-[#B45309]',
        pending: 'bg-[#FEF3C7] text-[#B45309]',
        declined: 'bg-[#FEE2E2] text-[#B91C1C]',
        rejected: 'bg-[#FEE2E2] text-[#B91C1C]',
    }[String(value).toLowerCase()] || 'bg-[#F1F5F9] text-[#475569]';

    return (
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shrink-0 ${tone}`}>
            {String(value).replace(/_/g, ' ')}
        </span>
    );
}

/**
 * A proof-of-delivery (or similar) photo — framed as a real card rather than
 * a bare thumbnail, with a soft gradient + zoom cue on hover and a click that
 * opens the shared lightbox instead of a plain new tab.
 */
function PodImage({ label = 'Proof of Delivery', subtitle, imageUrl, onOpen }) {
    if (!imageUrl) return null;

    return (
        <div className="mt-3 inline-block">
            <button
                type="button"
                onClick={() => onOpen({ url: imageUrl, label, subtitle })}
                className="group relative block w-36 sm:w-40 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-md"
            >
                <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-[#F1F5F9]">
                    <img
                        src={imageUrl}
                        alt={label}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/60 via-transparent to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-200 group-hover:opacity-100">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0F172A] shadow-sm">
                            <ZoomInIcon sx={{ fontSize: 18 }} />
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A]" />
                    <p className="truncate text-[11px] font-bold text-[#0F172A]">{label}</p>
                </div>
            </button>
        </div>
    );
}

/** A photo the driver took, plus whatever OCR read off it — now a proper
 *  card with a status-tinted header, a hover-zoom image, and an inline
 *  scanned-text drawer instead of a raw <pre> block. */
function EquipmentShot({ label, imageUrl, text, onOpen }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white transition hover:border-[#CBD5E1] hover:shadow-sm">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] bg-[#F8FAFC] px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">{label}</p>
                {imageUrl ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#16A34A]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Captured
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#CBD5E1]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" /> Missing
                    </span>
                )}
            </div>

            {imageUrl ? (
                <button
                    type="button"
                    onClick={() => onOpen({ url: imageUrl, label })}
                    className="group relative block h-32 w-full overflow-hidden bg-[#F1F5F9]"
                >
                    <img
                        src={imageUrl}
                        alt={label}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/55 via-transparent to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-200 group-hover:opacity-100">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#0F172A] shadow-sm">
                            <ZoomInIcon sx={{ fontSize: 18 }} />
                        </span>
                    </div>
                </button>
            ) : (
                <div className="flex h-32 flex-col items-center justify-center gap-1 bg-[#F8FAFC] text-[#CBD5E1]">
                    <ImageNotSupportedOutlinedIcon sx={{ fontSize: 22 }} />
                    <span className="text-[11px] font-semibold text-[#94A3B8]">No photo</span>
                </div>
            )}

            <div className="px-3 py-2.5">
                {text ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setOpen((v) => !v)}
                            className="flex w-full items-center justify-between text-[11px] font-bold text-[#2563EB]"
                        >
                            <span className="flex items-center gap-1.5">
                                <TextSnippetOutlinedIcon sx={{ fontSize: 14 }} />
                                Scanned text
                            </span>
                            <ExpandMoreIcon
                                sx={{ fontSize: 16, transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
                            />
                        </button>
                        {open && (
                            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-[#F8FAFC] p-2.5 font-mono text-[10px] leading-relaxed text-[#475569]">
                                {text}
                            </pre>
                        )}
                    </>
                ) : (
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#CBD5E1]">
                        <TextSnippetOutlinedIcon sx={{ fontSize: 14 }} /> No text read
                    </p>
                )}
            </div>
        </div>
    );
}

function DriverActivity({ shipment, onFocusLocation }) {
    const [lightboxImage, setLightboxImage] = useState(null);
    const openImage = useCallback((image) => setLightboxImage(image), []);
    const closeImage = useCallback(() => setLightboxImage(null), []);

    const driver = shipment?.driver;
    const equipment = shipment?.equipment_verification;
    const journey = shipment?.journey;
    const stops = [...(shipment?.stops || [])].sort((a, b) => a.stop_number - b.stop_number);

    const hasAnything =
        driver ||
        equipment ||
        journey ||
        stops.some((s) => s.progress || s.event_answers?.length || s.verifications?.length);

    if (!hasAnything) {
        return (
            <div className="rounded-xl border border-[#E2E8F0] py-10 text-center">
                <PersonOutlineIcon sx={{ fontSize: 28, color: '#CBD5E1' }} />
                <p className="mt-2 text-sm font-medium text-[#94A3B8]">
                    Nothing recorded from the driver app on this load yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">

            <ImageLightbox image={lightboxImage} onClose={closeImage} />

            {driver && (
                <Card
                    title="Driver"
                    icon={<BadgeOutlinedIcon sx={{ fontSize: 17 }} />}
                    right={<StatusPill value={driver.status} />}
                >
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        {driver.profile_picture ? (
                            <img
                                src={driver.profile_picture}
                                alt={driver.name || 'Driver'}
                                className="h-14 w-14 shrink-0 rounded-full border border-[#E2E8F0] object-cover"
                            />
                        ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-lg font-bold text-[#4F46E5]">
                                {(driver.name || 'D').charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="grid flex-1 w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="Name">{driver.name}</Field>
                            <Field label="Phone">{driver.phone}</Field>
                            <Field label="Email">{driver.email}</Field>
                            <Field label="Carrier">{driver.carrier_name}</Field>
                            <Field label="CDL Number">{driver.cdl_number}</Field>
                            <Field label="CDL State">{driver.cdl_state}</Field>
                            <Field label="CDL Expires">{driver.cdl_expiration}</Field>
                            <Field label="Ping Interval">
                                {driver.tracking_interval_seconds ? `${driver.tracking_interval_seconds}s` : null}
                            </Field>
                            <Field label="Date of Birth">{driver.dob}</Field>
                            <Field label="Address">
                                {[driver.address, driver.city, driver.state, driver.zip].filter(Boolean).join(', ')}
                            </Field>
                            <Field label="Signed Up">{driver.created_at}</Field>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-4">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                            <VerifiedUserOutlinedIcon sx={{ fontSize: 15 }} /> Identity / Liveness
                        </span>
                        <StatusPill value={driver.liveness_status} />
                        <span className="text-[11px] font-medium text-[#64748B]">
                            {driver.liveness_verified ? 'Face check passed' : 'Face check not passed'}
                        </span>
                    </div>
                </Card>
            )}

            {equipment && (
                <Card
                    title="Equipment Verification"
                    icon={<InventoryOutlinedIcon sx={{ fontSize: 17 }} />}
                    right={<StatusPill value={equipment.status} />}
                >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <EquipmentShot
                            label="VIN Plate"
                            imageUrl={equipment.vin_image_url}
                            text={equipment.vin_text}
                            onOpen={openImage}
                        />
                        <EquipmentShot
                            label="Tractor"
                            imageUrl={equipment.tractor_image_url}
                            text={equipment.tractor_text}
                            onOpen={openImage}
                        />
                        <EquipmentShot
                            label="Trailer"
                            imageUrl={equipment.trailer_image_url}
                            text={equipment.trailer_text}
                            onOpen={openImage}
                        />
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-[#94A3B8]">Submitted {equipment.created_at}</p>
                </Card>
            )}

            {journey && (
                <Card title="Journey Summary" icon={<PlaceOutlinedIcon sx={{ fontSize: 17 }} />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <Field label="Current Step">
                            {journey.current_step ? String(journey.current_step).replace(/_/g, ' ') : null}
                        </Field>
                        <Field label="Arrived at Shipper">{journey.shipper_arrived_at}</Field>
                        <Field label="Shipper OTP">{journey.shipper_otp}</Field>
                        <Field label="Seal Number">{journey.shipper_seal_number}</Field>
                        <Field label="Loaded At">{journey.loaded_at}</Field>
                        <Field label="Arrived at Receiver">{journey.receiver_arrived_at}</Field>
                        <Field label="Delivered At">{journey.delivered_at}</Field>
                        <Field label="Condition on Delivery">{journey.delivery_condition}</Field>
                        <Field label="Received By">{journey.receiver_printed_name}</Field>
                        <Field label="Completed At">{journey.completed_at}</Field>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-4">
                        <CoordButton
                            lat={journey.shipper_arrival_lat}
                            lng={journey.shipper_arrival_lng}
                            label="Arrival at shipper"
                            onFocus={onFocusLocation}
                        />
                        <CoordButton
                            lat={journey.receiver_arrival_lat}
                            lng={journey.receiver_arrival_lng}
                            label="Arrival at receiver"
                            onFocus={onFocusLocation}
                        />
                    </div>

                    <PodImage imageUrl={journey.pod_image_url} onOpen={openImage} />
                </Card>
            )}

            {stops.map((stop) => {
                const progress = stop.progress;
                const answers = stop.event_answers || [];
                const otps = stop.verifications || [];

                return (
                    <Card
                        key={stop.id}
                        title={`Stop ${stop.stop_number} — ${stop.stop_type}`}
                        icon={<PlaceOutlinedIcon sx={{ fontSize: 17 }} />}
                        right={
                            progress?.completed_at ? (
                                <StatusPill value="completed" />
                            ) : progress?.arrived_at ? (
                                <StatusPill value="in_review" />
                            ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8] shrink-0">
                                    Not reached
                                </span>
                            )
                        }
                    >
                        {progress ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    <Field label="Arrived At">{progress.arrived_at}</Field>
                                    <Field label="OTP Verified">{progress.otp_verified_at}</Field>
                                    <Field label="Seal Number">{progress.seal_number}</Field>
                                    <Field label="Completed At">{progress.completed_at}</Field>
                                    <Field label="Condition">{progress.delivery_condition}</Field>
                                    <Field label="Received By">{progress.receiver_printed_name}</Field>
                                </div>

                                <div className="mt-3">
                                    <CoordButton
                                        lat={progress.arrival_lat}
                                        lng={progress.arrival_lng}
                                        label={`Stop ${stop.stop_number} arrival`}
                                        onFocus={onFocusLocation}
                                    />
                                </div>

                                <PodImage
                                    imageUrl={progress.pod_image_url}
                                    subtitle={progress.completed_at}
                                    onOpen={openImage}
                                />
                            </>
                        ) : (
                            <p className="text-[12px] font-medium text-[#94A3B8]">
                                The driver has not checked in at this stop yet.
                            </p>
                        )}

                        {otps.length > 0 && (
                            <div className="mt-4 border-t border-[#F1F5F9] pt-3">
                                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                                    <LockOpenOutlinedIcon sx={{ fontSize: 14 }} /> Verification Codes
                                </p>
                                <div className="space-y-1.5">
                                    {otps.map((otp) => (
                                        <div key={otp.id} className="flex flex-wrap items-center gap-2 text-[11px]">
                                            <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 font-bold uppercase text-[#475569]">
                                                {otp.purpose}
                                            </span>
                                            <span className="font-medium text-[#475569]">sent to {otp.sent_to}</span>
                                            <span className="text-[#94A3B8]">
                                                {otp.consumed_at
                                                    ? `used ${otp.consumed_at}`
                                                    : `not used (expires ${otp.expires_at})`}
                                            </span>
                                            {otp.attempts > 0 && (
                                                <span className="text-[#B45309]">{otp.attempts} failed attempt(s)</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {answers.length > 0 && (
                            <div className="mt-4 border-t border-[#F1F5F9] pt-3">
                                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                                    <QuizOutlinedIcon sx={{ fontSize: 14 }} /> Event Answers
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {answers.map((answer) => (
                                        <div
                                            key={answer.id}
                                            className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white transition hover:border-[#CBD5E1] hover:shadow-sm"
                                        >
                                            <div className="px-3 pt-2.5">
                                                <p className="text-[11px] font-semibold text-[#334155]">{answer.question}</p>
                                            </div>

                                            {answer.answer_image_url ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        openImage({
                                                            url: answer.answer_image_url,
                                                            label: answer.question,
                                                            subtitle: answer.created_at
                                                        })
                                                    }
                                                    className="group relative mt-2 block h-24 w-full overflow-hidden bg-[#F1F5F9]"
                                                >
                                                    <img
                                                        src={answer.answer_image_url}
                                                        alt={answer.question}
                                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/55 via-transparent to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-200 group-hover:opacity-100">
                                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#0F172A] shadow-sm">
                                                            <ZoomInIcon sx={{ fontSize: 16 }} />
                                                        </span>
                                                    </div>
                                                </button>
                                            ) : (
                                                <p className="mt-1.5 px-3 text-[12px] font-bold text-[#0F172A]">
                                                    {answer.answer_value || (
                                                        <span className="font-medium text-[#94A3B8]">No answer</span>
                                                    )}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                                                <span className="rounded bg-[#F1F5F9] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#94A3B8]">
                                                    {String(answer.answer_type || '').replace(/_/g, ' ')}
                                                </span>
                                                <CoordButton
                                                    lat={answer.answered_lat}
                                                    lng={answer.answered_lng}
                                                    label={answer.question}
                                                    onFocus={onFocusLocation}
                                                />
                                                <span className="text-[10px] font-medium text-[#94A3B8]">
                                                    {answer.created_at}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}

export default DriverActivity;