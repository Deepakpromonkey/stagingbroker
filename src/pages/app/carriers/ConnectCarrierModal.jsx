import { useEffect, useMemo, useState } from "react";

import Close from "@mui/icons-material/Close";
import Bolt from "@mui/icons-material/Bolt";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import AlternateEmail from "@mui/icons-material/AlternateEmail";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import WarningAmber from "@mui/icons-material/WarningAmber";

import CircularProgress from "@mui/material/CircularProgress";

import { apiFetch } from "../../../lib/api";

const inputClasses =
  "w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#1F2937] transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-gray-50";

/**
 * Chooses where a carrier's onboarding invitation is sent.
 *
 * The FMCSA-registered address is the trusted one — it comes off the carrier's
 * own federal record, so an invitation sent there needs no further proof. Any
 * other address does: a broker could otherwise redirect onboarding for a
 * carrier they don't represent to an inbox they control. So an alternate
 * address is never invited directly. The API first emails the FMCSA address for
 * approval, and only once the carrier approves does the onboarding link go out
 * to the address the broker typed.
 */
export default function ConnectCarrierModal({
  isOpen,
  onClose,
  carrier,
  onSubmitted,
  isResend = false,
  connectRequest = null,
}) {
  const fmcsaEmail = useMemo(
    function () {
      return (
        carrier?.fmcsa_data?.email ||
        carrier?.email ||
        carrier?.official_email ||
        carrier?.email_address ||
        ""
      )
        .toString()
        .toLowerCase();
    },
    [carrier],
  );

  // An alternate address already sent for approval on an earlier click. Showing
  // it again is the difference between "resend" and "start over" — without it
  // the broker reopens the modal and sees no trace of what they asked for.
  const pendingEmail = (connectRequest?.pending_email || "").toLowerCase();

  const [choice, setChoice] = useState("fmcsa");
  const [alternateEmail, setAlternateEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  // A carrier with no address on their federal record can't approve anything,
  // so there is nothing to fall back to.
  const hasFmcsaEmail = !!fmcsaEmail;

  useEffect(
    function () {
      if (!isOpen) return;

      // Reopening while an approval is outstanding resumes that request rather
      // than silently dropping back to the registered address.
      if (pendingEmail) {
        setChoice("alternate");
        setAlternateEmail(pendingEmail);
      } else {
        setChoice(hasFmcsaEmail ? "fmcsa" : "alternate");
        setAlternateEmail("");
      }

      setError("");
      setFieldError("");
    },
    [isOpen, hasFmcsaEmail, pendingEmail],
  );

  const validate = function () {
    if (choice === "fmcsa") return true;

    const email = alternateEmail.trim().toLowerCase();

    if (!email) {
      setFieldError("Enter the email address to send the invitation to.");
      return false;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError("Enter a valid email address.");
      return false;
    }

    // Routing to the registered address through the approval flow would mean
    // asking that inbox to approve itself.
    if (email === fmcsaEmail) {
      setFieldError(
        "That is already the FMCSA-registered address — pick the first option instead.",
      );
      return false;
    }

    setFieldError("");
    return true;
  };

  const submit = async function () {
    if (!carrier?.row_id) {
      setError("This carrier cannot be invited — no carrier reference.");
      return;
    }

    if (!validate()) return;

    const usingAlternate = choice === "alternate";

    setSubmitting(true);
    setError("");

    try {
      const res = await apiFetch("/carrier-connect", {
        method: "POST",
        body: JSON.stringify({
          row_id: carrier.row_id,
          email_option: usingAlternate ? "alternate" : "fmcsa",
          email: usingAlternate ? alternateEmail.trim().toLowerCase() : null,
        }),
      });

      onSubmitted?.(res, {
        usingAlternate,
        email: usingAlternate ? alternateEmail.trim().toLowerCase() : fmcsaEmail,
        fmcsaEmail,
      });

      onClose?.();
    } catch (err) {
      setError(
        err?.message || "Could not send the invitation. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#F1F5F9] px-6 py-5 sm:px-8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
              <Bolt style={{ fontSize: 20 }} />
            </span>

            <div>
              <h3 className="text-xl font-bold tracking-tight text-[#111827]">
                {isResend ? "Resend invitation" : "Send onboarding invitation"}
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
          {/* An approval already in flight, so the broker knows this is a
              resend of that request rather than a fresh choice. */}
          {pendingEmail && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
              <ShieldOutlined
                style={{ fontSize: 18 }}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-relaxed text-amber-800">
                <span className="font-bold">Awaiting approval.</span> You already
                asked the carrier to approve{" "}
                <span className="font-semibold break-all">{pendingEmail}</span>.
                Sending again re-issues that approval email — nothing has been
                sent to that address yet.
              </p>
            </div>
          )}

          <p className="mb-4 text-sm text-[#6B7280]">
            Where should the onboarding link be sent?
          </p>

          {!hasFmcsaEmail && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
              <WarningAmber
                style={{ fontSize: 18 }}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-relaxed text-amber-800">
                No FMCSA-registered email is on file for this carrier, so an
                alternate address cannot be verified against their federal
                record. Confirm the address with the carrier before sending.
              </p>
            </div>
          )}

          {/* Option 1 — the registered address */}
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-colors ${
              choice === "fmcsa"
                ? "border-[#1D4ED8] bg-[#F8FAFF]"
                : "border-[#E5E7EB] bg-white hover:bg-[#FAFBFC]"
            } ${!hasFmcsaEmail ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input
              type="radio"
              name="connect-email-choice"
              value="fmcsa"
              checked={choice === "fmcsa"}
              disabled={submitting || !hasFmcsaEmail}
              onChange={() => setChoice("fmcsa")}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#1D4ED8]"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#111827]">
                  FMCSA-registered email
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#047857] uppercase">
                  <VerifiedOutlined style={{ fontSize: 12 }} />
                  Verified
                </span>
              </div>

              <p className="mt-1 truncate text-sm font-semibold text-[#1D4ED8]">
                {fmcsaEmail || "Not on record"}
              </p>

              {carrier?.company_name && hasFmcsaEmail && (
                <p className="mt-0.5 truncate text-xs text-[#6B7280]">
                  {carrier.company_name}
                </p>
              )}

              <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">
                Sent straight away — this address is on the carrier's federal
                record, so no approval is needed.
              </p>
            </div>
          </label>

          {/* Option 2 — an alternate address, gated on approval */}
          <label
            className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition-colors ${
              choice === "alternate"
                ? "border-[#1D4ED8] bg-[#F8FAFF]"
                : "border-[#E5E7EB] bg-white hover:bg-[#FAFBFC]"
            }`}
          >
            <input
              type="radio"
              name="connect-email-choice"
              value="alternate"
              checked={choice === "alternate"}
              disabled={submitting}
              onChange={() => setChoice("alternate")}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#1D4ED8]"
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#111827]">
                  A different email address
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#92400E] uppercase">
                  <ShieldOutlined style={{ fontSize: 12 }} />
                  Needs approval
                </span>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
                Use this when the carrier's dispatch or compliance inbox differs
                from the one on their FMCSA record.
              </p>

              {choice === "alternate" && (
                <div className="mt-3">
                  <div className="relative">
                    <AlternateEmail
                      style={{ fontSize: 18 }}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9CA3AF]"
                    />

                    <input
                      type="email"
                      value={alternateEmail}
                      disabled={submitting}
                      autoFocus
                      placeholder="dispatch@carrier.com"
                      onChange={(event) => {
                        setAlternateEmail(event.target.value);
                        setFieldError("");
                      }}
                      className={`${inputClasses} pl-10`}
                    />
                  </div>

                  {fieldError && (
                    <p className="mt-1 text-xs text-red-500">{fieldError}</p>
                  )}

                  <div className="mt-3 rounded-lg border border-[#DBEAFE] bg-[#F8FAFF] px-3 py-2.5">
                    <p className="text-[11px] leading-relaxed text-[#1E40AF]">
                      <span className="font-bold">How this works:</span> we email{" "}
                      <span className="font-semibold">
                        {fmcsaEmail || "the carrier's FMCSA address"}
                      </span>{" "}
                      to confirm the new address. Once the carrier approves from
                      that email, the onboarding link is sent to{" "}
                      <span className="font-semibold">
                        {alternateEmail.trim() || "the address above"}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              )}
            </div>
          </label>

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
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-md transition-all hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {submitting ? (
              <CircularProgress size={18} sx={{ color: "#fff" }} />
            ) : choice === "alternate" ? (
              "Request approval"
            ) : (
              "Send invitation"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
