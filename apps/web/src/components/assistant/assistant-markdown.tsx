import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown renderer for assistant replies.
 *
 * Hand-rolled rather than pulling in react-markdown: the assistant only emits
 * six constructs, and this never produces raw HTML — every node is a React
 * element built from matched text, so a reply containing markup renders as
 * characters instead of executing. A general HTML-producing renderer would
 * need sanitising on top.
 */
export function AssistantMarkdown({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => (
        <Block key={i} text={block} />
      ))}
    </div>
  );
}

function Block({ text }: { text: string }) {
  const lines = text.split("\n");

  // Heading — ##, ###
  const heading = /^(#{1,4})\s+(.*)$/.exec(lines[0] ?? "");
  if (heading && lines.length === 1) {
    return (
      <p className="text-[13px] font-semibold text-white">{inline(heading[2])}</p>
    );
  }

  // Bulleted list
  if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
    return (
      <ul className="space-y-1 pl-1">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
            <span>{inline(l.replace(/^\s*[-*]\s+/, ""))}</span>
          </li>
        ))}
      </ul>
    );
  }

  // Numbered list
  if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
    return (
      <ol className="space-y-1 pl-1">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed">
            <span className="shrink-0 font-medium text-emerald-400">{i + 1}.</span>
            <span>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <p className="text-[13px] leading-relaxed">
      {lines.map((l, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {inline(l)}
        </Fragment>
      ))}
    </p>
  );
}

/**
 * Inline constructs, matched in one pass so a link's label can still be bold
 * without the patterns fighting over the same characters.
 */
function inline(text: string): ReactNode[] {
  const pattern =
    /(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)/g;

  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));

    if (match[1]) {
      const href = match[3];
      // Only http(s) and site-relative links are rendered as links; anything
      // else (javascript:, data:) falls through as plain text.
      out.push(
        <a
          key={key++}
          href={href}
          target={href.startsWith("/") ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        >
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      out.push(
        <strong key={key++} className="font-semibold text-white">
          {match[5]}
        </strong>,
      );
    } else if (match[6]) {
      out.push(
        <code
          key={key++}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px] text-emerald-300"
        >
          {match[7]}
        </code>,
      );
    }

    last = pattern.lastIndex;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}
