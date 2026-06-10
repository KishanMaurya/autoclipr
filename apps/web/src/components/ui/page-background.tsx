import { cn } from "@/lib/utils";

type PageBackgroundProps = {
  variant?: "marketing" | "auth" | "dashboard";
  className?: string;
};

export function PageBackground({ variant = "marketing", className }: PageBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}
    >
      <div className="absolute inset-0 bg-[#030014]" />
      <div className="absolute inset-0 bg-mesh opacity-90" />

      {variant === "marketing" && (
        <>
          <div className="orb orb-violet -left-32 top-0 h-[520px] w-[520px]" />
          <div className="orb orb-pink right-0 top-1/4 h-[480px] w-[480px] animation-delay-2000" />
          <div className="orb orb-orange bottom-0 left-1/3 h-[400px] w-[400px] animation-delay-4000" />
        </>
      )}

      {variant === "auth" && (
        <>
          <div className="orb orb-violet left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2" />
          <div className="orb orb-pink bottom-0 right-0 h-[400px] w-[400px]" />
        </>
      )}

      {variant === "dashboard" && (
        <>
          <div className="orb orb-violet -left-40 top-20 h-[360px] w-[360px] opacity-40" />
          <div className="orb orb-cyan bottom-0 right-0 h-[320px] w-[320px] opacity-30" />
        </>
      )}

      <div className="absolute inset-0 bg-grid opacity-[0.35]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030014]/80" />
    </div>
  );
}
