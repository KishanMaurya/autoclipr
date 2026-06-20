import { baseLayout, h1, p, divider, infoTable, highlight } from './base';

export interface ContactConfirmationVars {
  userName: string;
  category: string;
  message: string;
  appUrl: string;
  supportEmail: string;
}

export function contactConfirmationTemplate(vars: ContactConfirmationVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'We got your message – AutoClipr';
  const truncated = vars.message.length > 300 ? vars.message.slice(0, 297) + '…' : vars.message;

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:36px;text-align:center;">📩</p>
    ${h1(`Message received, ${highlight(vars.userName)}!`)}
    ${p('Thanks for reaching out. A member of our team will get back to you as soon as possible — we aim to reply within <strong style="color:#e5e7eb;">1–2 business days</strong>.')}

    ${infoTable([
      ['Topic', vars.category],
    ])}

    <!-- Message preview -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0d0d14;border-radius:10px;border-left:3px solid #6366f1;padding:16px 20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#9ca3af;line-height:1.7;font-style:italic;">
          "${truncated}"
        </td>
      </tr>
    </table>

    <!-- What to expect -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#6366f108;border-radius:10px;border:1px solid #6366f120;padding:20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#c4b5fd;line-height:1.9;">
          <strong style="color:#e5e7eb;">What happens next:</strong><br/>
          ✉️ &nbsp;We'll reply to this email address<br/>
          ⏰ &nbsp;Response within 1–2 business days<br/>
          🔍 &nbsp;For billing issues we may ask for your account details
        </td>
      </tr>
    </table>

    ${divider()}

    ${p('If your issue is urgent, you can also email us directly at <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}
    `,
    `We received your message and will reply within 1–2 business days.`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `Message received, ${vars.userName}!

Thanks for reaching out. We'll reply within 1–2 business days.

Topic: ${vars.category}
Your message: "${truncated}"

We'll reply to this email address. For urgent issues: ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}
