"use client";

const CREATORS = [
  { name: "Ali Abdaal", stat: "420M Views", seed: "ali-abdaal", emoji: "👨‍💻" },
  { name: "MrBeast", stat: "40B Views", seed: "mrbeast", emoji: "🤑" },
  { name: "Chad Wild Clay", stat: "7B Views", seed: "chad-wild", emoji: "🕵️" },
  { name: "Think Media", stat: "350M Views", seed: "think-media", emoji: "🎬" },
  { name: "SB737", stat: "1B Views", seed: "sb737", emoji: "⛏️" },
  { name: "Masha and Bear", stat: "52.6M Subs", seed: "masha-bear", emoji: "🐻" },
  { name: "Jordan Matter", stat: "31.7M Subs", seed: "jordan-matter", emoji: "📸" },
  { name: "Preston", stat: "31.3M Subs", seed: "preston", emoji: "🎮" },
  { name: "Veritasium", stat: "18B Views", seed: "veritasium", emoji: "🔬" },
  { name: "Kurzgesagt", stat: "2B Views", seed: "kurzgesagt", emoji: "🌌" },
];

const BRANDS = [
  { name: "Microsoft", emoji: "🪟" },
  { name: "National Geographic", emoji: "🌍" },
  { name: "Netflix", emoji: "🎬" },
  { name: "TED-Ed", emoji: "🎓" },
  { name: "IGN", emoji: "🎮" },
  { name: "ESPN", emoji: "🏆" },
  { name: "Vox", emoji: "📰" },
  { name: "BBC", emoji: "📺" },
  { name: "BattleBots", emoji: "🤖" },
  { name: "GeForce GTX", emoji: "⚡" },
];

function CreatorCard({ creator }: { creator: typeof CREATORS[number] }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 px-5">
      <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-[#0d0d18]">
        <img
          src={`https://api.dicebear.com/9.x/personas/svg?seed=${creator.seed}&backgroundColor=0d0d18`}
          alt={creator.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Emoji overlay badge */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d0d18] text-[10px] border border-white/10">
          {creator.emoji}
        </span>
      </div>
      <p className="text-xs font-semibold text-white/80 whitespace-nowrap">{creator.name}</p>
      <p className="text-[10px] text-white/35 whitespace-nowrap">{creator.stat}</p>
    </div>
  );
}

function BrandPill({ brand }: { brand: typeof BRANDS[number] }) {
  return (
    <div className="flex shrink-0 items-center gap-2 px-6">
      <span className="text-base">{brand.emoji}</span>
      <span className="text-xs font-bold uppercase tracking-widest text-white/20 whitespace-nowrap">
        {brand.name}
      </span>
    </div>
  );
}

function CreatorTrack() {
  return (
    <div className="flex shrink-0 animate-marquee items-end gap-1 pr-1">
      {CREATORS.map((c, i) => <CreatorCard key={i} creator={c} />)}
    </div>
  );
}

function BrandTrack() {
  return (
    <div className="flex shrink-0 animate-marquee-reverse items-center gap-2 pr-2">
      {BRANDS.map((b, i) => <BrandPill key={i} brand={b} />)}
    </div>
  );
}

export function CreatorsMarquee() {
  return (
    <div className="relative border-y border-white/[0.06] bg-white/[0.01] py-8 overflow-hidden">
      <div className="mx-auto max-w-5xl overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 [background:linear-gradient(to_right,hsl(var(--background)),transparent)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 [background:linear-gradient(to_left,hsl(var(--background)),transparent)]" />

        {/* Creators row — left to right scroll */}
        <div className="mb-6 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <CreatorTrack />
          <CreatorTrack />
        </div>

        <div className="mx-4 mb-6 border-t border-white/[0.06]" />

        {/* Brands row — right to left scroll */}
        <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <BrandTrack />
          <BrandTrack />
          <BrandTrack />
        </div>
      </div>
    </div>
  );
}
