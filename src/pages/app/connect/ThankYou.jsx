import CheckCircle from "@mui/icons-material/CheckCircle";
import DoneAll from "@mui/icons-material/DoneAll";
import Email from "@mui/icons-material/Email";
import PhoneAndroid from "@mui/icons-material/PhoneAndroid";

/**
 * Shown once the agreement is signed.
 *
 * Rendered from the wizard rather than pushed as its own route, so a refresh of
 * the invitation link lands back here — `load` reports the request as completed,
 * and the carrier never sees the form again.
 */
export default function ThankYou({ brokerName, carrierName, completedSteps = [] }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-4 py-16 font-sans text-[#1A1A1A]">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle style={{ fontSize: 64 }} className="text-emerald-600" />
      </div>

      <div className="mt-6 rounded-full bg-emerald-50 px-4 py-1.5 text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
        Onboarding complete
      </div>

      <h1 className="mt-4 text-center text-4xl font-bold tracking-tight text-[#111827]">
        Thank you{carrierName ? `, ${carrierName}` : ""}
      </h1>

      <p className="mt-3 max-w-xl text-center text-sm text-[#4B5563]">
        Your agreement has been signed and sent to{" "}
        <strong className="text-[#111827]">{brokerName || "the broker"}</strong>.
        They have been notified and can start tendering loads to you. There is
        nothing further for you to do.
      </p>

      {completedSteps.length > 0 && (
        <div className="mt-10 w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-[#FAFBFD] p-6">
          <span className="text-xs font-bold tracking-wider text-[#9CA3AF] uppercase">
            What you completed
          </span>

          <ul className="mt-4 space-y-3">
            {completedSteps.map((step) => (
              <li key={step} className="flex items-center gap-3">
                <DoneAll style={{ fontSize: 18 }} className="text-emerald-600" />
                <span className="text-sm text-[#1F2937]">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 flex flex-col items-center">
        <span className="text-xs font-bold text-[#4B5563]">
          Questions about this onboarding? Reach out to us.
        </span>

        <div className="my-5 h-[1px] w-full bg-[#E5E7EB]" />

        <div className="flex flex-wrap items-center justify-center gap-5">
          <div className="flex items-center gap-1">
            <PhoneAndroid style={{ fontSize: 16 }} className="text-[#CBD5E1]" />
            <span className="text-xs text-[#4B5563]">
              {import.meta.env.VITE_GLOBAL_SUPPORT_CONTACT || "Support"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Email style={{ fontSize: 16 }} className="text-[#CBD5E1]" />
            <span className="text-xs text-[#4B5563]">
              {import.meta.env.VITE_GLOBAL_SUPPORT_EMAIL || "support"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
