import { baseLayout, h1, p, ctaButton, divider, infoTable, highlight } from './base';

export interface InvoiceVars {
  userName: string;
  invoiceNumber: string;
  transactionId: string;
  paymentDate: string;
  amount: string;
  planName: string;
  invoiceUrl: string;
  appUrl: string;
  supportEmail: string;
}

export function invoiceTemplate(vars: InvoiceVars): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your AutoClipr Invoice #${vars.invoiceNumber}`;

  const html = baseLayout(
    `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
      <tr>
        <td>
          ${h1('Payment Receipt')}
          ${p('Thank you for your payment. Here\'s your invoice summary for your records.')}
        </td>
        <td align="right" valign="top" class="hide-mobile">
          <span style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#6366f1 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:36px;font-weight:900;letter-spacing:-1px;">PAID</span>
        </td>
      </tr>
    </table>

    ${infoTable([
      ['Invoice number', `#${vars.invoiceNumber}`],
      ['Transaction ID', vars.transactionId],
      ['Payment date', vars.paymentDate],
      ['Plan', vars.planName],
    ])}

    <!-- Amount highlight -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:linear-gradient(135deg,#10b98110 0%,#6366f110 100%);border-radius:10px;border:1px solid #10b98120;padding:20px;margin:0 0 28px;">
      <tr>
        <td style="font-size:14px;color:#9ca3af;">Amount paid</td>
        <td align="right">
          <span style="font-size:28px;font-weight:800;color:#10b981;">${vars.amount}</span>
        </td>
      </tr>
    </table>

    ${ctaButton('⬇  Download PDF Invoice', vars.invoiceUrl)}

    ${divider()}

    ${p('This invoice has been generated automatically. If you have questions about this charge, please contact <a href="mailto:' + vars.supportEmail + '" style="color:#10b981;">' + vars.supportEmail + '</a>.', true)}
    `,
    `Payment confirmed · Invoice #${vars.invoiceNumber} · ${vars.amount}`,
  )
    .replace(/\{\{appUrl\}\}/g, vars.appUrl)
    .replace(/\{\{supportEmail\}\}/g, vars.supportEmail);

  const text = `AutoClipr Invoice #${vars.invoiceNumber}

Hi ${vars.userName},

Your payment has been processed successfully.

Invoice number: #${vars.invoiceNumber}
Transaction ID: ${vars.transactionId}
Payment date: ${vars.paymentDate}
Plan: ${vars.planName}
Amount paid: ${vars.amount}

Download your invoice: ${vars.invoiceUrl}

Questions? Contact ${vars.supportEmail}

— The AutoClipr Team`;

  return { subject, html, text };
}
