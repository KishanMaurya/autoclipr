import { baseLayout, h1, p, highlight, divider, infoTable, button } from './base';

export interface PlatformConnectedVars {
  userName: string;
  platformName: string;
  accountName: string;
  appUrl: string;
  supportEmail: string;
}

const PLATFORM_EMOJI: Record<string, string> = {
  youtube: '▶️',
  instagram: '📸',
  facebook: '📘',
  tiktok: '🎵',
};

export function platformConnectedTemplate(vars: PlatformConnectedVars): {
  subject: string;
  html: string;
  text: string;
} {
  const emoji = PLATFORM_EMOJI[vars.platformName.toLowerCase()] ?? '🔗';
  const subject = `${emoji} ${vars.platformName} connected to AutoClipr.ai`;

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:36px;text-align:center;">${emoji}</p>
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
          ${button('Go to Dashboard', `${vars.appUrl}/dashboard`)}
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
