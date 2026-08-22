import { requireAdminSession } from '@/lib/auth/admin';
import { getStockProductsPage, getStockSummary } from '@/lib/stock/queries';
import { manualStockInAction, manualStockOutAction, updateCriticalStockAction } from '@/app/admin/(panel)/stock/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { Pagination } from '@/components/ui/pagination';
import { parsePageParam } from '@/lib/pagination';
import { Boxes, PackageCheck, Search, TriangleAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StockStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const search = params.q || '';
  const page = parsePageParam(params.page);

  const [stockPage, summary] = await Promise.all([
    getStockProductsPage({ search, page, pageSize: 25 }),
    getStockSummary(search),
  ]);

  const products = stockPage.rows;

  const totalProducts = summary.totalProducts;
  const outOfStock = summary.outOfStock;
  const critical = summary.critical;

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Stok yönetimi</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Stok Durumu</h1><p className="mt-2 text-sm text-slate-500">Ürün bazında güncel stokları ve kritik seviyeleri yönetin.</p></header>

      {/* Özet */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Toplam Ürün', value: totalProducts, icon: Boxes, tone: 'bg-sky-50 text-sky-500' },
          { label: 'Stokta Tükenen', value: outOfStock, icon: TriangleAlert, tone: 'bg-rose-50 text-rose-600' },
          { label: 'Kritik Stok', value: critical, icon: PackageCheck, tone: 'bg-amber-50 text-amber-600' },
        ].map((metric) => <article key={metric.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`grid size-12 place-items-center rounded-xl ${metric.tone}`}><metric.icon className="size-6" /></div><div><p className="text-sm text-slate-500">{metric.label}</p><p className="text-2xl font-semibold text-slate-950">{metric.value}</p></div></article>)}
      </section>

      {/* Arama */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form method="get" className="flex gap-2">
          <Input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Ürün veya SKU ara..."
            className="max-w-sm"
          />
          <Button type="submit"><Search className="size-4" /> Ara</Button>
        </form>
      </section>

      {/* Tablo */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ürün</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Mevcut</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Kritik Seviye</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Stok Girişi</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Stok Çıkışı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                const isOut = Number(p.stock_quantity) <= 0;
                const isCritical = !isOut && Number(p.stock_quantity) <= Number(p.critical_stock);
                return (
                  <tr key={p.id} className={isCritical ? 'bg-amber-50/40' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={isOut ? 'font-semibold text-rose-600' : 'font-semibold text-gray-900'}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ToastActionForm action={updateCriticalStockAction} successMessage="Kritik stok seviyesi güncellendi." errorMessage="Kritik stok seviyesi güncellenemedi." className="inline-flex items-center gap-1">
                        <input type="hidden" name="product_id" value={p.id} />
                        <Input
                          type="number"
                          name="critical_stock"
                          defaultValue={p.critical_stock}
                          min="0"
                          className="w-16 h-8 px-2 py-1 text-xs text-right"
                        />
                        <Button type="submit" size="sm">
                          ✓
                        </Button>
                      </ToastActionForm>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOut ? (
                        <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600">Tükendi</span>
                      ) : isCritical ? (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600">Kritik</span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">Yeterli</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ToastActionForm action={manualStockInAction} successMessage="Stok girişi başarıyla kaydedildi." errorMessage="Stok girişi kaydedilemedi." className="inline-flex items-center gap-1">
                        <input type="hidden" name="product_id" value={p.id} />
                        <Input
                          type="number"
                          name="quantity"
                          required
                          min="1"
                          placeholder="Adet"
                          className="w-20 h-8 px-2 py-1 text-xs text-right border-emerald-200"
                        />
                        <Button type="submit" size="sm">
                          +
                        </Button>
                      </ToastActionForm>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ToastActionForm action={manualStockOutAction} successMessage="Stok çıkışı başarıyla kaydedildi." errorMessage="Stok çıkışı kaydedilemedi." className="inline-flex items-center gap-1">
                        <input type="hidden" name="product_id" value={p.id} />
                        <Input
                          type="number"
                          name="quantity"
                          required
                          min="1"
                          placeholder="Adet"
                          className="w-20 h-8 px-2 py-1 text-xs text-right border-rose-200"
                        />
                        <Button type="submit" variant="destructive" size="sm">
                          −
                        </Button>
                      </ToastActionForm>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">Ürün bulunmuyor.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={stockPage.page} pageCount={stockPage.pageCount} pageSize={stockPage.pageSize} totalItems={stockPage.count} itemLabel="ürün" searchParams={params} />
      </div>
    </div>
  );
}
