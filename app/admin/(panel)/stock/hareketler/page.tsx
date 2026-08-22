import { requireAdminSession } from '@/lib/auth/admin';
import { getStockMovementsPage } from '@/lib/stock/queries';
import { STOCK_MOVEMENT_LABELS } from '@/lib/accounting/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';
import { parsePageParam } from '@/lib/pagination';
import { Filter, Search, ShieldCheck, Warehouse } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; type?: string; from?: string; to?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const movementsPage = await getStockMovementsPage({ page, pageSize: 25, search: params.q, type: params.type, from: params.from, to: params.to });

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">Stok Hareketleri</h1><span className="inline-flex items-center gap-2 rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-medium text-sky-500"><ShieldCheck className="size-4" /> Silinemez kayıt</span></div>
        <p className="mt-2 text-base text-slate-500">Tüm stok giriş/çıkış geçmişi (immutable, silinmez).</p>
      </header>

      <form method="get" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(240px,1fr)_minmax(180px,.8fr)_minmax(360px,1.4fr)_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium text-slate-700">Ürün<span className="relative"><Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={params.q ?? ''} placeholder="Ürün ara..." className="h-12 w-full rounded-lg border border-slate-200 pl-11 pr-3 font-normal outline-none focus:border-sky-400" /></span></label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">Tip<select name="type" defaultValue={params.type ?? ''} className="h-12 rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-sky-400"><option value="">Tümü</option>{Object.entries(STOCK_MOVEMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <fieldset className="grid gap-2"><legend className="text-sm font-medium text-slate-700">Tarih aralığı</legend><div className="grid grid-cols-2 gap-2"><input type="date" name="from" defaultValue={params.from ?? ''} className="h-12 rounded-lg border border-slate-200 px-3 outline-none focus:border-sky-400" /><input type="date" name="to" defaultValue={params.to ?? ''} className="h-12 rounded-lg border border-slate-200 px-3 outline-none focus:border-sky-400" /></div></fieldset>
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-sky-500 px-6 text-sm font-semibold text-white hover:bg-sky-600"><Filter className="size-4" /> Filtrele</button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><Table>
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
              {movementsPage.rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="font-medium text-gray-900">{m.product?.title || 'Silinmiş ürün'}</span>
                    <p className="text-xs text-gray-500">{m.product?.sku}</p>
                  </TableCell>
                  <TableCell>
                    <span className={m.quantity_change > 0 ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600' : 'rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600'}>
                      {STOCK_MOVEMENT_LABELS[m.type] ?? m.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{m.reference || '—'}</TableCell>
                  <TableCell className={'text-right font-semibold ' + (m.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                  </TableCell>
                  <TableCell className="text-right text-gray-500">{m.previous_quantity}</TableCell>
                  <TableCell className="text-right font-semibold text-gray-900">{m.resulting_quantity}</TableCell>
                  <TableCell className="text-right text-gray-500">{new Date(m.created_at).toLocaleString('tr-TR')}</TableCell>
                </TableRow>
              ))}
              {movementsPage.rows.length === 0 && <TableEmpty colSpan={7}><span className="grid justify-items-center gap-3 py-14"><Warehouse className="size-20 rounded-full bg-slate-50 p-4 text-slate-400" /><span>Henüz stok hareketi bulunmuyor.</span></span></TableEmpty>}
        </TableBody>
      </Table></div>
      <Pagination page={movementsPage.page} pageCount={movementsPage.pageCount} pageSize={movementsPage.pageSize} totalItems={movementsPage.count} itemLabel="hareket" searchParams={params} />
    </div>
  );
}
