import { baseLayout, h1, p, ctaButton, divider, infoTable, highlight } from './base';

export interface PaymentFailedVars {
  userName: string;
  planName: string;
  amount: string;
  failedAt: string;
  retryDate: string;
  updatePaymentUrl: string;
  appUrl: string;
  supportEmail: string;
}

export function paymentFailedTemplate(vars: PaymentFailedVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Action Required: AutoClipr Payment Failed ⚠️';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:40px;text-align:center;">⚠️</p>
    ${h1(`Payment failed, ${highlight(vars.userName)}`)}
    ${p(`We were unable to process your payment for the ${highlight(vars.planName)} plan. Please update your payment method to avoid interruption to your service.`)}

    <!-- Warning box -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ef444408;border-radius:10px;border:1px solid #ef444425;padding:20px;margin:0 0 24px;">
      <tr>
        <td style="font-size:13px;color:#f87171;line-height:1.7;">
          <strong>What happens next:</strong><br/>
          We will automatically retry the charge on <strong>${vars.retryDate}</strong>. If the retry also fails, your subscription will be paused and you will lose access to clip generation.
        </td>
      </tr>
    </table>

    ${infoTable([
      ['Plan', vars.planName],
      ['Amount', vars.amount],
      ['Failed at', vars.failedAt],
      ['Retry date', vars.retryDate],
    ])}

    ${ctaButton('Update Payment Method →', vars.updatePaymentUrl)}

    ${divider()}

    ${p('Common reasons for failure: card expired, insufficient funds, or bank security block. If you\'re having trouble, contact <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a> — we\'ll sort it out.', true)}
    `,
    'Action required: your AutoClipr payment failed. Update your payment method to keep access.',
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `AutoClipr Payment Failed

Hi ${vars.userName},

We were unable to process your payment for the ${vars.planName} plan.

Amount: ${vars.amount}
Failed at: ${vars.failedAt}
Retry date: ${vars.retryDate}

Update your payment method: ${vars.updatePaymentUrl}

If the retry fails your subscription will be paused. Contact ${vars.supportEmail} if you need help.

— The AutoClipr Team`;

  return { subject, html, text };
}
