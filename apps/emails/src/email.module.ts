import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';

@Global()
@Module({
  providers: [InvoicePdfService, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
