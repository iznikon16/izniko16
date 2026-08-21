import { ExternalLink, PackageCheck, Truck } from 'lucide-react';
import { createShipmentAction, updateShipmentAction } from '@/app/admin/(panel)/actions';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AdminOrderRecord } from '@/lib/catalog/types';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipping/status';

const nextStatuses: Record<ShipmentStatus, ShipmentStatus[]> = {
  preparing: ['ready', 'cancelled'],
  ready: ['shipped', 'cancelled'],
  shipped: ['in_transit', 'out_for_delivery', 'delivered'],
  in_transit: ['out_for_delivery', 'delivered'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

export function OrderShipments({ order }: { order: AdminOrderRecord }) {
  const shippedByItem = new Map<string, number>();
  for (const shipment of order.shipments) {
    if (shipment.status === 'cancelled') continue;
    for (const item of shipment.items) {
      shippedByItem.set(item.order_item_id, (shippedByItem.get(item.order_item_id) ?? 0) + item.quantity);
    }
  }
  const availableItems = order.items.filter((item) => (shippedByItem.get(item.id) ?? 0) < item.quantity);
  const canCreate = ['confirmed', 'preparing', 'shipped'].includes(order.status) && availableItems.length > 0;

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Truck className="h-5 w-5" /></span>
        <div><p className="font-semibold text-slate-950">Sevkiyat ve kargo takibi</p><p className="text-xs text-slate-600">Kısmi sevkiyatları ve teslimat geçmişini yönetin.</p></div>
      </div>

      <div className="mt-4 grid gap-3">
        {order.shipments.map((shipment) => {
          const status = shipment.status as ShipmentStatus;
          const terminal = nextStatuses[status].length === 0;
          return (
            <div key={shipment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-slate-950">{shipment.shipment_number}</p><p className="mt-1 text-xs text-slate-500">{dateFormatter.format(new Date(shipment.created_at))}</p></div>
                <Badge variant={status === 'delivered' ? 'success' : status === 'cancelled' ? 'destructive' : 'info'}>{SHIPMENT_STATUS_LABELS[status]}</Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {shipment.items.map((item) => <p key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-slate-700">{item.orderItem?.product_title ?? 'Ürün'} <strong>× {item.quantity}</strong></p>)}
              </div>
              <ToastActionForm action={updateShipmentAction} successMessage="Sevkiyat güncellendi." errorMessage="Sevkiyat güncellenemedi." className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
                <input type="hidden" name="shipment_id" value={shipment.id} />
                <div className="grid gap-1.5"><Label>Durum</Label><Select name="status" defaultValue={status} disabled={terminal}><option value={status}>{SHIPMENT_STATUS_LABELS[status]}</option>{nextStatuses[status].map((value) => <option key={value} value={value}>{SHIPMENT_STATUS_LABELS[value]}</option>)}</Select></div>
                <div className="grid gap-1.5"><Label>Kargo firması</Label><Input name="carrier" defaultValue={shipment.carrier} placeholder="Örn. Yurtiçi Kargo" /></div>
                <div className="grid gap-1.5"><Label>Takip numarası</Label><Input name="tracking_number" defaultValue={shipment.tracking_number} /></div>
                <div className="grid gap-1.5"><Label>Takip bağlantısı</Label><Input name="tracking_url" type="url" defaultValue={shipment.tracking_url ?? ''} placeholder="https://..." /></div>
                <div className="grid gap-1.5 md:col-span-2"><Label>Sevkiyat notu</Label><Textarea name="note" rows={2} defaultValue={shipment.note} /></div>
                <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
                  {shipment.tracking_url ? <a href={shipment.tracking_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">Kargoyu takip et <ExternalLink className="h-3.5 w-3.5" /></a> : <span />}
                  {!terminal ? <Button type="submit">Sevkiyatı Güncelle</Button> : <span className="text-xs text-slate-500">Bu sevkiyat kapatıldı.</span>}
                </div>
              </ToastActionForm>
              {shipment.history.length > 0 ? <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Durum geçmişi ({shipment.history.length})</summary><div className="mt-2 space-y-1.5">{shipment.history.map((entry) => <p key={entry.id}>{dateFormatter.format(new Date(entry.created_at))} · {SHIPMENT_STATUS_LABELS[entry.to_status as ShipmentStatus] ?? entry.to_status}{entry.note ? ` · ${entry.note}` : ''}</p>)}</div></details> : null}
            </div>
          );
        })}
      </div>

      {canCreate ? (
        <ToastActionForm action={createShipmentAction} successMessage="Sevkiyat oluşturuldu." errorMessage="Sevkiyat oluşturulamadı." confirmation={{ title: 'Sevkiyat oluşturulsun mu?', description: 'Girilen miktarlar siparişten düşülerek sevkiyat geçmişine kaydedilecek.', confirmLabel: 'Sevkiyatı Oluştur' }} className="mt-4 grid gap-3 rounded-2xl border border-sky-200 bg-white p-4 md:grid-cols-2">
          <input type="hidden" name="order_id" value={order.id} />
          <div className="md:col-span-2"><p className="font-semibold text-slate-950">Yeni sevkiyat</p><p className="text-xs text-slate-500">Gönderilecek miktarları girin; boş veya sıfır olan satırlar dahil edilmez.</p></div>
          {availableItems.map((item) => {
            const remaining = item.quantity - (shippedByItem.get(item.id) ?? 0);
            return <div key={item.id} className="grid gap-1.5"><Label>{item.product_title} · kalan {remaining}</Label><Input name={`quantity:${item.id}`} type="number" min={0} max={remaining} defaultValue={0} /></div>;
          })}
          <div className="grid gap-1.5"><Label>Kargo firması</Label><Input name="carrier" placeholder="Örn. Yurtiçi Kargo" /></div>
          <div className="grid gap-1.5"><Label>Takip numarası</Label><Input name="tracking_number" /></div>
          <div className="grid gap-1.5"><Label>Takip bağlantısı</Label><Input name="tracking_url" type="url" placeholder="https://..." /></div>
          <div className="grid gap-1.5 md:col-span-2"><Label>Sevkiyat notu</Label><Textarea name="note" rows={2} /></div>
          <div className="flex justify-end md:col-span-2"><Button type="submit"><PackageCheck className="h-4 w-4" /> Sevkiyat Oluştur</Button></div>
        </ToastActionForm>
      ) : <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-slate-600">{availableItems.length === 0 ? 'Siparişin tüm ürünleri sevkiyata ayrıldı.' : 'Sipariş bu durumda sevkiyata açılamaz.'}</p>}
    </section>
  );
}
