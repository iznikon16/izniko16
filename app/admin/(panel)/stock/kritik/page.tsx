import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth/admin';
import { getCriticalStockProductsPage } from '@/lib/stock/queries';
import { Pagination } from '@/components/ui/pagination';
import { parsePageParam } from '@/lib/pagination';

export const dynamic = 'force-dynamic';

export default async function CriticalStockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const page = parsePageParam(params.page);
  const productsPage = await getCriticalStockProductsPage(page, 25);

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
              {productsPage.rows.map((p) => (
                <tr key={p.id} className="bg-amber-50/30 hover:bg-amber-50/60">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-red-600">{p.stock_quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.critical_stock}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{p.deficit}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href="/admin/stock" className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      Stok Gir
                    </Link>
                  </td>
                </tr>
              ))}
              {productsPage.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">🎉 Kritik stok seviyesinde ürün yok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={productsPage.page} pageCount={productsPage.pageCount} pageSize={productsPage.pageSize} totalItems={productsPage.count} itemLabel="kritik ürün" searchParams={params} />
      </div>
    </div>
  );
}
