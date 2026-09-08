import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { create } from "zustand";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";

import StepSidebar from "./StepSidebar";
import { useShipmentDraftStore, CustomDropdown } from "./Step1";
import {
  COUNTRY_CODES,
  PHONE_VALIDATION,
  validatePhoneForCountry,
  sanitizePhoneDigits,
} from "../../../lib/phone";
import CountryFlag from "../../../components/CountryFlag";

import IconButton from "@mui/material/IconButton";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import AddIcon from "@mui/icons-material/Add";
import RouteOutlinedIcon from "@mui/icons-material/RouteOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import FlagCircleOutlinedIcon from "@mui/icons-material/FlagCircleOutlined";
import TripOriginOutlinedIcon from "@mui/icons-material/TripOriginOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";

const COUNTRIES = ["United States", "Canada", "Mexico", "India"];

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

// Only letters and spaces (used for the shipper / receiver contact name)
const ALPHA_PATTERN = /^[A-Za-z\s]*$/;

// Every phone field defaults to the US dial code.
const DEFAULT_COUNTRY_CODE = "US";

const dialFor = (countryCode) =>
  COUNTRY_CODES.find((c) => c.code === (countryCode || DEFAULT_COUNTRY_CODE))?.dial || "+1";

const COUNTRY_CODE_OPTIONS = COUNTRY_CODES.map((c) => ({
  value: c.code,
  label: `${c.code} ${c.dial}`,
  searchText: `${c.code} ${c.dial} ${c.label}`,
  render: (isSelected) => (
    <span className="flex items-center gap-1.5">
      <CountryFlag code={c.code} />
      <span className={`text-[11px] font-bold uppercase ${isSelected ? "text-white" : "text-slate-500"}`}>
        {c.code}
      </span>
      <span>{c.dial}</span>
    </span>
  ),
}));

// Strips digits/symbols from name-type fields — letters and spaces only.
function sanitizeName(rawValue) {
  return (rawValue || "").replace(/[^A-Za-z\s]/g, "");
}

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

  requiresOtp: false,
  contactName: "",
  contactCountryCode: DEFAULT_COUNTRY_CODE,
  contactPhone: "",

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

  endDate: "",
  endTime: "",
  endTimezone: "",

  trackStartOffset: "",

  commentToDriver: "",
  alertEmails: "",

  customEvents: [],
});

export const BLANK_STEP2_VALUES = {
  stops: [blankStop(), blankStop()],
};

// Zod schema — single source of truth for validation, mirroring Step1's
// pattern. The onChange sanitizers on the inputs are UX guardrails only
// (they stop invalid keystrokes) and never decide correctness on their own.
const stopSchema = z.object({
  stopType: z.string(),
  stopTypeLabel: z.string(),
  stopName: z.string().optional().or(z.literal("")),

  // Contact name / phone are optional unless the stop has OTP turned on —
  // the conditional requirement lives in step2Schema's superRefine below.
  requiresOtp: z.boolean().optional(),
  contactName: z
    .string()
    .trim()
    .regex(ALPHA_PATTERN, "Only letters and spaces are allowed")
    .optional()
    .or(z.literal("")),
  contactCountryCode: z.string().optional().or(z.literal("")),
  contactPhone: z.string().trim().optional().or(z.literal("")),

  address: z.string().trim().min(1, "Address is required"),
  address2: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zipcode: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),

  startDate: z.string().optional().or(z.literal("")),
  startTime: z.string().optional().or(z.literal("")),
  startTimezone: z.string().optional().or(z.literal("")),

  endDate: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  endTimezone: z.string().optional().or(z.literal("")),

  trackStartOffset: z.string().optional().or(z.literal("")),

  commentToDriver: z.string().optional().or(z.literal("")),
  alertEmails: z
    .string()
    .optional()
    .refine((v) => !v || EMAIL_LIST_PATTERN.test(v), {
      message: "Enter one or more valid emails",
    }),

  customEvents: z.array(z.any()).optional(),
});

const step2Schema = z.object({ stops: z.array(stopSchema) }).superRefine((data, ctx) => {
  data.stops.forEach((stop, idx) => {
    const isPickup = stop.stopType === "pickup";

    // Contact name / phone only matter when this stop asks the driver for an
    // OTP — the code is texted to that number, so both become mandatory.
    if (stop.requiresOtp) {
      if (!stop.contactName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stops", idx, "contactName"],
          message: "Name is required when OTP is enabled",
        });
      }

      const digits = (stop.contactPhone || "").replace(/\D/g, "");
      if (!digits) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stops", idx, "contactPhone"],
          message: "Phone number is required — the OTP is sent here",
        });
      } else {
        const phoneCheck = validatePhoneForCountry(digits, stop.contactCountryCode || DEFAULT_COUNTRY_CODE);
        if (phoneCheck !== true) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["stops", idx, "contactPhone"],
            message: phoneCheck,
          });
        }
      }
    } else if (stop.contactPhone) {
      // Optional, but if something was typed it still has to be a real number.
      const phoneCheck = validatePhoneForCountry(stop.contactPhone, stop.contactCountryCode || DEFAULT_COUNTRY_CODE);
      if (phoneCheck !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stops", idx, "contactPhone"],
          message: phoneCheck,
        });
      }
    }

    if (isPickup) {
      if (!stop.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stops", idx, "startDate"],
          message: "Start date is required",
        });
      }
    } else {
      if (!stop.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stops", idx, "endDate"],
          message: "End date is required",
        });
      }
      if (!stop.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stops", idx, "endTime"],
          message: "End time is required",
        });
      }
      if (!stop.endTimezone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stops", idx, "endTimezone"],
          message: "End timezone is required",
        });
      }
    }
  });
});

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

const SectionEyebrow = ({ icon: Icon, children }) => (
  <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3.5">
    {Icon ? (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D4ED8]">
        <Icon sx={{ fontSize: 19 }} />
      </span>
    ) : null}
    <p className="text-[15px] font-bold tracking-tight text-[#112963] font-sans">
      {children}
    </p>
  </div>
);

const subPanelClass = "rounded-2xl border border-slate-100 bg-slate-50/50 p-4";

function ToggleSwitch({ checked, onChange, label, hint, id }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="block cursor-pointer text-sm font-semibold text-slate-800 font-sans">
          {label}
        </label>
        {hint ? <p className="mt-1 text-xs text-slate-500 font-sans">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-200 ${
          checked ? "bg-[#2F5CFB]" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

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
    return { hour: 12, minute: 0, period: "AM" };
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

  useEffect(() => {
  window.scrollTo(0, 0);
}, []);

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

function DurationInput({ value, onChange, hasError = false }) {
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    let hourDigits = digits.slice(0, 2);
    let minuteDigits = digits.slice(2, 4);

    if (hourDigits.length === 1 && parseInt(hourDigits, 10) > 2) {
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

function AddressAutocomplete({ index, value, onChange, setValue, error, hasError }) {
  const inputRef = useRef(null);

  useEffect(() => {
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

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      let city = "", state = "", zip = "", country = "";
      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes("locality") || types.includes("sublocality_level_1")) city = component.long_name;
        if (types.includes("administrative_area_level_1")) state = component.short_name;
        if (types.includes("postal_code")) zip = component.long_name;
        if (types.includes("country")) country = component.long_name;
      });

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

const timezoneName = (tz) => (tz ? tz.split(") ")[1] || tz : "");

function buildTripSheetPayload(stops) {
  return stops.map((stop) => {
    const hasEndWindow = stop.stopType !== "pickup";
    const hasStartWindow = stop.stopType === "pickup";

    return {
      stop_type: stop.stopTypeLabel || stop.stopType,
      stop_name: stop.stopName,

      requires_otp: !!stop.requiresOtp,
      contact_name: stop.contactName || "",
      contact_country_code: dialFor(stop.contactCountryCode),
      contact_phone: stop.contactPhone || "",

      address: stop.address,
      address_2: stop.address2 || "",
      city: stop.city || "",
      state: stop.state || "",
      zipcode: stop.zipcode || "",
      country: stop.country || "",
      latitude: stop.latitude,
      longitude: stop.longitude,

      start_date: hasStartWindow ? stop.startDate || "" : "",
      start_time: hasStartWindow ? stop.startTime || "" : "",
      start_timezone: hasStartWindow ? timezoneName(stop.startTimezone) : "",

      end_date: hasEndWindow ? stop.endDate || "" : "",
      end_time: hasEndWindow ? stop.endTime || "" : "",
      end_timezone: hasEndWindow ? timezoneName(stop.endTimezone) : "",

      track_start_offset: stop.stopType === "pickup" ? (stop.trackStartOffset || "") : "",

      comment_to_driver: stop.commentToDriver || "",
      alert_emails: stop.alertEmails || "",

      custom_events: (stop.customEvents || []).map((ce) => ({
        question: ce.question || "",
        answer_type: ce.answerType || "",
      })),
    };
  });
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

function StopCard({ index, total, control, register, errors, setValue, trigger, remove, canRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  const {
    fields: customEventFields,
    append: appendCustomEvent,
    remove: removeCustomEvent,
  } = useFieldArray({ control, name: `stops.${index}.customEvents` });

  const { value: stopTypeValue, label: stopTypeLabel } = getStopTypeInfo(index, total);

  const contactLabel =
    stopTypeValue === "pickup" ? "Shipper" : stopTypeValue === "delivery" ? "Receiver" : "Contact";

  const requiresOtp = !!useWatch({ control, name: `stops.${index}.requiresOtp` });
  const contactCountryCode =
    useWatch({ control, name: `stops.${index}.contactCountryCode` }) || DEFAULT_COUNTRY_CODE;

  const toggleCollapsed = () => setCollapsed((v) => !v);

  const stopAccent =
    stopTypeValue === "pickup" ? "#1D4ED8" : stopTypeValue === "delivery" ? "#12B76A" : "#7C6EF2";
  const StopIcon =
    stopTypeValue === "pickup" ? TripOriginOutlinedIcon : stopTypeValue === "delivery" ? FlagCircleOutlinedIcon : PlaceOutlinedIcon;

  return (
    <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,36,84,0.04),0_16px_32px_-24px_rgba(15,36,84,0.35)] transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(15,36,84,0.04),0_20px_36px_-20px_rgba(15,36,84,0.18)] font-sans">
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
        className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-y-2 border-b border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-4"
        style={{ borderLeft: `4px solid ${stopAccent}` }}
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
            style={{ backgroundColor: stopAccent }}
          >
            <StopIcon sx={{ fontSize: 18 }} />
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
              sx={{ color: "#94a3b8", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "6px", background: "#fff" }}
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
              background: "#fff",
              transform: collapsed ? "rotate(-90deg)" : "none",
              transition: "transform 0.15s",
            }}
          >
            <KeyboardArrowDownIcon fontSize="small" />
          </IconButton>
        </div>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 gap-8 px-4 sm:px-6 py-6 lg:grid-cols-2">
          <div>
            <SectionEyebrow icon={LocationOnOutlinedIcon}>Location</SectionEyebrow>

            <div className="mb-5">
              <FieldLabel>Stop Type</FieldLabel>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500 font-sans">
                {stopTypeLabel}
              </div>
            </div>

            <div className="mb-5">
              <FieldLabel>Stop Name</FieldLabel>
              <input className={inputClass} placeholder="Enter stop name" {...register(`stops.${index}.stopName`)} />
            </div>

            <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <Controller
                control={control}
                name={`stops.${index}.requiresOtp`}
                render={({ field: { value, onChange } }) => (
                  <ToggleSwitch
                    id={`stop-${index}-requires-otp`}
                    checked={!!value}
                    onChange={(next) => {
                      onChange(next);
                      trigger([`stops.${index}.contactName`, `stops.${index}.contactPhone`]);
                    }}
                    label={`Do you need OTP enabled ${stopTypeLabel}`}
                    hint={
                      value
                        ? `The verification code for this stop is texted to the ${contactLabel.toLowerCase()} phone below.`
                        : "Off by default — the driver completes this stop without a verification code."
                    }
                  />
                )}
              />

              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required={requiresOtp}>
                    {contactLabel} Name{" "}
                    {requiresOtp ? null : <span className="font-normal text-slate-400">optional</span>}
                  </FieldLabel>
                  <Controller
                    control={control}
                    name={`stops.${index}.contactName`}
                    render={({ field: { value, onChange }, fieldState }) => (
                      <>
                        <input
                          className={
                            inputClass +
                            (fieldState.error ? " border-red-400 focus:border-red-400 focus:ring-red-100" : "")
                          }
                          placeholder={`Who the driver reports to at ${stopTypeLabel.toLowerCase()}`}
                          value={value || ""}
                          onChange={(e) => onChange(sanitizeName(e.target.value))}
                        />
                        <ErrorText>{fieldState.error?.message}</ErrorText>
                      </>
                    )}
                  />
                </div>
                <div>
                  <FieldLabel required={requiresOtp}>
                    {contactLabel} Phone{" "}
                    {requiresOtp ? null : <span className="font-normal text-slate-400">optional</span>}
                  </FieldLabel>
                  <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                    <Controller
                      control={control}
                      name={`stops.${index}.contactCountryCode`}
                      render={({ field: { value, onChange } }) => (
                        <CustomDropdown
                          value={value || DEFAULT_COUNTRY_CODE}
                          onChange={(next) => {
                            onChange(next);
                            trigger(`stops.${index}.contactPhone`);
                          }}
                          options={COUNTRY_CODE_OPTIONS}
                          placeholder="Code"
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name={`stops.${index}.contactPhone`}
                      render={({ field: { value, onChange }, fieldState }) => (
                        <div>
                          <input
                            className={
                              inputClass +
                              (fieldState.error ? " border-red-400 focus:border-red-400 focus:ring-red-100" : "")
                            }
                            placeholder="5550001111"
                            inputMode="numeric"
                            maxLength={(PHONE_VALIDATION[contactCountryCode] || PHONE_VALIDATION.US).length}
                            value={value || ""}
                            onChange={(e) => onChange(sanitizePhoneDigits(e.target.value, contactCountryCode))}
                          />
                          <ErrorText>{fieldState.error?.message}</ErrorText>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <FieldLabel required>Address</FieldLabel>
              <Controller
                control={control}
                name={`stops.${index}.address`}
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

            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
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

            <div className="mb-2">
              <FieldLabel>Country</FieldLabel>
              <div className="relative">
                <select className={selectClass} {...register(`stops.${index}.country`)} defaultValue="">
                  <option value="" disabled>Select country</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>
          </div>

          <div>
            <SectionEyebrow icon={AccessTimeOutlinedIcon}>Timing</SectionEyebrow>

            {stopTypeValue === "pickup" && (
              <div className={`mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 ${subPanelClass}`}>
                <p className="col-span-full -mt-0.5 mb-0.5 text-[11px] font-bold uppercase tracking-wide text-[#1D4ED8]">
                  Start Window
                </p>
                <div>
                  <FieldLabel required>Start — Date</FieldLabel>
                  <input
                    className={inputClass}
                    type="date"
                    {...register(`stops.${index}.startDate`)}
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
            )}

            {stopTypeValue !== "pickup" && (
              <div className={`mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 ${subPanelClass}`}>
                <p className="col-span-full -mt-0.5 mb-0.5 text-[11px] font-bold uppercase tracking-wide text-[#12B76A]">
                  End Window
                </p>
                <div>
                  <FieldLabel required>End — Date</FieldLabel>
                  <input
                    className={inputClass}
                    type="date"
                    {...register(`stops.${index}.endDate`)}
                  />
                  <ErrorText>{errors?.stops?.[index]?.endDate?.message}</ErrorText>
                </div>
                <div>
                  <FieldLabel required>Time</FieldLabel>
                  <Controller
                    control={control}
                    name={`stops.${index}.endTime`}
                    render={({ field: { value, onChange }, fieldState }) => (
                      <>
                        <CustomTimePicker value={value} onChange={onChange} hasError={!!fieldState.error} />
                        <ErrorText>{fieldState.error?.message}</ErrorText>
                      </>
                    )}
                  />
                </div>
                <div>
                  <FieldLabel required>Timezone</FieldLabel>
                  <div className="relative">
                    <select
                      className={
                        selectClass +
                        (errors?.stops?.[index]?.endTimezone ? " border-red-400 focus:border-red-400 focus:ring-red-100" : "")
                      }
                      {...register(`stops.${index}.endTimezone`)}
                      defaultValue=""
                    >
                      <option value="" disabled>Select timezone</option>
                      {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    <ChevronDown />
                  </div>
                  <ErrorText>{errors?.stops?.[index]?.endTimezone?.message}</ErrorText>
                </div>
              </div>
            )}

            {stopTypeValue === "pickup" && (
              <div className={`mb-6 ${subPanelClass}`}>
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

            <SectionEyebrow icon={ChatBubbleOutlineIcon}>Driver Comms</SectionEyebrow>
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
                {...register(`stops.${index}.alertEmails`)}
              />
              <ErrorText>{errors?.stops?.[index]?.alertEmails?.message}</ErrorText>
            </div>

            <div className="mt-8">
              <SectionEyebrow icon={EventNoteOutlinedIcon}>Events at Location</SectionEyebrow>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
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

                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
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

  const resetStep1Draft = useShipmentDraftStore((s) => s.resetStep1);
  const markComingFromStep2Back = useShipmentDraftStore((s) => s.markComingFromStep2Back);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { isSubmitting, errors },
  } = useForm({
    resolver: zodResolver(step2Schema),
    mode: "onBlur",
    defaultValues: step2Draft,
  });

  const { fields, append, insert, remove } = useFieldArray({ control, name: "stops" });

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
      resetStep1Draft();
      navigate("/dashboard");
    } catch (err) {
      toast.error({ title: "Failed to save data", message: err?.message || "An error occurred." });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#EBF1FC] font-sans">
      <StepSidebar currentStep={2} />
      <div className="flex-1 min-w-0 px-4 sm:px-6 md:px-10 lg:px-14 py-6 lg:py-10">
        <div className="mb-8 flex items-start justify-between gap-4 overflow-hidden rounded-[28px] border border-[#DCE6F7] bg-gradient-to-br from-white to-[#F1F6FE] px-6 sm:px-8 py-7 shadow-[0_1px_2px_rgba(15,36,84,0.04),0_20px_40px_-24px_rgba(15,36,84,0.35)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5B7FCB]">Step 2 of 2</p>
            <h1 className="mt-1.5 text-[24px] sm:text-[28px] lg:text-[32px] font-extrabold tracking-tight text-[#112963]">Trip Sheet</h1>
            <p className="mt-2 max-w-lg text-[15px] font-medium leading-relaxed text-[#7085A8]">
              Add each stop on the route. Search addresses below to automatically get coordinates.
            </p>
          </div>
          <span className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#112963] text-white shadow-lg shadow-[#112963]/20">
            <RouteOutlinedIcon sx={{ fontSize: 26 }} />
          </span>
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
                setValue={setValue}
                trigger={trigger}
                remove={remove}
                canRemove={index !== 0 && index !== fields.length - 1}
              />
            ))}

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => insert(Math.max(fields.length - 1, 0), blankStop())}
                className="group inline-flex items-center gap-2.5 rounded-2xl border border-dashed border-[#B8CCF8] bg-white px-5 sm:px-7 py-3.5 shadow-sm transition-all duration-200 hover:border-[#2F5CFB] hover:bg-[#F8FBFF] hover:shadow-md"
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

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 sm:px-6 md:px-10 lg:px-14 py-3 lg:py-4 shadow-[0_-4px_20px_rgba(15,36,84,0.08)] backdrop-blur font-sans">
        <div className="ml-0 flex max-w-6xl flex-wrap items-center justify-between gap-3 lg:ml-[280px]">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF4FF] px-3 py-1.5 text-sm font-semibold text-[#112963] font-sans">
            {fields.length} stop{fields.length === 1 ? "" : "s"} on this route
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                markComingFromStep2Back();
                navigate("/trackshipment/step1");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-5 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 whitespace-nowrap"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit, onInvalid)}
              className="rounded-2xl bg-[#112963] px-5 sm:px-7 py-3 sm:py-4 text-sm font-semibold text-white shadow-lg shadow-[#112963]/25 transition hover:bg-[#0F2454] hover:shadow-xl disabled:opacity-60 whitespace-nowrap"
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}