import { randomUUID } from 'node:crypto';
import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PaymentRow, CustomerProfileRow, OrderRow } from '@/lib/catalog/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import { collectPaymentAction, reversePaymentAction } from '@/app/admin/(panel)/accounting/actions';
import { getAllCustomerAccounts } from '@/lib/accounting/queries';
import { getAdminPaymentMethods } from '@/lib/admin/commerce-queries';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { ConfirmActionForm } from '@/components/ui/confirm-action-form';

export const dynamic = 'force-dynamic';

export default async function CollectionsPage() {
  await requireAdminPermission('account.view');
  const supabase = createAdminClient();

  const [paymentsRes, customersRes, ordersRes, allocationsRes, ledgerRes, paymentMethods] = await Promise.all([
    supabase.from('payments').select('*').order('paid_at', { ascending: false }).limit(200),
    supabase.from('customer_profiles').select('user_id, full_name, email, phone'),
    supabase.from('orders').select('id, order_number, total, user_id, status').neq('status', 'cancelled'),
    supabase.from('payment_allocations').select('payment_id, order_id, allocated_amount'),
    supabase.from('account_transactions').select('order_id, debit, credit').not('order_id', 'is', null),
    getAdminPaymentMethods(),
  ]);

  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);
  if (allocationsRes.error) throw new Error(allocationsRes.error.message);
  if (ledgerRes.error) throw new Error(ledgerRes.error.message);

  const customersById = new Map((customersRes.data ?? []).map((c) => [c.user_id, c as CustomerProfileRow]));
  const ordersById = new Map((ordersRes.data ?? []).map((o) => [o.id, o as OrderRow]));
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const allocationByPaymentId = new Map((allocationsRes.data ?? []).map((allocation) => [allocation.payment_id, allocation]));
  const outstandingByOrderId = new Map<string, number>();
  for (const transaction of ledgerRes.data ?? []) {
    if (!transaction.order_id) continue;
    outstandingByOrderId.set(
      transaction.order_id,
      (outstandingByOrderId.get(transaction.order_id) ?? 0) + Number(transaction.debit) - Number(transaction.credit)
    );
  }
  const allocatableOrders = (ordersRes.data ?? []).filter((order) => (outstandingByOrderId.get(order.id) ?? 0) > 0);

  const totalCollected = payments.filter((p) => p.status !== 'reversed').reduce((sum, p) => sum + Number(p.amount), 0);

  // Tahsilat girişi için müşteri havuzu
  const accounts = await getAllCustomerAccounts();
  const customersForForm = accounts.map(({ customer }) => customer);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tahsilatlar</h1>
          <p className="mt-1 text-gray-500">Girilen ve iptal edilen tahsilatlar takip edilir.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm">
          <span className="text-gray-500">Toplam Tahsilat: </span>
          <span className="font-semibold text-emerald-600">{formatCommercePrice(totalCollected)}</span>
        </div>
      </div>

      {/* Yeni Tahsilat Girişi */}
      <div className="mb-6 rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
        <h2 className="mb-4 font-semibold text-gray-900">Yeni Tahsilat Gir</h2>
        <ToastActionForm action={collectPaymentAction} successMessage="Tahsilat başarıyla kaydedildi." errorMessage="Tahsilat kaydedilemedi." className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="idempotency_key" value={`manual-payment:${randomUUID()}`} />
          <select
            name="customer_id"
            required
            defaultValue=""
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-2"
          >
            <option value="" disabled>Müşteri seçin</option>
            {customersForForm.map((customer) => (
              <option key={customer.user_id} value={customer.user_id}>
                {customer.full_name || customer.email || customer.user_id}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="amount"
            required
            step="0.01"
            min="0"
            placeholder="Tutar (₺)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select name="payment_method" defaultValue="" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="" disabled>Ödeme yöntemi</option>
            <option value="Nakit">Nakit</option>
            {paymentMethods.filter((method) => method.is_active).map((method) => (
              <option key={method.id} value={method.name}>{method.name}</option>
            ))}
            <option value="Kredi Kartı">Kredi Kartı</option>
            <option value="Diğer">Diğer</option>
          </select>
          <input
            type="text"
            name="reference_number"
            placeholder="Referans no"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            name="paid_at"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            name="description"
            placeholder="Açıklama"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-3"
          />
          <select name="order_id" defaultValue="" className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-3">
            <option value="">Siparişe dağıtma (opsiyonel)</option>
            {allocatableOrders.map((order) => {
              const customer = customersById.get(order.user_id);
              const remaining = outstandingByOrderId.get(order.id) ?? 0;
              return (
                <option key={order.id} value={order.id}>
                  {customer?.full_name || customer?.email || order.user_id} — {order.order_number} — Kalan {formatCommercePrice(remaining)}
                </option>
              );
            })}
          </select>
          <textarea
            name="note"
            placeholder="İç not"
            rows={2}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-3"
          />
          <div className="lg:col-span-6 flex items-end justify-end">
            <button className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-600">
              Tahsilatı Kaydet
            </button>
          </div>
        </ToastActionForm>
      </div>

      {/* Tahsilat Listesi */}
      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Müşteri</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Tutar</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Yöntem</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Referans</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Açıklama</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Tarih</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Durum</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {payments.map((payment) => {
              const customer = payment.customer_id ? customersById.get(payment.customer_id) : null;
              const order = payment.order_id ? ordersById.get(payment.order_id) : null;
              const isReversed = payment.status === 'reversed';
              const allocation = allocationByPaymentId.get(payment.id);
              return (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{customer?.full_name || customer?.email || '—'}</span>
                    {order && <p className="text-xs text-gray-500">{order.order_number}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCommercePrice(Number(payment.amount))}
                    {allocation ? <p className="text-[11px] font-normal text-blue-600">Siparişe dağıtıldı</p> : null}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{payment.payment_method || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{payment.reference_number || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {payment.description || '—'}
                    {payment.note ? <p className="mt-1 text-xs text-gray-400">Not: {payment.note}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">{new Date(payment.paid_at).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={isReversed ? 'rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600' : 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600'}>
                      {isReversed ? 'İptal' : 'Onaylı'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isReversed && (
                      <ConfirmActionForm
                        action={reversePaymentAction}
                        fields={{ customer_id: payment.customer_id, payment_id: payment.id }}
                        buttonLabel="İptal Et"
                        title="Tahsilat iptal edilsin mi?"
                        description="Tahsilat silinmeyecek; bakiyeyi geri alan immutable ters kayıt oluşturulacak."
                        confirmLabel="Ters Kayıt Oluştur"
                        successMessage="Tahsilat ters kayıtla iptal edildi."
                        errorMessage="Tahsilat iptal edilemedi."
                        variant="destructive"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Henüz tahsilat bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
