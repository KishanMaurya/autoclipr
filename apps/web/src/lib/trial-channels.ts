export type TrialChannel = {
  id: string;
  name: string;
  url: string;
  handle: string;
};

/** Curated channels available during free trial */
export const TRIAL_CHANNELS: TrialChannel[] = [
  {
    id: "mrbeast",
    name: "MrBeast",
    url: "https://www.youtube.com/@MrBeast",
    handle: "@MrBeast",
  },
  {
    id: "mkbhd",
    name: "MKBHD",
    url: "https://www.youtube.com/@mkbhd",
    handle: "@mkbhd",
  },
  {
    id: "veritasium",
    name: "Veritasium",
    url: "https://www.youtube.com/@veritasium",
    handle: "@veritasium",
  },
  {
    id: "lex",
    name: "Lex Fridman",
    url: "https://www.youtube.com/@lexfridman",
    handle: "@lexfridman",
  },
  {
    id: "fireship",
    name: "Fireship",
    url: "https://www.youtube.com/@Fireship",
    handle: "@Fireship",
  },
  {
    id: "garyvee",
    name: "GaryVee",
    url: "https://www.youtube.com/@garyvee",
    handle: "@garyvee",
  },
];

export function findTrialChannel(query: string): TrialChannel | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return TRIAL_CHANNELS.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.handle.toLowerCase().includes(q) ||
      c.url.toLowerCase().includes(q)
  );
}

export function filterTrialChannels(query: string): TrialChannel[] {
  const q = query.trim().toLowerCase();
  if (!q) return TRIAL_CHANNELS;
  return TRIAL_CHANNELS.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.handle.toLowerCase().includes(q)
  );
}

export function resolveChannelFromInput(input: string): TrialChannel | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const byUrl = TRIAL_CHANNELS.find(
    (c) => c.url.toLowerCase() === trimmed.toLowerCase()
  );
  if (byUrl) return byUrl;

  const match = findTrialChannel(trimmed);
  return match ?? null;
}
