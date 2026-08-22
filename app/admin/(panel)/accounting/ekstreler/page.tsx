import Link from 'next/link';
import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerProfileRow } from '@/lib/catalog/types';
import { getAccountStatement } from '@/lib/accounting/queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { ACCOUNT_TRANSACTION_LABELS } from '@/lib/accounting/types';

export const dynamic = 'force-dynamic';

function todayISODate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

function monthStartISODate() {
  return `${todayISODate().slice(0, 7)}-01`;
}

export default async function StatementsPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; from?: string; to?: string }>;
}) {
  await requireAdminPermission('account.viewStatement');
  const params = await searchParams;
  const selectedCustomerId = params.customer || '';

  const supabase = createAdminClient();
  const { data: customers, error: customersError } = await supabase
    .from('customer_profiles')
    .select('user_id, full_name, email, phone')
    .order('full_name', { ascending: true });

  if (customersError) throw new Error(customersError.message);

  const customerList = (customers ?? []) as Pick<CustomerProfileRow, 'user_id' | 'full_name' | 'email' | 'phone'>[];

  const fromDate = params.from || monthStartISODate();
  const toDate = params.to || todayISODate();

  let statement = null;
  if (selectedCustomerId) {
    statement = await getAccountStatement(selectedCustomerId, fromDate, toDate);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cari Ekstre</h1>
        <p className="mt-1 text-gray-500">Müşteri bazında tarih aralıklı borç/alacak ekstresi.</p>
      </div>

      {/* Filtre formu */}
      <div className="mb-6 rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <select
            name="customer"
            defaultValue={selectedCustomerId}
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-2"
          >
            <option value="" disabled>Müşteri seçin</option>
            {customerList.map((customer) => (
              <option key={customer.user_id} value={customer.user_id}>
                {customer.full_name || customer.email || customer.user_id}
              </option>
            ))}
          </select>
          <input type="date" name="from" defaultValue={fromDate} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input type="date" name="to" defaultValue={toDate} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <button className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-600">
            Ekstre Oluştur
          </button>
        </form>
      </div>

      {!statement && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
          Bir müşteri seçip ekstre oluşturun.
        </div>
      )}

      {statement && (
        <div className="space-y-4">
          {/* Özet */}
          <div className="grid gap-4 sm:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Açılış Bakiyesi</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatCommercePrice(statement.openingBalance)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Toplam Borç</p>
              <p className="mt-1 text-lg font-bold text-red-600">{formatCommercePrice(statement.totalDebit)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Toplam Alacak</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">{formatCommercePrice(statement.totalCredit)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Kapanış Bakiyesi</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatCommercePrice(statement.closingBalance)}</p>
            </div>
            <div className="flex flex-col justify-center rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">Müşteri</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900">{statement.customer?.full_name || statement.customer?.email || '—'}</p>
              <p className="mt-1 text-xs text-gray-500">{statement.accountCode}</p>
            </div>
          </div>

          {/* Ekstre tablo */}
          <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Tarih</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Belge/Hareket No</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Açıklama</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Borç</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Alacak</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Bakiye</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Vade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Açılış satırı */}
                  <tr className="bg-gray-50/60">
                    <td className="px-4 py-3 text-gray-500">{new Date(`${fromDate}T00:00:00`).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-3 text-gray-500">—</td>
                    <td className="px-4 py-3 font-medium text-gray-700">Devir (Açılış Bakiyesi)</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{formatCommercePrice(statement.openingBalance)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                  {statement.lines.map((line) => (
                    <tr key={line.id} className={line.isReversal ? 'bg-red-50/40' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-gray-600">{new Date(line.date).toLocaleDateString('tr-TR')}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{line.documentNo}</td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{line.description}</span>
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                          {ACCOUNT_TRANSACTION_LABELS[line.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? line.type}
                        </span>
                        {line.isReversal && <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-600">İptal</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">{line.debit > 0 ? formatCommercePrice(line.debit) : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">{line.credit > 0 ? formatCommercePrice(line.credit) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCommercePrice(line.balanceAfter)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {line.dueDate ? new Date(`${line.dueDate}T00:00:00`).toLocaleDateString('tr-TR') : '—'}
                      </td>
                    </tr>
                  ))}
                  {statement.lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Bu tarih aralığında hareket bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href={`/admin/accounting/ekstre/pdf?customer=${selectedCustomerId}&from=${fromDate}&to=${toDate}`}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600"
            >
              PDF İndir
            </Link>
            <Link
              href={`/admin/accounting/ekstre/excel?customer=${selectedCustomerId}&from=${fromDate}&to=${toDate}`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Excel İndir
            </Link>
            <Link
              href={`/admin/accounting/ekstre/csv?customer=${selectedCustomerId}&from=${fromDate}&to=${toDate}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              CSV İndir
            </Link>
            <Link
              href={`/admin/accounting/geciken-odemeler`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Geciken Ödemeler
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
