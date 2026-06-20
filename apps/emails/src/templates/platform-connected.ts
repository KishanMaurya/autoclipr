import { baseLayout, h1, p, highlight, divider, infoTable, ctaButton } from './base';

export interface PlatformConnectedVars {
  userName: string;
  platformName: string;
  accountName: string;
  appUrl: string;
  supportEmail: string;
}

const PLATFORM_ICON: Record<string, string> = {
  'youtube shorts': `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
    <tr><td align="center">
      <svg width="64" height="45" viewBox="0 0 64 45" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="45" rx="12" fill="#FF0000"/>
        <polygon points="26,13 26,32 44,22.5" fill="#FFFFFF"/>
      </svg>
    </td></tr>
  </table>`,
  youtube: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
    <tr><td align="center">
      <svg width="64" height="45" viewBox="0 0 64 45" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="45" rx="12" fill="#FF0000"/>
        <polygon points="26,13 26,32 44,22.5" fill="#FFFFFF"/>
      </svg>
    </td></tr>
  </table>`,
  'instagram reels': `<p style="margin:0 0 16px;font-size:48px;text-align:center;">📸</p>`,
  instagram: `<p style="margin:0 0 16px;font-size:48px;text-align:center;">📸</p>`,
  facebook: `<p style="margin:0 0 16px;font-size:48px;text-align:center;">📘</p>`,
  tiktok: `<p style="margin:0 0 16px;font-size:48px;text-align:center;">🎵</p>`,
};

const PLATFORM_EMOJI: Record<string, string> = {
  'youtube shorts': '▶️',
  youtube: '▶️',
  'instagram reels': '📸',
  instagram: '📸',
  facebook: '📘',
  tiktok: '🎵',
};

export function platformConnectedTemplate(vars: PlatformConnectedVars): {
  subject: string;
  html: string;
  text: string;
} {
  const key = vars.platformName.toLowerCase();
  const emoji = PLATFORM_EMOJI[key] ?? '🔗';
  const icon = PLATFORM_ICON[key] ?? `<p style="margin:0 0 16px;font-size:48px;text-align:center;">🔗</p>`;
  const subject = `${emoji} ${vars.platformName} connected to AutoClipr.ai`;

  const html = baseLayout(
    `
    ${icon}
    ${h1(`${vars.platformName} connected, ${highlight(vars.userName)}!`)}
    ${p(`Your <strong style="color:#e5e7eb;">${vars.platformName}</strong> account has been successfully connected to AutoClipr.ai. You can now automatically post your AI-generated clips to this platform.`)}

    ${infoTable([
      ['Platform', vars.platformName],
      ['Account', vars.accountName],
      ['Status', '✅ Connected & authorized'],
    ])}

    ${p('Ready to start clipping? Head back to the dashboard and generate your first viral clip.')}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
      <tr>
        <td align="center">
          ${ctaButton('Go to Dashboard', `${vars.appUrl}/dashboard`)}
        </td>
      </tr>
    </table>

    ${divider()}

    ${p(`If you didn't connect this account, please contact us at <a href="mailto:${vars.supportEmail}" style="color:#10b981;">${vars.supportEmail}</a> immediately.`, true)}
    `,
    `Your ${vars.platformName} account is now connected — start clipping!`,
  );

  const text = `${vars.platformName} connected, ${vars.userName}!

Your ${vars.platformName} account (${vars.accountName}) has been successfully connected to AutoClipr.ai.

Go to your dashboard: ${vars.appUrl}/dashboard

If you didn't connect this account, contact us at ${vars.supportEmail}.

— The AutoClipr.ai Team`;

  return { subject, html, text };
}
