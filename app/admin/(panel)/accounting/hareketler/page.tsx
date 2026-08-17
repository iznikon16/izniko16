import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AccountTransactionRow, CustomerProfileRow } from '@/lib/catalog/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import { ACCOUNT_TRANSACTION_LABELS } from '@/lib/accounting/types';

export const dynamic = 'force-dynamic';

export default async function AccountMovementsPage() {
  await requireAdminSession();
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
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cari Hareketler</h1>
        <p className="mt-1 text-gray-500">Tüm borç/alacak (ledger) hareketleri. Kayıtlar asla silinmez; düzeltmeler ters kayıt ile yapılır.</p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
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
                <tr key={tx.id} className={tx.is_reversal ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{customer?.full_name || customer?.email || '—'}</span>
                    {order && <p className="text-xs text-gray-500">{order.order_number}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={tx.is_reversal ? 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700' : 'rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'}>
                      {ACCOUNT_TRANSACTION_LABELS[tx.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? tx.type}
                      {tx.is_reversal && ' (İptal)'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tx.description || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{Number(tx.debit) > 0 ? formatCommercePrice(Number(tx.debit)) : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">{Number(tx.credit) > 0 ? formatCommercePrice(Number(tx.credit)) : '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCommercePrice(Number(tx.balance_after))}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{tx.due_date ? new Date(`${tx.due_date}T00:00:00`).toLocaleDateString('tr-TR') : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{new Date(tx.created_at).toLocaleDateString('tr-TR')}</td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Henüz cari hareket bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
