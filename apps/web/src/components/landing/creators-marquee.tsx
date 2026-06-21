"use client";

const CREATORS = [
  { name: "Ali Abdaal", stat: "420M Views", initials: "AA", color: "from-blue-500 to-cyan-400" },
  { name: "MrBeast", stat: "40B Views", initials: "MB", color: "from-yellow-500 to-orange-400" },
  { name: "Chad Wild Clay", stat: "7B Views", initials: "CW", color: "from-red-500 to-pink-400" },
  { name: "Think Media", stat: "350M Views", initials: "TM", color: "from-purple-500 to-violet-400" },
  { name: "SB737", stat: "1B Views", initials: "SB", color: "from-green-500 to-emerald-400" },
  { name: "Masha and Bear", stat: "52.6M Subs", initials: "MB", color: "from-pink-500 to-rose-400" },
  { name: "Jordan Matter", stat: "31.7M Subs", initials: "JM", color: "from-indigo-500 to-blue-400" },
  { name: "Preston", stat: "31.3M Subs", initials: "PR", color: "from-orange-500 to-red-400" },
  { name: "Veritasium", stat: "18B Views", initials: "VE", color: "from-teal-500 to-cyan-400" },
  { name: "Kurzgesagt", stat: "2B Views", initials: "KZ", color: "from-amber-500 to-yellow-400" },
];

const BRANDS = [
  "BattleBots",
  "GeForce GTX",
  "Microsoft",
  "National Geographic",
  "Netflix",
  "TED-Ed",
  "IGN",
  "ESPN",
  "Vox",
  "BBC",
];

function CreatorCard({ creator }: { creator: typeof CREATORS[number] }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 px-6">
      <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${creator.color} text-sm font-bold text-white shadow-lg`}>
        {creator.initials}
      </div>
      <p className="text-sm font-semibold text-white/80 whitespace-nowrap">{creator.name}</p>
      <p className="text-xs text-white/40 whitespace-nowrap">{creator.stat}</p>
    </div>
  );
}

function BrandPill({ name }: { name: string }) {
  return (
    <div className="flex shrink-0 items-center px-8">
      <span className="text-sm font-bold uppercase tracking-widest text-white/25 whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

function CreatorTrack() {
  return (
    <div className="flex shrink-0 animate-marquee items-end gap-2 pr-2">
      {CREATORS.map((c, i) => <CreatorCard key={i} creator={c} />)}
    </div>
  );
}

function BrandTrack() {
  return (
    <div className="flex shrink-0 animate-marquee items-center gap-4 pr-4">
      {BRANDS.map((b, i) => <BrandPill key={i} name={b} />)}
    </div>
  );
}

export function CreatorsMarquee() {
  return (
    <div className="relative border-y border-white/[0.06] bg-white/[0.01] py-8 overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-32 z-10 [background:linear-gradient(to_right,var(--background),transparent)]" />
      <div className="absolute inset-y-0 right-0 w-32 z-10 [background:linear-gradient(to_left,var(--background),transparent)]" />

      {/* Creators row */}
      <div className="mb-6 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <CreatorTrack />
        <CreatorTrack />
      </div>

      {/* Divider */}
      <div className="mx-auto mb-6 w-[80%] border-t border-white/[0.06]" />

      {/* Brands row */}
      <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <BrandTrack />
        <BrandTrack />
        <BrandTrack />
      </div>
    </div>
  );
}
