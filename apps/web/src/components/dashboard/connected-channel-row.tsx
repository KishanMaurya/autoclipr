import { Check, ExternalLink, Info, Loader2, Trash2, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { YoutubeChannel } from "@/lib/api";
import { formatConnectedDate } from "@/lib/utils";

type ConnectedChannelRowProps = {
  channel: YoutubeChannel;
  onRemove?: (id: string) => void;
  removing?: boolean;
};

export function ConnectedChannelRow({
  channel,
  onRemove,
  removing,
}: ConnectedChannelRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Youtube className="h-5 w-5 shrink-0 text-red-500" />
        <div className="min-w-0">
          <p className="font-semibold">{channel.channel_name}</p>
          <p className="truncate text-xs text-muted-foreground">{channel.channel_url}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Connected {formatConnectedDate(channel.created_at)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="success" className="border-0">
          <Check className="mr-1 h-3 w-3" />
          active
        </Badge>
        <a
          href={channel.channel_url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
          aria-label="Open channel"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(channel.id)}
            disabled={removing}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-red-400 disabled:opacity-50"
            aria-label="Remove channel"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function ConnectedChannelsHeading({ count }: { count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <p className="text-sm font-semibold">Connected Channels</p>
      <Info
        className="h-3.5 w-3.5 text-muted-foreground"
        aria-label="AutoClipr monitors these channels for new uploads"
      />
      {count > 0 && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
