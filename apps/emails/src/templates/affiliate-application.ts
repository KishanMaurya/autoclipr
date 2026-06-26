import { baseLayout, h1, p, divider, infoTable, highlight, ctaButton } from './base';

export interface AffiliateApplicationVars {
  email: string;
  channelUrl: string;
  refCode: string;
  appUrl: string;
}

/** Sent when a user applies AND is auto-approved — includes their live ref link */
export function affiliateApplicationTemplate(vars: AffiliateApplicationVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "You're approved! Your AutoClipr affiliate link is ready 🎉";
  const refLink = `${vars.appUrl}/?ref=${vars.refCode}`;
  const dashboardUrl = `${vars.appUrl}/dashboard/affiliate`;

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:36px;text-align:center;">🎉</p>
    ${h1(`Welcome to the AutoClipr ${highlight('Affiliate Program')}!`)}
    ${p('Your application has been <strong>instantly approved</strong>. Start sharing your unique referral link right now and earn 30–40% recurring commission on every subscriber you bring in.')}

    ${infoTable([
      ['Your referral link', refLink],
      ['Commission',         '30% (auto-upgrades to 35% → 40%)'],
      ['Cookie window',      '90 days'],
      ['Minimum payout',     '₹1,000'],
    ])}

    <!-- Ref link highlight box -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0a1a12;border-radius:10px;border:1px solid #10b98133;padding:16px 20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#10b981;line-height:1.7;font-family:monospace;word-break:break-all;">
          ${refLink}
        </td>
      </tr>
    </table>

    ${ctaButton('View your affiliate dashboard', dashboardUrl)}

    ${divider()}

    ${p('Commission tiers unlock automatically as your conversions grow:', true)}
    ${infoTable([
      ['Starter (1–5 conversions)',  '30% recurring'],
      ['Growth (6–20 conversions)',  '35% recurring'],
      ['Elite  (21+ conversions)',   '40% recurring'],
    ])}

    ${p('Questions? Reply to this email or reach us at <a href="mailto:support@autoclipr.com" style="color:#10b981;">support@autoclipr.com</a>.', true)}
    `,
    "You're approved! Your AutoClipr affiliate link is ready.",
  ).replace(/\{\{appUrl\}\}/g, vars.appUrl);

  const text = `You're approved! Welcome to the AutoClipr Affiliate Program.

Your referral link: ${refLink}
Dashboard: ${dashboardUrl}

Commission tiers:
• Starter (1–5 conversions): 30% recurring
• Growth  (6–20 conversions): 35% recurring
• Elite   (21+ conversions):  40% recurring

Minimum payout: ₹1,000 via PayPal, UPI, or bank transfer.

Questions? Email support@autoclipr.com.

— The AutoClipr Team`;

  return { subject, html, text };
}

/** Sent from the public marketing page form (before the user has an account) */
export interface AffiliateInquiryVars {
  email: string;
  channelUrl: string;
  appUrl: string;
}

export function affiliateInquiryTemplate(vars: AffiliateInquiryVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Your affiliate inquiry is received — AutoClipr';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:36px;text-align:center;">📬</p>
    ${h1(`We received your ${highlight('affiliate inquiry')}!`)}
    ${p('Thanks for your interest in the AutoClipr Affiliate Program. To get your unique referral link and dashboard access, sign up for a free account and apply from your dashboard.')}

    ${ctaButton('Create free account & apply', `${vars.appUrl}/register`)}

    ${divider()}

    ${p('Already have an account? <a href="' + vars.appUrl + '/dashboard/affiliate" style="color:#10b981;">Apply from your dashboard →</a>', true)}
    ${p('Questions? Reply to this email or reach us at <a href="mailto:support@autoclipr.com" style="color:#10b981;">support@autoclipr.com</a>.', true)}
    `,
    'Thanks for your interest in the AutoClipr Affiliate Program!',
  ).replace(/\{\{appUrl\}\}/g, vars.appUrl);

  const text = `Thanks for your interest in the AutoClipr Affiliate Program!

To get your unique referral link, create a free account and apply from your dashboard:
${vars.appUrl}/register

Already have an account? Apply here: ${vars.appUrl}/dashboard/affiliate

— The AutoClipr Team`;

  return { subject, html, text };
}
