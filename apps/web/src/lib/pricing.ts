export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "SGD" | "AED" | "SAR" | "JPY" | "BRL" | "MXN" | "KRW" | "CNY" | "NZD";

export type PlanPrices = {
  monthly: number;
  yearly: number;
};

// Prices per currency per plan (0 = free)
export const PLAN_PRICES: Record<string, Record<CurrencyCode, PlanPrices>> = {
  starter: {
    INR: { monthly: 0, yearly: 0 },
    USD: { monthly: 0, yearly: 0 },
    EUR: { monthly: 0, yearly: 0 },
    GBP: { monthly: 0, yearly: 0 },
    AUD: { monthly: 0, yearly: 0 },
    CAD: { monthly: 0, yearly: 0 },
    SGD: { monthly: 0, yearly: 0 },
    AED: { monthly: 0, yearly: 0 },
    SAR: { monthly: 0, yearly: 0 },
    JPY: { monthly: 0, yearly: 0 },
    BRL: { monthly: 0, yearly: 0 },
    MXN: { monthly: 0, yearly: 0 },
    KRW: { monthly: 0, yearly: 0 },
    CNY: { monthly: 0, yearly: 0 },
    NZD: { monthly: 0, yearly: 0 },
  },
  creator: {
    INR: { monthly: 399, yearly: 349 },
    USD: { monthly: 5, yearly: 4 },
    EUR: { monthly: 5, yearly: 4 },
    GBP: { monthly: 4, yearly: 3 },
    AUD: { monthly: 8, yearly: 7 },
    CAD: { monthly: 7, yearly: 6 },
    SGD: { monthly: 7, yearly: 6 },
    AED: { monthly: 18, yearly: 16 },
    SAR: { monthly: 18, yearly: 16 },
    JPY: { monthly: 750, yearly: 650 },
    BRL: { monthly: 25, yearly: 22 },
    MXN: { monthly: 85, yearly: 75 },
    KRW: { monthly: 6500, yearly: 5800 },
    CNY: { monthly: 36, yearly: 32 },
    NZD: { monthly: 8, yearly: 7 },
  },
  business: {
    INR: { monthly: 1999, yearly: 1749 },
    USD: { monthly: 24, yearly: 20 },
    EUR: { monthly: 22, yearly: 19 },
    GBP: { monthly: 19, yearly: 16 },
    AUD: { monthly: 37, yearly: 32 },
    CAD: { monthly: 33, yearly: 28 },
    SGD: { monthly: 32, yearly: 28 },
    AED: { monthly: 88, yearly: 76 },
    SAR: { monthly: 90, yearly: 78 },
    JPY: { monthly: 3600, yearly: 3100 },
    BRL: { monthly: 120, yearly: 104 },
    MXN: { monthly: 410, yearly: 355 },
    KRW: { monthly: 32000, yearly: 28000 },
    CNY: { monthly: 175, yearly: 152 },
    NZD: { monthly: 39, yearly: 34 },
  },
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£",
  AUD: "A$", CAD: "CA$", SGD: "S$", AED: "AED ",
  SAR: "SAR ", JPY: "¥", BRL: "R$", MXN: "MX$",
  KRW: "₩", CNY: "¥", NZD: "NZ$",
};

export function formatPrice(amount: number, currency: CurrencyCode): string {
  if (amount === 0) return "Free";
  const symbol = CURRENCY_SYMBOLS[currency];
  // JPY and KRW don't use decimals
  if (currency === "JPY" || currency === "KRW") {
    return `${symbol}${amount.toLocaleString()}`;
  }
  return `${symbol}${amount}`;
}
