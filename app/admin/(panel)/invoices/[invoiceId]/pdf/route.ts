import { requireAdminPermission } from '@/lib/auth/admin';
import { attachmentHeaders } from '@/lib/accounting/statement-export';
import { buildInvoicePdf,createInvoiceFileName } from '@/lib/invoices/documents';
import { getAdminInvoice } from '@/lib/invoices/queries';

export const dynamic='force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  await requireAdminPermission('invoice.view');
  const {invoiceId}=await context.params;
  const invoice=await getAdminInvoice(invoiceId);
  if(!invoice) return new Response('Fatura bulunamadı.',{status:404});
  return new Response(await buildInvoicePdf(invoice),{headers:attachmentHeaders(createInvoiceFileName(invoice.invoice_number),'application/pdf')});
}
