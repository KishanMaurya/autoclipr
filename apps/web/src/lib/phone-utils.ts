import {
  DEFAULT_PHONE_DIAL,
  PHONE_COUNTRIES,
  type PhoneCountry,
} from "./phone-countries";

export function buildPhoneNumber(dial: string, localNumber: string): string {
  const dialDigits = dial.replace(/\D/g, "");
  const localDigits = localNumber.replace(/\D/g, "");
  if (!dialDigits || !localDigits) return "";
  return `+${dialDigits}${localDigits}`;
}

export function validatePhoneNumber(full: string): string | null {
  const digits = full.replace(/\D/g, "");
  if (digits.length < 10) {
    return "Enter a valid mobile number.";
  }
  if (digits.length > 15) {
    return "Enter a valid mobile number.";
  }
  return null;
}

export function parsePhoneNumber(
  full: string,
  countries: PhoneCountry[] = PHONE_COUNTRIES,
): { dial: string; local: string } {
  const trimmed = full.trim();
  const digits = (trimmed.startsWith("+") ? trimmed.slice(1) : trimmed).replace(/\D/g, "");
  if (!digits) {
    return { dial: DEFAULT_PHONE_DIAL, local: "" };
  }

  const sorted = [...countries].sort(
    (a, b) => b.dial.replace(/\D/g, "").length - a.dial.replace(/\D/g, "").length,
  );

  for (const country of sorted) {
    const dialDigits = country.dial.replace(/\D/g, "");
    if (digits.startsWith(dialDigits)) {
      return {
        dial: country.dial,
        local: digits.slice(dialDigits.length),
      };
    }
  }

  return { dial: DEFAULT_PHONE_DIAL, local: digits };
}
