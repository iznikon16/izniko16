import { PackageOpen, RotateCcw } from 'lucide-react';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createReturnRequestAction } from '@/lib/returns/actions';
import { formatCommercePrice, getCustomerOrders, requireCustomerSession } from '@/lib/commerce/queries';
import { getCustomerReturns } from '@/lib/returns/queries';
import { RETURN_STATUS_LABELS, type ReturnStatus } from '@/lib/returns/types';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short'});

export default async function CustomerReturnsPage({ searchParams }: { searchParams?: Promise<Record<string,string|string[]|undefined>> }) {
  const session = await requireCustomerSession('/hesabim/iadelerim');
  const params = searchParams ? await searchParams : {};
  const selectedOrder = Array.isArray(params.order) ? params.order[0] : params.order;
  const [returns,orders] = await Promise.all([getCustomerReturns(session.user.id),getCustomerOrders(session.user.id)]);
  const eligibleOrders = orders.filter((order) => ['shipped','completed'].includes(order.status) && (!selectedOrder || order.id===selectedOrder));
  const alreadyRequested = new Map<string,number>();
  for (const request of returns) if (request.status!=='rejected') for (const item of request.items) alreadyRequested.set(item.order_item_id,(alreadyRequested.get(item.order_item_id)??0)+item.quantity);

  return <div className="grid gap-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">İade merkezi</p><h1 className="mt-2 text-2xl font-black text-slate-950">İadelerim</h1><p className="mt-2 text-sm text-slate-500">Sevk edilmiş sipariş ürünleri için miktar bazlı iade talebi oluşturabilirsiniz.</p>
      {eligibleOrders.length===0 ? <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center"><PackageOpen className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 font-bold text-slate-700">İadeye uygun sipariş bulunamadı.</p></div> : <div className="mt-6 space-y-5">{eligibleOrders.map((order) => {
        const available = order.items.filter((item)=>(alreadyRequested.get(item.id)??0)<item.quantity);
        return <ToastActionForm key={order.id} action={createReturnRequestAction} successMessage="İade talebiniz oluşturuldu." errorMessage="İade talebi oluşturulamadı." confirmation={{title:'İade talebi oluşturulsun mu?',description:'Talep yönetici incelemesine gönderilecek; tutar ve sevk miktarı sunucuda yeniden doğrulanacaktır.',confirmLabel:'Talebi Gönder'}} className="grid gap-3 rounded-2xl border border-slate-200 p-5 md:grid-cols-2">
          <input type="hidden" name="order_id" value={order.id}/><div className="md:col-span-2"><p className="font-black text-slate-950">{order.order_number}</p><p className="text-sm text-slate-500">Sipariş toplamı: {formatCommercePrice(order.total)}</p></div>
          {available.map((item)=>{const remaining=item.quantity-(alreadyRequested.get(item.id)??0);return <div key={item.id} className="grid gap-1.5"><Label>{item.product_title} · en fazla {remaining}</Label><Input name={`quantity:${item.id}`} type="number" min={0} max={remaining} defaultValue={0}/></div>;})}
          <div className="grid gap-1.5"><Label>İade nedeni</Label><Input name="reason" required maxLength={200} placeholder="Hasarlı, yanlış ürün…"/></div>
          <div className="grid gap-1.5 md:col-span-2"><Label>Açıklama</Label><Textarea name="customer_note" rows={3} maxLength={1000}/></div>
          <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={available.length===0}><RotateCcw className="h-4 w-4"/> Talep Oluştur</Button></div>
        </ToastActionForm>;
      })}</div>}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><h2 className="text-xl font-black text-slate-950">İade geçmişi</h2>{returns.length===0?<p className="mt-5 text-sm text-slate-500">Henüz iade talebiniz yok.</p>:<div className="mt-5 space-y-4">{returns.map((request)=><article key={request.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-black text-slate-950">{request.return_number}</p><p className="text-xs text-slate-500">{request.order?.order_number} · {dateFormatter.format(new Date(request.created_at))}</p></div><div className="text-right"><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">{RETURN_STATUS_LABELS[request.status as ReturnStatus]??request.status}</span><p className="mt-2 font-black">{formatCommercePrice(request.total_refund_amount)}</p></div></div><div className="mt-4 space-y-1 text-sm text-slate-600">{request.items.map((item)=><p key={item.id}>{item.orderItem?.product_title??'Ürün'} × {item.quantity}</p>)}</div>{request.admin_note?<p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Yönetici notu: {request.admin_note}</p>:null}</article>)}</div>}</section>
  </div>;
}
