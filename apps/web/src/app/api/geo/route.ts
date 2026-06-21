import { NextResponse } from "next/server";

// Maps country code → currency info
const CURRENCY_MAP: Record<string, { code: string; symbol: string; name: string }> = {
  IN: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  US: { code: "USD", symbol: "$", name: "US Dollar" },
  CA: { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  GB: { code: "GBP", symbol: "£", name: "British Pound" },
  AU: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  NZ: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  SG: { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  AE: { code: "AED", symbol: "AED", name: "UAE Dirham" },
  SA: { code: "SAR", symbol: "SAR", name: "Saudi Riyal" },
  JP: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  CN: { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  KR: { code: "KRW", symbol: "₩", name: "Korean Won" },
  BR: { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  MX: { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  // European countries → EUR
  DE: { code: "EUR", symbol: "€", name: "Euro" },
  FR: { code: "EUR", symbol: "€", name: "Euro" },
  IT: { code: "EUR", symbol: "€", name: "Euro" },
  ES: { code: "EUR", symbol: "€", name: "Euro" },
  NL: { code: "EUR", symbol: "€", name: "Euro" },
  PT: { code: "EUR", symbol: "€", name: "Euro" },
  PL: { code: "EUR", symbol: "€", name: "Euro" },
  SE: { code: "EUR", symbol: "€", name: "Euro" },
  NO: { code: "EUR", symbol: "€", name: "Euro" },
  DK: { code: "EUR", symbol: "€", name: "Euro" },
  FI: { code: "EUR", symbol: "€", name: "Euro" },
  AT: { code: "EUR", symbol: "€", name: "Euro" },
  BE: { code: "EUR", symbol: "€", name: "Euro" },
  CH: { code: "EUR", symbol: "€", name: "Euro" },
};

function getIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  if (forwarded) return forwarded.split(",")[0].trim();
  if (real) return real.trim();
  return "";
}

export async function GET(request: Request) {
  try {
    const ip = getIp(request);

    // Use ipapi.co for geo lookup (free tier: 1000 req/day, no key needed)
    const url = ip ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";
    const res = await fetch(url, {
      headers: { "User-Agent": "autoclipr/1.0" },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!res.ok) throw new Error("Geo lookup failed");

    const data = await res.json();
    const countryCode: string = data.country_code ?? "US";
    const currency = CURRENCY_MAP[countryCode] ?? { code: "USD", symbol: "$", name: "US Dollar" };

    return NextResponse.json({
      country: countryCode,
      countryName: data.country_name ?? "Unknown",
      currency,
    });
  } catch {
    // Fallback to USD on any error
    return NextResponse.json({
      country: "US",
      countryName: "Unknown",
      currency: { code: "USD", symbol: "$", name: "US Dollar" },
    });
  }
}
