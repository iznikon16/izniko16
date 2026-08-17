import { requireCustomerSession, getCustomerOrders } from '@/lib/commerce/queries';
import { getCustomerAccountWithSummary } from '@/lib/accounting/queries';
import { formatCommercePrice } from '@/lib/commerce/format';

export const dynamic = 'force-dynamic';

export default async function HesabimCariPage() {
  const session = await requireCustomerSession('/hesabim/cari');
  const { summary } = await getCustomerAccountWithSummary(session.user.id);
  const orders = await getCustomerOrders(session.user.id);

  const paidOrdersCount = orders.filter((o) => o.payment_status === 'paid').length;
  const openOrdersCount = orders.length - paidOrdersCount;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Cari Hesabım</h1>
      <p className="mb-6 text-gray-500">Güncel bakiyeniz ve mali özetiniz.</p>

      {/* Cari özet kartları */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Güncel Bakiye</p>
          <p className={`mt-2 text-2xl font-bold ${summary.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatCommercePrice(summary.balance)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Toplam Borç</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCommercePrice(summary.totalDebit)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Toplam Tahsilat</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCommercePrice(summary.totalCredit)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Vadesi Geçmiş</p>
          <p className={`mt-2 text-2xl font-bold ${summary.overdueBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCommercePrice(summary.overdueBalance)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Kredi / Risk Limiti</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCommercePrice(summary.riskLimit)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Kullanılabilir Limit</p>
          <p className={`mt-2 text-2xl font-bold ${summary.availableLimit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCommercePrice(summary.availableLimit)}
          </p>
        </div>
      </div>

      {/* Sipariş özeti */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Sipariş Özeti</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Toplam Sipariş</p>
            <p className="text-xl font-bold text-gray-900">{orders.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Ödenmiş</p>
            <p className="text-xl font-bold text-emerald-600">{paidOrdersCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Açık</p>
            <p className="text-xl font-bold text-red-600">{openOrdersCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
