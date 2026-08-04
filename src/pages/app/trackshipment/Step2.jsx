import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { create } from "zustand";

 
import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

 
import StepSidebar from "./StepSidebar";

 
import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import AddIcon from "@mui/icons-material/Add";

 
const COUNTRIES = ["United States", "Canada", "Mexico", "India"];

 
// Answer type options for a custom event — matches the "Answer Type"
// dropdown you shared. `value` is what gets sent to the backend, `label`
// is what's shown in the UI.
const ANSWER_TYPES = [
  { value: "yes_no", label: "Yes / No" },
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "image_upload", label: "Image Upload" },
];

 
const TIMEZONES = [
  "(UTC-07:00) Arizona",
  "(UTC-05:00) Eastern",
  "(UTC-06:00) Central",
  "(UTC-08:00) Pacific",
  "(UTC+05:30) India",
];

 
const EMAIL_LIST_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*(,\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*)*$/;

 
// --- Stop type is now derived purely from position in the route ---
// index 0            -> Pickup
// last index          -> Delivery
// anything in between -> Intermediate, Intermediate 2, Intermediate 3, ...
const getStopTypeInfo = (index, total) => {
  if (index === 0) return { value: "pickup", label: "Pickup" };
  if (index === total - 1) return { value: "delivery", label: "Delivery" };
  return {
    value: "intermediate",
    label: index === 1 ? "Intermediate" : `Intermediate ${index}`,
  };
};

 
const blankStop = () => ({
  stopType: "pickup",
  stopTypeLabel: "Pickup",
  stopName: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  zipcode: "",
  country: "",
  latitude: null,
  longitude: null,

 
  startDate: "",
  startTime: "",
  startTimezone: "",

 
  // Only used/shown for the Pickup stop
  trackStartOffset: "",

 
  commentToDriver: "",
  alertEmails: "",

 
  customEvents: [],
});

 
export const BLANK_STEP2_VALUES = {
  stops: [blankStop(), blankStop()],
};

 
const useTripSheetDraftStore = create((set) => ({
  step2: BLANK_STEP2_VALUES,
  setStep2: (values) => set({ step2: values }),
  resetStep2: () => set({ step2: BLANK_STEP2_VALUES }),
}));

 
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-sans";

 
const selectClass = inputClass + " appearance-none pr-9";

 
const FieldLabel = ({ children, required }) => (
  <label className="mb-2 block text-sm font-semibold text-slate-800 font-sans">
    {children}
    {required ? <span className="ml-0.5 text-red-500">*</span> : null}
  </label>
);

 
const SectionEyebrow = ({ children }) => (
  <p className="mb-4 border-b border-slate-200 pb-2 text-xs font-bold tracking-widest text-blue-600 font-sans">
    {children}
  </p>
);

 
const ErrorText = ({ children }) =>
  children ? <p className="mt-1.5 text-xs text-red-500 font-sans">{children}</p> : null;

 
const ChevronDown = () => (
  <KeyboardArrowDownIcon
    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
    fontSize="small"
  />
);

 
const pad = (n) => String(n).padStart(2, "0");

 
function to12Hour(value24) {
  if (!value24) {
    const now = new Date();
    return { hour: ((now.getHours() % 12) || 12), minute: now.getMinutes(), period: now.getHours() >= 12 ? "PM" : "AM" };
  }
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

 
// Same 12-hour spinner time picker used on Step 1's "Send Updates To" rows,
// reused here for each stop's Start — Time field.
function CustomTimePicker({ value, onChange, hasError = false }) {
  const { hour, minute, period } = to12Hour(value);

 
  const commit = (nextHour, nextMinute, nextPeriod) => {
    onChange(to24HourString(nextHour, nextMinute, nextPeriod));
  };

 
  const bumpHour = (dir) => {
    const next = ((hour - 1 + dir + 12) % 12) + 1;
    commit(next, minute, period);
  };
  const bumpMinute = (dir) => {
    const next = (minute + dir + 60) % 60;
    commit(hour, next, period);
  };
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
  const segmentClass =
    "w-6 border-none bg-transparent text-center text-sm font-semibold text-slate-800 outline-none font-sans";

 
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
        className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition font-sans"
      >
        {period}
      </button>
    </div>
  );
}

 
// Plain typed HH:MM duration input for "Start the Track: __ hrs before
// pickup" — just a text box showing 00:00 that the user types over directly
// (no spinners). Auto-inserts the colon as digits are typed, and clamps
// hours to 0-99 / minutes to 0-59 on blur.
function DurationInput({ value, onChange, hasError = false }) {
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    let hourDigits = digits.slice(0, 2);
    let minuteDigits = digits.slice(2, 4);

 
    if (hourDigits.length === 1 && parseInt(hourDigits, 10) > 2) {
      // Max is 24 hrs, so a lone first digit of 3-9 can only be a
      // single-digit hour — pad it immediately (e.g. "9" -> "09") and
      // move straight on to the minutes.
      hourDigits = pad(parseInt(hourDigits, 10));
    } else if (hourDigits.length === 2) {
      const hVal = Math.min(parseInt(hourDigits, 10) || 0, 24);
      hourDigits = pad(hVal);
    }

 
    if (minuteDigits.length === 2) {
      const mVal = Math.min(parseInt(minuteDigits, 10) || 0, 59);
      minuteDigits = pad(mVal);
    }

 
    onChange(hourDigits.length === 2 ? `${hourDigits}:${minuteDigits}` : hourDigits);
  };

 
  const handleBlur = () => {
    if (!value) return;
    const [rawHour = "", rawMinute = ""] = value.split(":");
    const hour = Math.min(parseInt(rawHour, 10) || 0, 24);
    const minute = Math.min(parseInt(rawMinute, 10) || 0, 59);
    onChange(`${pad(hour)}:${pad(minute)}`);
  };

 
  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder="00:00"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className={
        "w-28 rounded-xl border bg-white px-4 py-3 text-center text-sm font-semibold text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition font-sans " +
        (hasError
          ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100")
      }
    />
  );
}

 
const StopTypeBadge = ({ label }) => (
  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-600 font-sans">
    {label}
  </span>
);

 
// --- GOOGLE MAPS AUTOCOMPLETE COMPONENT ---
// Controlled via Controller (value/onChange) so the "required" rule on
// stops.{index}.address actually registers with react-hook-form and shows
// up in `errors`. setValue is still used for the side-channel fields
// (lat/lng/city/state/zip/country) that Google's Autocomplete fills in.
function AddressAutocomplete({ index, value, onChange, setValue, error, hasError }) {
  const inputRef = useRef(null);

 
  useEffect(() => {
    // Ensure Google maps script is loaded in your index.html
    if (!window.google) {
      console.warn("Google Maps JavaScript API is not loaded.");
      return;
    }

 
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["address_components", "geometry", "formatted_address"],
    });

 
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();

 
      if (!place.geometry) return;

 
      // Extract Coordinates
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

 
      // Extract Address Components
      let city = "", state = "", zip = "", country = "";
      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes("locality") || types.includes("sublocality_level_1")) city = component.long_name;
        if (types.includes("administrative_area_level_1")) state = component.short_name;
        if (types.includes("postal_code")) zip = component.long_name;
        if (types.includes("country")) country = component.long_name;
      });

 
      // Push the selected address through Controller's onChange (this is
      // what makes the "required" validation aware of a real value), and
      // populate the remaining fields via setValue as before.
      onChange(place.formatted_address);
      setValue(`stops.${index}.latitude`, lat);
      setValue(`stops.${index}.longitude`, lng);
      if (city) setValue(`stops.${index}.city`, city);
      if (state) setValue(`stops.${index}.state`, state);
      if (zip) setValue(`stops.${index}.zipcode`, zip);
      if (country) setValue(`stops.${index}.country`, country);
    });

 
    return () => {
      if (window.google) window.google.maps.event.removeListener(listener);
    };
  }, [index, setValue, onChange]);

 
  return (
    <div>
      <input
        ref={inputRef}
        className={inputClass + (hasError ? " border-red-400 focus:border-red-400 focus:ring-red-100" : "")}
        placeholder="Search and select address..."
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <ErrorText>{error}</ErrorText>
    </div>
  );
}

 
// Builds the specific JSON structure your backend expects
function buildTripSheetPayload(stops) {
  return stops.map((stop) => ({
    stop_type: stop.stopTypeLabel || stop.stopType,
    stop_name: stop.stopName,
    address: stop.address,
    address_2: stop.address2 || "",
    city: stop.city || "",
    state: stop.state || "",
    zipcode: stop.zipcode || "",
    country: stop.country || "",
    latitude: stop.latitude,
    longitude: stop.longitude,

 
    start_date: stop.startDate || "",
    start_time: stop.startTime || "",
    start_timezone: stop.startTimezone ? stop.startTimezone.split(') ')[1] : "", // Extracts 'Pacific' from '(UTC-08:00) Pacific'

 
    // Only meaningful for the Pickup stop
    track_start_offset: stop.stopType === "pickup" ? (stop.trackStartOffset || "") : "",

 
    comment_to_driver: stop.commentToDriver || "",
    alert_emails: stop.alertEmails || "",

 
    custom_events: (stop.customEvents || []).map((ce) => ({
      question: ce.question || "",
      answer_type: ce.answerType || "",
    })),
  }));
}

 
function CustomEventRow({ stopIndex, ceIndex, control, register, remove }) {
  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400 font-sans">
          Event {ceIndex + 1}
        </p>
        <IconButton size="small" onClick={() => remove(ceIndex)} aria-label="Remove custom event" sx={{ color: "#94a3b8" }}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </div>

 
      <div className="mb-3">
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400 font-sans">
          Answer Type
        </label>
        <div className="relative">
          <select
            className={selectClass}
            {...register(`stops.${stopIndex}.customEvents.${ceIndex}.answerType`)}
            defaultValue=""
          >
            <option value="" disabled>Select how the carrier should respond</option>
            {ANSWER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown />
        </div>
      </div>

 
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400 font-sans">
          Question
        </label>
        <input
          className={inputClass}
          placeholder="e.g. Was the load secured properly?"
          {...register(`stops.${stopIndex}.customEvents.${ceIndex}.question`)}
        />
      </div>
    </div>
  );
}

 
function StopCard({ index, total, control, register, errors, setValue, remove, canRemove }) {
  const [collapsed, setCollapsed] = useState(false);

 
  const {
    fields: customEventFields,
    append: appendCustomEvent,
    remove: removeCustomEvent,
  } = useFieldArray({ control, name: `stops.${index}.customEvents` });

 
  const { value: stopTypeValue, label: stopTypeLabel } = getStopTypeInfo(index, total);

 
  const toggleCollapsed = () => setCollapsed((v) => !v);

 
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm font-sans">
      <div
        role="button"
        tabIndex={0}
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
        className="flex cursor-pointer select-none items-center justify-between border-b border-slate-100 px-6 py-4"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#112963] text-sm font-bold text-white">
            {index + 1}
          </span>
          <p className="text-sm font-bold text-slate-800">
            Stop {index + 1} · {stopTypeLabel}
          </p>
          <StopTypeBadge label={stopTypeLabel} />
        </div>

 
        <div className="flex items-center gap-2">
          {canRemove ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                remove(index);
                toast.success({ title: "Stop removed", duration: 2500 });
              }}
              sx={{ color: "#94a3b8", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "6px" }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          ) : null}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            sx={{
              color: "#94a3b8",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "6px",
              transform: collapsed ? "rotate(-90deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

 
      {!collapsed && (
        <div className="grid grid-cols-1 gap-8 px-6 py-6 lg:grid-cols-2">
          <div>
            <SectionEyebrow>Location</SectionEyebrow>

 
            <div className="mb-5">
              <FieldLabel>Stop Type</FieldLabel>
              {/* Stop type is derived automatically from the stop's position in the
                  route (Pickup -> Intermediate(s) -> Delivery) and is not user editable. */}
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 font-sans">
                {stopTypeLabel}
              </div>
            </div>

 
            <div className="mb-5">
              <FieldLabel>Stop Name</FieldLabel>
              <input className={inputClass} placeholder="Enter stop name" {...register(`stops.${index}.stopName`)} />
            </div>

 
            <div className="mb-5">
              <FieldLabel required>Address</FieldLabel>
              {/* Custom Google Places Component injected here */}
              <Controller
                control={control}
                name={`stops.${index}.address`}
                rules={{ required: "Address is required" }}
                render={({ field: { value, onChange }, fieldState }) => (
                  <AddressAutocomplete
                    index={index}
                    value={value}
                    onChange={onChange}
                    setValue={setValue}
                    error={fieldState.error?.message}
                    hasError={!!fieldState.error}
                  />
                )}
              />
            </div>

 
            <div className="mb-5">
              <label className="mb-2 block text-sm font-semibold text-slate-800 font-sans">
                Address 2 <span className="font-normal text-slate-400">optional</span>
              </label>
              <input className={inputClass} placeholder="Enter address 2" {...register(`stops.${index}.address2`)} />
            </div>

 
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel>City</FieldLabel>
                <input className={inputClass} placeholder="City" {...register(`stops.${index}.city`)} />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <input className={inputClass} placeholder="State" {...register(`stops.${index}.state`)} />
              </div>
              <div>
                <FieldLabel>Zipcode</FieldLabel>
                <input className={inputClass} placeholder="Zip" {...register(`stops.${index}.zipcode`)} />
              </div>
            </div>

 
            <div className="mb-8">
              <FieldLabel>Country</FieldLabel>
              <div className="relative">
                <select className={selectClass} {...register(`stops.${index}.country`)} defaultValue="">
                  <option value="" disabled>Select country</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>

 
            <SectionEyebrow>Timing</SectionEyebrow>
            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <FieldLabel required>Start — Date</FieldLabel>
                <input
                  className={inputClass}
                  type="date"
                  {...register(`stops.${index}.startDate`, { required: "Start date is required" })}
                />
                <ErrorText>{errors?.stops?.[index]?.startDate?.message}</ErrorText>
              </div>
              <div>
                <FieldLabel>Time</FieldLabel>
                <Controller
                  control={control}
                  name={`stops.${index}.startTime`}
                  render={({ field: { value, onChange } }) => (
                    <CustomTimePicker value={value} onChange={onChange} />
                  )}
                />
              </div>
              <div>
                <FieldLabel>Timezone</FieldLabel>
                <div className="relative">
                  <select className={selectClass} {...register(`stops.${index}.startTimezone`)} defaultValue="">
                    <option value="" disabled>Select timezone</option>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                  <ChevronDown />
                </div>
              </div>
            </div>

 
            {/* Start the Track — only shown for the Pickup stop */}
            {stopTypeValue === "pickup" && (
              <div className="mb-8">
                <FieldLabel>Start the Track</FieldLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <Controller
                    control={control}
                    name={`stops.${index}.trackStartOffset`}
                    render={({ field: { value, onChange } }) => (
                      <DurationInput value={value} onChange={onChange} />
                    )}
                  />
                  <span className="text-sm font-medium text-slate-500 font-sans">
                    hrs before the above entered pickup time
                  </span>
                </div>
              </div>
            )}

 
            <SectionEyebrow>Driver Comms</SectionEyebrow>
            <div className="mb-5">
              <FieldLabel>Comment to Driver</FieldLabel>
              <textarea
                rows={3}
                className={inputClass + " resize-y"}
                placeholder="Type your message"
                {...register(`stops.${index}.commentToDriver`)}
              />
            </div>
            <div>
              <FieldLabel>Alert Emails</FieldLabel>
              <input
                className={inputClass}
                placeholder="Enter email(s)"
                {...register(`stops.${index}.alertEmails`, {
                  validate: (v) => v === "" || EMAIL_LIST_PATTERN.test(v) || "Enter one or more valid emails",
                })}
              />
              <ErrorText>{errors?.stops?.[index]?.alertEmails?.message}</ErrorText>
            </div>
          </div>

 
          <div>
            <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
              <p className="text-xs font-bold tracking-widest text-blue-600 font-sans">EVENTS AT LOCATION</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              {customEventFields.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400 font-sans">
                  No custom events yet
                </div>
              ) : (
                customEventFields.map((ce, ceIndex) => (
                  <CustomEventRow
                    key={ce.id}
                    stopIndex={index}
                    ceIndex={ceIndex}
                    control={control}
                    register={register}
                    remove={removeCustomEvent}
                  />
                ))
              )}

 
              <div className="border-t border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => appendCustomEvent({ question: "", answerType: "" })}
                  className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 font-sans"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50">
                    <AddIcon sx={{ fontSize: 14 }} />
                  </span>
                  Add custom event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

 
export default function TrackShipmentStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  const step2Draft = useTripSheetDraftStore((s) => s.step2);
  const setStep2Draft = useTripSheetDraftStore((s) => s.setStep2);
  const resetStep2Draft = useTripSheetDraftStore((s) => s.resetStep2);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm({
    mode: "onBlur",
    defaultValues: step2Draft,
  });

  const { fields, append, insert, remove } = useFieldArray({ control, name: "stops" });

  // Keep stopType/stopTypeLabel in sync with each stop's position whenever
  // stops are added or removed (Pickup -> Intermediate(s) -> Delivery).
  useEffect(() => {
    fields.forEach((_, idx) => {
      const info = getStopTypeInfo(idx, fields.length);
      setValue(`stops.${idx}.stopType`, info.value);
      setValue(`stops.${idx}.stopTypeLabel`, info.label);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length]);

  useEffect(() => {
    const subscription = watch((values) => setStep2Draft(values));
    return () => subscription.unsubscribe();
  }, [watch, setStep2Draft]);

  const onInvalid = () => {
    toast.error({ title: "Missing information", message: "Please check the highlighted fields." });
  };

  const onSubmit = async (data) => {
    const step1Payload = location.state?.step1Payload;

    if (!step1Payload) {
      toast.error({ title: "Missing Shipment Summary", message: "Please complete step 1 first." });
      navigate("/trackshipment/step1");
      return;
    }

    const stopsPayload = buildTripSheetPayload(data.stops);

    const formData = new FormData();
    formData.append("stops_data", JSON.stringify(stopsPayload));

    try {
      const shipmentRes = await apiFetch("/shipments", {
        method: "POST",
        body: JSON.stringify(step1Payload),
      });

      if (!shipmentRes) {
        toast.error({
          title: "Could not create shipment",
          message: shipmentRes?.message || "Please check the form and try again.",
          duration: 6000,
        });
        return;
      }

      const shipmentUuid = shipmentRes.data?.uuid || shipmentRes.uuid;
      localStorage.setItem("current_shipment_uuid", shipmentUuid);

      await apiFetch(`/shipments/${shipmentUuid}/stops`, {
        method: "POST",
        body: formData,
      });

      toast.success({ title: "Shipment and Stops saved successfully!", duration: 2500 });
      resetStep2Draft();
      navigate("/dashboard");
    } catch (err) {
      toast.error({ title: "Failed to save data", message: err?.message || "An error occurred." });
    }
  };

  return (
    <div className="flex min-h-screen bg-[#EBF1FC] font-sans">
      <StepSidebar currentStep={2} />
      <div className="flex-1 px-8 py-10 md:px-14">
        <div className="mb-4 border-b border-[#E2EAF4] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#93A7CD]">STEP 2</p>
          <h1 className="mt-1 text-[32px] font-extrabold tracking-tight text-[#112963]">Trip Sheet</h1>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#7085A8]">
            Add each stop on the route. Search addresses below to automatically get coordinates.
          </p>
        </div>

        <div className="max-w-5xl">
          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="pb-28">
            {fields.map((field, index) => (
              <StopCard
                key={field.id}
                index={index}
                total={fields.length}
                control={control}
                register={register}
                errors={errors}
                setValue={setValue} // Passing setValue down so Autocomplete can update forms
                remove={remove}
                canRemove={index !== 0 && index !== fields.length - 1}
              />
            ))}

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => insert(Math.max(fields.length - 1, 0), blankStop())}
                className="group inline-flex items-center gap-2.5 rounded-xl border border-dashed border-[#B8CCF8] bg-white px-6 py-3 transition-all duration-200 hover:border-[#2F5CFB] hover:bg-[#F8FBFF]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF4FF] group-hover:bg-[#DCE9FF]">
                  <AddIcon sx={{ fontSize: 18, color: "#2F5CFB" }} />
                </span>
                <span className="text-base font-bold text-[#112963] font-sans">Add another stop</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-8 py-4 backdrop-blur md:px-14 font-sans">
        <div className="ml-0 flex max-w-6xl items-center justify-between md:ml-[280px]">
          <span className="text-sm font-semibold text-slate-500 font-sans">
            {fields.length} stop{fields.length === 1 ? "" : "s"} on this route
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/trackshipment/step1")}
              className="rounded-xl border border-slate-200 px-6 py-4 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit, onInvalid)}
              className="rounded-xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}