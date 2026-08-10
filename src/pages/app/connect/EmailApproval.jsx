import { useSearchParams } from "react-router-dom";

import CheckCircle from "@mui/icons-material/CheckCircle";
import GppBad from "@mui/icons-material/GppBad";
import AccessTime from "@mui/icons-material/AccessTime";
import PhoneAndroid from "@mui/icons-material/PhoneAndroid";
import Email from "@mui/icons-material/Email";

/**
 * Where the carrier lands after following the approval link sent to their
 * FMCSA-registered address.
 *
 * The API has already done the work by the time this renders — approving,
 * releasing the invitation and burning the single-use token — so this only
 * reports the outcome it was redirected with.
 */
const OUTCOMES = {
  approved: {
    badge: "Approved",
    badgeClass: "bg-[#ECFDF5] text-[#047857]",
    icon: <CheckCircle style={{ fontSize: 180 }} className="text-[#A7F3D0]" />,
    title: "Thanks — that address is approved.",
    body: (email) =>
      email
        ? `We've sent the onboarding link to ${email}. You can close this page.`
        : "We've sent the onboarding link to the approved address. You can close this page.",
  },

  expired: {
    badge: "Link Expired",
    badgeClass: "bg-[#FFFBEB] text-[#B45309]",
    icon: <AccessTime style={{ fontSize: 180 }} className="text-[#E2E8F0]" />,
    title: "This approval link has expired.",
    body: () =>
      "For your security the link is only valid for a short time. Ask the broker to send the request again, and it will arrive at this address.",
  },

  invalid: {
    badge: "Link Not Valid",
    badgeClass: "bg-[#FEF2F2] text-[#B91C1C]",
    icon: <GppBad style={{ fontSize: 180 }} className="text-[#E2E8F0]" />,
    title: "This approval link is no longer valid.",
    body: () =>
      "It may already have been used — each link works only once — or the request was withdrawn. Nothing has been sent to the other address.",
  },
};

export default function EmailApproval() {
  const [params] = useSearchParams();

  const outcome = OUTCOMES[params.get("status")] || OUTCOMES.invalid;

  const email = params.get("email") || "";

  return (
    <div className="flex min-h-screen select-none flex-col items-center bg-white px-4 py-10 font-sans text-[#1A1A1A]">
      <div
        className={`mb-4 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase ${outcome.badgeClass}`}
      >
        {outcome.badge}
      </div>

      <div className="flex items-center justify-center">{outcome.icon}</div>

      <p className="mt-4 max-w-[420px] text-center text-base font-semibold text-[#111827]">
        {outcome.title}
      </p>

      <p className="mt-2 mb-12 max-w-[420px] text-center text-sm break-words text-[#4B5563]">
        {outcome.body(email)}
      </p>

      <div>
        <div className="flex items-center justify-center">
          <span className="text-xs font-bold text-[#4B5563]">
            Feel free to reach us for any support.
          </span>
        </div>

        <div className="my-6 h-[1px] w-full bg-[#E5E7EB]" />

        <div className="flex items-center gap-5">
          <div className="flex items-center">
            <PhoneAndroid className="text-[#E2E8F0]" />
            <span className="text-xs">
              {import.meta.env.VITE_GLOBAL_SUPPORT_CONTACT}
            </span>
          </div>

          <div className="flex items-center">
            <Email className="text-[#E2E8F0]" />
            <span className="text-xs">
              {import.meta.env.VITE_GLOBAL_SUPPORT_EMAIL}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
