import { baseLayout, h1, p, divider, infoTable, highlight, ctaButton } from './base';

export interface AffiliateApplicationVars {
  email: string;
  channelUrl: string;
  appUrl: string;
}

export function affiliateApplicationTemplate(vars: AffiliateApplicationVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Your affiliate application is received — AutoClipr';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:36px;text-align:center;">🎉</p>
    ${h1(`Application received, ${highlight('you\'re in the queue')}!`)}
    ${p('Thanks for applying to the AutoClipr Affiliate Program. Our team reviews every application within <strong>24–48 hours</strong>.')}

    ${infoTable([
      ['Email submitted', vars.email],
      ['Channel / Blog',  vars.channelUrl],
      ['Commission',      '30–40% recurring'],
      ['Cookie window',   '90 days'],
    ])}

    ${p('Once approved you\'ll receive a second email with your unique referral link, access to your affiliate dashboard, and a free Pro account to create demos.', true)}

    ${ctaButton('Learn more about the program', `${vars.appUrl}/affiliate`)}

    ${divider()}

    ${p('Questions? Reply to this email or reach us at <a href="mailto:support@autoclipr.com" style="color:#10b981;">support@autoclipr.com</a>.', true)}
    `,
    'Thanks for applying to the AutoClipr Affiliate Program!',
  ).replace(/\{\{appUrl\}\}/g, vars.appUrl);

  const text = `Application received!

Thanks for applying to the AutoClipr Affiliate Program.

We review applications within 24–48 hours. Once approved you'll get:
• Your unique referral link
• Access to your affiliate dashboard
• A free Pro account to create demos

Details submitted:
Email: ${vars.email}
Channel: ${vars.channelUrl}

Learn more: ${vars.appUrl}/affiliate

— The AutoClipr Team`;

  return { subject, html, text };
}
