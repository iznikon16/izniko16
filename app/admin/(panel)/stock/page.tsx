import { requireAdminSession } from '@/lib/auth/admin';
import { getAllStockProducts } from '@/lib/stock/queries';
import { manualStockInAction, manualStockOutAction, updateCriticalStockAction } from '@/app/admin/(panel)/stock/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToastActionForm } from '@/components/ui/toast-action-form';

export const dynamic = 'force-dynamic';

export default async function StockStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const search = params.q || '';
  const products = await getAllStockProducts(search);

  const totalProducts = products.length;
  const outOfStock = products.filter((p) => Number(p.stock_quantity) <= 0).length;
  const critical = products.filter((p) => Number(p.stock_quantity) <= Number(p.critical_stock)).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Stok Durumu</h1>
        <p className="mt-1 text-gray-500">Ürün bazında güncel stok ve kritik seviye yönetimi.</p>
      </div>

      {/* Özet */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <p className="text-xs font-medium text-gray-500">Toplam Ürün</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalProducts}</p>
        </div>
        <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <p className="text-xs font-medium text-gray-500">Stokta Tükenen</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{outOfStock}</p>
        </div>
        <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <p className="text-xs font-medium text-gray-500">Kritik Stok</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{critical}</p>
        </div>
      </div>

      {/* Arama */}
      <div className="mb-4">
        <form method="get" className="flex gap-2">
          <Input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Ürün veya SKU ara..."
            className="max-w-sm"
          />
          <Button type="submit">Ara</Button>
        </form>
      </div>

      {/* Tablo */}
      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
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
                      <span className={isOut ? 'font-semibold text-red-600' : 'font-semibold text-gray-900'}>
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
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600">Tükendi</span>
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
                          className="w-20 h-8 px-2 py-1 text-xs text-right border-red-200"
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
      </div>
    </div>
  );
}
