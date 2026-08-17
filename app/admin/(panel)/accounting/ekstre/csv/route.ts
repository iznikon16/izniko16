import { getAccountStatement } from '@/lib/accounting/queries';
import { requireAdminSession } from '@/lib/auth/admin';
import { ACCOUNT_TRANSACTION_LABELS } from '@/lib/accounting/types';

export const dynamic = 'force-dynamic';

/**
 * Cari ekstre CSV export (UTF-8 BOM'lu, Türkçe karakter korumalı).
 */

export async function GET(request: Request) {
  await requireAdminSession();
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customer') ?? '';
  const toDate = url.searchParams.get('to') || new Date().toISOString().slice(0, 10);
  const fromDate = url.searchParams.get('from') || toDate;

  const statement = await getAccountStatement(customerId, fromDate, toDate);

  const escape = (value: string | number | boolean) => {
    const s = String(value ?? '');
    if (/[";\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows: string[][] = [
    ['Cari Ekstre', '', '', '', '', ''],
    ['Müşteri', statement.customer?.full_name || statement.customer?.email || '', '', '', '', ''],
    ['Dönem', `${fromDate} - ${toDate}`, '', '', '', ''],
    [],
    ['Tarih', 'Belge No', 'Açıklama', 'Borç', 'Alacak', 'Bakiye'],
  ];

  for (const line of statement.lines) {
    rows.push([
      new Date(line.date).toLocaleDateString('tr-TR'),
      line.documentNo,
      `${line.description} (${ACCOUNT_TRANSACTION_LABELS[line.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] ?? line.type})`,
      line.debit > 0 ? line.debit.toFixed(2) : '0',
      line.credit > 0 ? line.credit.toFixed(2) : '0',
      line.balanceAfter.toFixed(2),
    ]);
  }

  rows.push(
    [],
    ['Açılış Bakiyesi', statement.openingBalance.toFixed(2), '', '', '', ''],
    ['Toplam Borç', statement.totalDebit.toFixed(2), '', '', '', ''],
    ['Toplam Alacak', statement.totalCredit.toFixed(2), '', '', '', ''],
    ['Kapanış Bakiyesi', statement.closingBalance.toFixed(2), '', '', '', '']
  );

  // UTF-8 BOM (Türkçe karakter bozulmaması için)
  const bom = '\uFEFF';
  const csv = bom + rows.map((row) => row.map(escape).join(';')).join('\r\n');
  const fileName = `ekstre-${statement.customer?.full_name?.replace(/\s+/g, '-') || 'musteri'}-${fromDate}-${toDate}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
