import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

const SEVERITY_STYLES = {
  Review: { text: "#fff", bg: "#e07a1f", bar: "#e07a1f" },
  High: { text: "#fff", bg: "#dc2626", bar: "#dc2626" },
  Medium: { text: "#7a4a00", bg: "#f2b632", bar: "#f2b632" },
  Low: { text: "#166534", bg: "#bbf7d0", bar: "#22c55e" },
};

const SCORE_STATUS_BANDS = [
  { min: 85, bg: "#16a34a" },
  { min: 70, bg: "#10b981" },
  { min: 55, bg: "#fbbf24" },
  { min: 19, bg: "#f97316" },
  { min: 0, bg: "#dc2626" },
];

function fallbackScoreColor(score) {
  const s = Number(score) ?? 0;
  return (
    SCORE_STATUS_BANDS.find((band) => s >= band.min)?.bg ||
    SCORE_STATUS_BANDS[SCORE_STATUS_BANDS.length - 1].bg
  );
}

// "good_to_go" -> "Good To Go"
function formatVerdict(verdict) {
  if (!verdict) return "";
  return verdict
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ScoreStatusPill({ label, color }) {
  if (!label) return null;

  return (
    <span
      className="mt-[8px] inline-flex w-fit shrink-0 items-center rounded-full px-[14px] py-[6px] text-[13px] font-[800] tracking-tight text-white"
      style={{ background: color }}
    >
      {label}
    </span>
  );
}

function SeverityPill({ level }) {
  const style = SEVERITY_STYLES[level] || SEVERITY_STYLES.Medium;
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-[10px] py-[3px] text-[10.5px] font-[800] uppercase tracking-tight"
      style={{ color: style.text, background: style.bg }}
    >
      {level}
    </span>
  );
}

function FindingRow({ finding }) {
  const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.Medium;

  return (
    <div className="flex gap-[12px] border-b border-[#eef1f6] py-[14px] last:border-b-0">
      <div
        className="mt-[2px] w-[3px] shrink-0 rounded-full"
        style={{ background: style.bar }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-[12px]">
          <div className="flex min-w-0 items-start gap-[10px]">
            <SeverityPill level={finding.severity} />
            <p className="m-0 text-[13.5px] font-[700] leading-[1.35] text-[#111827]">
              {finding.check}
            </p>
          </div>
          {finding.points != null && (
            <span className="shrink-0 text-[13px] font-[800] text-[#374151]">
              +{finding.points}
            </span>
          )}
        </div>

        {(finding.area || finding.result) && (
          <div className="mt-[8px] flex flex-wrap items-center gap-[6px]">
            {finding.area && (
              <span className="inline-flex items-center rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] px-[8px] py-[3px] text-[11.5px] font-[700] text-[#64748b]">
                {finding.area}
              </span>
            )}
            {finding.result && (
              <span className="text-[11.5px] leading-[1.4] text-[#64748b]">
                {finding.result}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const HOW_IT_WORKS_PATH = "/dt-score/how-it-works";

export default function DtScoreHoverCard({ carrier, score, onSeeHowItWorks, children }) {
  const navigate = useNavigate();

  const handleSeeHowItWorks =
    onSeeHowItWorks || (() => navigate(HOW_IT_WORKS_PATH));

  const [showIcon, setShowIcon] = useState(false);
  const [open, setOpen] = useState(false);
  const iconCloseTimer = useRef(null);

  const trustScore = carrier?.computed?.carrier_trust_score;
  const whyThisScore = trustScore?.why_this_score;

  const resolvedScore = score ?? whyThisScore?.score ?? trustScore?.overall_score ?? 0;

  const scoreColor = whyThisScore?.color || fallbackScoreColor(resolvedScore);

  const grade = whyThisScore?.grade || trustScore?.grade;
  const verdictLabel = formatVerdict(whyThisScore?.verdict);
  const message = whyThisScore?.message;
  const detail = whyThisScore?.detail;
  const counts = whyThisScore?.counts;

  const findings = whyThisScore?.triggered || [];

  const resolvedRiskPoints = findings.reduce((sum, f) => {
    const n = parseInt(f?.points, 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const engineVersion = whyThisScore?.model_version || trustScore?.model_version;

  function handleTriggerEnter() {
    if (iconCloseTimer.current) clearTimeout(iconCloseTimer.current);
    setShowIcon(true);
  }

  function handleTriggerLeave() {
    if (open) return;
    iconCloseTimer.current = setTimeout(() => setShowIcon(false), 150);
  }

  function handleIconClick() {
    setOpen((v) => !v);
  }

  function closeCard() {
    setOpen(false);
    setShowIcon(false);
  }

  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") closeCard();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleTriggerEnter}
      onMouseLeave={handleTriggerLeave}
    >
      {children}

      <button
        type="button"
        aria-label="View DT Score breakdown"
        onClick={handleIconClick}
        tabIndex={showIcon || open ? 0 : -1}
        className={`ml-[8px] inline-flex shrink-0 items-center gap-[3px] rounded-full border border-[#c7d9f5] bg-[#eef4ff] px-[10px] py-[4px] text-[10.5px] font-[800] uppercase tracking-tight text-[#1c5dbe] shadow-sm transition-all duration-150 ease-out hover:border-[#1c5dbe] hover:bg-[#e0ecff] ${
          showIcon || open
            ? "translate-x-0 scale-100 opacity-100"
            : "pointer-events-none -translate-x-[6px] scale-90 opacity-0"
        }`}
      >
        Details
        <svg
          viewBox="0 0 24 24"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-[16px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeCard();
            }}
          >
            <div className="flex h-[620px] max-h-[88vh] w-[520px] max-w-[94vw] flex-col overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-white shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b border-[#eef1f6] px-[24px] py-[18px]">
                <div>
                  <p className="m-0 text-[12px] font-[800] uppercase tracking-tight text-[#64748b]">
                    Why this score
                  </p>
                  <p className="m-0 mt-[3px] text-[12px] text-[#94a3b8]">
                    {grade ? `Grade ${grade}` : null}
                    {grade && engineVersion ? " · " : null}
                    {engineVersion ? `engine ${engineVersion}` : null}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-[8px]">
                  <div className="flex items-center gap-[14px]">
                    <span
                      className="text-[30px] font-[800] leading-none"
                      style={{ color: scoreColor }}
                    >
                      {resolvedScore}
                    </span>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={closeCard}
                      className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#334155]"
                    >
                      ✕
                    </button>
                  </div>
                  <ScoreStatusPill label={verdictLabel} color={scoreColor} />
                </div>
              </div>

              {(message || detail) && (
                <div className="shrink-0 border-b border-[#eef1f6] bg-[#f8fafc] px-[24px] py-[12px]">
                  {message && (
                    <p className="m-0 text-[13px] font-[700] text-[#111827]">
                      {message}
                    </p>
                  )}
                  {detail && (
                    <p className="m-0 mt-[3px] text-[12px] leading-[1.5] text-[#64748b]">
                      {detail}
                    </p>
                  )}
                </div>
              )}

              <div
                className="min-h-0 flex-1 overflow-y-auto px-[24px] py-[14px]"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#cbd5e1 transparent" }}
              >
                <div className="mb-[6px] flex items-baseline justify-between">
                  <p className="m-0 text-[13px] font-[800] text-[#111827]">
                    Findings{" "}
                    <span className="font-[500] text-[#64748b]">
                      {findings.length}
                      {counts?.total ? ` of ${counts.total} rules` : ""}
                    </span>
                  </p>

                  {counts && (
                    <p className="m-0 text-[11.5px] text-[#94a3b8]">
                      {counts.passed} passed
                      {counts.not_checked ? ` · ${counts.not_checked} not checked` : ""}
                    </p>
                  )}
                </div>

                <div>
                  {findings.length > 0 ? (
                    findings.map((finding, i) => (
                      <FindingRow key={i} finding={finding} />
                    ))
                  ) : (
                    <p className="m-0 py-[20px] text-center text-[13px] text-[#94a3b8]">
                      No findings triggered for this carrier.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-[#eef1f6] bg-[#f4f6f9] px-[24px] py-[13px]">
                <span className="text-[13px] text-[#374151]">
                  {resolvedRiskPoints.toLocaleString()} risk points
                </span>
                <span className="text-[13px] font-[800] text-[#111827]">
                  score {resolvedScore}
                </span>
              </div>

              <div className="shrink-0 border-t border-[#eef1f6] px-[24px] py-[16px]">
                <p className="m-0 text-[12px] leading-[1.55] text-[#64748b]">
                  Federal data behind this score can be disputed with FMCSA
                  through{" "}
                  <span className="font-[700] text-[#374151]">DataQs</span>;
                  corrections flow into the next refresh automatically. New
                  to the score?{" "}
                  <button
                    type="button"
                    onClick={handleSeeHowItWorks}
                    className="cursor-pointer border-none bg-transparent p-0 font-[700] text-[#15803d] underline decoration-1 underline-offset-2"
                  >
                    See how the DT Trust Score works
                  </button>
                  .
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}