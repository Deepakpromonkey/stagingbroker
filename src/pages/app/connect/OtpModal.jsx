import { useRef, useState, useEffect, useCallback } from "react";

import Close from "@mui/icons-material/Close";
import ArrowRightAlt from "@mui/icons-material/ArrowRightAlt";
import CircularProgress from "@mui/material/CircularProgress";

import { apiFetch } from "../../../lib/api";

const OTP_LENGTH = 6;

const RESEND_SECONDS = 30;

/**
 * Phone verification for carrier onboarding.
 *
 * Public endpoints keyed by the invitation token, so `skipAuth` is set — the
 * carrier is not a logged-in user and has no bearer token.
 */
export default function OtpModal({
  isOpen,
  onClose,
  token,
  phoneHint,
  onVerifySuccess,
}) {
  const [digits, setDigits] = useState(new Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(0);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  const [hint, setHint] = useState(phoneHint || "");
  const [error, setError] = useState("");

  const inputRefs = useRef([]);

  const sendCode = useCallback(async () => {
    setSending(true);
    setError("");
    setDigits(new Array(OTP_LENGTH).fill(""));

    try {
      const res = await apiFetch("/carrier-connect/otp/send", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token }),
      });

      setHint(res?.data?.phone_hint || "");
      setSent(true);
      setTimer(RESEND_SECONDS);
      setDigits(new Array(OTP_LENGTH).fill(""));

      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err?.message || "Could not send the code. Please try again.");
    } finally {
      setSending(false);
    }
  }, [token]);

  // Send a code as soon as the modal opens. sendCode clears the previous entry
  // itself, so reopening starts clean without a separate reset-on-close pass.
  useEffect(() => {
    if (!isOpen) return;

    sendCode();
  }, [isOpen, sendCode]);

  useEffect(() => {
    if (timer <= 0) return;

    const id = setTimeout(() => setTimer((value) => value - 1), 1000);

    return () => clearTimeout(id);
  }, [timer]);

  const setDigitAt = (index, value) => {
    setDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const handleChange = (index, rawValue) => {
    const value = rawValue.replace(/\D/g, "");

    if (!value) {
      setDigitAt(index, "");
      return;
    }

    // Typing over a filled box, or pasting several digits at once, should fill
    // forwards rather than dropping everything but the first character.
    if (value.length > 1) {
      setDigits((current) => {
        const next = [...current];

        value
          .slice(0, OTP_LENGTH - index)
          .split("")
          .forEach((digit, offset) => {
            next[index + offset] = digit;
          });

        return next;
      });

      const landing = Math.min(index + value.length, OTP_LENGTH - 1);
      inputRefs.current[landing]?.focus();

      return;
    }

    setDigitAt(index, value);

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const verify = async () => {
    const code = digits.join("");

    if (code.length !== OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const res = await apiFetch("/carrier-connect/otp/verify", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ token, otp: code }),
      });

      onVerifySuccess?.(res?.data);
    } catch (err) {
      setError(err?.message || "That code is not correct.");
      setDigits(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  const complete = digits.every((digit) => digit !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-[#111827]">
              Verify your phone
            </h3>

            <p className="mt-1 text-sm text-[#6B7280]">
              {sent && hint
                ? `We sent a ${OTP_LENGTH} digit code to ${hint}.`
                : `We're sending a ${OTP_LENGTH} digit code to the number on file.`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <Close style={{ fontSize: 20 }} />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={digit}
              disabled={sending || verifying}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className={`h-14 w-full rounded-xl border text-center text-xl font-bold text-[#1F2937] transition-all focus:ring-2 focus:outline-none ${
                error
                  ? "border-red-400 focus:ring-red-100"
                  : "border-[#E5E7EB] focus:border-blue-500 focus:ring-blue-100"
              } disabled:bg-gray-50`}
            />
          ))}
        </div>

        {error && <p className="mb-4 text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={verify}
          disabled={!complete || verifying || sending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] py-3.5 text-sm font-semibold tracking-wide text-white shadow-md transition-all hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
        >
          {verifying ? (
            <CircularProgress size={18} sx={{ color: "#fff" }} />
          ) : (
            <>
              Verify
              <ArrowRightAlt style={{ fontSize: 18 }} />
            </>
          )}
        </button>

        <div className="mt-5 text-center">
          {timer > 0 ? (
            <span className="text-xs text-[#9CA3AF]">
              You can request a new code in {timer}s
            </span>
          ) : (
            <button
              type="button"
              onClick={sendCode}
              disabled={sending}
              className="text-xs font-semibold text-[#1D4ED8] hover:underline disabled:opacity-40"
            >
              {sending ? "Sending..." : "Send a new code"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
