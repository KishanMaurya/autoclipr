export { EmailModule } from './email.module';
export { EmailService } from './email.service';
export { InvoicePdfService } from './pdf/invoice-pdf.service';
export { emailConfigFromEnv } from './email.config';
export type { EmailConfig } from './email.config';

// Template types
export type { WelcomeVars } from './templates/welcome';
export type { SubscriptionConfirmedVars } from './templates/subscription-confirmed';
export type { InvoiceVars } from './templates/invoice';
export type { ClipReadyVars } from './templates/clip-ready';
export type { UpgradeRequiredVars } from './templates/upgrade-required';
export type { TrialExpiringVars } from './templates/trial-expiring';
export type { RenewalSuccessVars } from './templates/renewal-success';
export type { PaymentFailedVars } from './templates/payment-failed';
export type { FeedbackConfirmationVars } from './templates/feedback-confirmation';
export type { ContactConfirmationVars } from './templates/contact-confirmation';
export type { AccountDeletedVars } from './templates/account-deleted';
