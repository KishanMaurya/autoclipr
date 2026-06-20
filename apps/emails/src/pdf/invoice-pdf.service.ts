import { Injectable, Logger } from '@nestjs/common';

export interface InvoicePdfData {
  invoiceNumber: string;
  transactionId: string;
  paymentDate: string;
  userName: string;
  userEmail: string;
  planName: string;
  amount: string;
  currency?: string;
  companyName?: string;
  companyAddress?: string;
  companyWebsite?: string;
}

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);

  async generate(data: InvoicePdfData): Promise<Buffer> {
    // Lazy-load pdfkit to avoid import errors if the package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFDocument = require('pdfkit') as typeof import('pdfkit');

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 56,
          info: {
            Title: `Invoice #${data.invoiceNumber}`,
            Author: data.companyName ?? 'AutoClipr',
          },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const PAGE_W = doc.page.width - 112; // content width
        const BRAND = '#10b981';
        const TEXT_DARK = '#111827';
        const TEXT_MUTED = '#6b7280';
        const BORDER = '#e5e7eb';
        const BG_LIGHT = '#f9fafb';

        // ── Header ──────────────────────────────────────────────────────────
        doc.rect(0, 0, doc.page.width, 90).fill('#0d0d14');

        doc.fontSize(24).font('Helvetica-Bold').fillColor(BRAND).text('Auto', 56, 30, { continued: true });
        doc.fillColor('#ffffff').text('Clipr');

        doc.fontSize(10).font('Helvetica').fillColor('#9ca3af')
          .text(data.companyWebsite ?? 'https://autoclipr.com', 56, 60);

        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
          .text('INVOICE', doc.page.width - 150, 38, { width: 94, align: 'right' });
        doc.fillColor('#9ca3af').font('Helvetica').fontSize(10)
          .text(`#${data.invoiceNumber}`, doc.page.width - 150, 56, { width: 94, align: 'right' });

        doc.moveDown(3);

        // ── Bill To / Company ────────────────────────────────────────────────
        const colW = PAGE_W / 2;
        const yBill = doc.y;

        doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_MUTED)
          .text('BILL TO', 56, yBill, { width: colW });
        doc.fontSize(12).font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(data.userName, 56, yBill + 16, { width: colW });
        doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
          .text(data.userEmail, 56, yBill + 32, { width: colW });

        const rightX = 56 + colW + 20;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_MUTED)
          .text('FROM', rightX, yBill, { width: colW });
        doc.fontSize(12).font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(data.companyName ?? 'AutoClipr', rightX, yBill + 16, { width: colW });
        if (data.companyAddress) {
          doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
            .text(data.companyAddress, rightX, yBill + 32, { width: colW });
        }

        doc.moveDown(4);

        // ── Invoice meta table ────────────────────────────────────────────────
        const metaY = doc.y;
        doc.rect(56, metaY, PAGE_W, 36).fill(BG_LIGHT);

        const cols = [
          { label: 'Invoice Number', value: `#${data.invoiceNumber}` },
          { label: 'Payment Date', value: data.paymentDate },
          { label: 'Transaction ID', value: data.transactionId },
        ];

        const colWidth = PAGE_W / cols.length;
        cols.forEach((col, i) => {
          const cx = 56 + i * colWidth + 12;
          doc.fontSize(8).font('Helvetica-Bold').fillColor(TEXT_MUTED)
            .text(col.label.toUpperCase(), cx, metaY + 6, { width: colWidth - 12 });
          doc.fontSize(10).font('Helvetica').fillColor(TEXT_DARK)
            .text(col.value, cx, metaY + 20, { width: colWidth - 12 });
        });

        doc.moveDown(3.5);

        // ── Line items table ──────────────────────────────────────────────────
        const tableY = doc.y;
        const COL = { desc: 56, qty: 310, unit: 390, total: 460 };

        // Header row
        doc.rect(56, tableY, PAGE_W, 28).fill('#111827');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('DESCRIPTION', COL.desc + 8, tableY + 9, { width: 200 });
        doc.text('QTY', COL.qty, tableY + 9, { width: 60, align: 'center' });
        doc.text('UNIT PRICE', COL.unit, tableY + 9, { width: 80, align: 'right' });
        doc.text('TOTAL', COL.total, tableY + 9, { width: PAGE_W - COL.total + 56, align: 'right' });

        // Item row
        const rowY = tableY + 28;
        doc.rect(56, rowY, PAGE_W, 36).fill('#ffffff').stroke(BORDER);
        doc.fontSize(11).font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(data.planName, COL.desc + 8, rowY + 12, { width: 240 });
        doc.fontSize(10).font('Helvetica').fillColor(TEXT_MUTED)
          .text('1', COL.qty, rowY + 14, { width: 60, align: 'center' });
        doc.text(data.amount, COL.unit, rowY + 14, { width: 80, align: 'right' });
        doc.font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(data.amount, COL.total, rowY + 14, { width: PAGE_W - COL.total + 56, align: 'right' });

        doc.moveDown(5.5);

        // ── Total box ────────────────────────────────────────────────────────
        const totalY = doc.y;
        doc.rect(doc.page.width - 56 - 220, totalY, 220, 52).fill(BRAND);
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff')
          .text('AMOUNT PAID', doc.page.width - 56 - 208, totalY + 8, { width: 196, align: 'right' });
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff')
          .text(data.amount, doc.page.width - 56 - 208, totalY + 24, { width: 196, align: 'right' });

        // Paid stamp
        doc.save()
          .rotate(-22, { origin: [270, totalY + 26] })
          .fontSize(32).font('Helvetica-Bold').fillColor(BRAND).opacity(0.15)
          .text('PAID', 200, totalY + 10)
          .restore();

        doc.moveDown(5);

        // ── Footer ────────────────────────────────────────────────────────────
        const footerY = doc.page.height - 70;
        doc.moveTo(56, footerY).lineTo(56 + PAGE_W, footerY).strokeColor(BORDER).lineWidth(1).stroke();

        doc.fontSize(9).font('Helvetica').fillColor(TEXT_MUTED)
          .text(
            `Thank you for your business! · ${data.companyWebsite ?? 'https://autoclipr.com'}`,
            56,
            footerY + 12,
            { width: PAGE_W, align: 'center' },
          );

        doc.end();
      } catch (err) {
        this.logger.error('PDF generation failed', err);
        reject(err);
      }
    });
  }
}
