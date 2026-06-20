import * as nodemailer from 'nodemailer';
import { Logger } from '@nestjs/common';
import type { SendParams } from './resend.transport';
import type { EmailConfig } from '../email.config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(config: EmailConfig): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort ?? 587,
      secure: config.smtpSecure ?? false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
      pool: true,
      maxConnections: 5,
      rateDelta: 1000,
      rateLimit: 5,
    });
  }
  return transporter;
}

export async function sendViaSMTP(params: SendParams, config: EmailConfig): Promise<void> {
  const logger = new Logger('SMTPTransport');
  const transport = getTransporter(config);

  const info = await transport.sendMail({
    from: params.from,
    to: Array.isArray(params.to) ? params.to.join(', ') : params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  logger.log(`Email sent via SMTP: ${info.messageId}`);
}
