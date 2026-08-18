import Link from 'next/link';
import { ChevronDown, MapPin, MessageSquare, Search, SlidersHorizontal, X } from 'lucide-react';
import { deleteOrderAction, saveOrderAction } from '@/app/admin/(panel)/actions';
import { DeleteSubmitButton } from '@/components/admin/delete-submit-button';
import { getAdminOrders, getAdminPaymentMethods } from '@/lib/admin/commerce-queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getPaymentProviderDefinition } from '@/lib/commerce/payment-provider-presets';
import type { AdminOrderFilters, AdminOrderRecord, OrderRow, PaymentMethodRow } from '@/lib/catalog/types';

const orderStatusLabels: Record<OrderRow['status'], string> = {
  pending_payment: 'Ödeme Bekliyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  shipped: 'Sevk Edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const paymentStatusLabels: Record<OrderRow['payment_status'], string> = {
  unpaid: 'Ödenmedi',
  pending: 'Beklemede',
  paid: 'Ödendi',
  failed: 'Başarısız',
  refunded: 'İade',
};

const integrationTypeLabels: Record<PaymentMethodRow['integration_type'], string> = {
  manual: 'Manuel',
  redirect: 'Yönlendirme',
  api: 'API',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type OrdersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): AdminOrderFilters {
  const query = getSingleParam(searchParams.query).trim();
  const status = getSingleParam(searchParams.status).trim() as OrderRow['status'] | '';
  const paymentStatus = getSingleParam(searchParams.paymentStatus).trim() as OrderRow['payment_status'] | '';

  return {
    paymentStatus: paymentStatus || undefined,
    query: query || undefined,
    status: status || undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getSnapshotText(source: unknown, key: string) {
  if (!isRecord(source)) {
    return '';
  }

  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getDeliverySnapshot(order: AdminOrderRecord) {
  const address = order.shipping_address;
  const city = getSnapshotText(address, 'city');
  const district = getSnapshotText(address, 'district');
  const neighborhood = getSnapshotText(address, 'neighborhood');
  const addressLine = getSnapshotText(address, 'address_line');
  const postalCode = getSnapshotText(address, 'postal_code');

  return {
    addressLine,
    city,
    district,
    email: order.customer_email || order.profile?.email || '',
    fullName: getSnapshotText(address, 'full_name') || order.customer_name || order.profile?.full_name || '',
    label: getSnapshotText(address, 'label') || 'Teslimat',
    neighborhood,
    phone: getSnapshotText(address, 'phone') || order.customer_phone || order.profile?.phone || '',
    postalCode,
  };
}

function OrderRow({ order, paymentMethods }: { order: AdminOrderRecord; paymentMethods: PaymentMethodRow[] }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const delivery = getDeliverySnapshot(order);
  const locationLine = [delivery.neighborhood, delivery.district, delivery.city].filter(Boolean).join(' / ');
  const customerName = order.customer_name || order.profile?.full_name || 'Müşteri adı yok';
  const customerEmail = order.customer_email || order.profile?.email || '';
  const customerPhone = order.customer_phone || order.profile?.phone || '';
  const paymentProviderLabel = getPaymentProviderDefinition(order.payment_provider).label;
  const paymentMethodLabel = order.paymentMethod?.name ?? paymentProviderLabel;

  return (
    <details className="group border-t border-gray-100 first:border-t-0">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 outline-none transition-colors hover:bg-gray-50 xl:grid-cols-[180px_minmax(190px,1fr)_170px_160px_105px_130px_34px] xl:items-center">
        <div className="min-w-0">
          <Badge variant="info" className="max-w-full">
            <span className="truncate">{order.order_number}</span>
          </Badge>
          <p className="mt-1.5 text-xs text-gray-500">{dateFormatter.format(new Date(order.created_at))}</p>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-[-0.03em] text-gray-900">{customerName}</h3>
          <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {customerEmail ? <span className="truncate">{customerEmail}</span> : null}
            <span>{customerPhone || 'Telefon yok'}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'destructive' : 'secondary'}>
            {orderStatusLabels[order.status]}
          </Badge>
          <Badge variant={order.payment_status === 'paid' ? 'success' : order.payment_status === 'failed' ? 'destructive' : 'outline'}>
            {paymentStatusLabels[order.payment_status]}
          </Badge>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{paymentMethodLabel}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gray-500">{paymentProviderLabel}</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900">{itemCount} ürün</p>
          <p className="mt-1 text-[11px] text-gray-500">{order.items.length} satır</p>
        </div>

        <div>
          <p className="text-lg font-semibold tracking-[-0.03em] text-gray-900 xl:text-right">{formatCommercePrice(order.total)}</p>
          <p className="mt-1 text-[11px] text-gray-500 xl:text-right">{order.profile?.is_blocked ? 'Kilitli hesap' : 'Hesap aktif'}</p>
        </div>

        <ChevronDown className="hidden h-4 w-4 text-gray-500 transition-transform group-open:rotate-180 xl:block" />
      </summary>

      <article className="border-t border-gray-100 bg-gray-50 px-4 py-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="grid gap-3">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-600">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600">{delivery.label}</p>
                <h4 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-gray-900">Teslimat bilgileri</h4>

                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Ad Soyad</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{delivery.fullName || 'Belirtilmedi'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Telefon</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{delivery.phone || 'Belirtilmedi'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 md:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">E-posta</p>
                    <p className="mt-1 break-all text-sm font-semibold text-gray-900">{delivery.email || 'Belirtilmedi'}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 md:col-span-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Adres</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-gray-900">{delivery.addressLine || 'Açık adres girilmedi'}</p>
                    {locationLine ? <p className="mt-1 text-xs leading-5 text-gray-500">{locationLine}</p> : null}
                    {delivery.postalCode ? <p className="mt-1 text-xs leading-5 text-gray-500">Posta kodu: {delivery.postalCode}</p> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex flex-wrap gap-2">
              {order.paymentMethod ? (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {order.paymentMethod.name}
                </span>
              ) : null}
              {order.coupon ? (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Kupon: {order.coupon.code}
                </span>
              ) : null}
              {order.campaign ? (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Kampanya: {order.campaign.name}
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-[18px] border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{item.product_title}</p>
                    <p className="mt-1 text-xs text-gray-500">Slug: {item.product_slug || '-'}</p>
                  </div>
                  <span className="text-sm text-gray-500">x{item.quantity}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCommercePrice(item.line_total)}</span>
                </div>
              ))}
            </div>

            {order.note ? (
              <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-blue-300/20 bg-blue-600/10 px-4 py-3 text-sm leading-6 text-gray-500">
                <MessageSquare className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">Müşteri notu</p>
                  <p className="mt-1 text-gray-900">{order.note}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid content-start gap-3">
          <form action={saveOrderAction} className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <input type="hidden" name="id" value={order.id} />
            <input type="hidden" name="payment_provider" value={order.payment_provider} />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Sipariş durumu</Label>
                <Select name="status" defaultValue={order.status}>
                  {Object.entries(orderStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Ödeme durumu</Label>
                <Select name="payment_status" defaultValue={order.payment_status}>
                  {Object.entries(paymentStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Ödeme yöntemi</Label>
                <Select name="payment_method_id" defaultValue={order.payment_method_id ?? ''}>
                  <option value="">Seçilmedi</option>
                  {paymentMethods.map((paymentMethod) => (
                    <option key={paymentMethod.id} value={paymentMethod.id}>
                      {paymentMethod.name} · {integrationTypeLabels[paymentMethod.integration_type]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Referans</Label>
                <Input
                  name="payment_reference"
                  defaultValue={order.payment_reference ?? ''}
                  placeholder="Provider / dekont no"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Müşteri notu</Label>
              <Textarea
                name="note"
                rows={2}
                defaultValue={order.note}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">İç operasyon notu</Label>
              <Textarea
                name="admin_note"
                rows={2}
                defaultValue={order.admin_note}
                placeholder="Kargo planı, ödeme teyidi, iç not"
              />
            </div>

            <Button type="submit">
              Siparişi Güncelle
            </Button>
          </form>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-600">Kalıcı Silme</p>
            <p className="mt-1 text-xs leading-5 text-red-500">Sipariş ve bağlı kalem/ödeme denemesi kayıtları kaldırılır.</p>
            <form action={deleteOrderAction} className="mt-3">
              <input type="hidden" name="id" value={order.id} />
              <DeleteSubmitButton confirmMessage={`${order.order_number} numaralı sipariş kalıcı olarak silinsin mi?`} label="Siparişi Sil" />
            </form>
          </div>
        </div>
        </div>
      </article>
    </details>
  );
}

function OrdersTable({ orders, paymentMethods }: { orders: AdminOrderRecord[]; paymentMethods: PaymentMethodRow[] }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white/[0.025]">
      <div className="hidden border-b border-gray-100 bg-gray-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 xl:grid xl:grid-cols-[180px_minmax(190px,1fr)_170px_160px_105px_130px_34px]">
        <span>Sipariş</span>
        <span>Müşteri</span>
        <span>Durum</span>
        <span>Ödeme</span>
        <span>Ürün</span>
        <span>Tutar</span>
        <span />
      </div>
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} paymentMethods={paymentMethods as any} />
      ))}
    </div>
  );
}

export default async function AdminOrdersPage({ searchParams }: OrdersPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const filters = parseFilters(resolvedSearchParams);
  const [orders, paymentMethods] = await Promise.all([getAdminOrders(filters), getAdminPaymentMethods()]);
  const activeFilterCount = [filters.query, filters.status, filters.paymentStatus].filter(Boolean).length;
  const activeFilterLabels = [
    filters.query ? `Arama: ${filters.query}` : null,
    filters.status ? `Sipariş: ${orderStatusLabels[filters.status]}` : null,
    filters.paymentStatus ? `Ödeme: ${paymentStatusLabels[filters.paymentStatus]}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Siparişler</p>
          <CardTitle className="mt-3">Sipariş operasyonu</CardTitle>
          <CardDescription className="mt-2 max-w-3xl">
            Sipariş, ödeme durumu ve yöntem atamasını tek ekrandan yönetin. Son seçilen ödeme yöntemi ödeme denemesi kaydına da işlenir.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
        <form className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(2,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="search"
                name="query"
                defaultValue={filters.query ?? ''}
                placeholder="Sipariş no, müşteri adı veya e-posta ara"
                className="pl-11"
              />
            </div>

            <Select name="status" defaultValue={filters.status ?? ''}>
              <option value="">Tüm sipariş durumları</option>
              {Object.entries(orderStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Select name="paymentStatus" defaultValue={filters.paymentStatus ?? ''}>
              <option value="">Tüm ödeme durumları</option>
              {Object.entries(paymentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Akış</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{orders.length} sipariş</p>
              {activeFilterLabels.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <span key={label} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="secondary" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtrele
              </Button>
              {activeFilterCount > 0 ? (
                <Link
                  href="/admin/orders"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                >
                  <X className="h-4 w-4" />
                  Temizle
                </Link>
              ) : null}
            </div>
          </div>
        </form>

        {orders.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Sipariş bulunamadı"
            description="Bu filtrelerle eşleşen sipariş kaydı bulunmamaktadır."
          />
        ) : (
          <OrdersTable orders={orders} paymentMethods={paymentMethods as any} />
        )}
        </CardContent>
      </Card>
    </div>
  );
}

