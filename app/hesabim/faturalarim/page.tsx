import Link from 'next/link';
import { Download,ReceiptText } from 'lucide-react';
import { requireCustomerSession } from '@/lib/commerce/queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { getCustomerInvoices } from '@/lib/invoices/queries';
import { INVOICE_DOCUMENT_LABELS,INVOICE_STATUS_LABELS,type InvoiceDocumentType } from '@/lib/invoices/types';

export const dynamic='force-dynamic';
const date=new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'});

export default async function CustomerInvoicesPage(){
  const session=await requireCustomerSession('/hesabim/faturalarim');
  const invoices=await getCustomerInvoices(session.user.id);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><ReceiptText className="h-5 w-5"/></span><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Belgelerim</p><h1 className="text-2xl font-black text-slate-950">Faturalarım</h1></div></div><p className="mt-3 text-sm text-slate-500">Fatura, iptal ve iade belgelerinizi güvenli PDF olarak indirebilirsiniz.</p>
    {invoices.length===0?<div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center"><ReceiptText className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 font-bold text-slate-700">Henüz faturanız bulunmuyor.</p></div>:<div className="mt-6 grid gap-3 md:grid-cols-2">{invoices.map((invoice)=><article key={invoice.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">{INVOICE_DOCUMENT_LABELS[invoice.document_type as InvoiceDocumentType]}</p><h2 className="mt-1 font-black text-slate-950">{invoice.invoice_number}</h2><p className="mt-1 text-xs text-slate-500">{invoice.order?.order_number} · {date.format(new Date(invoice.issued_at))}</p></div><div className="text-right"><p className="font-black text-slate-950">{formatCommercePrice(invoice.total)}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${invoice.status==='cancelled'?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>{INVOICE_STATUS_LABELS[invoice.status]}</span></div></div><Link href={`/hesabim/faturalarim/${invoice.id}/pdf`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-800"><Download className="h-4 w-4"/>PDF İndir</Link></article>)}</div>}
  </section>;
}
