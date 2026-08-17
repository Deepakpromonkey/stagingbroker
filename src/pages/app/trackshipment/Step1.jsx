import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { create } from "zustand";

import { apiFetch } from "../../../lib/api";
import { toast } from "../../../components/ui/Toaster";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import StepSidebar from "./StepSidebar";

import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ApartmentOutlinedIcon from "@mui/icons-material/ApartmentOutlined";
import MyLocationOutlinedIcon from "@mui/icons-material/MyLocationOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BookmarkAddedOutlinedIcon from "@mui/icons-material/BookmarkAddedOutlined";

const TRACKING_METHODS = [
  { value: "driver_phone", label: "Driver's Cell Phone" },
  { value: "eld", label: "ELD / Telematics" },
  // { value: "gps", label: "Trailer GPS" },
];

const DRIVER_TYPES = [
  { value: "company_driver", label: "Your company driver" },
  { value: "leased_owner_operator", label: "Owner operator (leased)" },
  { value: "independent_owner_operator", label: "Owner operator (independent)" },
  { value: "other_company_driver", label: "Other carrier company driver" },
];

const COUNTRY_CODES = [
  { code: "IN", dial: "+91", label: "India" },
  { code: "US", dial: "+1", label: "United States" },
  { code: "CA", dial: "+1", label: "Canada" },
  { code: "MX", dial: "+52", label: "Mexico" },
];

// NOTE: TRACK_DURATIONS and INTERVALS were only used by the "Send Updates To"
// rows, which have been removed from the UI below (see commented section).
// Keeping the constants here (unused) in case that section is restored later.
const TRACK_DURATIONS = [
  { value: "track for 1 day", label: "Track for 1 day" },
  { value: "track for 2 days", label: "Track for 2 days" },
  { value: "track for 3 days", label: "Track for 3 days" },
  { value: "track for 1 week", label: "Track for 1 week" },
];

const INTERVALS = [
  { value: "every 15 minutes", label: "Every 15 minutes" },
  { value: "every 30 minutes", label: "Every 30 minutes" },
  { value: "every 1 hour", label: "Every 1 hour" },
  { value: "every 2 hour", label: "Every 2 hours" },
];

/*
| How often the driver app reports its position, in seconds.
|
| The API accepts 60–21600 (CreateShipmentRequest), and the driver app reads
| the chosen value back off every sync response and restarts its tracker when
| it changes. The ends of the range are bounded for a reason: under a minute
| flattens a phone battery inside a shift without buying useful precision, and
| past six hours it is not tracking any more.
*/
const TRACKING_INTERVALS = [
  { value: 60, label: "Every 1 minute" },
  { value: 120, label: "Every 2 minutes" },
  { value: 300, label: "Every 5 minutes (default)" },
  { value: 600, label: "Every 10 minutes" },
  { value: 900, label: "Every 15 minutes" },
  { value: 1800, label: "Every 30 minutes" },
  { value: 3600, label: "Every 1 hour" },
  { value: 7200, label: "Every 2 hours" },
  { value: 14400, label: "Every 4 hours" },
  { value: 21600, label: "Every 6 hours" },
];

const PHONE_PATTERN = /^[0-9()+\-\s]{7,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_LIST_PATTERN = /^\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*(,\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*)*$/;

const CARRIER_LIST_URL = "/getCarrier";

// NEW: template listing + per-template fetch endpoints
const TEMPLATE_LIST_URL = "/shipment-templates";
const templateDetailUrl = (trackingNumber) =>
  `/shipment-templates/${encodeURIComponent(trackingNumber)}`;

export const BLANK_STEP1_VALUES = {
  reuseTemplate: "scratch",

  proNumber: "",
  trackingNumber: "",

  carrierName: "",
  carrierMc: "",
  carrierDot: "",
  carrierPhone: "",

  trackingMethod: "driver_phone",

  countryCode1: "US",
  driverPhone1: "",
  countryCode2: "US",
  driverPhone2: "",
  driverType: "owner_operator_leased",

  truckNumber: "",
  trailerNumber: "",

  teamLoad: false,

  dispatcherName: "",
  dispatcherEmail: "",

  // How often the driver's phone reports its position on this load. Five
  // minutes is the backend's default, so the form opens on the same value.
  trackingIntervalSeconds: 300,

  // Kept for backward compatibility with the payload shape / template
  // mapping even though the "Send Updates To" rows are hidden from the UI.
  updates: [
    { date: "", time: "", duration: "", interval: "" },
  ],
  emailUpdatesTo: "",

  notes: "",
  saveAsTemplate: false,
};

export const useShipmentDraftStore = create((set) => ({
  step1: BLANK_STEP1_VALUES,
  setStep1: (values) => set({ step1: values }),
  resetStep1: () => set({ step1: BLANK_STEP1_VALUES }),

  lastCreatedShipment: null,
  setLastCreatedShipment: (shipment) => set({ lastCreatedShipment: shipment }),
}));

const onInvalid = () => {
  toast.error({
    title: "Missing information",
    message: "Please check the highlighted fields and try again.",
  });
};

function useCarrierOptions() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiFetch(CARRIER_LIST_URL, { method: "GET" })
      .then((data) => {
        if (cancelled) return;
        // Be defensive about the response shape: plain array, or wrapped in
        // { data: [...] } / { records: [...] }
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.records)
              ? data.records
              : [];
        setCarriers(list);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return [carriers, loading];
}

function useApiOptions(endpoint) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiFetch(endpoint)
      .then((data) => {
        if (cancelled) return;

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data?.data)
              ? data.data
              : [];
        setOptions(list);
      })
      .catch(() => { })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return [options, setOptions, loading];
}

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

const CountryFlag = ({ code, className = "" }) => (
  <img
    src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`}
    srcSet={`https://flagcdn.com/48x36/${code.toLowerCase()}.png 2x`}
    width={20}
    height={15}
    alt=""
    className={`inline-block shrink-0 rounded-[2px] object-cover ${className}`}
  />
);

const CarrierStatusBadge = ({ carrier }) => {
  if (!carrier) return null;
  const verified = !!carrier.stripe_verified_at;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold  ${verified ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-700"
        }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${verified ? "bg-green-500" : "bg-yellow-400"}`} />
      {verified ? "Stripe Verified" : "Pending Verification"}
    </span>
  );
};

const FieldLabel = ({ children, required }) => (
  <label className="mb-2 block text-sm font-semibold text-slate-800 ">
    {children}
    {required ? <span className="ml-0.5 text-red-500">*</span> : null}
  </label>
);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ";

const selectClass = inputClass + " appearance-none pr-9";

const cardClass =
  "mb-6 rounded-[28px] border border-slate-200/80 bg-white p-5 sm:p-8 shadow-[0_1px_2px_rgba(15,36,84,0.04),0_16px_32px_-24px_rgba(15,36,84,0.35)] transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(15,36,84,0.04),0_20px_36px_-20px_rgba(15,36,84,0.18)]";

const switchSx = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
  "& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb": { backgroundColor: "#fff" },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: "#1D4ED8",
    opacity: 1,
  },
  "& .MuiSwitch-track": { backgroundColor: "#CBD5E1", opacity: 1 },
  "& .MuiSwitch-thumb": { boxShadow: "0 1px 3px rgba(15,36,84,0.3)" },
};

const SectionHeading = ({ icon: Icon, children, hint }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
    <div className="flex items-center gap-3">
      {Icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D4ED8]">
          <Icon sx={{ fontSize: 19 }} />
        </span>
      ) : null}
      <h3 className="text-[15px] font-bold tracking-tight text-[#112963] ">
        {children}
      </h3>
    </div>
    {hint ? <span className="text-xs font-medium text-slate-400">{hint}</span> : null}
  </div>
);

const ErrorText = ({ children }) =>
  children ? <p className="mt-1.5 text-xs text-red-500 ">{children}</p> : null;

const ChevronDown = () => (
  <KeyboardArrowDownIcon
    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
    sx={{ fontSize: 20 }}
  />
);

// NEW: a more visible pill-style toggle used for "Save as template".
// Same on/off boolean contract as MUI's Switch (checked / onChange(bool)),
// just styled so the on/off state is obvious at a glance: filled blue pill
// background, a sliding white knob, and a highlighted border + label color
// when active.
const CustomToggle = ({ checked, onChange, label, icon: Icon }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`group flex items-center gap-3 rounded-2xl border px-4 py-2.5 transition-all duration-200  ${
      checked
        ? "border-[#1D4ED8] bg-[#EEF4FF] shadow-sm"
        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    <span
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
        checked ? "bg-[#1D4ED8]" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] translate-x-[3px] transform rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : ""
        }`}
      />
    </span>
    <span
      className={`flex items-center gap-1.5 text-sm font-semibold transition-colors  ${
        checked ? "text-[#112963]" : "text-slate-600"
      }`}
    >
      {Icon ? (
        <Icon sx={{ fontSize: 16 }} className={checked ? "text-[#1D4ED8]" : "text-slate-400"} />
      ) : null}
      {label}
    </span>
  </button>
);

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Select…",
  loading = false,
  searchable = false,
  hasError = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  useOutsideClick(rootRef, () => setOpen(false));

  const selected = options.find((o) => o.value === value);
  const filtered =
    searchable && query
      ? options.filter((o) => (o.searchText || o.label).toLowerCase().includes(query.toLowerCase()))
      : options;

  const renderContent = (opt) => {
    if (!opt) return null;
    if (typeof opt.render === "function") return opt.render(opt.value === value);
    return opt.label;
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className={
          selectClass +
          ` flex items-center text-left disabled:opacity-60 ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""
          }`
        }
      >
        {loading ? (
          <span className="text-slate-400">Loading…</span>
        ) : selected ? (
          renderContent(selected)
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </button>
      <ChevronDown />

      {open && !loading && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
              <SearchIcon sx={{ fontSize: 18 }} className="shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or DOT #…"
                className="w-full text-sm text-slate-700 outline-none placeholder:text-slate-400 "
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-slate-400 ">No matches</p>}
            {filtered.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium transition  ${isSelected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {opt.render ? opt.render(isSelected) : opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n) => String(n).padStart(2, "0");

function formatDateDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

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
        className={
          inputClass +
          ` flex items-center justify-between text-left ${hasError ? "border-red-400 focus:border-red-400 focus:ring-red-100" : ""
          }`
        }
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[280px] max-w-[90vw] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <IconButton size="small" onClick={goPrev} sx={{ color: "#94a3b8" }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <p className="text-sm font-bold text-slate-800 ">{monthLabel}</p>
            <IconButton size="small" onClick={goNext} sx={{ color: "#94a3b8" }}>
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 ">
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
                  className={`h-8 rounded-lg text-sm font-medium transition  ${isSelected ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
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
    "w-6 border-none bg-transparent text-center text-sm font-semibold text-slate-800  outline-none";

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
        <input
          type="text"
          inputMode="numeric"
          value={pad(hour)}
          onChange={handleHourInput}
          className={segmentClass}
        />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpHour(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      <span className="text-slate-400">:</span>

      <div className="flex flex-col items-center leading-none">
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(1)} tabIndex={-1}>
          <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={pad(minute)}
          onChange={handleMinuteInput}
          className={segmentClass}
        />
        <button type="button" className={spinnerBtnClass} onClick={() => bumpMinute(-1)} tabIndex={-1}>
          <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
        </button>
      </div>

      <button
        type="button"
        onClick={togglePeriod}
        className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition "
      >
        {period}
      </button>
    </div>
  );
}

function buildDateTime(date, time) {
  if (!date || !time) return "";
  const seconds = time.length === 5 ? ":00" : "";
  return `${date} ${time}${seconds}`;
}

function splitDateTime(dateTime) {
  if (!dateTime) return { date: "", time: "" };
  const [date, time] = String(dateTime).split(" ");
  return { date: date || "", time: time ? time.slice(0, 5) : "" };
}


function emailStringToList(rawValue) {
 
  const items = Array.isArray(rawValue)
    ? rawValue
    : (rawValue || "").split(",");
 
  return items
    .map((e) => (e || "").trim())
    .filter(Boolean);
}

function emailListToString(list) {
  return list.join(", ");
}

const CHIP_AVATAR_COLORS = [
  "bg-rose-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-violet-600",
  "bg-cyan-600",
  "bg-pink-600",
  "bg-indigo-600",
];

function chipColorForEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i += 1) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHIP_AVATAR_COLORS[Math.abs(hash) % CHIP_AVATAR_COLORS.length];
}

function EmailChipsInput({ value, onChange, onBlur, hasError }) {
  const [draft, setDraft] = useState("");
  // Local validation message for whatever is currently sitting in the draft
  // box (e.g. "abc" with no @, or a duplicate). This is what was missing
  // before: an invalid entry used to be silently wiped (setDraft("")) even
  // though it was never turned into a chip, which then made the *next*
  // Backspace remove the last real chip instead of just clearing the typo.
  const [draftError, setDraftError] = useState("");
  // Chrome's saved-address autofill ignores autocomplete="off" on fields it
  // recognizes as "email"-like, and fills every such field in the form
  // (this is what was pulling the same address into Dispatcher Email).
  // Keeping the field read-only until the user actually focuses it stops
  // Chrome from offering/applying that autofill at all.
  const [locked, setLocked] = useState(true);
  const emails = emailStringToList(value);

  const commitDraft = () => {
    const candidate = draft.trim().replace(/,+$/, "");

 
    if (!candidate) {
      setDraft("");
      setDraftError("");
      return;
    }

 
    if (!EMAIL_PATTERN.test(candidate)) {
      // Keep the text in the box (don't clear it) so the user can see and
      // fix what they typed instead of it silently vanishing.
      setDraftError("Enter a valid email address");
      return;
    }

 
    if (emails.includes(candidate)) {
      setDraftError("That email is already added");
      return;
    }

 
    onChange(emailListToString([...emails, candidate]));
    setDraft("");
    setDraftError("");
  };

  const removeEmail = (email) => {
    onChange(emailListToString(emails.filter((e) => e !== email)));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      if (draft.trim() !== "") e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    }
  };

  return (
    <div>
      <div
        className={`flex min-h-[88px] w-full flex-wrap items-start content-start gap-2 rounded-xl border bg-white px-3 py-2.5 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100  ${hasError || draftError ? "border-red-400" : "border-slate-200"
          }`}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2 text-sm font-medium text-slate-700"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${chipColorForEmail(email)}`}
            >
              {email[0].toUpperCase()}
            </span>
            {email}
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="ml-0.5 flex h-4 w-4 items-center justify-center text-slate-400 hover:text-slate-600"
              aria-label={`Remove ${email}`}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            // Clear the stale error the moment the user starts editing again.
            if (draftError) setDraftError("");
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setLocked(false)}
          onBlur={() => {
            commitDraft();
            setLocked(true);
            onBlur();
          }}
          readOnly={locked}
          placeholder={emails.length === 0 ? "name@company.com, name2@company.com" : ""}
          // Prevent the browser's saved-address autofill (which was cross-filling
          // the Broker Dispatcher "Email" field) from attaching to this input.
          name="email_updates_draft_no_autofill"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          role="presentation"
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          className="mt-0.5 min-w-[160px] flex-1 cursor-text border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 "
        />
      </div>
      <ErrorText>{draftError}</ErrorText>
    </div>
  );
}

export default function TrackShipmentStep1() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [carriers, carriersLoading] = useCarrierOptions();
  // NEW: template list now comes from /shipment-templates
  const [templates, , templatesLoading] = useApiOptions(TEMPLATE_LIST_URL);
  // NEW: track the in-flight "load template details" request separately
  // from the plain templates-list loading state above.
  const [templateApplying, setTemplateApplying] = useState(false);
  // Chrome ties Dispatcher Email + Email Updates To together for its saved-
  // address autofill; locking this field until it's actually focused stops
  // that autofill from firing here too (see EmailChipsInput for the same
  // pattern).
  const [dispatcherEmailLocked, setDispatcherEmailLocked] = useState(true);

  const step1Draft = useShipmentDraftStore((s) => s.step1);
  const setStep1Draft = useShipmentDraftStore((s) => s.setStep1);
  const resetStep1Draft = useShipmentDraftStore((s) => s.resetStep1);
  const setLastCreatedShipment = useShipmentDraftStore((s) => s.setLastCreatedShipment);

  const generateTrackingNumber = () => {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    return `TRK${randomNum}`;
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm({
    mode: "onBlur",
    defaultValues: step1Draft,
  });

  // Kept in place (even though the "Send Updates To" rows are hidden from
  // the UI below) so BLANK_STEP1_VALUES.updates / buildPayload keep working
  // without further changes.
  const { fields, append, remove } = useFieldArray({ control, name: "updates" });

  useEffect(() => {
    const subscription = watch((values) => {
      setStep1Draft(values);
    });
    return () => subscription.unsubscribe();
  }, [watch, setStep1Draft]);

  useEffect(() => {
   if (searchParams.get("incomplete") === "1") {
    toast.error({
      title: "Finish step 1 first",
       message: "Please complete and save the shipment summary before continuing.",
       duration: 5000,
     });
     searchParams.delete("incomplete");
     setSearchParams(searchParams, { replace: true });
   }

   if (!step1Draft?.trackingNumber) {
     setValue("trackingNumber", generateTrackingNumber());
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapApiTemplateToFormValues = (apiData) => {
    if (!apiData) return {};

    const matchedCarrier = carriers.find(
      (c) => c.dot_number === apiData.carrier_dot || c.legal_name === apiData.carrier_name
    );

    const updatesFromApi =
      Array.isArray(apiData.send_updates_to) && apiData.send_updates_to.length > 0
        ? apiData.send_updates_to.map((u) => {
          const { date, time } = splitDateTime(u.date_time);
          return {
            date,
            time,
            duration: u.tracking_days || "",
            interval: u.interval || "",
          };
        })
        : [{ date: "", time: "", duration: "", interval: "" }];

    return {
      proNumber: apiData.pro_number || "",

      carrierName: matchedCarrier ? matchedCarrier.row_id : "",
      carrierMc: apiData.carrier_mc || "",
      carrierDot: apiData.carrier_dot || "",
      carrierPhone: apiData.carrier_phone || "",

      trackingMethod: apiData.tracking_method || "driver_phone",
      
      truckNumber: apiData.truck_number || "",
      trailerNumber: apiData.trailer_number || "",

      countryCode1: COUNTRY_CODES.find((c) => c.dial === apiData.country_code_1)?.code || "US",
      driverPhone1: apiData.driver_phone_1 || "",
      countryCode2: COUNTRY_CODES.find((c) => c.dial === apiData.country_code)?.code || "US",
      driverPhone2: apiData.driver_phone_2 || "",
      driverType: apiData.driver_type || "company_driver",

      teamLoad: !!apiData.team_load,

      dispatcherName: apiData.broker_dispatcher_name || "",
      dispatcherEmail: apiData.broker_dispatcher_email || "",

      // How often the driver's phone reports its position on this load.
      trackingIntervalSeconds: Number(apiData.tracking_interval_seconds) || 300,

      updates: updatesFromApi,
      // The API may return this as an array (["a@x.com", "b@x.com"]) or as
      // the older comma-string shape — normalise either into the
      // comma-string the chip input works with.
      emailUpdatesTo: Array.isArray(apiData.email_updates_to)
        ? emailListToString(apiData.email_updates_to)
        : (apiData.email_updates_to || ""),

      notes: apiData.notes || "",
    };
  };


  const onApplyTemplate = (trackingNumber) => {
    if (trackingNumber === "scratch") {
      resetStep1Draft();
      reset({ ...BLANK_STEP1_VALUES, trackingNumber: generateTrackingNumber() });
      return;
    }

    setTemplateApplying(true);

    apiFetch(templateDetailUrl(trackingNumber), { method: "GET" })
      .then((res) => {
        // Response shape: { status: true, message: "...", data: {...} }
        if (res && res.status === false) {
          toast.error({
            title: "Could not load template",
            message: res.message || "Please try again.",
          });
          return;
        }

        const apiData = res?.data || res;
        const mapped = mapApiTemplateToFormValues(apiData);
        reset({
          ...BLANK_STEP1_VALUES,
          ...mapped,
          trackingNumber: generateTrackingNumber(),
          reuseTemplate: trackingNumber,
        });

        toast.success({
          title: "Template applied",
          message: res?.message || "Template data retrieved successfully.",
          duration: 3000,
        });
      })
      .catch((err) => {
        toast.error({
          title: "Could not load template",
          message: err?.message || "Please try again.",
        });
      })
      .finally(() => setTemplateApplying(false));
  };


  const buildPayload = (data) => {
    const selectedCarrier = carriers.find((c) => c.row_id === data.carrierName);

    return {
      pro_number: data.proNumber,

      carrier_name: selectedCarrier?.legal_name || data.carrierName,
      carrier_mc: data.carrierMc,
      carrier_dot: selectedCarrier?.dot_number || data.carrierDot,
      carrier_phone: data.carrierPhone,

      tracking_method: data.trackingMethod,
      tracking_number: data.trackingNumber,

      truck_number: data.truckNumber,
      trailer_number: data.trailerNumber,

      country_code_1: COUNTRY_CODES.find((c) => c.code === data.countryCode1)?.dial || "+1",
      driver_phone_1: data.driverPhone1,
      country_code: COUNTRY_CODES.find((c) => c.code === data.countryCode2)?.dial || "+1",
      driver_phone_2: data.driverPhone2 || "",

      driver_type: data.driverType,

      team_load: !!data.teamLoad,

      broker_dispatcher_name: data.dispatcherName || "",
      broker_dispatcher_email: data.dispatcherEmail || "",

      // How often the driver app reports its position on this load.
      tracking_interval_seconds: Number(data.trackingIntervalSeconds) || 300,

  
      send_updates_to: data.updates.map((update) => ({
        date_time: buildDateTime(update.date, update.time),
        tracking_days: update.duration || "",
        interval: update.interval || "",
      })),
     
      email_updates_to: emailStringToList(data.emailUpdatesTo),

      notes: data.notes || "",


      save_as_template: !!data.saveAsTemplate,
      template_name: data.trackingNumber,
    };
  };

  const onSubmit = async (data) => {
    const payload = buildPayload(data);

    try {
      const proCheckRes = await apiFetch("/check-pro-number", {
        method: "POST",
        body: JSON.stringify({ pro_number: payload.pro_number }),
      });

      console.log("PRO check response:", proCheckRes);

      if (proCheckRes?.status !== "success" || proCheckRes?.exists === true) {
        toast.error({
          title: "PRO Number Error",
          message: proCheckRes?.message || "This PRO number is already in use or unavailable.",
          duration: 6000,
        });
        return;
      }

      localStorage.setItem("current_shipment_uuid", "pending_draft");

      navigate("/trackshipment/step2", { state: { step1Payload: payload } });
    } catch (err) {
      toast.error({
        title: "Validation Error",
        message: err?.message || "Could not verify the PRO number. Please try again.",
        duration: 6000,
      });
    }
  };


  const carrierOptions = carriers.map((c) => {
    const verified = !!c.stripe_verified_at;
    return {
      value: c.row_id,
      label: `${c.legal_name} (${c.dot_number})`,
      searchText: `${c.legal_name || ""} ${c.dot_number || ""}`,
      render: (isSelected) => (
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${verified ? "bg-green-500" : "bg-yellow-400"}`}
            aria-hidden="true"
          />
          <span>
            {c.legal_name}{" "}
            <span className={isSelected ? "text-blue-900" : "text-slate-900"}>({c.dot_number})</span>
          </span>
        </span>
      ),
    };
  });

  const countryCodeOptions = COUNTRY_CODES.map((c) => ({
    value: c.code,
    label: `${c.code} ${c.dial} ${c.label}`,
    searchText: `${c.code} ${c.dial} ${c.label}`,
    render: (isSelected) => (
      <span className="flex items-center gap-2">
        <CountryFlag code={c.code} />
        <span className={`text-[11px] font-bold uppercase ${isSelected ? "text-white" : "text-slate-500"}`}>{c.code}</span>
        <span>{c.dial} {c.label}</span>
      </span>
    ),
  }));

  return (
      <div className="flex flex-col lg:flex-row min-h-screen bg-[#EBF1FC] ">
        <StepSidebar currentStep={1} />

        <div className="flex-1 min-w-0 px-4 sm:px-6 md:px-10 lg:px-14 py-6 lg:py-10">
          <div className="mb-8 flex items-start justify-between gap-4 overflow-hidden rounded-[28px] border border-[#DCE6F7] bg-gradient-to-br from-white to-[#F1F6FE] px-6 sm:px-8 py-7 shadow-[0_1px_2px_rgba(15,36,84,0.04),0_20px_40px_-24px_rgba(15,36,84,0.35)]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#5B7FCB]">Step 1 of 2</p>
              <h1 className="mt-1.5 text-[24px] sm:text-[28px] lg:text-[32px] font-extrabold tracking-tight text-[#112963]">Shipment Summary</h1>
              <p className="mt-2 max-w-lg text-[15px] font-medium leading-relaxed text-[#7085A8]">
                Fill in the load details below, then continue to the Trip Sheet.
              </p>
            </div>
            <span className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#112963] text-white shadow-lg shadow-[#112963]/20">
              <LocalShippingRoundedIcon sx={{ fontSize: 26 }} />
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="mt-2 max-w-4xl pb-28">
            <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-[#DCE6F7] bg-white px-5 sm:px-7 py-5 shadow-[0_1px_2px_rgba(15,36,84,0.04),0_16px_32px_-24px_rgba(15,36,84,0.35)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#1D4ED8]">
                  <HistoryOutlinedIcon sx={{ fontSize: 19 }} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">Reuse from template</p>
                  <p className="text-xs text-slate-400">Start from a saved shipment or begin from scratch.</p>
                </div>
              </div>
              <div className="relative w-full sm:w-72">
                <Controller
                  control={control}
                  name="reuseTemplate"
                  render={({ field }) => (
                    <select
                      {...field}
                      className={selectClass}
                      disabled={templatesLoading || templateApplying}
                      onChange={(e) => {
                        field.onChange(e);
                        onApplyTemplate(e.target.value);
                      }}
                    >
                      <option value="scratch">Start from scratch</option>
                      {templatesLoading && <option disabled>Loading…</option>}
                      {templates.map((t) => (
                        <option key={t.tracking_number} value={t.tracking_number}>
                          {t.template_name || t.tracking_number}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <ChevronDown />
                {templateApplying && (
                  <span className="ml-2 align-middle text-xs text-slate-400 ">Loading template…</span>
                )}
              </div>
            </div>

            <div className={cardClass}>
            <SectionHeading icon={Inventory2OutlinedIcon}>Load</SectionHeading>
            {/* CHANGED: "Dollar Traq No." (tracking number) now sits right after Pro # / Load ID */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <FieldLabel required>Pro # / Load ID</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="e.g. PRO123456"
                  {...register("proNumber", { required: "Load ID is required" })}
                />
                <ErrorText>{errors.proNumber?.message}</ErrorText>
              </div>
              <div>
                <FieldLabel required>Dollar Traq No.</FieldLabel>
                <input
                  className={`${inputClass} cursor-not-allowed bg-slate-100 text-slate-500`}
                  placeholder="TRK12345678"
                  readOnly
                  {...register("trackingNumber", { required: "Dollar Traq No. is required" })}
                />
                <ErrorText>{errors.trackingNumber?.message}</ErrorText>
              </div>
            </div>
            </div>

            <div className={cardClass}>
            <SectionHeading icon={ApartmentOutlinedIcon}>Carrier</SectionHeading>
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <FieldLabel required>Carrier Name</FieldLabel>
                <Controller
                  control={control}
                  name="carrierName"
                  render={({ field: { value } }) => {
                    const selectedCarrier = carriers.find((c) => c.row_id === value);
                    return <CarrierStatusBadge carrier={selectedCarrier} />;
                  }}
                />
              </div>
              <Controller
                control={control}
                name="carrierName"
                rules={{ required: "Carrier name is required" }}
                render={({ field: { value, onChange }, fieldState }) => (
                  <>
                    <CustomDropdown
                      value={value}
                      onChange={(val) => {
                        onChange(val);
                        const selected = carriers.find((c) => c.row_id === val);
                        if (selected) {
                          setValue("carrierDot", selected.dot_number || "", { shouldValidate: true });
                           setValue("carrierMc", selected.mc_number || "", { shouldValidate: true });
                        }
                      }}
                      options={carrierOptions}
                      loading={carriersLoading}
                      searchable
                      placeholder="Select a carrier…"
                      hasError={!!fieldState.error}
                    />
                    <ErrorText>{fieldState.error?.message}</ErrorText>
                  </>
                )}
              />
            </div>
            {/* CHANGED: "Ext" removed; Carrier Phone now sits in that spot */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <FieldLabel required>Carrier MC #</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="MC123456"
                  {...register("carrierMc", { required: "Carrier MC # is required" })}
                />
                <ErrorText>{errors.carrierMc?.message}</ErrorText>
              </div>
              <div>
                <FieldLabel required>Carrier DOT #</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="DOT987654"
                  {...register("carrierDot", { required: "Carrier DOT # is required" })}
                />
                <ErrorText>{errors.carrierDot?.message}</ErrorText>
              </div>
              <div>
                <FieldLabel required>Carrier Phone</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="9876543210"
                  {...register("carrierPhone", {
                    required: "Carrier phone is required",
                    pattern: { value: PHONE_PATTERN, message: "Enter a valid phone number" },
                  })}
                />
                <ErrorText>{errors.carrierPhone?.message}</ErrorText>
              </div>
            </div>
            </div>

            <div className={cardClass}>
            <SectionHeading icon={MyLocationOutlinedIcon}>Tracking</SectionHeading>
            {/* CHANGED: Tracking Full Number moved up to the Load section (as "Dollar Traq No.");
                Driver Phone 1 now takes its place here, with its own Country Code
                (default US) right before it. */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <FieldLabel>Tracking Method</FieldLabel>
                <div className="relative">
                  <select className={selectClass} {...register("trackingMethod")}>
                    {TRACKING_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
              </div>
              <div>
                <FieldLabel>Country Code</FieldLabel>
                <Controller
                  control={control}
                  name="countryCode1"
                  render={({ field: { value, onChange } }) => (
                    <CustomDropdown
                      value={value}
                      onChange={onChange}
                      options={countryCodeOptions}
                      placeholder="Select country…"
                    />
                  )}
                />
              </div>
              <div>
                <FieldLabel required>Driver Phone 1</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="Primary"
                  {...register("driverPhone1", {
                    required: "Driver phone is required",
                    pattern: { value: PHONE_PATTERN, message: "Enter a valid phone number" },
                  })}
                />
                <ErrorText>{errors.driverPhone1?.message}</ErrorText>
              </div>
            </div>
            </div>

            <div className={cardClass}>
            <SectionHeading icon={BadgeOutlinedIcon}>Driver &amp; Equipment</SectionHeading>
            <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <FieldLabel required>Truck Number</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="e.g. 4471"
                  {...register("truckNumber", { required: "Truck number is required" })}
                />
                <ErrorText>{errors.truckNumber?.message}</ErrorText>
              </div>
              <div>
                <FieldLabel required>Trailer Number</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="e.g. TR-208"
                  {...register("trailerNumber", { required: "Trailer number is required" })}
                />
                <ErrorText>{errors.trailerNumber?.message}</ErrorText>
              </div>
            </div>

            {/* CHANGED: Country Code (default US) now appears right before Driver Phone 2 */}
            <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <FieldLabel>Country Code</FieldLabel>
                <Controller
                  control={control}
                  name="countryCode2"
                  render={({ field: { value, onChange } }) => (
                    <CustomDropdown
                      value={value}
                      onChange={onChange}
                      options={countryCodeOptions}
                      placeholder="Select country…"
                    />
                  )}
                />
              </div>
              <div>
                <FieldLabel>Driver Phone 2</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="Optional"
                  {...register("driverPhone2", {
                    validate: (v) => v === "" || PHONE_PATTERN.test(v) || "Enter a valid phone number",
                  })}
                />
                <ErrorText>{errors.driverPhone2?.message}</ErrorText>
              </div>
            </div>

            <div className="mb-6">
              <FieldLabel>Driver Type</FieldLabel>
              <Controller
                control={control}
                name="driverType"
                render={({ field: { value, onChange } }) => (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {DRIVER_TYPES.map((type) => {
                      const isSelected = value === type.value;
                      return (
                        <button
                          type="button"
                          key={type.value}
                          onClick={() => onChange(type.value)}
                          className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-sm font-semibold transition  ${isSelected ? "border-[#1D4ED8] bg-[#EEF4FF] text-[#112963]" : "border-slate-200 text-slate-700 hover:border-slate-300"
                            }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-[#1D4ED8]" : "border-slate-300"
                              }`}
                          >
                            {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#1D4ED8]" />}
                          </span>
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            <Controller
              control={control}
              name="teamLoad"
              render={({ field: { value, onChange } }) => (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#1D4ED8] shadow-sm">
                      <GroupsOutlinedIcon sx={{ fontSize: 19 }} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 ">This load is a team load</p>
                      <p className="text-xs text-slate-400">Two drivers will be assigned to this shipment.</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    sx={switchSx}
                    inputProps={{ "aria-label": "This load is a team load" }}
                  />
                </div>
              )}
            />
            </div>

            <div className={cardClass}>
            <SectionHeading icon={MailOutlineIcon}>Broker Dispatcher Information</SectionHeading>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <FieldLabel>Dispatcher Name</FieldLabel>
                <input className={inputClass} placeholder="Enter dispatcher name" {...register("dispatcherName")} />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <input
                  className={inputClass}
                  placeholder="dispatcher@company.com"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  readOnly={dispatcherEmailLocked}
                  onFocus={() => setDispatcherEmailLocked(false)}
                  {...register("dispatcherEmail", {
                    validate: (v) => v === "" || EMAIL_PATTERN.test(v) || "Enter a valid email address",
                    onBlur: () => setDispatcherEmailLocked(true),
                  })}
                />
                <ErrorText>{errors.dispatcherEmail?.message}</ErrorText>
              </div>
            </div>
            </div>

            <div className={cardClass}>
            <SectionHeading icon={NotificationsActiveOutlinedIcon}>Schedule &amp; Updates</SectionHeading>

            {/* The one control that decides how often the driver's phone
                reports in. The driver app picks the new value up from its
                next sync response, so changing it takes effect without the
                driver doing anything. */}
            <div className="mb-6">
              <FieldLabel>Driver Location Updates</FieldLabel>
              <div className="grid grid-cols-1 gap-2 sm:max-w-md">
                <div className="relative">
                  <select
                    className={selectClass}
                    {...register("trackingIntervalSeconds", { valueAsNumber: true })}
                  >
                    {TRACKING_INTERVALS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
                <p className="text-xs text-slate-500 ">
                  How often the driver&rsquo;s app sends its position while this load is running.
                  Shorter intervals track more closely but use more of the driver&rsquo;s battery.
                </p>
              </div>
            </div>

            {/* REMOVED: "Send Updates To" date/time/duration/interval rows.
                Kept here (commented) in case this needs to come back later.

            <div className="mb-2">
              <FieldLabel>Send Updates To</FieldLabel>
            </div>
              <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1.1fr_0.9fr_1.2fr_1.2fr_auto]">
              <span className="text-xs font-semibold ">Date</span>
              <span className="text-xs font-semibold  ">Time</span>
              <span className="text-xs font-semibold ">Duration</span>
              <span className="text-xs font-semibold ">Interval</span>
              <span />
            </div>
            <div className="space-y-3">
              {fields.map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1.1fr_0.9fr_1.2fr_1.2fr_auto]"
                >
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-slate-500  sm:hidden">Date</span>
                    <Controller
                      control={control}
                      name={`updates.${index}.date`}
                      rules={index === 0 ? { required: "Date is required" } : undefined}
                      render={({ field: { value, onChange }, fieldState }) => (
                        <>
                          <CustomDatePicker value={value} onChange={onChange} hasError={!!fieldState.error} />
                          <ErrorText>{fieldState.error?.message}</ErrorText>
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-slate-500  sm:hidden">Time</span>
                    <Controller
                      control={control}
                      name={`updates.${index}.time`}
                      rules={index === 0 ? { required: "Time is required" } : undefined}
                      render={({ field: { value, onChange }, fieldState }) => (
                        <>
                          <CustomTimePicker value={value} onChange={onChange} hasError={!!fieldState.error} />
                          <ErrorText>{fieldState.error?.message}</ErrorText>
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-slate-500  sm:hidden">Duration</span>
                    <div className="relative">
                      <Controller
                        control={control}
                        name={`updates.${index}.duration`}
                        render={({ field: { value, onChange } }) => (
                          <select
                            className={selectClass}
                            value={value || ""}
                            onChange={(e) => onChange(e.target.value)}
                          >
                            <option value="" disabled>Select duration…</option>
                            {TRACK_DURATIONS.map((d) => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        )}
                      />
                      <ChevronDown />
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs font-semibold text-slate-500  sm:hidden">Interval</span>
                    <div className="relative">
                      <Controller
                        control={control}
                        name={`updates.${index}.interval`}
                        render={({ field: { value, onChange } }) => (
                          <select
                            className={selectClass}
                            value={value || ""}
                            onChange={(e) => onChange(e.target.value)}
                          >
                            <option value="" disabled>Select interval…</option>
                            {INTERVALS.map((i) => (
                              <option key={i.value} value={i.value}>{i.label}</option>
                            ))}
                          </select>
                        )}
                      />
                      <ChevronDown />
                    </div>
                  </div>
                  <div className="flex h-[46px] items-center justify-self-start sm:justify-self-center">
                    {index > 0 ? (
                      <IconButton size="small" onClick={() => remove(index)} aria-label="Remove update row" sx={{ color: "#ef4444" }}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => append({ date: "", time: "", duration: "", interval: "" })}
                className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 "
              >
                <span className="text-lg leading-none">+</span> Add update
              </button>
            </div>

            */}

            <div className="mb-6">
              <FieldLabel>Email Updates To</FieldLabel>
              {/* CHANGED: Gmail-style chip UI — each valid email becomes a pill with a
                  colored initial avatar and an ✕ to remove it (matches the reference
                  screenshot). Press space, comma, or enter to turn what you typed
                  into a chip; backspace on an empty input removes the last chip.
                  Internally this still edits a comma string; buildPayload() is what
                  turns it into the ["a@x.com", "b@x.com"] array shape sent to the API. */}
              <Controller
                control={control}
                name="emailUpdatesTo"
                rules={{
                  validate: (v) => v === "" || EMAIL_LIST_PATTERN.test(v) || "Enter one or more valid emails, separated by commas",
                }}
                render={({ field: { value, onChange, onBlur }, fieldState }) => (
                  <>
                    <EmailChipsInput
                      value={value}
                      onChange={onChange}
                      onBlur={onBlur}
                      hasError={!!fieldState.error}
                    />
                    <ErrorText>{fieldState.error?.message}</ErrorText>
                  </>
                )}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 ">Notes</label>
              <textarea
                rows={4}
                className={inputClass + " resize-y"}
                placeholder="Type your message"
                {...register("notes")}
              />
            </div>
            </div>
          </form>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-4 sm:px-6 md:px-10 lg:px-14 py-3 lg:py-4 shadow-[0_-4px_20px_rgba(15,36,84,0.08)] backdrop-blur ">
          <div className="ml-0 flex max-w-6xl flex-wrap items-center justify-between gap-3 lg:ml-[280px]">
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              <span className="text-xs text-slate-400">
                <span className="text-red-500">*</span> Required fields
              </span>
              {/* CHANGED: swapped the barely-visible MUI Switch for a more
                  visible pill-style CustomToggle. Same value/onChange
                  contract via Controller, nothing else about this field
                  changed. */}
              <Controller
                control={control}
                name="saveAsTemplate"
                render={({ field: { value, onChange } }) => (
                  <CustomToggle
                    checked={!!value}
                    onChange={onChange}
                    label="Save as template"
                    icon={BookmarkAddedOutlinedIcon}
                  />
                )}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit(onSubmit, onInvalid)}
                className="rounded-2xl bg-[#112963] px-5 sm:px-7 py-3 sm:py-4 text-sm font-semibold text-white shadow-lg shadow-[#112963]/25 transition hover:bg-[#0F2454] hover:shadow-xl disabled:opacity-60 whitespace-nowrap"
              >
                {isSubmitting ? "Saving…" : "Continue to Trip Sheet →"}
              </button>
            </div>
          </div>
        </div>
      </div>
  );
}