import { baseLayout, h1, p, ctaButton, divider, highlight, infoTable } from './base';

export interface VideoRetentionWarningVars {
  userName: string;
  /** How many videos are scheduled for deletion in this notice. */
  videoCount: number;
  /** Titles of the affected videos, already truncated by the caller. */
  videoTitles: string[];
  /** Human-readable date the deletion happens, e.g. "3 March 2026". */
  deletionDate: string;
  upgradeUrl: string;
  appUrl: string;
  supportEmail: string;
}

/**
 * Formal notice that Starter-plan videos are about to be deleted.
 *
 * Deliberately states the exact date and the exact titles: this is the only
 * warning a user gets before the files are gone, so it has to be specific
 * enough to act on, not a generic upgrade nudge.
 */
export function videoRetentionWarningTemplate(vars: VideoRetentionWarningVars): {
  subject: string;
  html: string;
  text: string;
} {
  const plural = vars.videoCount === 1 ? '' : 's';
  const subject = `Action needed: ${vars.videoCount} video${plural} will be deleted on ${vars.deletionDate}`;

  const titleList = vars.videoTitles
    .map((t) => `📹 &nbsp;${escapeHtml(t)}`)
    .join('<br/>');

  const html = baseLayout(
    `
    <p style="margin:0 0 16px;font-size:40px;text-align:center;">⚠️</p>
    ${h1(`Your video${plural} will be deleted on ${highlight(vars.deletionDate)}`)}
    ${p(`Hi ${highlight(vars.userName)}, you're on the free <strong>Starter</strong> plan, which keeps generated videos for 3 days. Unless you upgrade to <strong>Creator</strong>, the video${plural} below will be permanently deleted on <strong style="color:#ef4444;">${vars.deletionDate}</strong>.`)}

    ${infoTable([
      ['Videos affected', String(vars.videoCount)],
      ['Deletion date', vars.deletionDate],
      ['Your plan', 'Starter (free)'],
    ])}

    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#ef444408;border-radius:10px;border:1px solid #ef444420;padding:20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:13px;color:#f87171;line-height:1.9;">
          ${titleList}
        </td>
      </tr>
    </table>

    ${p('Upgrading to Creator keeps every video you generate, with no 3-day limit. If you\'d rather not upgrade, download your files before the date above — deletion is permanent and we cannot restore them.', true)}

    ${ctaButton('Upgrade to Creator →', vars.upgradeUrl)}

    ${divider()}

    ${p('Questions? Reply to this email or contact <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}
    `,
    `${vars.videoCount} video${plural} will be deleted on ${vars.deletionDate} unless you upgrade.`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `AutoClipr — Your video${plural} will be deleted on ${vars.deletionDate}

Hi ${vars.userName},

You're on the free Starter plan, which keeps generated videos for 3 days.
Unless you upgrade to Creator, the following video${plural} will be permanently
deleted on ${vars.deletionDate}:

${vars.videoTitles.map((t) => `  - ${t}`).join('\n')}

Upgrading to Creator keeps every video you generate, with no 3-day limit:
${vars.upgradeUrl}

If you'd rather not upgrade, download your files before that date. Deletion is
permanent and we cannot restore them.

Questions? Contact ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
