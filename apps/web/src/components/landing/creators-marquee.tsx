"use client";

const CREATORS = [
  { name: "Ali Abdaal", stat: "420M Views", img: "https://unavatar.io/youtube/aliabdaal", emoji: "👨‍💻" },
  { name: "MrBeast", stat: "40B Views", img: "https://unavatar.io/youtube/MrBeast6000", emoji: "🤑" },
  { name: "Chad Wild Clay", stat: "7B Views", img: "https://unavatar.io/youtube/ChadWildClay", emoji: "🕵️" },
  { name: "Think Media", stat: "350M Views", img: "https://unavatar.io/youtube/ThinkMediaTV", emoji: "🎬" },
  { name: "SB737", stat: "1B Views", img: "https://unavatar.io/youtube/SB737", emoji: "⛏️" },
  { name: "Jordan Matter", stat: "31.7M Subs", img: "https://unavatar.io/youtube/JordanMatter", emoji: "📸" },
  { name: "Preston", stat: "31.3M Subs", img: "https://unavatar.io/youtube/PrestonPlayz", emoji: "🎮" },
  { name: "Veritasium", stat: "18B Views", img: "https://unavatar.io/youtube/veritasium", emoji: "🔬" },
  { name: "Kurzgesagt", stat: "2B Views", img: "https://unavatar.io/youtube/inanutshell", emoji: "🌌" },
  { name: "Mark Rober", stat: "800M Views", img: "https://unavatar.io/youtube/MarkRober", emoji: "🚀" },
];

function MicrosoftLogo() {
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
      <rect x="13" y="0" width="11" height="11" fill="#7FBA00"/>
      <rect x="0" y="13" width="11" height="11" fill="#00A4EF"/>
      <rect x="13" y="13" width="11" height="11" fill="#FFB900"/>
      <text x="30" y="17" fontFamily="sans-serif" fontSize="13" fontWeight="600" fill="white" opacity="0.4">Microsoft</text>
    </svg>
  );
}

function NetflixLogo() {
  return (
    <svg width="60" height="28" viewBox="0 0 60 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2L4 26L10 24.5L10 16L16 26L22 24.5V2H16V12L10 2H4Z" fill="#E50914" opacity="0.7"/>
    </svg>
  );
}

function BBCLogo() {
  return (
    <svg width="72" height="26" viewBox="0 0 72 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="1" width="22" height="24" rx="2" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.5"/>
      <text x="4" y="18" fontFamily="serif" fontSize="14" fontWeight="900" fill="white" opacity="0.35">BBC</text>
      <rect x="25" y="1" width="22" height="24" rx="2" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.5"/>
      <text x="29.5" y="18" fontFamily="serif" fontSize="14" fontWeight="900" fill="white" opacity="0.35">BBC</text>
    </svg>
  );
}

function TEDLogo() {
  return (
    <svg width="58" height="26" viewBox="0 0 58 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="58" height="26" rx="4" fill="#E62B1E" opacity="0.7"/>
      <text x="5" y="19" fontFamily="sans-serif" fontSize="15" fontWeight="900" fill="white">TED</text>
    </svg>
  );
}

function IGNLogo() {
  return (
    <svg width="48" height="26" viewBox="0 0 48 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="48" height="26" rx="4" fill="#CC0000" opacity="0.7"/>
      <text x="8" y="19" fontFamily="sans-serif" fontSize="14" fontWeight="900" fill="white">IGN</text>
    </svg>
  );
}

function ESPNLogo() {
  return (
    <svg width="64" height="26" viewBox="0 0 64 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="64" height="26" rx="4" fill="#CC0000" opacity="0.7"/>
      <text x="7" y="19" fontFamily="sans-serif" fontSize="14" fontWeight="900" fill="white">ESPN</text>
    </svg>
  );
}

function NatGeoLogo() {
  return (
    <svg width="100" height="26" viewBox="0 0 100 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="2" width="20" height="22" fill="#FFCC00" opacity="0.8"/>
      <text x="26" y="18" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill="white" opacity="0.35" letterSpacing="1">NAT GEO</text>
    </svg>
  );
}

function VoxLogo() {
  return (
    <svg width="48" height="26" viewBox="0 0 48 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="2" y="20" fontFamily="sans-serif" fontSize="22" fontWeight="900" fill="white" opacity="0.35">Vox</text>
    </svg>
  );
}

function BattleBotsLogo() {
  return (
    <svg width="100" height="26" viewBox="0 0 100 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="19" fontFamily="sans-serif" fontSize="13" fontWeight="900" fill="white" opacity="0.3" letterSpacing="1">BATTLEBOTS</text>
    </svg>
  );
}

function GeforceLogo() {
  return (
    <svg width="90" height="26" viewBox="0 0 90 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 13 C4 6 9 2 16 2 C20 2 23 4 25 7 L20 7 C19 5.5 17.5 5 16 5 C11 5 7.5 8.5 7.5 13 C7.5 17.5 11 21 16 21 C19 21 21.5 19.5 23 17 L16 17 L16 14 L26 14 L26 22 C23.5 24.5 20 26 16 26 C9 26 4 20 4 13Z" fill="#76B900" opacity="0.7"/>
      <text x="30" y="18" fontFamily="sans-serif" fontSize="11" fontWeight="700" fill="white" opacity="0.35" letterSpacing="0.5">GEFORCE</text>
    </svg>
  );
}

const BRAND_LOGOS = [
  { key: "microsoft", Logo: MicrosoftLogo },
  { key: "natgeo", Logo: NatGeoLogo },
  { key: "netflix", Logo: NetflixLogo },
  { key: "ted", Logo: TEDLogo },
  { key: "ign", Logo: IGNLogo },
  { key: "espn", Logo: ESPNLogo },
  { key: "vox", Logo: VoxLogo },
  { key: "bbc", Logo: BBCLogo },
  { key: "battlebots", Logo: BattleBotsLogo },
  { key: "geforce", Logo: GeforceLogo },
];

function CreatorCard({ creator }: { creator: typeof CREATORS[number] }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 px-5">
      <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-[#0d0d18]">
        <img
          src={creator.img}
          alt={creator.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#0d0d18] text-[10px] border border-white/10">
          {creator.emoji}
        </span>
      </div>
      <p className="text-xs font-semibold text-white/80 whitespace-nowrap">{creator.name}</p>
      <p className="text-[10px] text-white/35 whitespace-nowrap">{creator.stat}</p>
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
    <div className="flex shrink-0 animate-marquee-reverse items-center gap-8 pr-8">
      {BRAND_LOGOS.map(({ key, Logo }) => (
        <div key={key} className="flex shrink-0 items-center">
          <Logo />
        </div>
      ))}
    </div>
  );
}

export function CreatorsMarquee() {
  return (
    <div className="relative border-y border-white/[0.06] bg-white/[0.01] py-8 overflow-hidden">
      <div className="mx-auto max-w-5xl overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 [background:linear-gradient(to_right,hsl(var(--background)),transparent)]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 [background:linear-gradient(to_left,hsl(var(--background)),transparent)]" />

        {/* Creators row — scrolls left */}
        <div className="mb-6 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <CreatorTrack />
          <CreatorTrack />
        </div>

        <div className="mx-4 mb-6 border-t border-white/[0.06]" />

        {/* Brand logos row — scrolls right */}
        <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <BrandTrack />
          <BrandTrack />
          <BrandTrack />
        </div>
      </div>
    </div>
  );
}
