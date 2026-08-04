import CheckCircle from "@mui/icons-material/CheckCircle";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import HandshakeOutlined from "@mui/icons-material/HandshakeOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import PersonOutline from "@mui/icons-material/PersonOutlined";

// Mirrors the `stage` the API derives, so the wording is identical to the
// Connected Carriers list.
const STAGE_STYLES = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  invited: "bg-blue-50 text-blue-700 border-blue-200",
  declined: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
};

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

/**
 * Where this carrier has got to in onboarding, shown on their profile.
 *
 * Reads the connect request the profile already fetched — no extra call.
 */
export default function OnboardingStatus({ request }) {
  if (!request) return null;

  const steps = [
    { label: "Phone verified", done: request.mobile_verified },
    { label: "Government ID verified", done: request.identity_verified },
    { label: "Bank account connected", done: request.bank_verified },
    { label: "Broker questions answered", done: request.questionnaire_completed },
    { label: "Agreement signed", done: request.signed },
  ];

  const stageClass = STAGE_STYLES[request.stage] || STAGE_STYLES.invited;

  const percent = Math.round(
    ((request.steps_completed || 0) / (request.steps_total || 5)) * 100,
  );

  const factoring = request.factoring || {};

  const sentOn = formatDate(request.sent_on);
  const expiresAt = formatDate(request.expires_at);

  return (
    <div className="overflow-hidden rounded-[16px] border border-[#d9e1ee] bg-white shadow-[0_2px_8px_rgba(16,24,40,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] px-[20px] py-[16px] md:px-[28px]">
        <div className="flex items-center gap-2">
          <HandshakeOutlined className="!text-[#185abc]" />

          <span className="text-[15px] font-[700] tracking-[-0.01em] text-[#101828]">
            Onboarding Status
          </span>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${stageClass}`}
        >
          {request.stage_label}
        </span>
      </div>

      <div className="px-[20px] py-[20px] md:px-[28px]">
        {/* Progress */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                request.stage === "completed"
                  ? "bg-emerald-500"
                  : request.stage === "declined"
                    ? "bg-red-400"
                    : "bg-[#1D4ED8]"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <span className="text-xs font-semibold text-[#4B5563]">
            {request.steps_completed || 0} of {request.steps_total || 5} steps
          </span>
        </div>

        {/* Step checklist */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-2">
              {step.done ? (
                <CheckCircle
                  sx={{ fontSize: 18 }}
                  className="text-emerald-600"
                />
              ) : (
                <RadioButtonUnchecked
                  sx={{ fontSize: 18 }}
                  className="text-gray-300"
                />
              )}

              <span
                className={`text-sm ${
                  step.done ? "text-[#1F2937]" : "text-[#9CA3AF]"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Risk flag */}
        {request.identity_risk_flagged && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
            <WarningAmber sx={{ fontSize: 18 }} className="mt-0.5 text-amber-600" />

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Identity check flagged
              </p>

              <p className="mt-0.5 text-xs text-amber-700">
                The verification session came from a VPN, Tor exit or a data
                centre. Worth reviewing before tendering loads.
              </p>
            </div>
          </div>
        )}

        {/* Factoring */}
        {request.factoring_answered && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#E5E7EB] bg-[#FAFBFD] px-4 py-3">
            <AccountBalanceOutlined
              sx={{ fontSize: 18 }}
              className="mt-0.5 text-[#185abc]"
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1F2937]">
                {factoring.uses_factoring_company
                  ? "Uses a factoring company"
                  : "Does not use a factoring company"}
              </p>

              {factoring.uses_factoring_company && (
                <p className="mt-0.5 truncate text-xs text-[#6B7280]">
                  {factoring.company_name || "Name not provided"}
                  {factoring.document_name
                    ? ` · notice of assignment: ${factoring.document_name}`
                    : " · no notice of assignment on file"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer meta */}
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#eef2f7] pt-4">
          {request.invited_by && (
            <div className="flex items-center gap-1.5">
              <PersonOutline sx={{ fontSize: 16 }} className="text-gray-400" />
              <span className="text-xs text-[#6B7280]">
                Invited by{" "}
                <span className="font-semibold text-[#4B5563]">
                  {request.invited_by}
                </span>
              </span>
            </div>
          )}

          {sentOn && (
            <span className="text-xs text-[#6B7280]">
              Sent <span className="font-semibold text-[#4B5563]">{sentOn}</span>
            </span>
          )}

          {expiresAt && request.stage !== "completed" && (
            <span className="text-xs text-[#6B7280]">
              {request.stage === "expired" ? "Expired" : "Expires"}{" "}
              <span className="font-semibold text-[#4B5563]">{expiresAt}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
