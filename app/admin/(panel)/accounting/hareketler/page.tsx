import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AccountTransactionRow, CustomerProfileRow } from '@/lib/catalog/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import { ACCOUNT_TRANSACTION_LABELS } from '@/lib/accounting/types';
import { BookOpenCheck, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccountMovementsPage() {
  await requireAdminPermission('account.view');
  const supabase = createAdminClient();

  const [txRes, profilesRes, ordersRes] = await Promise.all([
    supabase.from('account_transactions').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('customer_profiles').select('user_id, full_name, email, phone'),
    supabase.from('orders').select('id, order_number, total, created_at'),
  ]);

  if (txRes.error) throw new Error(txRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);

  const customersById = new Map((profilesRes.data ?? []).map((c) => [c.user_id, c as CustomerProfileRow]));
  const ordersById = new Map((ordersRes.data ?? []).map((o) => [o.id, o]));
  const transactions = (txRes.data ?? []) as AccountTransactionRow[];

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Ön muhasebe</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-500"><BookOpenCheck className="size-5" /></div>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">Cari Hareketler</h1>
            <p className="mt-1 text-sm leading-6 text-slate-500">Tüm borç ve alacak hareketlerini değiştirilemez kayıt düzeniyle izleyin.</p>
          </div>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-600">
          <BookOpenCheck className="size-4" /> Kayıtlar silinmez; düzeltmeler ters kayıt ile yapılır.
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Müşteri</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tip</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Açıklama</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Borç</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Alacak</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Bakiye</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Vade</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const customer = customersById.get(tx.customer_id);
              const order = tx.order_id ? ordersById.get(tx.order_id) : null;
              return (
                <tr key={tx.id} className={tx.is_reversal ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{customer?.full_name || customer?.email || '—'}</span>
                    {order && <p className="text-xs text-gray-500">{order.order_number}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={tx.is_reversal ? 'rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700' : 'rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-600'}>
                      {ACCOUNT_TRANSACTION_LABELS[tx.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? tx.type}
                      {tx.is_reversal && ' (İptal)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tx.description || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-rose-600">{Number(tx.debit) > 0 ? formatCommercePrice(Number(tx.debit)) : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">{Number(tx.credit) > 0 ? formatCommercePrice(Number(tx.credit)) : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCommercePrice(Number(tx.balance_after))}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{tx.due_date ? new Date(`${tx.due_date}T00:00:00`).toLocaleDateString('tr-TR') : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-20 text-center text-gray-500">
                  <Inbox className="mx-auto mb-4 size-14 rounded-full bg-sky-50 p-3 text-sky-500" />
                  <p className="font-medium text-slate-700">Henüz cari hareket bulunmuyor.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
