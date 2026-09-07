/*
| Country dialling codes and phone rules, in one place.
|
| These used to be copied verbatim into Track Shipment step 1 and the profile
| screen — the comment in the profile copy even said it was keeping in step
| with the other by hand. Adding the invite form as a third consumer is what
| made that untenable, so both copies now import from here.
*/

export const COUNTRY_CODES = [
  { code: "IN", dial: "+91", label: "India" },
  { code: "US", dial: "+1", label: "United States" },
  { code: "CA", dial: "+1", label: "Canada" },
  { code: "MX", dial: "+52", label: "Mexico" },
];

export const PHONE_VALIDATION = {
  US: {
    length: 10,
    pattern: /^[2-9]\d{9}$/,
    message: "Enter a valid 10-digit US phone number",
  },
  CA: {
    length: 10,
    pattern: /^[2-9]\d{9}$/,
    message: "Enter a valid 10-digit Canadian phone number",
  },
  MX: {
    length: 10,
    pattern: /^\d{10}$/,
    message: "Enter a valid 10-digit Mexican phone number",
  },
  IN: {
    length: 10,
    pattern: /^[6-9]\d{9}$/,
    message: "Enter a valid 10-digit Indian mobile number",
  },
};

/** react-hook-form validator: `true` when valid, otherwise the message. */
export function validatePhoneForCountry(rawPhone, countryCode) {
  const digits = (rawPhone || "").replace(/\D/g, "");
  const rule = PHONE_VALIDATION[countryCode] || PHONE_VALIDATION.US;

  if (digits.length !== rule.length) {
    return rule.message;
  }

  if (rule.pattern && !rule.pattern.test(digits)) {
    return rule.message;
  }

  return true;
}

export function sanitizePhoneDigits(rawValue, countryCode) {
  const maxLength = (PHONE_VALIDATION[countryCode] || PHONE_VALIDATION.US).length;
  return (rawValue || "").replace(/\D/g, "").slice(0, maxLength);
}

/**
 * The ISO code behind a stored value.
 *
 * Records hold either the ISO code ("US") or the dial code ("+1"); the latter
 * is ambiguous — US and CA share +1 — so it resolves to the first match, which
 * is the best that can be done without more information.
 */
export function resolveCountryCode(value, fallback = "US") {
  if (!value) return fallback;

  return (
    COUNTRY_CODES.find((c) => c.code === value || c.dial === value)?.code
      || fallback
  );
}

/** The dial code for an ISO code, e.g. "US" -> "+1". */
export function dialFor(countryCode, fallback = "+1") {
  return COUNTRY_CODES.find((c) => c.code === countryCode)?.dial || fallback;
}
