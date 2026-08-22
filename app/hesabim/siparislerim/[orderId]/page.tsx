import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Download, ExternalLink, FileText, PackageCheck, Truck } from 'lucide-react';
import { formatCommercePrice, getCustomerOrderDetail, requireCustomerSession } from '@/lib/commerce/queries';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipping/status';
import { getCustomerOrderDocuments } from '@/lib/invoices/queries';
import { INVOICE_DOCUMENT_LABELS, type InvoiceDocumentType } from '@/lib/invoices/types';

export const dynamic = 'force-dynamic';

const orderStatusLabels: Record<string, string> = {
  cancelled: 'İptal edildi', completed: 'Tamamlandı', confirmed: 'Onaylandı',
  pending_payment: 'Ödeme bekleniyor', preparing: 'Hazırlanıyor', shipped: 'Kargoda',
};
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

export default async function CustomerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await requireCustomerSession(`/hesabim/siparislerim/${orderId}`);
  const [order, documents] = await Promise.all([
    getCustomerOrderDetail(session.user.id, orderId),
    getCustomerOrderDocuments(session.user.id, orderId),
  ]);
  if (!order) notFound();

  return (
    <section className="space-y-5">
      <Link href="/hesabim/siparislerim" className="inline-flex items-center gap-2 text-sm font-bold text-sky-700"><ArrowLeft className="h-4 w-4" /> Siparişlerime dön</Link>
      {['shipped','completed'].includes(order.status) ? <Link href={`/hesabim/iadelerim?order=${order.id}`} className="ml-3 inline-flex text-sm font-bold text-rose-700">İade talebi oluştur</Link> : null}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Sipariş detayı</p><h1 className="mt-2 text-2xl font-black text-slate-950">{order.order_number}</h1><p className="mt-1 text-sm text-slate-500">{dateFormatter.format(new Date(order.created_at))}</p></div>
          <div className="text-right"><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{orderStatusLabels[order.status] ?? order.status}</span><p className="mt-2 text-xl font-black text-slate-950">{formatCommercePrice(order.total)}</p></div>
        </div>
        <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
          {order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm"><span className="text-slate-700">{item.product_title} × {item.quantity}</span><strong>{formatCommercePrice(item.line_total)}</strong></div>)}
        </div>
      </article>

      {documents.length > 0 ? <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><FileText className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-slate-950">Sipariş belgeleri</h2><p className="text-sm text-slate-500">Bu siparişe ait sistem içi satış belgeleri ve faturalar</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{documents.map((document)=><div key={document.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">{INVOICE_DOCUMENT_LABELS[document.document_type as InvoiceDocumentType]??document.document_type}</p><p className="mt-1 font-black text-slate-950">{document.invoice_number}</p><Link href={`/hesabim/faturalarim/${document.id}/pdf`} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white"><Download className="h-4 w-4" />PDF İndir</Link></div>)}</div>
      </article> : null}

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Truck className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-slate-950">Sevkiyat geçmişi</h2><p className="text-sm text-slate-500">Kısmi gönderiler ve kargo hareketleri</p></div></div>
        {order.shipments.length === 0 ? <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center"><PackageCheck className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-bold text-slate-700">Henüz sevkiyat oluşturulmadı.</p></div> : (
          <div className="mt-6 space-y-4">{order.shipments.map((shipment) => {
            const status = shipment.status as ShipmentStatus;
            return <section key={shipment.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{shipment.shipment_number}</h3><p className="mt-1 text-xs text-slate-500">{dateFormatter.format(new Date(shipment.created_at))}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{SHIPMENT_STATUS_LABELS[status] ?? status}</span></div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Kargo firması</dt><dd className="mt-1 font-bold text-slate-900">{shipment.carrier || 'Belirtilmedi'}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">Takip numarası</dt><dd className="mt-1 font-bold text-slate-900">{shipment.tracking_number || 'Belirtilmedi'}</dd></div></dl>
              <div className="mt-3 space-y-2">{shipment.items.map((item) => <p key={item.id} className="text-sm text-slate-700">{item.orderItem?.product_title ?? 'Ürün'} <strong>× {item.quantity}</strong></p>)}</div>
              {shipment.tracking_url ? <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white">Kargoyu takip et <ExternalLink className="h-4 w-4" /></a> : null}
              <ol className="mt-5 space-y-2 border-t border-slate-100 pt-4">{shipment.history.map((entry) => <li key={entry.id} className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-bold text-slate-700">{SHIPMENT_STATUS_LABELS[entry.to_status as ShipmentStatus] ?? entry.to_status}</span><time className="text-slate-500">{dateFormatter.format(new Date(entry.created_at))}</time>{entry.note ? <p className="w-full text-slate-500">{entry.note}</p> : null}</li>)}</ol>
            </section>;
          })}</div>
        )}
      </article>
    </section>
  );
}
