import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth/admin';
import { getCriticalStockProductsPage } from '@/lib/stock/queries';
import { Pagination } from '@/components/ui/pagination';
import { parsePageParam } from '@/lib/pagination';
import { Boxes, TriangleAlert } from 'lucide-react';

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
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Stok yönetimi</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Kritik Stok</h1>
        <p className="mt-1 text-sm text-slate-500">Kritik stok seviyesinin altına düşen ürünleri ve eksik miktarları izleyin.</p>
      </header>

      <section className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600"><TriangleAlert className="size-5" /></div><div><p className="text-sm text-slate-500">Kritik ürün</p><p className="text-xl font-semibold text-slate-950">{productsPage.count}</p></div></article>
        <article className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="grid size-11 place-items-center rounded-full bg-amber-50 text-amber-600"><Boxes className="size-5" /></div><div><p className="text-sm text-slate-500">Listelenen eksik</p><p className="text-xl font-semibold text-slate-950">{productsPage.rows.reduce((sum, product) => sum + product.deficit, 0)}</p></div></article>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                <tr key={p.id} className="bg-rose-50/40">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-rose-600">{p.stock_quantity}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.critical_stock}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{p.deficit}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href="/admin/stock" className="inline-flex rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-medium text-sky-600 transition hover:border-sky-500 hover:bg-sky-50">
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
