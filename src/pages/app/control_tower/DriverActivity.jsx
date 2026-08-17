import React, { useState } from 'react';

import MyLocationIcon from '@mui/icons-material/MyLocation';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';

/*
| Everything the driver's phone recorded, in the order a broker reads it:
| who they are, whether their identity and equipment checked out, then what
| happened at each stop.
|
| Any coordinate the driver captured is a button — it drops the map at the top
| of the page onto that exact point, so "where did he say he arrived?" is one
| click rather than a copy-paste into Google Maps.
*/

const dash = <span className="text-[#CBD5E1]">—</span>;

/** 300 -> "every 5 min", 3600 -> "every 1 hr". */
function formatInterval(seconds) {
    const value = Number(seconds);
    if (!value) return null;

    if (value < 3600) return `every ${Math.round(value / 60)} min`;

    const hours = value / 3600;
    return `every ${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
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
            <div className="flex items-center justify-between border-b border-[#F1F5F9] px-5 py-3">
                <div className="flex items-center gap-2 text-[#0F172A]">
                    <span className="text-[#94A3B8]">{icon}</span>
                    <h4 className="text-[13px] font-bold tracking-tight">{title}</h4>
                </div>
                {right}
            </div>
            <div className="px-5 py-4">{children}</div>
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
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
            {String(value).replace(/_/g, ' ')}
        </span>
    );
}

/** A photo the driver took, plus whatever OCR read off it. */
function EquipmentShot({ label, imageUrl, text }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="rounded-xl border border-[#E2E8F0] p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</p>

            {imageUrl ? (
                <a href={imageUrl} target="_blank" rel="noreferrer">
                    <img
                        src={imageUrl}
                        alt={label}
                        className="h-28 w-full rounded-lg border border-[#E2E8F0] object-cover transition hover:opacity-90"
                    />
                </a>
            ) : (
                <div className="flex h-28 items-center justify-center rounded-lg bg-[#F8FAFC] text-[11px] font-medium text-[#94A3B8]">
                    No photo
                </div>
            )}

            {text ? (
                <>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#2563EB]"
                    >
                        <ExpandMoreIcon
                            sx={{ fontSize: 14, transform: open ? 'rotate(180deg)' : 'none', transition: '0.15s' }}
                        />
                        {open ? 'Hide' : 'Show'} scanned text
                    </button>
                    {open && (
                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#F8FAFC] p-2 font-mono text-[10px] leading-relaxed text-[#475569]">
                            {text}
                        </pre>
                    )}
                </>
            ) : (
                <p className="mt-2 text-[11px] font-medium text-[#94A3B8]">No text read</p>
            )}
        </div>
    );
}

function DriverActivity({ shipment, onFocusLocation }) {
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

            {driver && (
                <Card
                    title="Driver"
                    icon={<BadgeOutlinedIcon sx={{ fontSize: 17 }} />}
                    right={<StatusPill value={driver.status} />}
                >
                    <div className="flex items-start gap-4">
                        {driver.profile_picture ? (
                            <img
                                src={driver.profile_picture}
                                alt={driver.name || 'Driver'}
                                className="h-14 w-14 rounded-full border border-[#E2E8F0] object-cover"
                            />
                        ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EEF2FF] text-lg font-bold text-[#4F46E5]">
                                {(driver.name || 'D').charAt(0).toUpperCase()}
                            </div>
                        )}

                        <div className="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
                            <Field label="Name">{driver.name}</Field>
                            <Field label="Phone">{driver.phone}</Field>
                            <Field label="Email">{driver.email}</Field>
                            <Field label="Carrier">{driver.carrier_name}</Field>
                            <Field label="CDL Number">{driver.cdl_number}</Field>
                            <Field label="CDL State">{driver.cdl_state}</Field>
                            <Field label="CDL Expires">{driver.cdl_expiration}</Field>
                            {/* The load's interval, not the driver's: the
                                app_drivers column is a leftover that nothing
                                writes, so showing it would report 5 minutes on
                                every load whatever the broker chose. */}
                            <Field label="Ping Interval">
                                {formatInterval(shipment?.tracking_interval_seconds)}
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
                        <EquipmentShot label="VIN Plate" imageUrl={equipment.vin_image_url} text={equipment.vin_text} />
                        <EquipmentShot label="Tractor" imageUrl={equipment.tractor_image_url} text={equipment.tractor_text} />
                        <EquipmentShot label="Trailer" imageUrl={equipment.trailer_image_url} text={equipment.trailer_text} />
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-[#94A3B8]">Submitted {equipment.created_at}</p>
                </Card>
            )}

            {journey && (
                <Card title="Journey Summary" icon={<PlaceOutlinedIcon sx={{ fontSize: 17 }} />}>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

                    {journey.pod_image_url && (
                        <a href={journey.pod_image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                            <img
                                src={journey.pod_image_url}
                                alt="Proof of delivery"
                                className="h-24 rounded-lg border border-[#E2E8F0] object-cover"
                            />
                        </a>
                    )}
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
                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">
                                    Not reached
                                </span>
                            )
                        }
                    >
                        {progress ? (
                            <>
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

                                {progress.pod_image_url && (
                                    <a
                                        href={progress.pod_image_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-block"
                                    >
                                        <img
                                            src={progress.pod_image_url}
                                            alt="Proof of delivery"
                                            className="h-24 rounded-lg border border-[#E2E8F0] object-cover"
                                        />
                                    </a>
                                )}
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
                                <div className="space-y-3">
                                    {answers.map((answer) => (
                                        <div key={answer.id} className="rounded-lg bg-[#F8FAFC] p-2.5">
                                            <p className="text-[11px] font-semibold text-[#475569]">{answer.question}</p>

                                            {answer.answer_image_url ? (
                                                <a
                                                    href={answer.answer_image_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1.5 inline-block"
                                                >
                                                    <img
                                                        src={answer.answer_image_url}
                                                        alt={answer.question}
                                                        className="h-20 w-20 rounded border border-[#E2E8F0] object-cover"
                                                    />
                                                </a>
                                            ) : (
                                                <p className="mt-1 text-[12px] font-bold text-[#0F172A]">
                                                    {answer.answer_value || (
                                                        <span className="font-medium text-[#94A3B8]">No answer</span>
                                                    )}
                                                </p>
                                            )}

                                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
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
