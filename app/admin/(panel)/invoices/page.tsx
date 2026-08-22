import Link from 'next/link';
import { FilePlus2, ReceiptText } from 'lucide-react';
import { requireAdminPermission } from '@/lib/auth/admin';
import { createOrderInvoiceAction } from '@/lib/invoices/actions';
import { getAdminInvoices,getInvoiceEligibleOrders } from '@/lib/invoices/queries';
import { INVOICE_DOCUMENT_LABELS,INVOICE_PROVIDER_STATUS_LABELS,INVOICE_STATUS_LABELS,type InvoiceDocumentType } from '@/lib/invoices/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export const dynamic='force-dynamic';
const date=new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium'});

export default async function AdminInvoicesPage(){
  await requireAdminPermission('invoice.view');
  const [invoices,orders]=await Promise.all([getAdminInvoices(),getInvoiceEligibleOrders()]);
  return <div className="grid gap-5">
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ReceiptText className="h-5 w-5"/></span><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Faz 25</p><h1 className="text-2xl font-semibold text-gray-950">Fatura merkezi</h1></div></div>
      <p className="mt-3 text-sm text-gray-500">Siparişlerden immutable fatura snapshot’ı oluşturun; iptal ve iadeleri bağlı düzeltme belgeleriyle yönetin.</p>
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2"><FilePlus2 className="h-5 w-5 text-sky-700"/><h2 className="text-lg font-semibold text-gray-950">Siparişten fatura oluştur</h2></div>
      {orders.length===0?<p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-500">Faturaya uygun yeni sipariş bulunmuyor.</p>:<ToastActionForm action={createOrderInvoiceAction} successMessage="Fatura oluşturuldu." errorMessage="Fatura oluşturulamadı." confirmation={{title:'Fatura oluşturulsun mu?',description:'Müşteri, adres, kalem ve tutar bilgileri değiştirilemez snapshot olarak kaydedilecek.',confirmLabel:'Faturayı Oluştur'}} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-1.5 md:col-span-2"><Label>Sipariş</Label><Select name="order_id" required><option value="">Sipariş seçin</option>{orders.map((order)=><option key={order.id} value={order.id}>{order.order_number} · {order.customer_name||order.customer_email} · {formatCommercePrice(order.total)}</option>)}</Select></div>
        <div className="grid gap-1.5"><Label>Vergi / T.C. No</Label><Input name="customer_tax_number" maxLength={20}/></div>
        <div className="grid gap-1.5"><Label>Vergi dairesi</Label><Input name="customer_tax_office" maxLength={100}/></div>
        <div className="grid gap-1.5"><Label>KDV oranı (%)</Label><Input name="tax_rate" type="number" min={0} max={100} step="0.01" defaultValue="20" required/></div>
        <div className="grid gap-1.5"><Label>Vade tarihi</Label><Input name="due_date" type="date"/></div>
        <div className="grid gap-1.5 md:col-span-2"><Label>Fatura notu</Label><Textarea name="note" rows={2} maxLength={1000}/></div>
        <div className="flex items-end justify-end md:col-span-2 xl:col-span-4"><Button type="submit" size="lg"><ReceiptText className="h-4 w-4"/>Fatura Oluştur</Button></div>
      </ToastActionForm>}
    </section>

    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-gray-950">Düzenlenen belgeler</h2><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{invoices.length} belge</span></div>
      {invoices.length===0?<p className="mt-5 text-sm text-gray-500">Henüz fatura bulunmuyor.</p>:<div className="mt-5 grid gap-3 xl:grid-cols-2">{invoices.map((invoice)=><article key={invoice.id} className="rounded-2xl border border-gray-200 p-5 transition hover:border-sky-300 hover:shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">{INVOICE_DOCUMENT_LABELS[invoice.document_type as InvoiceDocumentType]??invoice.document_type}</p><h3 className="mt-1 font-semibold text-gray-950">{invoice.invoice_number}</h3><p className="mt-1 text-sm text-gray-500">{invoice.order?.order_number} · {invoice.customer_name}</p></div><div className="text-right"><p className="text-lg font-semibold text-gray-950">{formatCommercePrice(invoice.total)}</p><p className="text-xs text-gray-500">{date.format(new Date(invoice.issued_at))}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status==='cancelled'?'bg-red-50 text-red-700':'bg-emerald-50 text-emerald-700'}`}>{INVOICE_STATUS_LABELS[invoice.status]??invoice.status}</span><span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{INVOICE_PROVIDER_STATUS_LABELS[invoice.provider_status]??invoice.provider_status}</span></div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/admin/invoices/${invoice.id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700">Belgeyi Aç</Link><Link href={`/admin/invoices/${invoice.id}/pdf`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-sky-300 hover:bg-sky-50">PDF İndir</Link></div></article>)}</div>}
    </section>
  </div>;
}
