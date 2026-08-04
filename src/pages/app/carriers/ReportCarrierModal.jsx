import { useEffect, useMemo, useState } from "react";

import Close from "@mui/icons-material/Close";
import WarningAmber from "@mui/icons-material/WarningAmber";
import CircularProgress from "@mui/material/CircularProgress";

import { apiFetch } from "../../../lib/api";

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "MX", label: "Mexico" },
];

const EMPTY_FORM = {
  incident_date: "",
  origin_city: "",
  origin_state: "",
  origin_country: "US",
  destination_city: "",
  destination_state: "",
  destination_country: "US",
  comments: "",
  is_private: false,
  carrier_email: "",
};

const inputClasses =
  "w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#1F2937] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-gray-50";

const labelClasses =
  "mb-1.5 block text-xs font-semibold tracking-wide text-[#6B7280] uppercase";

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className={labelClasses}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {children}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Files an incident report against a carrier.
 *
 * The incident checklist is fetched rather than hardcoded so it stays in step
 * with the backend's validation list — a stale copy here would let a broker
 * check a box the API then rejects.
 */
export default function ReportCarrierModal({
  isOpen,
  onClose,
  carrier,
  onSubmitted,
}) {
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [typesError, setTypesError] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedIncidents, setSelectedIncidents] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const carrierEmail = (
    carrier?.email ||
    carrier?.official_email ||
    carrier?.email_address ||
    ""
  ).toLowerCase();

  // Reset on every open so a previous submission's values never leak into the
  // next report.
  useEffect(() => {
    if (!isOpen) return;

    setForm({ ...EMPTY_FORM, carrier_email: carrierEmail });
    setSelectedIncidents([]);
    setError("");
    setFieldErrors({});
  }, [isOpen, carrierEmail]);

  useEffect(() => {
    if (!isOpen || incidentTypes.length) return;

    setLoadingTypes(true);
    setTypesError("");

    apiFetch("/carrier-reports/incidents", { method: "GET" })
      .then((res) => {
        setIncidentTypes(res?.data || []);
      })
      .catch((err) => {
        setTypesError(err?.message || "Could not load the incident list.");
      })
      .finally(() => {
        setLoadingTypes(false);
      });
  }, [isOpen, incidentTypes.length]);

  const setValue = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));

    setFieldErrors((current) => {
      if (!current[name]) return current;

      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const toggleIncident = (value) => {
    setSelectedIncidents((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

    setFieldErrors((current) => {
      if (!current.incidents) return current;

      const next = { ...current };
      delete next.incidents;
      return next;
    });
  };

  const validate = () => {
    const errors = {};

    if (!form.incident_date) errors.incident_date = "Pick the incident date.";
    else if (form.incident_date > today)
      errors.incident_date = "The incident date cannot be in the future.";

    if (!form.origin_city.trim()) errors.origin_city = "Required.";
    if (!form.origin_state.trim()) errors.origin_state = "Required.";
    if (!form.origin_country) errors.origin_country = "Required.";

    if (!form.destination_city.trim()) errors.destination_city = "Required.";
    if (!form.destination_state.trim()) errors.destination_state = "Required.";
    if (!form.destination_country) errors.destination_country = "Required.";

    if (!selectedIncidents.length)
      errors.incidents = "Check at least one incident.";

    if (form.carrier_email && !/^\S+@\S+\.\S+$/.test(form.carrier_email.trim()))
      errors.carrier_email = "Enter a valid email address.";

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const submit = async () => {
    if (!carrier?.row_id) {
      setError("This carrier cannot be reported — no carrier reference.");
      return;
    }

    if (!validate()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch("/carrier-reports", {
        method: "POST",
        body: JSON.stringify({
          row_id: carrier.row_id,
          incident_date: form.incident_date,
          origin_city: form.origin_city.trim(),
          origin_state: form.origin_state.trim(),
          origin_country: form.origin_country,
          destination_city: form.destination_city.trim(),
          destination_state: form.destination_state.trim(),
          destination_country: form.destination_country,
          incidents: selectedIncidents,
          comments: form.comments.trim() || null,
          is_private: form.is_private,
          carrier_email: form.carrier_email.trim() || null,
        }),
      });

      onSubmitted?.(res);
      onClose?.();
    } catch (err) {
      setError(err?.message || "Could not file the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#F1F5F9] px-6 py-5 sm:px-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <WarningAmber style={{ fontSize: 20 }} />
            </span>

            <div>
              <h3 className="text-xl font-bold tracking-tight text-[#111827]">
                Report carrier
              </h3>

              <p className="mt-1 text-sm text-[#6B7280]">
                {carrier?.company_name || "This carrier"}
                {carrier?.dot_number ? ` · DOT ${carrier.dot_number}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <Close style={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <Field
            label="Incident date"
            required
            error={fieldErrors.incident_date}
          >
            <input
              type="date"
              max={today}
              value={form.incident_date}
              disabled={submitting}
              onChange={(event) => setValue("incident_date", event.target.value)}
              className={`${inputClasses} sm:max-w-[240px]`}
            />
          </Field>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Field label="Origin city" required error={fieldErrors.origin_city}>
              <input
                type="text"
                value={form.origin_city}
                disabled={submitting}
                onChange={(event) => setValue("origin_city", event.target.value)}
                className={inputClasses}
              />
            </Field>

            <Field
              label="Origin state/province"
              required
              error={fieldErrors.origin_state}
            >
              <input
                type="text"
                value={form.origin_state}
                disabled={submitting}
                onChange={(event) =>
                  setValue("origin_state", event.target.value)
                }
                className={inputClasses}
              />
            </Field>

            <Field
              label="Origin country"
              required
              error={fieldErrors.origin_country}
            >
              <select
                value={form.origin_country}
                disabled={submitting}
                onChange={(event) =>
                  setValue("origin_country", event.target.value)
                }
                className={inputClasses}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field
              label="Destination city"
              required
              error={fieldErrors.destination_city}
            >
              <input
                type="text"
                value={form.destination_city}
                disabled={submitting}
                onChange={(event) =>
                  setValue("destination_city", event.target.value)
                }
                className={inputClasses}
              />
            </Field>

            <Field
              label="Destination state/province"
              required
              error={fieldErrors.destination_state}
            >
              <input
                type="text"
                value={form.destination_state}
                disabled={submitting}
                onChange={(event) =>
                  setValue("destination_state", event.target.value)
                }
                className={inputClasses}
              />
            </Field>

            <Field
              label="Destination country"
              required
              error={fieldErrors.destination_country}
            >
              <select
                value={form.destination_country}
                disabled={submitting}
                onChange={(event) =>
                  setValue("destination_country", event.target.value)
                }
                className={inputClasses}
              >
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-7">
            <div className="mb-1 flex items-baseline justify-between">
              <span className={labelClasses}>
                Incident(s)<span className="ml-0.5 text-red-500">*</span>
              </span>

              {selectedIncidents.length > 0 && (
                <span className="text-xs font-semibold text-[#1D4ED8]">
                  {selectedIncidents.length} selected
                </span>
              )}
            </div>

            <p className="mb-3 text-xs text-[#6B7280]">Check all that apply.</p>

            {loadingTypes && (
              <div className="flex items-center gap-2 py-6 text-sm text-[#6B7280]">
                <CircularProgress size={16} />
                Loading incident types...
              </div>
            )}

            {typesError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                {typesError}
              </div>
            )}

            {!loadingTypes && !typesError && (
              <div className="grid gap-x-6 gap-y-1 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-4 sm:grid-cols-2">
                {incidentTypes.map((incident) => {
                  const checked = selectedIncidents.includes(incident.value);

                  return (
                    <label
                      key={incident.value}
                      className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={submitting}
                        onChange={() => toggleIncident(incident.value)}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#1D4ED8]"
                      />

                      <span
                        className={`text-[13px] leading-snug ${
                          checked
                            ? "font-semibold text-[#111827]"
                            : "text-[#374151]"
                        }`}
                      >
                        {incident.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {fieldErrors.incidents && (
              <p className="mt-1.5 text-xs text-red-500">
                {fieldErrors.incidents}
              </p>
            )}
          </div>

          <div className="mt-7">
            <Field label="Comments">
              <textarea
                rows={4}
                value={form.comments}
                disabled={submitting}
                placeholder="Load numbers, dates, who you spoke to, anything that helps document the incident."
                onChange={(event) => setValue("comments", event.target.value)}
                className={`${inputClasses} resize-y`}
              />
            </Field>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
            <input
              type="checkbox"
              checked={form.is_private}
              disabled={submitting}
              onChange={(event) => setValue("is_private", event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#1D4ED8]"
            />

            <span className="text-[13px] leading-snug text-[#374151]">
              <span className="font-semibold text-[#111827]">
                I want this report to be private
              </span>
              <br />
              Only your company will see it. Other brokers viewing this carrier
              will not.
            </span>
          </label>

          <div className="mt-6">
            <Field label="Carrier email" error={fieldErrors.carrier_email}>
              <input
                type="email"
                value={form.carrier_email}
                disabled={submitting}
                placeholder="dispatch@carrier.com"
                onChange={(event) =>
                  setValue("carrier_email", event.target.value)
                }
                className={inputClasses}
              />
            </Field>

            <p className="mt-1.5 text-xs text-[#6B7280]">
              A copy of this report will be emailed to this address. Leave it
              blank to only save the report.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#F1F5F9] px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-gray-100 disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || loadingTypes || !!typesError}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-md transition-all hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {submitting ? (
              <CircularProgress size={18} sx={{ color: "#fff" }} />
            ) : (
              "Submit report"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
