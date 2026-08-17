import { requireAdminSession } from '@/lib/auth/admin';
import { getStockMovements } from '@/lib/stock/queries';
import { STOCK_MOVEMENT_LABELS } from '@/lib/accounting/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

export default async function StockMovementsPage() {
  await requireAdminSession();
  const movements = await getStockMovements();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stok Hareketleri</h1>
        <p className="mt-1 text-gray-500">Tüm stok giriş/çıkış geçmişi (immutable, silinmez).</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ürün</TableHead>
            <TableHead>Tip</TableHead>
            <TableHead>Referans</TableHead>
            <TableHead className="text-right">Değişim</TableHead>
            <TableHead className="text-right">Önceki</TableHead>
            <TableHead className="text-right">Sonuç</TableHead>
            <TableHead className="text-right">Tarih</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="font-medium text-gray-900">{m.product?.title || 'Silinmiş ürün'}</span>
                    <p className="text-xs text-gray-500">{m.product?.sku}</p>
                  </TableCell>
                  <TableCell>
                    <span className={m.quantity_change > 0 ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600' : 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600'}>
                      {STOCK_MOVEMENT_LABELS[m.type] ?? m.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{m.reference || '—'}</TableCell>
                  <TableCell className={'text-right font-semibold ' + (m.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">{m.previous_quantity}</TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">{m.resulting_quantity}</TableCell>
                  <TableCell className="text-right text-gray-500">{new Date(m.created_at).toLocaleString('tr-TR')}</TableCell>
                </TableRow>
              ))}
              {movements.length === 0 && (
                <TableEmpty colSpan={7}>Henüz stok hareketi bulunmuyor.</TableEmpty>
              )}
        </TableBody>
      </Table>
    </div>
  );
}
