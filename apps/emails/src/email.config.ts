export interface EmailConfig {
  /** Resend API key — takes priority over SMTP when set */
  resendApiKey?: string;
  /** Sender address shown in From field */
  fromAddress: string;
  /** Display name shown in From field */
  fromName: string;
  /** SMTP host (Google Workspace: smtp.gmail.com) */
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  /** Support email shown in templates */
  supportEmail: string;
  /** Base URL for dashboard links (no trailing slash) */
  appUrl: string;
}

export function emailConfigFromEnv(): EmailConfig {
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    fromAddress: process.env.EMAIL_FROM_ADDRESS ?? 'noreply@autoclipr.com',
    fromName: process.env.EMAIL_FROM_NAME ?? 'AutoClipr',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    supportEmail: process.env.SUPPORT_EMAIL ?? 'support@autoclipr.com',
    appUrl: (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? 'https://autoclipr.com').replace(/\/$/, ''),
  };
}
