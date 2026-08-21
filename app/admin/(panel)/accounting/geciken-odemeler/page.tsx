import { requireAdminPermission } from '@/lib/auth/admin';
import { getDueReceivables } from '@/lib/accounting/queries';
import type { DueReceivableStatus } from '@/lib/accounting/types';
import { formatCommercePrice } from '@/lib/commerce/format';

export const dynamic = 'force-dynamic';

const statusLabels: Record<DueReceivableStatus, string> = {
  OPEN: 'Açık',
  APPROACHING: 'Yaklaşıyor',
  DUE_TODAY: 'Bugün',
  OVERDUE: 'Gecikti',
  PARTIAL_PAID: 'Kısmi Ödendi',
  PAID: 'Ödendi',
};

function statusTone(status: DueReceivableStatus, overdueDays: number) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-700';
  if (overdueDays > 0) return 'bg-red-50 text-red-700';
  if (status === 'PARTIAL_PAID') return 'bg-blue-50 text-blue-700';
  if (status === 'DUE_TODAY' || status === 'APPROACHING') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

export default async function OverduePaymentsPage() {
  await requireAdminPermission('account.view');
  const receivables = await getDueReceivables();

  const totalOverdue = receivables.filter((item) => item.overdueDays > 0 && item.remaining > 0).reduce((sum, item) => sum + item.remaining, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vade & Geciken Ödemeler</h1>
        <p className="mt-1 text-gray-500">
          Açık, yaklaşan, kısmi ve gecikmiş alacaklar. Geciken toplam: <span className="font-semibold text-red-600">{formatCommercePrice(totalOverdue)}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Müşteri</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Sipariş</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Açık Borç</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Ödenen</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Kalan</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Vade</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Kalan Gün</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Gecikme Günü</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receivables.map((item) => (
              <tr key={item.transactionId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{item.customerName}</span>
                  <p className="text-xs text-gray-500">{item.customerPhone}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.orderNumber || '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{formatCommercePrice(item.total)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatCommercePrice(item.collected)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${item.overdueDays > 0 ? 'text-red-600' : 'text-gray-900'}`}>{formatCommercePrice(item.remaining)}</td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {item.dueDate ? new Date(`${item.dueDate}T12:00:00Z`).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{item.remainingDays > 0 ? `${item.remainingDays} gün` : '—'}</td>
                <td className="px-4 py-3 text-right text-red-600">{item.overdueDays > 0 ? `${item.overdueDays} gün` : '—'}</td>
                <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusTone(item.status, item.overdueDays)}`}>{statusLabels[item.status]}</span></td>
              </tr>
            ))}
            {receivables.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-500">Henüz vadeli alacak bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
