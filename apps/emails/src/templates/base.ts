export function baseLayout(content: string, previewText = ''): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>AutoClipr</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-text-size-adjust: 100%; }
    table { border-collapse: collapse; }
    a { color: #10b981; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { border: 0; display: block; max-width: 100%; }
    .btn { display: inline-block; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 16px; text-align: center; text-decoration: none !important; cursor: pointer; }
    .btn-primary { background: linear-gradient(135deg, #10b981 0%, #6366f1 100%); color: #ffffff !important; }
    .btn-secondary { background: #1e1e2e; color: #10b981 !important; border: 1px solid #10b98130; }
    @media (max-width: 600px) {
      .container { width: 100% !important; }
      .btn { display: block !important; width: 100% !important; }
      .hide-mobile { display: none !important; }
    }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>` : ''}

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">

        <!-- Card container -->
        <table class="container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="background:#13131f;border-radius:16px;border:1px solid #ffffff14;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#10b98115 0%,#6366f115 100%);border-bottom:1px solid #ffffff0a;padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      <span style="color:#10b981;">Auto</span>Clipr
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">AI Video Clips</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} AutoClipr · AI-Powered Video Clips
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                <a href="{{appUrl}}/dashboard" style="color:#10b981;">Dashboard</a>
                &nbsp;·&nbsp;
                <a href="{{appUrl}}/billing" style="color:#10b981;">Billing</a>
                &nbsp;·&nbsp;
                <a href="mailto:{{supportEmail}}" style="color:#10b981;">Support</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- / Card container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">${text}</h1>`;
}

export function p(text: string, muted = false): string {
  const color = muted ? '#9ca3af' : '#d1d5db';
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${color};">${text}</p>`;
}

export function divider(): string {
  return `<hr style="border:0;border-top:1px solid #ffffff0a;margin:28px 0;" />`;
}

export function badge(label: string, value: string): string {
  return `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #ffffff08;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="font-size:13px;color:#6b7280;">${label}</td>
          <td align="right" style="font-size:13px;font-weight:600;color:#e5e7eb;">${value}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function infoTable(rows: Array<[string, string]>): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0d0d14;border-radius:10px;border:1px solid #ffffff0a;margin:24px 0;padding:4px 20px;">
    <tbody>
      ${rows.map(([label, value]) => badge(label, value)).join('')}
    </tbody>
  </table>`;
}

export function ctaButton(text: string, url: string, secondary = false): string {
  const cls = secondary ? 'btn btn-secondary' : 'btn btn-primary';
  const bg = secondary
    ? 'background:#1e1e2e;border:1px solid #10b98130;color:#10b981'
    : 'background:linear-gradient(135deg,#10b981 0%,#6366f1 100%);color:#ffffff';
  return `
  <table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0;">
    <tr>
      <td>
        <a href="${url}" class="${cls}" style="${bg};display:inline-block;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:700;text-decoration:none;">
          ${text}
        </a>
      </td>
    </tr>
  </table>`;
}

export function highlight(text: string): string {
  return `<span style="color:#10b981;font-weight:700;">${text}</span>`;
}
