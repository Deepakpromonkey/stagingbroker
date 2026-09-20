import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SatelliteAltOutlinedIcon from "@mui/icons-material/SatelliteAltOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import IconButton from "@mui/material/IconButton";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

/*
| The ELD live-tracking booking form.
|
| Styled to match Step1/Step2 of the manual flow exactly (same card, input
| and button classes, same address-autocomplete and date/time/timezone
| patterns) rather than the dark reference mockup this was first built from —
| this is the one page in the app a broker actually uses day to day, and it
| needs to look like the rest of the app, not like a separate product.
|
| Still a single page, not a wizard: there is no trip sheet for an ELD load,
| so there is nothing a second step would hold.
*/

const CARRIERS_URL = "/eld/carriers";
const fleetUrl = (connectionUuid) => `/eld/carriers/${connectionUuid}/fleet`;

const TIMEZONES = [
  "(UTC-07:00) Arizona",
  "(UTC-05:00) Eastern",
  "(UTC-06:00) Central",
  "(UTC-08:00) Pacific",
  "(UTC+05:30) India",
];
const timezoneName = (tz) => (tz ? tz.split(") ")[1] || tz : "");

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const selectClass = inputClass + " appearance-none pr-9";
const cardClass =
  "mb-6 rounded-[28px] border border-slate-200/80 bg-white p-5 sm:p-8 shadow-[0_1px_2px_rgba(15,36,84,0.04),0_16px_32px_-24px_rgba(15,36,84,0.35)]";

const FieldLabel = ({ children, required }) => (
  <label className="mb-2 block text-sm font-semibold text-slate-800">
    {children}
    {required ? <span className="ml-0.5 text-red-500">*</span> : null}
  </label>
);

const ErrorText = ({ children }) =>
  children ? <p className="mt-1.5 text-xs text-red-500">{children}</p> : null;

const ChevronDown = () => (
  <KeyboardArrowDownIcon
    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
    sx={{ fontSize: 20 }}
  />
);

const SectionHeading = ({ icon: Icon, children }) => (
  <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
    {Icon ? (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D4ED8]">
        <Icon sx={{ fontSize: 19 }} />
      </span>
    ) : null}
    <h3 className="text-[15px] font-bold tracking-tight text-[#112963]">{children}</h3>
  </div>
);

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

// TRK + 8 digits, matching the shape every other Dollar Traq No. in this app
// already has. Generated once per mount, so a fresh page load is a fresh
// number — a broker never types this, it's an internal reference only.
function generateTrackingNumber() {
  return "TRK" + String(Math.floor(10000000 + Math.random() * 90000000));
}

const pad = (n) => String(n).padStart(2, "0");

function to12Hour(value24) {
  if (!value24) return { hour: 12, minute: 0, period: "AM" };
  const [h, m] = value24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return { hour, minute: m, period };
}

function to24HourString(hour, minute, period) {
  let h = hour % 12;
  if (period === "PM") h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

// Identical to trackshipment/Step2's CustomTimePicker — kept local rather
// than imported since Step2 doesn't export it.
function CustomTimePicker({ value, onChange, hasError = false }) {
  const { hour, minute, period } = to12Hour(value);
  const commit = (h, m, p) => onChange(to24HourString(h, m, p));
  const bumpHour = (dir) => commit(((hour - 1 + dir + 12) % 12) + 1, minute, period);
  const bumpMinute = (dir) => commit(hour, (minute + dir + 60) % 60, period);
  const togglePeriod = () => commit(hour, minute, period === "AM" ? "PM" : "AM");

  const handleHourInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-2);
    if (raw === "") return;
    let n = parseInt(raw, 10);
    if (n < 1) n = 1;
    if (n > 12) n = 12;
    commit(n, minute, period);
  };
  const handleMinuteInput = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(-2);
    if (raw === "") return;
    let n = parseInt(raw, 10);
    if (n > 59) n = 59;
    commit(hour, n, period);
  };

  const spinnerBtnClass = "flex justify-center text-slate-400 hover:text-blue-600 transition leading-none";
  const segmentClass = "w-6 border-none bg-transparent text-center text-sm font-semibold text-slate-800 outline-none";

  return (
    <div
      className={`flex h-[46px] w-full items-center gap-2 rounded-xl border bg-white px-3 shadow-sm transition ${
        hasError
          ? "border-red-400 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100"
          : "border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
      }`}
    >
      <div className="flex flex-col items-center leading-none">
        <button type="button" className={spinnerBtnClass} onClick={() => bumpHour(1)} tabIndex={-1}>
          <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
        </button>
        <input type="text" inputMode="numeric" value={pad(hour)} onChange={handleHourInput} className={segmentClass} />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpHour(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>
      <span className="text-slate-400">:</span>
      <div className="flex flex-col items-center leading-none">
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(1)} tabIndex={-1}>
          <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
        </button>
        <input type="text" inputMode="numeric" value={pad(minute)} onChange={handleMinuteInput} className={segmentClass} />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>
      <button
        type="button"
        onClick={togglePeriod}
        className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition"
      >
        {period}
      </button>
    </div>
  );
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDateDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

/**
 * Identical to trackshipment/Step1's CustomDatePicker — a click-driven
 * calendar, not a native <input type="date">. Native date inputs only fire
 * onChange once every segment (day/month/year) is complete and valid, which
 * is exactly what was causing pickup/delivery date to still read as unset
 * after what looked like a completed selection. This sidesteps that
 * class of browser quirk entirely — a date is only ever set by clicking a
 * day in the grid below, an atomic action with no partial state.
 */
function CustomDatePicker({ value, onChange, placeholder = "Select date", hasError = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const goPrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const pick = (day) => {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={inputClass + ` flex items-center justify-between text-left ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>{value ? formatDateDisplay(value) : placeholder}</span>
        <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[280px] max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <IconButton size="small" onClick={goPrev} sx={{ color: "#94a3b8" }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <p className="text-sm font-bold text-slate-800">{monthLabel}</p>
            <IconButton size="small" onClick={goNext} sx={{ color: "#94a3b8" }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={`empty_${i}`} />;
              const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
              const isSelected = iso === value;
              return (
                <button
                  type="button"
                  key={iso}
                  onClick={() => pick(day)}
                  className={`h-8 rounded-lg text-sm font-medium transition ${isSelected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Same shape as trackshipment/Step2's AddressAutocomplete — Google Places
// on the input, formatted_address is what gets stored, lat/lng ride along
// for whenever a route-completion estimate needs them.
function EldAddressAutocomplete({ value, onChange, onPlaceSelect, placeholder, hasError }) {
  const inputRef = useRef(null);

  // onChange/onPlaceSelect are inline arrows from the parent — a fresh
  // reference every render. Reading them through a ref (updated every
  // render, but never an effect dependency) means the widget below is built
  // exactly once and always calls whatever the latest callback is. Without
  // this, they'd belong in the effect's dependency array, which would tear
  // down and rebuild Google's entire Autocomplete widget on this input on
  // every keystroke — losing its internal prediction state mid-type, which
  // is exactly what was corrupting what got typed here.
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  // Committing the ref here, not in the render body — mutating a ref while
  // rendering is itself unsafe under React's concurrent rendering (a render
  // can be started and discarded without committing), so this has to be an
  // effect. No dependency array: it re-runs after every render, which is
  // what keeps the refs current without ever touching the autocomplete
  // widget itself.
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  });

  useEffect(() => {
    if (!window.google?.maps?.places) return undefined;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      onChangeRef.current(place.formatted_address);
      onPlaceSelectRef.current(place.geometry.location.lat(), place.geometry.location.lng());
    });

    return () => window.google?.maps?.event.removeListener(listener);
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        value={value || ""}
        onChange={(e) => {
          onChange(e.target.value);
          onPlaceSelect(null, null); // typed by hand, not picked — no coordinates to trust
        }}
        placeholder={placeholder}
        className={inputClass + (hasError ? " border-red-400 focus:border-red-400 focus:ring-red-100" : "")}
      />
    </div>
  );
}

/** Searchable carrier picker — only lists carriers this broker has already connected via Terminal. */
function CarrierSearch({ carriers, loading, value, onSelect, hasError }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const filtered = query
    ? carriers.filter((c) => `${c.carrier_name} ${c.dot_number}`.toLowerCase().includes(query.toLowerCase()))
    : carriers;

  return (
    <div className="relative" ref={rootRef}>
      <div className="relative">
        <SearchIcon sx={{ fontSize: 18 }} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
          className={inputClass + ` pl-10 disabled:opacity-60 ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""}`}
        />
      </div>

      {open && !loading && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {carriers.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">
                No connected carriers yet. Connect a carrier's ELD from Carriers first.
              </p>
            )}
            {carriers.length > 0 && filtered.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No matches</p>}
            {filtered.map((c) => (
              <button
                type="button"
                key={c.connection_uuid}
                onClick={() => {
                  onSelect(c);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-900">{c.carrier_name}</span>
                <span className="text-xs text-slate-400">DOT {c.dot_number}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Vehicle and driver picker. Every row shows everything the fleet endpoint
 * actually has — make/model/year, plate, VIN for a truck; phone and license
 * for a driver — so a broker can tell two trucks apart without opening a
 * second screen. The options list is pre-filtered to active-only by the
 * caller (see vehicleOptions/driverOptions below); this component just
 * displays what it's handed.
 */
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
          className={selectClass + ` flex items-center justify-between text-left disabled:opacity-50 ${hasError ? "border-red-400" : ""}`}
        >
          <span className={selected ? "text-slate-800" : "text-slate-400"}>{selected ? selected.label : placeholder}</span>
        </button>
        <ChevronDown />

        {open && !disabled && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="max-h-72 overflow-y-auto py-1">
              {options.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">No active {label.toLowerCase()}s on this carrier's fleet.</p>
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
                    className={`flex w-full items-start gap-2 px-4 py-3 text-left transition ${
                      isSelected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircleIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
                    ) : (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{opt.label}</span>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                            isSelected ? "bg-white/20 text-white" : "bg-green-50 text-green-600"
                          }`}
                        >
                          Active
                        </span>
                      </span>
                      {opt.sublabel && (
                        <span className={`mt-0.5 block truncate text-xs ${isSelected ? "text-blue-50" : "text-slate-500"}`}>
                          {opt.sublabel}
                        </span>
                      )}
                      {opt.meta && (
                        <span className={`mt-0.5 block truncate text-[11px] font-mono ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                          {opt.meta}
                        </span>
                      )}
                    </span>
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

/** The full picture on whichever truck/driver got picked, kept visible after the dropdown closes. */
function SelectedDetail({ option }) {
  if (!option || (!option.sublabel && !option.meta)) return null;
  return (
    <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      {option.sublabel && <p className="text-xs font-semibold text-slate-700">{option.sublabel}</p>}
      {option.meta && <p className="mt-0.5 font-mono text-[11px] text-slate-500">{option.meta}</p>}
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
    // Regenerated on every mount — i.e. every page load — per the request
    // that a broker never types this themselves.
    trackingNumber: generateTrackingNumber(),
    origin: "",
    originLat: null,
    originLng: null,
    destination: "",
    destinationLat: null,
    destinationLng: null,
    trailerNumber: "",
    vehicleTerminalId: "",
    driverTerminalId: "",
    pickupDate: "",

    // CustomTimePicker displays "12:00 AM" whenever its value is empty —
    // that's just its rendering default, not a committed value. Defaulting
    // the real state to the same "00:00" it would otherwise only show
    // means what's on screen from the first render is what actually gets
    // submitted, instead of looking filled-in while silently being empty.
    pickupTime: "00:00",
    pickupTimezone: "",
    deliveryDate: "",
    deliveryTime: "00:00",
    deliveryTimezone: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(CARRIERS_URL)
      .then((res) => {
        if (!cancelled) setCarriers(Array.isArray(res?.data) ? res.data : []);
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
        if (data?.last_sync_error) setFleetError(data.last_sync_error);
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

  // The fleet endpoint already filters to active-only (EldFleetController's
  // onlyActive() scope — a null status counts as active there too, since not
  // every provider reports one), but the same check is repeated here rather
  // than trusted blindly: this dropdown is the one place a broker actually
  // picks a truck, and it should never show one that isn't active even if a
  // future change to the endpoint ever stopped filtering server-side.
  const isActive = (status) => !status || String(status).toLowerCase() === "active";

  const vehicleOptions = useMemo(
    () =>
      (fleet?.vehicles || [])
        .filter((v) => isActive(v.status))
        .map((v) => ({
          value: v.terminal_id,
          label: v.label || v.name,
          sublabel: [v.year, v.make, v.model].filter(Boolean).join(" ") || null,
          meta: [v.license_plate ? `Plate ${v.license_plate}` : null, v.vin ? `VIN ${v.vin}` : null]
            .filter(Boolean)
            .join(" · ") || null,
        })),
    [fleet]
  );
  const driverOptions = useMemo(
    () =>
      (fleet?.drivers || [])
        .filter((d) => isActive(d.status))
        .map((d) => ({
          value: d.terminal_id,
          label: d.name,
          sublabel: d.phone || null,
          meta: [d.license_number ? `License ${d.license_number}` : null, d.license_state]
            .filter(Boolean)
            .join(" · ") || null,
        })),
    [fleet]
  );

  const setField = (key, value) => {
    setFields((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Returns the errors found rather than just true/false, so the toast below
  // can name exactly which fields failed instead of a generic "check the
  // form" — that specificity is what made the pickup-window date bug
  // diagnosable in the first place, and it stays useful for whatever the
  // next one turns out to be.
  const validate = () => {
    const next = {};
    if (!fields.origin.trim()) next.origin = "Origin is required for an ELD-tracked load.";
    if (!fields.destination.trim()) next.destination = "Destination is required for an ELD-tracked load.";
    if (!selectedCarrier) next.carrier = "Select a connected carrier.";
    if (!fields.vehicleTerminalId) next.vehicleTerminalId = "Select a vehicle.";
    if (!fields.driverTerminalId) next.driverTerminalId = "Select a driver.";
    if (!fields.pickupDate) next.pickupDate = "Pickup date is required.";
    if (!fields.pickupTimezone) next.pickupTimezone = "Pickup timezone is required.";
    if (!fields.deliveryDate) next.deliveryDate = "Delivery date is required.";
    if (!fields.deliveryTimezone) next.deliveryTimezone = "Delivery timezone is required.";
    setErrors(next);
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      toast.error({
        title: "Missing information",
        message: Object.values(validationErrors).join(" "),
        duration: 6000,
      });
      return;
    }

    setSubmitting(true);
    try {
      const shipmentRes = await apiFetch("/shipments", {
        method: "POST",
        body: JSON.stringify({
          tracking_method: "eld",
          pro_number: fields.proNumber || undefined,
          tracking_number: fields.trackingNumber,
          origin: fields.origin,
          origin_lat: fields.originLat,
          origin_lng: fields.originLng,
          destination: fields.destination,
          destination_lat: fields.destinationLat,
          destination_lng: fields.destinationLng,
          trailer_number: fields.trailerNumber || undefined,
          eld_connection_uuid: selectedCarrier.connection_uuid,
          eld_vehicle_terminal_id: fields.vehicleTerminalId,
          eld_driver_terminal_id: fields.driverTerminalId,
          pickup_date: fields.pickupDate,
          pickup_time: fields.pickupTime,
          pickup_timezone: timezoneName(fields.pickupTimezone),
          delivery_date: fields.deliveryDate,
          delivery_time: fields.deliveryTime,
          delivery_timezone: timezoneName(fields.deliveryTimezone),
        }),
      });

      const shipmentUuid = shipmentRes?.data?.uuid;
      if (!shipmentUuid) throw new Error(shipmentRes?.message || "Could not create the shipment.");

      // Booking and dispatch are the same click here — an ELD load has no
      // separate trip-sheet step to fill in before the truck starts
      // reporting, so Start runs immediately after Create.
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
    <div className="min-h-screen bg-[#EBF1FC] px-4 sm:px-6 md:px-10 lg:px-14 py-6 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4 overflow-hidden rounded-[28px] border border-[#DCE6F7] bg-gradient-to-br from-white to-[#F1F6FE] px-6 sm:px-8 py-7 shadow-[0_1px_2px_rgba(15,36,84,0.04),0_20px_40px_-24px_rgba(15,36,84,0.35)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5B7FCB]">ELD Live Tracking</p>
            <h1 className="mt-1.5 text-[24px] sm:text-[28px] lg:text-[32px] font-extrabold tracking-tight text-[#112963]">
              New live tracking
            </h1>
            <p className="mt-2 max-w-lg text-[15px] font-medium leading-relaxed text-[#7085A8]">
              Connect a carrier's ELD and start tracking a load — no TMS required.
            </p>
          </div>
          <span className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#112963] text-white shadow-lg shadow-[#112963]/20">
            <SatelliteAltOutlinedIcon sx={{ fontSize: 26 }} />
          </span>
        </div>

        <form onSubmit={handleSubmit} className="pb-28">
          <div className={cardClass}>
            <SectionHeading icon={LocalShippingOutlinedIcon}>Shipment</SectionHeading>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <input value={fields.trackingNumber} disabled className={inputClass + " disabled:opacity-70"} />
                {/* <p className="mt-1.5 text-xs text-slate-400">Generated automatically — nothing to fill in here.</p> */}
              </div>

              <div>
                <FieldLabel required>Origin</FieldLabel>
                <EldAddressAutocomplete
                  value={fields.origin}
                  onChange={(v) => setField("origin", v)}
                  onPlaceSelect={(lat, lng) => setFields((f) => ({ ...f, originLat: lat, originLng: lng }))}
                  placeholder="Search and select an address…"
                  hasError={!!errors.origin}
                />
                <ErrorText>{errors.origin}</ErrorText>
              </div>
              <div>
                <FieldLabel required>Destination</FieldLabel>
                <EldAddressAutocomplete
                  value={fields.destination}
                  onChange={(v) => setField("destination", v)}
                  onPlaceSelect={(lat, lng) => setFields((f) => ({ ...f, destinationLat: lat, destinationLng: lng }))}
                  placeholder="Search and select an address…"
                  hasError={!!errors.destination}
                />
                <ErrorText>{errors.destination}</ErrorText>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="col-span-full -mt-0.5 mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1D4ED8]">
                <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} /> Pickup Window
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel required>Date</FieldLabel>
                  <CustomDatePicker
                    value={fields.pickupDate}
                    onChange={(v) => setField("pickupDate", v)}
                    hasError={!!errors.pickupDate}
                  />
                  <ErrorText>{errors.pickupDate}</ErrorText>
                </div>
                <div>
                  <FieldLabel>Time</FieldLabel>
                  <CustomTimePicker value={fields.pickupTime} onChange={(v) => setField("pickupTime", v)} />
                </div>
                <div>
                  <FieldLabel required>Timezone</FieldLabel>
                  <div className="relative">
                    <select
                      value={fields.pickupTimezone}
                      onChange={(e) => setField("pickupTimezone", e.target.value)}
                      className={selectClass + (errors.pickupTimezone ? " border-red-400" : "")}
                    >
                      <option value="" disabled>Select timezone</option>
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    <ChevronDown />
                  </div>
                  <ErrorText>{errors.pickupTimezone}</ErrorText>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="col-span-full -mt-0.5 mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#12B76A]">
                <AccessTimeOutlinedIcon sx={{ fontSize: 14 }} /> Delivery Window
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel required>Date</FieldLabel>
                  <CustomDatePicker
                    value={fields.deliveryDate}
                    onChange={(v) => setField("deliveryDate", v)}
                    hasError={!!errors.deliveryDate}
                  />
                  <ErrorText>{errors.deliveryDate}</ErrorText>
                </div>
                <div>
                  <FieldLabel>Time</FieldLabel>
                  <CustomTimePicker value={fields.deliveryTime} onChange={(v) => setField("deliveryTime", v)} />
                </div>
                <div>
                  <FieldLabel required>Timezone</FieldLabel>
                  <div className="relative">
                    <select
                      value={fields.deliveryTimezone}
                      onChange={(e) => setField("deliveryTimezone", e.target.value)}
                      className={selectClass + (errors.deliveryTimezone ? " border-red-400" : "")}
                    >
                      <option value="" disabled>Select timezone</option>
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    <ChevronDown />
                  </div>
                  <ErrorText>{errors.deliveryTimezone}</ErrorText>
                </div>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <SectionHeading icon={SatelliteAltOutlinedIcon}>Carrier</SectionHeading>

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
                <input value={selectedCarrier.dot_number || "—"} disabled className={inputClass + " disabled:opacity-70"} />
              </div>
            )}

            {selectedCarrier && fleetLoading && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                Checking ELD connection…
              </div>
            )}

            {selectedCarrier && !fleetLoading && fleetError && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <ErrorOutlineIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
                <span>{fleetError}</span>
              </div>
            )}

            {selectedCarrier && !fleetLoading && fleet && !fleetError && (
              <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircleIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0" />
                <span>
                  <strong>{selectedCarrier.carrier_name}</strong> is connected via Terminal
                  {selectedCarrier.provider ? ` (${selectedCarrier.provider} ELD)` : ""}. Vehicle and driver data is
                  available live.
                </span>
              </div>
            )}

            {selectedCarrier && !fleetLoading && fleet && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <TruckDriverDropdown
                    label="Truck"
                    placeholder="Select a vehicle…"
                    options={vehicleOptions}
                    value={fields.vehicleTerminalId}
                    onChange={(v) => setField("vehicleTerminalId", v)}
                    hasError={!!errors.vehicleTerminalId}
                  />
                  <ErrorText>{errors.vehicleTerminalId}</ErrorText>
                  <SelectedDetail option={vehicleOptions.find((o) => o.value === fields.vehicleTerminalId)} />
                </div>
                <div>
                  <TruckDriverDropdown
                    label="Driver"
                    placeholder="Select a driver…"
                    options={driverOptions}
                    value={fields.driverTerminalId}
                    onChange={(v) => setField("driverTerminalId", v)}
                    hasError={!!errors.driverTerminalId}
                  />
                  <ErrorText>{errors.driverTerminalId}</ErrorText>
                  <SelectedDetail option={driverOptions.find((o) => o.value === fields.driverTerminalId)} />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel>Trailer # (optional)</FieldLabel>
                  <input
                    value={fields.trailerNumber}
                    onChange={(e) => setField("trailerNumber", e.target.value)}
                    placeholder="e.g. TR-208"
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-xs text-slate-400">Not reported by the ELD — enter it yourself if you know it.</p>
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 sm:px-6 md:px-10 lg:px-14 py-3 lg:py-4 shadow-[0_-4px_20px_rgba(15,36,84,0.08)] backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/load-search")}
              className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="rounded-2xl bg-[#112963] px-5 sm:px-7 py-3 sm:py-4 text-sm font-semibold text-white shadow-lg shadow-[#112963]/25 transition hover:bg-[#0F2454] hover:shadow-xl disabled:opacity-60 whitespace-nowrap"
            >
              {submitting ? "Starting…" : "Start live tracking →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
