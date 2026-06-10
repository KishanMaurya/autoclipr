export const PLATFORMS_STORAGE_KEY = "autoclipr_connected_platforms";

export function getConnectedPlatforms(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLATFORMS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setConnectedPlatforms(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(ids));
}
