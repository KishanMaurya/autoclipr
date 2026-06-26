import { Construction } from "lucide-react";

export function ComingSoon({ section }: { section: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Construction className="h-12 w-12 text-white/20" />
      <h1 className="text-2xl font-bold text-white">{section}</h1>
      <p className="text-sm text-white/35 max-w-sm">This section is being built. Full data tracking will be available once event logging is set up.</p>
    </div>
  );
}
