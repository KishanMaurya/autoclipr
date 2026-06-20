import { baseLayout, h1, p, highlight, divider, infoTable } from './base';

export interface AccountDeletedVars {
  userName: string;
  email: string;
  appUrl: string;
  supportEmail: string;
}

export function accountDeletedTemplate(vars: AccountDeletedVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Your AutoClipr.ai account has been deleted';

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:36px;text-align:center;">👋</p>
    ${h1(`Goodbye, ${highlight(vars.userName)}`)}
    ${p('Your AutoClipr.ai account and all associated data have been permanently deleted. This includes your clips, videos, connected platforms, and billing information.')}

    ${infoTable([
      ['Account', vars.email],
      ['Status', 'Permanently deleted'],
    ])}

    ${p('If you deleted your account by mistake or have any questions, please contact us within <strong style="color:#e5e7eb;">24 hours</strong> and we\'ll do our best to help.')}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#7f1d1d22;border-radius:10px;border-left:3px solid #ef4444;padding:16px 20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#fca5a5;line-height:1.7;">
          ⚠️ &nbsp;This action is <strong>irreversible</strong>. Your data cannot be recovered after deletion.
        </td>
      </tr>
    </table>

    ${divider()}

    ${p(`Need help or think this was a mistake? Email us at <a href="mailto:${vars.supportEmail}" style="color:#10b981;">${vars.supportEmail}</a> as soon as possible.`, true)}
    `,
    'Your AutoClipr.ai account has been permanently deleted.',
  );

  const text = `Goodbye, ${vars.userName}

Your AutoClipr.ai account (${vars.email}) has been permanently deleted along with all your clips, videos, and connected platforms.

If this was a mistake, contact us at ${vars.supportEmail} within 24 hours.

— The AutoClipr.ai Team`;

  return { subject, html, text };
}
