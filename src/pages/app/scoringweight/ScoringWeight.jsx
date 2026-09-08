import React, { useState, useEffect, useCallback, useRef } from "react";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import DashboardCustomizeOutlinedIcon from "@mui/icons-material/DashboardCustomizeOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

import { apiFetch } from "../../../lib/api";
import { toast, ToastContainer } from "../../../components/ui/Toaster";

const WEIGHTS_ENDPOINT = "/scoring-weights";
const ACTIVE_ENDPOINT = "/scoring-weights/active";
const TEMPLATES_ENDPOINT = "/scoring-weights/templates";

const FIELD_ORDER = [
  "authority",
  "insurance_coi",
  "safety_csa",
  "inspection_vin",
  "fraud_signals",
  "payment_history",
];

const FIELD_META = {
  authority: { label: "Authority", subtitle: "Operational history and status" },
  insurance_coi: { label: "Insurance / COI", subtitle: "Operational history and status" },
  safety_csa: { label: "Safety / CSA", subtitle: "Operational history and status" },
  inspection_vin: { label: "Inspection / VIN", subtitle: "Operational history and status" },
  fraud_signals: { label: "Fraud Signals", subtitle: "Operational history and status" },
  payment_history: { label: "Payment History", subtitle: "Operational history and status" },
};

// Must total exactly 100 - StoreScoringWeightRequest rejects anything else, and
// the Save button stays disabled until the sum matches. These mirror the column
// defaults in the scoring_weights migration.
const DEFAULT_WEIGHTS = {
  authority: 20,
  insurance_coi: 20,
  safety_csa: 20,
  inspection_vin: 15,
  fraud_signals: 10,
  payment_history: 15,
};

const extractWeights = (source) => {
  const result = {};
  FIELD_ORDER.forEach((key) => {
    result[key] = typeof source?.[key] === "number" ? source[key] : DEFAULT_WEIGHTS[key];
  });
  return result;
};

export default function ScoringWeights() {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const isMounted = useRef(true);

  const loadTemplates = useCallback(() => {
    setTemplatesLoading(true);
    return apiFetch(TEMPLATES_ENDPOINT)
      .then((res) => {
        if (res && res.status === "success") {
          setTemplates(Array.isArray(res.data) ? res.data.filter((t) => t.is_template) : []);
        }
      })
      .catch(() => {
        setTemplates([]);
      })
      .finally(() => {
        setTemplatesLoading(false);
      });
  }, []);

  useEffect(() => {
    isMounted.current = true;

    apiFetch(ACTIVE_ENDPOINT)
      .then((res) => {
        if (!isMounted.current) return;
        if (res && res.status === "success" && res.data) {
          setWeights(extractWeights(res.data));
        }
      })
      .catch(() => {
        // Fallback silently
      })
      .finally(() => {
        if (isMounted.current) {
          setLoading(false);
        }
      });

    loadTemplates();

    return () => {
      isMounted.current = false;
    };
  }, [loadTemplates]);

  const applyTemplate = (template) => {
    setWeights(extractWeights(template));
    toast.info(`Loaded "${template.template_name}". Click Save Settings to activate.`);
  };

  const handleSliderChange = (changedField, newValue) => {
    const val = Math.max(0, Math.min(100, parseInt(newValue, 10) || 0));

    setWeights((prevWeights) => {
      const updated = { ...prevWeights, [changedField]: val };
      const currentSum = Object.values(updated).reduce((a, b) => a + b, 0);

      if (currentSum === 100) return updated;

      const remainingTarget = 100 - val;
      const otherFields = FIELD_ORDER.filter((key) => key !== changedField);
      const currentOtherSum = otherFields.reduce((sum, key) => sum + prevWeights[key], 0);

      if (currentOtherSum === 0) {
        const evenSplit = Math.floor(remainingTarget / otherFields.length);
        otherFields.forEach((key, index) => {
          updated[key] =
            index === otherFields.length - 1
              ? remainingTarget - evenSplit * (otherFields.length - 1)
              : evenSplit;
        });
      } else {
        let distributedSum = 0;
        otherFields.forEach((key, index) => {
          if (index === otherFields.length - 1) {
            updated[key] = remainingTarget - distributedSum;
          } else {
            const share = Math.round((prevWeights[key] / currentOtherSum) * remainingTarget);
            updated[key] = share;
            distributedSum += share;
          }
        });
      }

      return updated;
    });
  };

  const handleSave = () => {
    const totalSum = Object.values(weights).reduce((a, b) => a + b, 0);

    if (totalSum !== 100) {
      toast.error("Weights must add up to exactly 100% before saving.");
      return;
    }

    if (saveAsTemplate && !templateName.trim()) {
      toast.error("Please enter a template name before saving.");
      return;
    }

    const payload = {
      authority: weights.authority,
      insurance_coi: weights.insurance_coi,
      safety_csa: weights.safety_csa,
      inspection_vin: weights.inspection_vin,
      fraud_signals: weights.fraud_signals,
      payment_history: weights.payment_history,
      save_as_template: saveAsTemplate,
    };

    if (saveAsTemplate) {
      payload.template_name = templateName.trim();
    }

    setSaving(true);

    apiFetch(WEIGHTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        toast.success(res?.message || "Scoring weights updated successfully.");
        if (saveAsTemplate) {
          setTemplateName("");
          setSaveAsTemplate(false);
          loadTemplates();
        }
      })
      .catch((err) => {
        // The 422 from StoreScoringWeightRequest carries its detail in `errors`
        // (including the custom `total_weight` rule), which is more specific
        // than the generic top-level message.
        const fieldError = err?.errors ? Object.values(err.errors).flat()[0] : null;
        toast.error(fieldError || err?.message || "Something went wrong while saving.");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const toggleSaveAsTemplate = () => {
    setSaveAsTemplate((prev) => !prev);
  };

  const totalSum = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
<div className="min-h-screen bg-[#F4F5F1] px-4 py-6 sm:px-6 sm:py-8 md:px-14 md:py-10 text-[#0F172A]">
      <ToastContainer />

      <style>{`
        .custom-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
        }
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2.5px solid #0040A8;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .custom-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 2.5px solid #0040A8;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
          cursor: pointer;
        }
      `}</style>

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] sm:text-[32px] md:text-[40px] font-semibold tracking-tight text-slate-900">
            Scoring Weights
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            FMCSA bulk + commercial enrichment. ~22.7M rows across 8 core tables.
          </p>
        </div>
        <div>
          {/* <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-xs font-semibold text-[#1E293B] rounded-xl border border-gray-200 shadow-xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <RefreshIcon sx={{ fontSize: 16, color: "#64748B" }} />
            Run sync now
          </button> */}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-16 text-center">Loading current weights…</div>
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FIELD_ORDER.map((field) => {
              const val = weights[field];
              return (
                <div
                  key={field}
                  className="bg-white rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-gray-100/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4 sm:mb-5">
                      <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                        <ShieldOutlinedIcon sx={{ fontSize: 20, color: "#2563EB" }} />
                      </div>
                      <span className="text-base font-semibold text-[#1D4ED8] tracking-tight">
                        {val} %
                      </span>
                    </div>

                    <div className="mb-5 sm:mb-6">
                      <h2 className="text-base font-semibold text-[#0F172A]">
                        {FIELD_META[field].label}
                      </h2>
                      <p className="text-xs text-[#64748B] mt-1">
                        {FIELD_META[field].subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={val}
                      onChange={(e) => handleSliderChange(field, e.target.value)}
                      className="custom-slider"
                      style={{
                        background: `linear-gradient(to right, #0040A8 0%, #0040A8 ${val}%, #EAEAEA ${val}%, #EAEAEA 100%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Bar Below Cards */}
          <div className="mt-6 sm:mt-8 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Weight Total */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[#64748B]">Total Weight:</span>
                <span
                  className={`text-base font-bold ${
                    totalSum === 100 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {totalSum}%
                </span>
                <span className="text-xs text-gray-400">/ 100%</span>
              </div>

              {/* Right Options & Action */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center sm:justify-end gap-3 sm:gap-4">
                {/* Optional Toggle */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={saveAsTemplate}
                    onClick={toggleSaveAsTemplate}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                      saveAsTemplate ? "bg-[#2563EB]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        saveAsTemplate ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-xs font-semibold text-[#0F172A]">Save as template</span>
                </div>

                {/* Template Name Input */}
                {saveAsTemplate && (
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name *"
                    className="rounded-xl border border-gray-200 px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all w-full sm:w-48"
                  />
                )}

                {/* Save Settings Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || totalSum !== 100}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <AutorenewOutlinedIcon className="animate-spin" sx={{ fontSize: 16 }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Saved Templates List */}
            {templatesLoading && (
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-[#94A3B8]">
                Loading saved templates…
              </div>
            )}

            {!templatesLoading && templates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
                  <DashboardCustomizeOutlinedIcon sx={{ fontSize: 16, color: "#2563EB" }} />
                  <span>Saved Templates:</span>
                </div>
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-gray-200 hover:border-[#2563EB] hover:bg-[#EFF6FF] text-xs font-semibold text-[#0F172A] transition-all cursor-pointer"
                  >
                    {t.template_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}