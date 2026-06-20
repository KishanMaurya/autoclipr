import { baseLayout, h1, p, ctaButton, divider, highlight } from './base';

export interface ClipReadyVars {
  userName: string;
  clipTitle: string;
  clipsCount: number;
  generatedAt: string;
  clipUrl: string;
  appUrl: string;
  supportEmail: string;
}

export function clipReadyTemplate(vars: ClipReadyVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your Clip is Ready 🎬 – "${vars.clipTitle}"`;

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:48px;text-align:center;">🎬</p>
    ${h1(`Your clips are ready, ${highlight(vars.userName)}!`)}
    ${p(`AutoClipr has finished processing <strong style="color:#e5e7eb;">"${vars.clipTitle}"</strong>. ${vars.clipsCount} viral short${vars.clipsCount === 1 ? '' : 's'} with AI-optimised captions ${vars.clipsCount === 1 ? 'is' : 'are'} ready for you to review and download.`)}

    <!-- Stats row -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
      <tr>
        <td width="48%" style="background:#0d0d14;border-radius:10px;border:1px solid #ffffff0a;padding:20px;text-align:center;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:32px;font-weight:800;color:#10b981;">${vars.clipsCount}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Clips generated</p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#0d0d14;border-radius:10px;border:1px solid #ffffff0a;padding:20px;text-align:center;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#e5e7eb;">${vars.generatedAt}</p>
          <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Completed at</p>
        </td>
      </tr>
    </table>

    ${p('Each clip includes a viral score, auto-generated captions, and is optimised for 9:16 vertical format — ready for TikTok, Instagram Reels, and YouTube Shorts.', true)}

    ${ctaButton('▶  View My Clips', vars.clipUrl)}

    ${divider()}

    ${p('Clips are stored in your account. Download them any time from your clips page.', true)}
    `,
    `${vars.clipsCount} new clip${vars.clipsCount === 1 ? '' : 's'} ready from "${vars.clipTitle}"`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `Your Clips are Ready – AutoClipr

Hi ${vars.userName},

Your video "${vars.clipTitle}" has been processed.

Clips generated: ${vars.clipsCount}
Completed at: ${vars.generatedAt}

View your clips: ${vars.clipUrl}

— The AutoClipr Team`;

  return { subject, html, text };
}
