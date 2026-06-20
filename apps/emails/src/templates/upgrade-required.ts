import { baseLayout, h1, p, ctaButton, divider, highlight } from './base';

export interface UpgradeRequiredVars {
  userName: string;
  campaignName: string;
  upgradeUrl: string;
  appUrl: string;
  supportEmail: string;
}

export function upgradeRequiredTemplate(vars: UpgradeRequiredVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Upgrade Required to Activate "${vars.campaignName}"`;

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:40px;text-align:center;">⚡</p>
    ${h1(`Upgrade to activate your campaign`)}
    ${p(`Hi ${highlight(vars.userName)}, your campaign <strong style="color:#e5e7eb;">"${vars.campaignName}"</strong> has been saved — but you need an active subscription to start generating clips.`)}

    <!-- Info box -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f59e0b08;border-radius:10px;border:1px solid #f59e0b25;padding:20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#fbbf24;line-height:1.7;">
          <strong>Your campaign is saved</strong> — it won't be lost. As soon as you upgrade, it'll be ready to run.
        </td>
      </tr>
    </table>

    ${p('With an AutoClipr subscription you get:', true)}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
      ${[
        ['🤖', 'AI-powered viral moment detection'],
        ['✂️', 'Automatic 9:16 short clip generation'],
        ['📝', 'Auto-captions with viral styling'],
        ['📊', 'Viral scores and engagement predictions'],
        ['🚀', 'Priority processing and publishing'],
      ]
        .map(
          ([icon, text]) => `
      <tr>
        <td width="40" style="padding:8px 0;font-size:20px;vertical-align:middle;">${icon}</td>
        <td style="padding:8px 0;font-size:14px;color:#d1d5db;vertical-align:middle;">${text}</td>
      </tr>`,
        )
        .join('')}
    </table>

    ${ctaButton('🚀  Upgrade Now', vars.upgradeUrl)}

    ${divider()}

    ${p('Questions about plans? We\'re happy to help — reach us at <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}
    `,
    `Your campaign "${vars.campaignName}" is saved — upgrade to activate it.`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `Upgrade Required – AutoClipr

Hi ${vars.userName},

Your campaign "${vars.campaignName}" has been saved, but you need an active subscription to generate clips.

Upgrade your plan: ${vars.upgradeUrl}

What you get with a subscription:
- AI-powered viral moment detection
- Automatic 9:16 clip generation
- Auto-captions
- Viral scores and engagement predictions
- Priority processing

Questions? Contact ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}
