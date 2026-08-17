import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth/admin';
import { getCriticalStockProducts } from '@/lib/stock/queries';

export const dynamic = 'force-dynamic';

export default async function CriticalStockPage() {
  await requireAdminSession();
  const products = await getCriticalStockProducts();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kritik Stok</h1>
        <p className="mt-1 text-gray-500">Kritik stok seviyesinin altına düşen ürünler.</p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ürün</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">SKU</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Mevcut</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Kritik Seviye</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Eksik</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="bg-amber-50/30 hover:bg-amber-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-red-600">{p.stock_quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.critical_stock}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{p.deficit}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href="/admin/stok" className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      Stok Gir
                    </Link>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">🎉 Kritik stok seviyesinde ürün yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
