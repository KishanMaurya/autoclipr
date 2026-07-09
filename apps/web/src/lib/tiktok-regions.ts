/**
 * Countries where TikTok is fully banned for the general public.
 * ISO 3166-1 alpha-2 codes. Government-device-only bans (US, EU institutions, etc.)
 * are NOT included — those users can still use TikTok personally.
 *
 * Sources: Wikipedia "Censorship of TikTok", Reuters, BBC (as of mid-2025).
 */
export const TIKTOK_BANNED_COUNTRIES: ReadonlySet<string> = new Set([
  "AF", // Afghanistan
  "IN", // India (banned since June 2020)
  "NP", // Nepal
  "SO", // Somalia
  "YE", // Yemen
  "SB", // Solomon Islands
]);

export function isTikTokBanned(countryCode: string): boolean {
  return TIKTOK_BANNED_COUNTRIES.has(countryCode.toUpperCase());
}
