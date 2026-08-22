import { requireAdminPermission } from '@/lib/auth/admin';
import { getDueReceivables } from '@/lib/accounting/queries';
import type { DueReceivableStatus } from '@/lib/accounting/types';
import { formatCommercePrice } from '@/lib/commerce/format';
import { CalendarClock, Inbox, WalletCards } from 'lucide-react';

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
  if (overdueDays > 0) return 'bg-rose-50 text-rose-700';
  if (status === 'PARTIAL_PAID') return 'bg-sky-50 text-sky-600';
  if (status === 'DUE_TODAY' || status === 'APPROACHING') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-600';
}

export default async function OverduePaymentsPage() {
  await requireAdminPermission('account.view');
  const receivables = await getDueReceivables();

  const totalOverdue = receivables.filter((item) => item.overdueDays > 0 && item.remaining > 0).reduce((sum, item) => sum + item.remaining, 0);
  const totalOpen = receivables.filter((item) => item.remaining > 0).reduce((sum, item) => sum + item.remaining, 0);
  const totalApproaching = receivables.filter((item) => item.status === 'APPROACHING' || item.status === 'DUE_TODAY').reduce((sum, item) => sum + item.remaining, 0);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Ön muhasebe</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Vade &amp; Geciken Ödemeler</h1>
        <p className="mt-1 text-gray-500">
          Açık, yaklaşan, kısmi ve gecikmiş alacaklar. Geciken toplam: <span className="font-semibold text-rose-600">{formatCommercePrice(totalOverdue)}</span>
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Açık Alacak', value: totalOpen, icon: WalletCards, tone: 'text-sky-500 bg-sky-50' },
          { label: 'Yaklaşan', value: totalApproaching, icon: CalendarClock, tone: 'text-amber-600 bg-amber-50' },
          { label: 'Geciken', value: totalOverdue, icon: CalendarClock, tone: 'text-rose-600 bg-rose-50' },
        ].map((metric) => (
          <article key={metric.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`grid size-12 place-items-center rounded-xl ${metric.tone}`}><metric.icon className="size-6" /></div>
            <div><p className="text-sm text-slate-500">{metric.label}</p><p className="mt-1 text-2xl font-semibold text-slate-950">{formatCommercePrice(metric.value)}</p></div>
          </article>
        ))}
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                <td className={`px-4 py-3 text-right font-semibold ${item.overdueDays > 0 ? 'text-rose-600' : 'text-gray-900'}`}>{formatCommercePrice(item.remaining)}</td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {item.dueDate ? new Date(`${item.dueDate}T12:00:00Z`).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{item.remainingDays > 0 ? `${item.remainingDays} gün` : '—'}</td>
                <td className="px-4 py-3 text-right text-rose-600">{item.overdueDays > 0 ? `${item.overdueDays} gün` : '—'}</td>
                <td className="px-4 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusTone(item.status, item.overdueDays)}`}>{statusLabels[item.status]}</span></td>
              </tr>
            ))}
            {receivables.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-20 text-center text-gray-500">
                  <Inbox className="mx-auto mb-4 size-14 rounded-full bg-slate-50 p-3 text-slate-400" />
                  <p className="font-medium text-slate-700">Henüz vadeli alacak bulunmuyor.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
