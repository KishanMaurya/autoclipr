import { baseLayout, h1, p, ctaButton, divider, infoTable, highlight } from './base';

export interface SubscriptionConfirmedVars {
  userName: string;
  planName: string;
  amount: string;
  billingCycle: string;
  renewalDate: string;
  subscriptionId: string;
  dashboardUrl: string;
  appUrl: string;
  supportEmail: string;
}

export function subscriptionConfirmedTemplate(vars: SubscriptionConfirmedVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Subscription Confirmed – AutoClipr';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:40px;text-align:center;">🎉</p>
    ${h1(`You're subscribed, ${highlight(vars.userName)}!`)}
    ${p(`Thank you for subscribing to the ${highlight(vars.planName)} plan. Your account is now fully unlocked and ready to create viral short-form clips at scale.`)}

    ${infoTable([
      ['Plan', vars.planName],
      ['Billing cycle', vars.billingCycle],
      ['Amount', vars.amount],
      ['Next renewal', vars.renewalDate],
      ['Subscription ID', vars.subscriptionId],
    ])}

    ${p('Your credits have been added to your account. Head to the dashboard to start importing videos and generating clips.', true)}

    ${ctaButton('Go to Dashboard →', vars.dashboardUrl)}

    ${divider()}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0d0d14;border-radius:10px;border:1px solid #10b98118;padding:20px;margin:0 0 20px;">
      <tr>
        <td style="font-size:13px;color:#9ca3af;line-height:1.7;">
          <strong style="color:#e5e7eb;">What's included in your plan:</strong><br/>
          ✅ &nbsp;AI-powered viral moment detection<br/>
          ✅ &nbsp;Auto-captions with viral styling<br/>
          ✅ &nbsp;9:16 clip export for TikTok, Reels & Shorts<br/>
          ✅ &nbsp;Priority processing queue<br/>
          ✅ &nbsp;Premium support
        </td>
      </tr>
    </table>

    ${p('Questions about your subscription? Reach us at <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}
    `,
    `Subscription confirmed! ${vars.planName} · ${vars.amount} · Renews ${vars.renewalDate}`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `Subscription Confirmed – AutoClipr

Hi ${vars.userName},

Thank you for subscribing to the ${vars.planName} plan!

Plan: ${vars.planName}
Billing cycle: ${vars.billingCycle}
Amount: ${vars.amount}
Next renewal: ${vars.renewalDate}
Subscription ID: ${vars.subscriptionId}

Head to your dashboard to start creating clips: ${vars.dashboardUrl}

Questions? Contact ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}
