/**
 * Countries where each social platform is fully banned for the general public.
 * ISO 3166-1 alpha-2 codes.
 *
 * Government-device-only bans (e.g. US federal devices for TikTok) are NOT
 * included — those users can still use the platform personally.
 *
 * Sources: Wikipedia censorship pages, Freedom House, NetBlocks (mid-2025).
 */

const PLATFORM_BANS: Record<string, readonly string[]> = {
  youtube: [
    "CN", // China — Great Firewall
    "KP", // North Korea — no public internet
    "IR", // Iran — blocked
    "ER", // Eritrea — heavily restricted
  ],

  instagram: [
    "CN", // China — Great Firewall
    "KP", // North Korea
    "IR", // Iran — blocked
    "RU", // Russia — blocked since March 2022
  ],

  facebook: [
    "CN", // China — Great Firewall
    "KP", // North Korea
    "IR", // Iran — blocked
    "RU", // Russia — blocked since March 2022
    "CU", // Cuba — heavily restricted
  ],

  tiktok: [
    "AF", // Afghanistan
    "IN", // India — banned since June 2020
    "NP", // Nepal
    "SO", // Somalia
    "YE", // Yemen
    "SB", // Solomon Islands
  ],
};

const BANS_BY_PLATFORM: Record<string, ReadonlySet<string>> = Object.fromEntries(
  Object.entries(PLATFORM_BANS).map(([p, codes]) => [p, new Set(codes)]),
);

export function isPlatformBanned(platform: string, countryCode: string): boolean {
  return BANS_BY_PLATFORM[platform]?.has(countryCode.toUpperCase()) ?? false;
}

export function getBannedPlatforms(countryCode: string): string[] {
  const code = countryCode.toUpperCase();
  return Object.keys(BANS_BY_PLATFORM).filter((p) => BANS_BY_PLATFORM[p].has(code));
}
