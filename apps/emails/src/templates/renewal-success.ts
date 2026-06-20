import { baseLayout, h1, p, ctaButton, divider, infoTable, highlight } from './base';

export interface RenewalSuccessVars {
  userName: string;
  planName: string;
  amount: string;
  renewalDate: string;
  nextRenewalDate: string;
  transactionId: string;
  dashboardUrl: string;
  appUrl: string;
  supportEmail: string;
}

export function renewalSuccessTemplate(vars: RenewalSuccessVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'AutoClipr Subscription Renewed ✅';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:40px;text-align:center;">✅</p>
    ${h1(`Subscription renewed, ${highlight(vars.userName)}!`)}
    ${p(`Your ${highlight(vars.planName)} subscription has been successfully renewed. Your credits have been refreshed and you\'re all set to keep creating viral clips.`)}

    ${infoTable([
      ['Plan', vars.planName],
      ['Amount charged', vars.amount],
      ['Renewal date', vars.renewalDate],
      ['Next renewal', vars.nextRenewalDate],
      ['Transaction ID', vars.transactionId],
    ])}

    ${ctaButton('Go to Dashboard →', vars.dashboardUrl)}

    ${divider()}

    ${p('If you didn\'t expect this charge or want to cancel, contact us at <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a> within 7 days for a full refund.', true)}
    `,
    `Subscription renewed · ${vars.planName} · ${vars.amount}`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `AutoClipr Subscription Renewed

Hi ${vars.userName},

Your ${vars.planName} subscription has been renewed successfully.

Amount charged: ${vars.amount}
Renewal date: ${vars.renewalDate}
Next renewal: ${vars.nextRenewalDate}
Transaction ID: ${vars.transactionId}

Go to dashboard: ${vars.dashboardUrl}

Questions? Contact ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}
