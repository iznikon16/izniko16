import { getAccountStatement } from '@/lib/accounting/queries';
import { requireAdminSession } from '@/lib/auth/admin';
import { formatCommercePrice } from '@/lib/commerce/format';
import { ACCOUNT_TRANSACTION_LABELS } from '@/lib/accounting/types';

export const dynamic = 'force-dynamic';

/**
 * Cari ekstre PDF çıktısı (UTF-8 / Türkçe karakter uyumlu, print-friendly).
 * Tarayıcının yazdır kutusu üzerinden PDF'e çevrilir.
 */

export default async function StatementPdfPage({
  searchParams,
}: {
  searchParams: Promise<{ customer: string; from?: string; to?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const customerId = params.customer;
  const toDate = params.to || new Date().toISOString().slice(0, 10);
  const from = params.from || '';
  const fromDate = from || toDate;

  const statement = await getAccountStatement(customerId, fromDate, toDate);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-gray-900">
      {/* Firma bilgileri */}
      <div className="mb-6 border-b border-gray-300 pb-4">
        <h1 className="text-xl font-bold">Cari Ekstre</h1>
        <p className="mt-1 text-sm text-gray-600">İzniko Ticaret</p>
      </div>

      {/* Müşteri + dönem */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-semibold text-gray-500">Müşteri</p>
          <p>{statement.customer?.full_name || statement.customer?.email || '—'}</p>
          <p>{statement.customer?.phone}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-500">Dönem</p>
          <p>
            {new Date(`${fromDate}T00:00:00`).toLocaleDateString('tr-TR')} - {new Date(`${toDate}T00:00:00`).toLocaleDateString('tr-TR')}
          </p>
        </div>
      </div>

      {/* Özet */}
      <div className="mb-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          { label: 'Açılış', value: statement.openingBalance },
          { label: 'Borç', value: statement.totalDebit },
          { label: 'Alacak', value: statement.totalCredit },
          { label: 'Kapanış', value: statement.closingBalance },
        ].map((item) => (
          <div key={item.label} className="rounded border border-gray-200 p-3">
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-1 font-bold">{formatCommercePrice(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Tablo */}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-gray-300 text-left">
            <th className="py-2 pr-2">Tarih</th>
            <th className="py-2 pr-2">Belge No</th>
            <th className="py-2 pr-2">Açıklama</th>
            <th className="py-2 pr-2 text-right">Borç</th>
            <th className="py-2 pr-2 text-right">Alacak</th>
            <th className="py-2 text-right">Bakiye</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-2 pr-2">{new Date(`${fromDate}T00:00:00`).toLocaleDateString('tr-TR')}</td>
            <td className="py-2 pr-2">—</td>
            <td className="py-2 pr-2 font-medium">Devir</td>
            <td className="py-2 pr-2" />
            <td className="py-2 pr-2" />
            <td className="py-2 text-right font-semibold">{formatCommercePrice(statement.openingBalance)}</td>
          </tr>
          {statement.lines.map((line) => (
            <tr key={line.id} className="border-b border-gray-100">
              <td className="py-2 pr-2">{new Date(line.date).toLocaleDateString('tr-TR')}</td>
              <td className="py-2 pr-2 font-mono">{line.documentNo}</td>
              <td className="py-2 pr-2">
                {line.description} <span className="text-gray-500">({ACCOUNT_TRANSACTION_LABELS[line.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? line.type})</span>
              </td>
              <td className="py-2 pr-2 text-right">{line.debit > 0 ? formatCommercePrice(line.debit) : ''}</td>
              <td className="py-2 pr-2 text-right">{line.credit > 0 ? formatCommercePrice(line.credit) : ''}</td>
              <td className="py-2 text-right font-semibold">{formatCommercePrice(line.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 text-center text-xs text-gray-500">
        Bu belge sistem tarafından {new Date().toLocaleString('tr-TR')} tarihinde oluşturulmuştur.
      </div>

      {/* Print script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(() => {
              if (window.print) window.print();
              setTimeout(() => { if (window.close) window.close(); }, 500);
            }, 600);
          `,
        }}
      />
      <style>{`body { background: #fff; margin: 0; } @media print { .no-print { display: none } }`}</style>
    </div>
  );
}
