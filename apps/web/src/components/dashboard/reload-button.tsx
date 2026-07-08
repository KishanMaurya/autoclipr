"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** When true, show a subtle pulsing dot hinting that new data may be available */
  hasProcessing?: boolean;
}

export function ReloadButton({ hasProcessing = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [spun, setSpun] = useState(false);

  const refresh = useCallback(() => {
    setSpun(true);
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setSpun(false), 700);
  }, [router]);

  return (
    <div className="relative">
      {/* Pulse dot — visible only when videos are processing */}
      {hasProcessing && !isPending && (
        <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={refresh}
        disabled={isPending}
        className="gap-2 text-muted-foreground hover:text-foreground"
        aria-label="Reload clips"
      >
        <RefreshCw
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-500",
            (isPending || spun) && "animate-spin"
          )}
        />
        {isPending ? "Refreshing…" : "Reload"}
      </Button>
    </div>
  );
}
