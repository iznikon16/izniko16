import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { formatCommercePrice } from "@/lib/commerce/format";
import { getCustomerOrders, requireCustomerSession } from "@/lib/commerce/queries";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  cancelled: "İptal edildi",
  completed: "Tamamlandı",
  confirmed: "Onaylandı",
  pending_payment: "Ödeme bekleniyor",
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
};

export default async function CustomerOrdersPage() {
  const session = await requireCustomerSession("/hesabim/siparislerim");
  const orders = await getCustomerOrders(session.user.id);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600">Müşteri portalı</p><h1 className="mt-2 text-2xl font-black text-slate-950">Siparişlerim</h1></div>
      {orders.length === 0 ? (
        <div className="py-14 text-center"><PackageOpen className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 font-black text-slate-900">Henüz siparişiniz yok</h2><Link href="/" className="mt-5 inline-flex rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white">Ürünleri incele</Link></div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-black text-slate-950">{order.order_number}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.created_at))}</p></div>
                <div className="text-right"><span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">{statusLabels[order.status] ?? order.status}</span><p className="mt-2 text-lg font-black text-slate-950">{formatCommercePrice(order.total)}</p></div>
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span className="truncate text-slate-600">{item.product_title} × {item.quantity}</span><strong>{formatCommercePrice(item.line_total)}</strong></div>)}
              </div>
              {order.paymentAttempt && order.payment_status !== "paid" && (
                <Link href={`/odeme/sonuc?attempt=${encodeURIComponent(order.paymentAttempt.id)}`} className="mt-4 inline-flex text-sm font-black text-sky-700">Ödeme talimatını görüntüle →</Link>
              )}
              <Link href={`/hesabim/siparislerim/${order.id}`} className="mt-4 inline-flex text-sm font-black text-sky-700">Sipariş ve kargo detayı →</Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
