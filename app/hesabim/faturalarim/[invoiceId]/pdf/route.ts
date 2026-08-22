import { attachmentHeaders } from '@/lib/accounting/statement-export';
import { requireCustomerSession } from '@/lib/commerce/queries';
import { buildInvoicePdf,createInvoiceFileName } from '@/lib/invoices/documents';
import { getCustomerInvoice } from '@/lib/invoices/queries';

export const dynamic='force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const {invoiceId}=await context.params;
  const session=await requireCustomerSession(`/hesabim/faturalarim/${invoiceId}/pdf`);
  const invoice=await getCustomerInvoice(session.user.id,invoiceId);
  if(!invoice) return new Response('Fatura bulunamadı.',{status:404});
  return new Response(await buildInvoicePdf(invoice),{headers:attachmentHeaders(createInvoiceFileName(invoice.invoice_number,invoice.document_type),'application/pdf')});
}
