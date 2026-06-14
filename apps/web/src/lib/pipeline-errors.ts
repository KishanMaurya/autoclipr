/** User-facing message for failed video pipeline jobs. */
export function formatPipelineError(raw?: string | null): string {
  if (!raw?.trim()) {
    return "Processing failed. Please try again in a moment.";
  }

  if (/ThrottlerException|Too Many Requests|TOO_MANY_REQUESTS/i.test(raw)) {
    return "Too many status checks. Please wait a few seconds and click Try again.";
  }

  if (/sign in to confirm|not a bot|bot check|YTDLP_COOKIES/i.test(raw)) {
    return (
      "YouTube blocked the download from our server. Upload the MP4 directly, " +
      "or try again in a few hours."
    );
  }

  if (/caption burn skipped|without burned captions/i.test(raw)) {
    return raw;
  }

  const withoutBanner = raw
    .replace(
      /(?:ffmpeg|ffprobe) version[\s\S]*?(?=Input #|\[[\w ]+\]|Error|Invalid|Unable|No such|Could not|Conversion failed|fontconfig|libass|Subtitle)/i,
      "",
    )
    .replace(/built with gcc[\s\S]*?(?=Input #|Error|Invalid|Unable|--enable-)/i, "")
    .replace(/configuration:[\s\S]*?(?=Input #|Error|Invalid|Unable)/i, "")
    .replace(/--enable-[\w-]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const message = withoutBanner || raw;
  if (message.length <= 280) return message;

  return `${message.slice(0, 277).trim()}…`;
}
