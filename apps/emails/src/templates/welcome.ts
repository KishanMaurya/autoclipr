import { baseLayout, h1, p, ctaButton, divider, highlight } from './base';

export interface WelcomeVars {
  userName: string;
  dashboardUrl: string;
  supportEmail: string;
  appUrl: string;
}

export function welcomeTemplate(vars: WelcomeVars): { subject: string; html: string; text: string } {
  const subject = 'Welcome to AutoClipr 🚀';

  const html = baseLayout(
    `
    ${h1(`Welcome aboard, ${highlight(vars.userName)}! 🚀`)}
    ${p('You\'re now part of AutoClipr — the AI-powered platform that turns your long-form videos into viral short clips for TikTok, Instagram Reels, and YouTube Shorts.')}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
      <tr>
        <td width="48%" style="background:#0d0d14;border-radius:10px;border:1px solid #10b98120;padding:20px;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:22px;">🎬</p>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#e5e7eb;">Paste a URL</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">YouTube, Vimeo, Loom, or direct MP4 — we handle the rest.</p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#0d0d14;border-radius:10px;border:1px solid #6366f120;padding:20px;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:22px;">✂️</p>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#e5e7eb;">AI clips it</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">Our AI finds the best hooks and cuts the perfect 9:16 clips.</p>
        </td>
      </tr>
      <tr><td colspan="3" height="12"></td></tr>
      <tr>
        <td width="48%" style="background:#0d0d14;border-radius:10px;border:1px solid #f59e0b20;padding:20px;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:22px;">📝</p>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#e5e7eb;">Auto-captions</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">Viral-style captions burned in — ready for every platform.</p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#0d0d14;border-radius:10px;border:1px solid #ef444420;padding:20px;vertical-align:top;">
          <p style="margin:0 0 6px;font-size:22px;">📤</p>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#e5e7eb;">Export & publish</p>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">Download your clips or publish directly to your channels.</p>
        </td>
      </tr>
    </table>

    ${ctaButton('Go to Dashboard →', vars.dashboardUrl)}

    ${divider()}

    ${p('Need help getting started? Reply to this email or reach us at <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a> — we\'re happy to help.', true)}
    `,
    'Welcome to AutoClipr! Your AI video clips platform is ready.',
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `Welcome to AutoClipr, ${vars.userName}!

You're now part of AutoClipr — the AI-powered platform that turns your long-form videos into viral short clips.

Get started by visiting your dashboard: ${vars.dashboardUrl}

What you can do:
- Paste a YouTube, Vimeo, or Loom URL
- AI finds the best moments and cuts 9:16 clips
- Auto-captions burned in
- Export and publish to your channels

Need help? Contact us at ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}
