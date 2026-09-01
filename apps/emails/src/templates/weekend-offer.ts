import { baseLayout, h1, p, ctaButton, divider, highlight } from './base';

export interface WeekendOfferVars {
  userName: string;
  /** The coupon code, taken from the campaign — never hardcoded here. */
  couponCode: string;
  /** e.g. "25% OFF" — derived from the coupon, so 30% or 50% render correctly. */
  offerLabel: string;
  /** Plan the offer applies to, e.g. "Creator". */
  planName: string;
  /** Human-readable expiry, or null when the coupon has none. */
  expiresOn: string | null;
  upgradeUrl: string;
  appUrl: string;
  supportEmail: string;
}

/**
 * Weekend discount offer for users still on the free plan.
 *
 * Every number and code comes from the campaign's coupon. Hardcoding "25%" or
 * "SATURDAY25" here would silently misprice the moment an admin runs a 30% or
 * 50% campaign — the email would advertise one thing and checkout charge
 * another.
 */
export function weekendOfferTemplate(vars: WeekendOfferVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `🎬 Get ${vars.offerLabel} AutoClipr ${vars.planName} this weekend`;

  const expiryLine = vars.expiresOn
    ? `Use it before ${vars.expiresOn}.`
    : 'Use it before the offer ends.';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:40px;text-align:center;">🎬</p>
    ${h1(`Get ${highlight(vars.offerLabel)} this weekend`)}
    ${p(`Hi ${highlight(vars.userName)}, you've been creating with AutoClipr. Ready to take your content to the next level?`)}
    ${p(`Get <strong>${vars.offerLabel} AutoClipr ${vars.planName}</strong> — more clips, longer videos, and no 3-day limit on what you generate.`)}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#10b98108;border-radius:12px;border:1px solid #10b98130;padding:24px;margin:0 0 28px;">
      <tr>
        <td align="center">
          <p style="margin:0 0 10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#6ee7b7;">Your coupon code</p>
          <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:3px;color:#ffffff;">${escapeHtml(vars.couponCode)}</p>
        </td>
      </tr>
    </table>

    ${p(expiryLine, true)}

    ${ctaButton(`Upgrade to ${vars.planName} →`, vars.upgradeUrl)}

    ${divider()}

    ${p('Happy clipping! 🎬', true)}
    ${p('Questions? Reply to this email or contact <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}
    `,
    `${vars.offerLabel} AutoClipr ${vars.planName} this weekend — code ${vars.couponCode}.`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `AutoClipr — ${vars.offerLabel} this weekend

Hi ${vars.userName},

You've been creating with AutoClipr. Ready to take your content creation to
the next level?

Get ${vars.offerLabel} AutoClipr ${vars.planName}.

Your coupon code:

    ${vars.couponCode}

${expiryLine}

Upgrade here: ${vars.upgradeUrl}

Happy clipping! 🎬

— The AutoClipr Team

Questions? Contact ${vars.supportEmail}`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
