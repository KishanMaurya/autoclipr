import { Injectable, Logger } from '@nestjs/common';
import { emailConfigFromEnv, type EmailConfig } from './email.config';
import { sendViaResend } from './transports/resend.transport';
import { sendViaSMTP } from './transports/smtp.transport';
import type { SendParams } from './transports/resend.transport';
import { InvoicePdfService } from './pdf/invoice-pdf.service';

import { welcomeTemplate, type WelcomeVars } from './templates/welcome';
import { subscriptionConfirmedTemplate, type SubscriptionConfirmedVars } from './templates/subscription-confirmed';
import { invoiceTemplate, type InvoiceVars } from './templates/invoice';
import { clipReadyTemplate, type ClipReadyVars } from './templates/clip-ready';
import { upgradeRequiredTemplate, type UpgradeRequiredVars } from './templates/upgrade-required';
import { trialExpiringTemplate, type TrialExpiringVars } from './templates/trial-expiring';
import { renewalSuccessTemplate, type RenewalSuccessVars } from './templates/renewal-success';
import { paymentFailedTemplate, type PaymentFailedVars } from './templates/payment-failed';
import { feedbackConfirmationTemplate, type FeedbackConfirmationVars } from './templates/feedback-confirmation';
import { contactConfirmationTemplate, type ContactConfirmationVars } from './templates/contact-confirmation';
import { accountDeletedTemplate, type AccountDeletedVars } from './templates/account-deleted';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly config: EmailConfig;

  constructor(private readonly invoicePdf: InvoicePdfService) {
    this.config = emailConfigFromEnv();
    this.logTransportMode();
  }

  private logTransportMode(): void {
    if (this.config.resendApiKey) {
      this.logger.log('Email transport: Resend');
    } else if (this.config.smtpHost) {
      this.logger.log(`Email transport: SMTP (${this.config.smtpHost}:${this.config.smtpPort})`);
    } else {
      this.logger.warn('No email transport configured — emails will be logged only. Set RESEND_API_KEY or SMTP_* env vars.');
    }
  }

  private fromField(): string {
    return `${this.config.fromName} <${this.config.fromAddress}>`;
  }

  private async dispatch(params: SendParams): Promise<void> {
    if (this.config.resendApiKey) {
      await sendViaResend(params, this.config.resendApiKey);
      return;
    }
    if (this.config.smtpHost) {
      await sendViaSMTP(params, this.config);
      return;
    }
    // Dev fallback — log the email content
    this.logger.debug(`[EMAIL DRY-RUN] To: ${params.to} | Subject: ${params.subject}`);
    this.logger.debug(`[EMAIL DRY-RUN] Text: ${params.text.slice(0, 200)}`);
  }

  /** Swallows errors so email failures never crash the caller */
  private async sendSafe(params: SendParams): Promise<void> {
    try {
      await this.dispatch(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${params.to}: ${msg}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private firstName(name: string): string {
    return name.trim().split(/\s+/)[0] ?? name.trim();
  }

  // ─── Public send methods ──────────────────────────────────────────────────

  async sendWelcome(to: string, vars: Omit<WelcomeVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = welcomeTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
      dashboardUrl: vars.dashboardUrl || `${this.config.appUrl}/dashboard`,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendSubscriptionConfirmed(to: string, vars: Omit<SubscriptionConfirmedVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = subscriptionConfirmedTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
      dashboardUrl: vars.dashboardUrl || `${this.config.appUrl}/dashboard`,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendInvoice(
    to: string,
    vars: Omit<InvoiceVars, 'appUrl' | 'supportEmail'>,
    attachPdf = true,
  ): Promise<void> {
    const { subject, html, text } = invoiceTemplate({
      ...vars,
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
    });

    let attachments: SendParams['attachments'];
    if (attachPdf) {
      try {
        const pdfBuffer = await this.invoicePdf.generate({
          invoiceNumber: vars.invoiceNumber,
          transactionId: vars.transactionId,
          paymentDate: vars.paymentDate,
          userName: vars.userName,
          userEmail: to,
          planName: vars.planName,
          amount: vars.amount,
          companyName: this.config.fromName,
          companyWebsite: this.config.appUrl,
        });
        attachments = [
          {
            filename: `autoclipr-invoice-${vars.invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ];
      } catch (err) {
        this.logger.error(`PDF generation failed for invoice ${vars.invoiceNumber}: ${err}`);
      }
    }

    await this.sendSafe({ to, subject, html, text, from: this.fromField(), attachments });
  }

  async sendClipReady(to: string, vars: Omit<ClipReadyVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = clipReadyTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendUpgradeRequired(to: string, vars: Omit<UpgradeRequiredVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = upgradeRequiredTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
      upgradeUrl: vars.upgradeUrl || `${this.config.appUrl}/billing`,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendTrialExpiring(to: string, vars: Omit<TrialExpiringVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = trialExpiringTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
      upgradeUrl: vars.upgradeUrl || `${this.config.appUrl}/billing`,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendRenewalSuccess(to: string, vars: Omit<RenewalSuccessVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = renewalSuccessTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
      dashboardUrl: vars.dashboardUrl || `${this.config.appUrl}/dashboard`,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendPaymentFailed(to: string, vars: Omit<PaymentFailedVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = paymentFailedTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
      updatePaymentUrl: vars.updatePaymentUrl || `${this.config.appUrl}/billing`,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendFeedbackConfirmation(to: string, vars: Omit<FeedbackConfirmationVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = feedbackConfirmationTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendContactConfirmation(to: string, vars: Omit<ContactConfirmationVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = contactConfirmationTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }

  async sendAccountDeleted(to: string, vars: Omit<AccountDeletedVars, 'appUrl' | 'supportEmail'>): Promise<void> {
    const { subject, html, text } = accountDeletedTemplate({
      ...vars,
      userName: this.firstName(vars.userName),
      appUrl: this.config.appUrl,
      supportEmail: this.config.supportEmail,
    });
    await this.sendSafe({ to, subject, html, text, from: this.fromField() });
  }
}
