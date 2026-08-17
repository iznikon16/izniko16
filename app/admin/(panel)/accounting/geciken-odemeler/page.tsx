import { requireAdminSession } from '@/lib/auth/admin';
import { getOverduePayments } from '@/lib/accounting/queries';
import { formatCommercePrice } from '@/lib/commerce/format';

export const dynamic = 'force-dynamic';

export default async function OverduePaymentsPage() {
  await requireAdminSession();
  const overdue = await getOverduePayments();

  const totalOverdue = overdue.reduce((sum, item) => sum + item.remaining, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Geciken Ödemeler</h1>
        <p className="mt-1 text-gray-500">
          Vadesi geçmiş ve kalan bakiyesi olan hareketler. Toplam: <span className="font-semibold text-red-600">{formatCommercePrice(totalOverdue)}</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Müşteri</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Sipariş</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Açıklama</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Toplam</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Tahsil Edilen</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Kalan</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Vade</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Gecikme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {overdue.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{item.customerName}</span>
                  <p className="text-xs text-gray-500">{item.customerPhone}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{item.orderNumber || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{item.description || '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{item.total ? formatCommercePrice(item.total) : '—'}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatCommercePrice(item.collected)}</td>
                <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCommercePrice(item.remaining)}</td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {item.dueDate ? new Date(`${item.dueDate}T00:00:00`).toLocaleDateString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600">{item.overdueDays} gün</span>
                </td>
              </tr>
            ))}
            {overdue.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">🎉 Geciken ödeme bulunmuyor.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
