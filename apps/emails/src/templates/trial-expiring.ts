import { baseLayout, h1, p, ctaButton, divider, highlight, infoTable } from './base';

export interface TrialExpiringVars {
  userName: string;
  daysLeft: number;
  expiryDate: string;
  upgradeUrl: string;
  appUrl: string;
  supportEmail: string;
}

export function trialExpiringTemplate(vars: TrialExpiringVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your AutoClipr trial expires in ${vars.daysLeft} day${vars.daysLeft === 1 ? '' : 's'} ⏰`;

  const urgencyColor = vars.daysLeft <= 1 ? '#ef4444' : vars.daysLeft <= 2 ? '#f59e0b' : '#10b981';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:40px;text-align:center;">⏰</p>
    ${h1(`Trial ending in ${highlight(vars.daysLeft + ' day' + (vars.daysLeft === 1 ? '' : 's'))}`)}
    ${p(`Hi ${highlight(vars.userName)}, your AutoClipr free trial expires on <strong style="color:${urgencyColor};">${vars.expiryDate}</strong>. Upgrade now to keep creating viral clips without interruption.`)}

    ${infoTable([
      ['Days remaining', `${vars.daysLeft} day${vars.daysLeft === 1 ? '' : 's'}`],
      ['Trial ends', vars.expiryDate],
    ])}

    ${p('After your trial ends, you\'ll lose access to:', true)}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ef444408;border-radius:10px;border:1px solid #ef444420;padding:20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#f87171;line-height:1.9;">
          ❌ &nbsp;Video import and processing<br/>
          ❌ &nbsp;AI clip generation<br/>
          ❌ &nbsp;Caption generation<br/>
          ❌ &nbsp;Your saved clips (stored but not accessible)
        </td>
      </tr>
    </table>

    ${ctaButton('Upgrade Before It Expires →', vars.upgradeUrl)}

    ${divider()}

    ${p('Questions? Reply to this email or contact <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}
    `,
    `Your trial ends in ${vars.daysLeft} day${vars.daysLeft === 1 ? '' : 's'} — upgrade to keep access.`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `AutoClipr Trial Expiring Soon

Hi ${vars.userName},

Your AutoClipr trial expires in ${vars.daysLeft} day${vars.daysLeft === 1 ? '' : 's'} on ${vars.expiryDate}.

Upgrade now to keep creating viral clips: ${vars.upgradeUrl}

After expiry you'll lose access to video processing, clip generation, and captions.

Questions? Contact ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}
