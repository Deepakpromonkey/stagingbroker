import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

/*
| The ELD live-tracking booking form.
|
| Deliberately a single page, not a wizard like the manual flow's Step1/Step2 —
| there is no trip sheet here. An ELD load has no stops to plan: the truck's
| position comes from the carrier's telematics, not from a driver arriving
| somewhere and pressing a button, so origin/destination are the only "route"
| this form needs.
|
| Carrier -> fleet -> truck/driver is a strict sequence, each step gated on the
| one before it: the fleet endpoint needs a connection uuid, and Start needs a
| vehicle + driver drawn from that same fleet. Selecting a new carrier always
| clears whatever truck/driver was chosen for a different one.
*/

const CARRIERS_URL = "/eld/carriers";
const fleetUrl = (connectionUuid) => `/eld/carriers/${connectionUuid}/fleet`;

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-[#3B5BFB] focus:ring-2 focus:ring-[#3B5BFB]/20";

const labelClass = "mb-2 block text-sm font-semibold text-slate-200";

const FieldLabel = ({ children, required }) => (
  <label className={labelClass}>
    {children}
    {required ? <span className="ml-0.5 text-red-400">*</span> : null}
  </label>
);

const ErrorText = ({ children }) =>
  children ? <p className="mt-1.5 text-xs text-red-400">{children}</p> : null;

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

/**
 * Searchable carrier picker. Only lists carriers this broker has actually
 * connected via Terminal — there is nothing here to "search the internet
 * for", the whole point of this flow is that the carrier already onboarded.
 */
function CarrierSearch({ carriers, loading, value, onSelect, hasError }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const filtered = query
    ? carriers.filter((c) =>
        `${c.carrier_name} ${c.dot_number}`.toLowerCase().includes(query.toLowerCase())
      )
    : carriers;

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <SearchIcon
          sx={{ fontSize: 18 }}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          value={value ? value.carrier_name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onSelect(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? "Loading connected carriers…" : "Start typing a carrier name…"}
          disabled={loading}
          className={inputClass + ` pl-10 disabled:opacity-60 ${hasError ? "border-red-500/60" : ""}`}
        />
      </div>

      {open && !loading && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#121a2c] shadow-2xl shadow-black/40">
          <div className="max-h-64 overflow-y-auto py-1">
            {carriers.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">
                No connected carriers yet. Connect a carrier's ELD from Carriers first.
              </p>
            )}
            {carriers.length > 0 && filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">No matches</p>
            )}
            {filtered.map((c) => (
              <button
                type="button"
                key={c.connection_uuid}
                onClick={() => {
                  onSelect(c);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/5"
              >
                <span className="font-medium">{c.carrier_name}</span>
                <span className="text-xs text-slate-500">DOT {c.dot_number}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TruckDriverDropdown({ label, placeholder, options, value, onChange, disabled, hasError }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const selected = options.find((o) => o.value === value);

  return (
    <div>
      <FieldLabel required>{label}</FieldLabel>
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={
            inputClass +
            ` flex items-center justify-between text-left disabled:opacity-50 ${
              hasError ? "border-red-500/60" : ""
            }`
          }
        >
          <span className={selected ? "text-slate-100" : "text-slate-500"}>
            {selected ? selected.label : placeholder}
          </span>
        </button>

        {open && !disabled && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#121a2c] shadow-2xl shadow-black/40">
            <div className="max-h-56 overflow-y-auto py-1">
              {options.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">
                  No active {label.toLowerCase()}s on this carrier's fleet.
                </p>
              )}
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${
                      isSelected ? "bg-[#3B5BFB] text-white" : "text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    {isSelected ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : null}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EldShipmentForm() {
  const navigate = useNavigate();

  const [carriers, setCarriers] = useState([]);
  const [carriersLoading, setCarriersLoading] = useState(true);
  const [selectedCarrier, setSelectedCarrier] = useState(null);

  const [fleet, setFleet] = useState(null);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [fleetError, setFleetError] = useState(null);

  const [fields, setFields] = useState({
    proNumber: "",
    trackingNumber: "",
    origin: "",
    destination: "",
    trailerNumber: "",
    vehicleTerminalId: "",
    driverTerminalId: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiFetch(CARRIERS_URL)
      .then((res) => {
        if (cancelled) return;
        setCarriers(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error({ title: "Could not load connected carriers" });
      })
      .finally(() => {
        if (!cancelled) setCarriersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the fleet the moment a carrier is picked — selecting from the list
  // IS the confirmation that it's connected, so there's no separate manual
  // "check connection" step; the loading/success/error state below plays
  // that role instead.
  useEffect(() => {
    if (!selectedCarrier) {
      setFleet(null);
      setFleetError(null);
      return;
    }

    let cancelled = false;
    setFleetLoading(true);
    setFleetError(null);
    setFleet(null);
    setFields((f) => ({ ...f, vehicleTerminalId: "", driverTerminalId: "" }));

    apiFetch(fleetUrl(selectedCarrier.connection_uuid))
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        if (data?.last_sync_error) {
          setFleetError(data.last_sync_error);
        }
        setFleet(data || { vehicles: [], drivers: [] });
      })
      .catch((err) => {
        if (!cancelled) setFleetError(err?.message || "Could not load this carrier's fleet.");
      })
      .finally(() => {
        if (!cancelled) setFleetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCarrier]);

  const vehicleOptions = useMemo(
    () => (fleet?.vehicles || []).map((v) => ({ value: v.terminal_id, label: v.label || v.name })),
    [fleet]
  );
  const driverOptions = useMemo(
    () => (fleet?.drivers || []).map((d) => ({ value: d.terminal_id, label: d.name })),
    [fleet]
  );

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!fields.origin.trim()) next.origin = "Origin is required for an ELD-tracked load.";
    if (!fields.destination.trim()) next.destination = "Destination is required for an ELD-tracked load.";
    if (!selectedCarrier) next.carrier = "Select a connected carrier.";
    if (!fields.vehicleTerminalId) next.vehicleTerminalId = "Select a vehicle.";
    if (!fields.driverTerminalId) next.driverTerminalId = "Select a driver.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error({ title: "Missing information", message: "Please check the highlighted fields." });
      return;
    }

    setSubmitting(true);
    try {
      const shipmentRes = await apiFetch("/shipments", {
        method: "POST",
        body: JSON.stringify({
          tracking_method: "eld",
          pro_number: fields.proNumber || undefined,
          tracking_number: fields.trackingNumber || undefined,
          origin: fields.origin,
          destination: fields.destination,
          trailer_number: fields.trailerNumber || undefined,
          eld_connection_uuid: selectedCarrier.connection_uuid,
          eld_vehicle_terminal_id: fields.vehicleTerminalId,
          eld_driver_terminal_id: fields.driverTerminalId,
        }),
      });

      const shipmentUuid = shipmentRes?.data?.uuid;
      if (!shipmentUuid) {
        throw new Error(shipmentRes?.message || "Could not create the shipment.");
      }

      // Booking and dispatch are the same click here — unlike the manual flow,
      // an ELD load has no separate "trip sheet" step to fill in before the
      // truck starts reporting, so Start runs immediately after Create.
      await apiFetch(`/shipments/${shipmentUuid}/eld/start`, { method: "POST" });

      toast.success({ title: "Live tracking started", duration: 2500 });
      navigate(`/shipment/eld/${shipmentUuid}`);
    } catch (err) {
      toast.error({
        title: "Could not start live tracking",
        message: err?.message || "Please check the form and try again.",
        duration: 6000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1E] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0D1526] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-6 sm:px-8">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">New live tracking</h1>
            <p className="mt-1.5 max-w-md text-sm text-slate-400">
              Connect a carrier's ELD and start tracking a load — no TMS required.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/load-search")}
            className="rounded-lg p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            aria-label="Close"
          >
            <CloseIcon sx={{ fontSize: 22 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto px-6 py-6 sm:px-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Shipment</p>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>PRO # / Load ID</FieldLabel>
              <input
                value={fields.proNumber}
                onChange={(e) => setField("proNumber", e.target.value)}
                placeholder="e.g. PRO123456"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Dollar Traq No.</FieldLabel>
              <input
                value={fields.trackingNumber}
                onChange={(e) => setField("trackingNumber", e.target.value)}
                placeholder="e.g. TRK123456"
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel required>Origin</FieldLabel>
              <input
                value={fields.origin}
                onChange={(e) => setField("origin", e.target.value)}
                placeholder="City, ST"
                className={inputClass + (errors.origin ? " border-red-500/60" : "")}
              />
              <ErrorText>{errors.origin}</ErrorText>
            </div>
            <div>
              <FieldLabel required>Destination</FieldLabel>
              <input
                value={fields.destination}
                onChange={(e) => setField("destination", e.target.value)}
                placeholder="City, ST"
                className={inputClass + (errors.destination ? " border-red-500/60" : "")}
              />
              <ErrorText>{errors.destination}</ErrorText>
            </div>
          </div>

          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Carrier</p>
          <div className="mb-4">
            <FieldLabel required>Carrier name</FieldLabel>
            <CarrierSearch
              carriers={carriers}
              loading={carriersLoading}
              value={selectedCarrier}
              onSelect={setSelectedCarrier}
              hasError={!!errors.carrier}
            />
            <ErrorText>{errors.carrier}</ErrorText>
          </div>

          {selectedCarrier && (
            <div className="mb-4">
              <FieldLabel>Carrier DOT #</FieldLabel>
              <input
                value={selectedCarrier.dot_number || "—"}
                disabled
                className={inputClass + " disabled:opacity-70"}
              />
            </div>
          )}

          {selectedCarrier && fleetLoading && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
              Checking ELD connection…
            </div>
          )}

          {selectedCarrier && !fleetLoading && fleetError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <ErrorOutlineIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
              <span>{fleetError}</span>
            </div>
          )}

          {selectedCarrier && !fleetLoading && fleet && !fleetError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              <CheckCircleIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
              <span>
                <strong>{selectedCarrier.carrier_name}</strong> is connected via Terminal
                {selectedCarrier.provider ? ` (${selectedCarrier.provider} ELD)` : ""}. Vehicle and
                driver data is available live.
              </span>
            </div>
          )}

          {selectedCarrier && !fleetLoading && fleet && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TruckDriverDropdown
                label="Truck"
                placeholder="Select a vehicle…"
                options={vehicleOptions}
                value={fields.vehicleTerminalId}
                onChange={(v) => setField("vehicleTerminalId", v)}
                hasError={!!errors.vehicleTerminalId}
              />
              <TruckDriverDropdown
                label="Driver"
                placeholder="Select a driver…"
                options={driverOptions}
                value={fields.driverTerminalId}
                onChange={(v) => setField("driverTerminalId", v)}
                hasError={!!errors.driverTerminalId}
              />
              <ErrorText>{errors.vehicleTerminalId}</ErrorText>
              <ErrorText>{errors.driverTerminalId}</ErrorText>

              <div className="sm:col-span-2">
                <FieldLabel>Trailer # (optional)</FieldLabel>
                <input
                  value={fields.trailerNumber}
                  onChange={(e) => setField("trailerNumber", e.target.value)}
                  placeholder="e.g. TR-208"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Not reported by the ELD — enter it yourself if you know it.
                </p>
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/load-search")}
            className="text-sm font-semibold text-slate-400 transition hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#3B5BFB] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#3B5BFB]/20 transition hover:bg-[#2F4CE0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Starting…" : "Start live tracking"}
            {!submitting && <ArrowForwardIcon sx={{ fontSize: 18 }} />}
          </button>
        </div>
      </div>
    </div>
  );
}
