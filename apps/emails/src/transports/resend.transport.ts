import { Logger } from '@nestjs/common';

export interface SendParams {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

export async function sendViaResend(params: SendParams, apiKey: string): Promise<void> {
  const logger = new Logger('ResendTransport');

  // Dynamic import so the package is optional
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Resend } = require('resend') as typeof import('resend');
  const resend = new Resend(apiKey);

  const attachments = params.attachments?.map((a) => ({
    filename: a.filename,
    content: a.content.toString('base64'),
  }));

  const { error } = await resend.emails.send({
    from: params.from,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments,
  });

  if (error) {
    logger.error(`Resend error: ${JSON.stringify(error)}`);
    throw new Error(`Resend failed: ${error.message}`);
  }

  logger.log(`Email sent via Resend to ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`);
}
