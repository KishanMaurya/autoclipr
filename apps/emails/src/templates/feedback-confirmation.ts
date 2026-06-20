import { baseLayout, h1, p, divider, infoTable, highlight } from './base';

export interface FeedbackConfirmationVars {
  userName: string;
  category: string;
  message: string;
  appUrl: string;
  supportEmail: string;
}

export function feedbackConfirmationTemplate(vars: FeedbackConfirmationVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'We received your feedback – AutoClipr';
  const truncated = vars.message.length > 300 ? vars.message.slice(0, 297) + '…' : vars.message;

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:36px;text-align:center;">💬</p>
    ${h1(`Thanks for the feedback, ${highlight(vars.userName)}!`)}
    ${p('We\'ve received your message and our team will review it shortly. We read every submission — your input shapes how AutoClipr evolves.')}

    ${infoTable([
      ['Topic', vars.category],
    ])}

    <!-- Message preview box -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0d0d14;border-radius:10px;border-left:3px solid #10b981;padding:16px 20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#9ca3af;line-height:1.7;font-style:italic;">
          "${truncated}"
        </td>
      </tr>
    </table>

    ${p('For urgent issues — especially billing or account access — you can also reach us directly at <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}

    ${divider()}

    ${p('We typically review feedback within 1–2 business days. No reply is needed from you — we\'ll reach out if we have follow-up questions.', true)}
    `,
    `Got it! We received your feedback and will review it soon.`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `Thanks for your feedback, ${vars.userName}!

We received your message and our team will review it shortly.

Topic: ${vars.category}
Your message: "${truncated}"

For urgent issues contact us at ${vars.supportEmail}.

— The AutoClipr Team`;

  return { subject, html, text };
}
