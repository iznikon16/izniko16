import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Edit3, ImageIcon, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { deleteProductAction } from '@/app/admin/(panel)/actions';
import { getAdminProducts, getAdminTaxonomies } from '@/lib/catalog/queries';
import type { AdminProductFilters, ProductRow } from '@/lib/catalog/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { getRootCategory } from '@/lib/catalog/utils';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const productStatusLabels: Record<ProductRow['status'], string> = {
  draft: 'Taslak',
  published: 'Yayında',
  archived: 'Arşiv',
};

const stockStatusLabels: Record<ProductRow['stock_status'], string> = {
  in_stock: 'Stokta',
  on_request: 'Sorunuz',
  out_of_stock: 'Tükendi',
};

const ADMIN_PRODUCTS_PER_PAGE = 10;

type AdminProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): AdminProductFilters {
  const query = getSingleParam(searchParams.query).trim();
  const brandId = getSingleParam(searchParams.brandId).trim();
  const rootCategoryId = getSingleParam(searchParams.rootCategoryId).trim();
  const status = getSingleParam(searchParams.status).trim() as ProductRow['status'] | '';
  const stockStatus = getSingleParam(searchParams.stockStatus).trim() as ProductRow['stock_status'] | '';

  return {
    query: query || undefined,
    brandId: brandId || undefined,
    rootCategoryId: rootCategoryId || undefined,
    status: status || undefined,
    stockStatus: stockStatus || undefined,
  };
}

function parsePageParam(value: string | string[] | undefined) {
  const page = Number.parseInt(getSingleParam(value), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((left, right) => left - right);
}

function buildProductsPageHref(filters: AdminProductFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set('query', filters.query);
  }

  if (filters.rootCategoryId) {
    params.set('rootCategoryId', filters.rootCategoryId);
  }

  if (filters.brandId) {
    params.set('brandId', filters.brandId);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.stockStatus) {
    params.set('stockStatus', filters.stockStatus);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const queryString = params.toString();
  return `${queryString ? `/admin/products?${queryString}` : '/admin/products'}#admin-products-results`;
}

function AdminProductsPagination({
  currentPage,
  filters,
  totalItems,
  totalPages,
}: {
  currentPage: number;
  filters: AdminProductFilters;
  totalItems: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const firstVisibleItem = (currentPage - 1) * ADMIN_PRODUCTS_PER_PAGE + 1;
  const lastVisibleItem = Math.min(currentPage * ADMIN_PRODUCTS_PER_PAGE, totalItems);
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="Admin ürün sayfaları"
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
    >
      <p className="text-sm text-gray-500">
        <span className="font-semibold text-gray-900">
          {firstVisibleItem}-{lastVisibleItem}
        </span>{' '}
        / {totalItems} ürün
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {currentPage === 1 ? (
          <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <ChevronLeft className="h-4 w-4" />
            Önceki
          </span>
        ) : (
          <Link
            href={buildProductsPageHref(filters, currentPage - 1)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Önceki
          </Link>
        )}

        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const showGap = previousPage != null && page - previousPage > 1;

            return (
              <span key={page} className="flex items-center gap-1">
                {showGap ? <span className="px-1 text-sm text-gray-500">...</span> : null}
                <Link
                  href={buildProductsPageHref(filters, page)}
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors ${
                    page === currentPage
                      ? 'border-white bg-white text-[#111111]'
                      : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {page}
                </Link>
              </span>
            );
          })}
        </div>

        {currentPage === totalPages ? (
          <span className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Sonraki
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link
            href={buildProductsPageHref(filters, currentPage + 1)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
          >
            Sonraki
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const filters = parseFilters(resolvedSearchParams);
  const [{ brands, categories }, products] = await Promise.all([getAdminTaxonomies(), getAdminProducts(filters)]);
  const totalProducts = products.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / ADMIN_PRODUCTS_PER_PAGE));
  const currentPage = Math.min(parsePageParam(resolvedSearchParams.page), totalPages);
  const paginatedProducts = products.slice((currentPage - 1) * ADMIN_PRODUCTS_PER_PAGE, currentPage * ADMIN_PRODUCTS_PER_PAGE);

  const rootCategories = categories.filter((category) => !category.parent_id);
  const activeFilterCount = [filters.query, filters.brandId, filters.rootCategoryId, filters.status, filters.stockStatus].filter(Boolean).length;
  const brandName = filters.brandId ? brands.find((brand) => brand.id === filters.brandId)?.name ?? null : null;
  const rootCategoryName = filters.rootCategoryId ? rootCategories.find((category) => category.id === filters.rootCategoryId)?.name ?? null : null;
  const activeFilterLabels = [
    filters.query ? `Arama: ${filters.query}` : null,
    brandName ? `Marka: ${brandName}` : null,
    rootCategoryName ? `Ana kategori: ${rootCategoryName}` : null,
    filters.status ? `Durum: ${productStatusLabels[filters.status]}` : null,
    filters.stockStatus ? `Stok: ${stockStatusLabels[filters.stockStatus]}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Ürünler</p>
            <CardTitle className="mt-3">Ürün kataloğu</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Ürünleri arayın, ana kategori, marka ve duruma göre daraltın. Sonuçlar doğrudan veritabanından filtrelenir.
            </CardDescription>
          </div>
          <Link href="/admin/products/new" className={cn(buttonVariants({ variant: "default" }), "gap-2 rounded-full shadow-sm hover:-translate-y-0.5 transition-transform")}>
            <Plus className="h-4 w-4" />
            Yeni Ürün
          </Link>
        </CardHeader>

        <CardContent>
        <form className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="search"
                name="query"
                defaultValue={filters.query ?? ''}
                placeholder="Başlık, stok kodu veya URL anahtarı ara"
                className="pl-11"
              />
            </div>

            <Select name="rootCategoryId" defaultValue={filters.rootCategoryId ?? ''}>
              <option value="">Tüm ana kategoriler</option>
              {rootCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            <Select name="brandId" defaultValue={filters.brandId ?? ''}>
              <option value="">Tüm markalar</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </Select>

            <Select name="status" defaultValue={filters.status ?? ''}>
              <option value="">Tüm durumlar</option>
              <option value="draft">Taslak</option>
              <option value="published">Yayında</option>
              <option value="archived">Arşiv</option>
            </Select>

            <Select name="stockStatus" defaultValue={filters.stockStatus ?? ''}>
              <option value="">Tüm stoklar</option>
              <option value="in_stock">Stokta</option>
              <option value="on_request">Sorunuz</option>
              <option value="out_of_stock">Tükendi</option>
            </Select>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Sonuç</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{totalProducts} ürün</p>
              {totalProducts > 0 ? (
                <p className="mt-1 text-sm text-gray-500">
                  Sayfa {currentPage}/{totalPages} · {(currentPage - 1) * ADMIN_PRODUCTS_PER_PAGE + 1}-{Math.min(currentPage * ADMIN_PRODUCTS_PER_PAGE, totalProducts)} arası gösteriliyor.
                </p>
              ) : null}
              {activeFilterLabels.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <Badge key={label} variant="muted">
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="secondary" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtrele
              </Button>
              {activeFilterCount > 0 ? (
                <Link href="/admin/products" className={cn(buttonVariants({ variant: "ghost" }), "gap-2 text-gray-600")}>
                  <X className="h-4 w-4" />
                  Temizle
                </Link>
              ) : null}
            </div>
          </div>
        </form>

        <div id="admin-products-results" className="mt-6 scroll-mt-8 overflow-hidden rounded-2xl border border-gray-100">
          <div className="grid grid-cols-[minmax(0,1.45fr)_150px_170px_180px_180px_220px] gap-3 bg-gray-50 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 max-lg:hidden">
            <span>Ürün</span>
            <span>Ana Kategori</span>
            <span>Marka</span>
            <span>Durum</span>
            <span>Fiyat</span>
            <span>İşlemler</span>
          </div>

          <div className="divide-y divide-white/8">
            {totalProducts === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Ürün bulunamadı"
                  description="Filtrelere uygun ürün bulunmamaktadır."
                />
              </div>
            ) : (
              paginatedProducts.map((product) => (
                <div key={product.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.45fr)_150px_170px_180px_180px_220px] lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] border border-gray-200 bg-gray-50">
                      {product.featuredImageUrl ? (
                        <Image src={product.featuredImageUrl} alt={product.title} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-500">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">{product.categories[0]?.name ?? 'Kategori yok'}</p>
                      <p className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-gray-900">{product.title}</p>
                      <p className="mt-2 text-sm text-gray-500">Güncelleme: {dateFormatter.format(new Date(product.updated_at))}</p>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">{getRootCategory(product.categories)?.name ?? 'Ana kategori yok'}</div>
                  <div className="text-sm text-gray-600">{product.brand?.name ?? 'Marka seçilmedi'}</div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={product.status === 'published' ? 'success' : product.status === 'archived' ? 'destructive' : 'secondary'}>
                      {productStatusLabels[product.status]}
                    </Badge>
                    <Badge variant={product.stock_status === 'in_stock' ? 'success' : product.stock_status === 'out_of_stock' ? 'destructive' : 'warning'}>
                      {stockStatusLabels[product.stock_status]}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600">{product.priceLabel}</div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/products/${product.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2 rounded-full")}>
                      <Edit3 className="h-4 w-4" />
                      Düzenle
                    </Link>

                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={product.id} />
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        className="gap-2 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                        Sil
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <AdminProductsPagination currentPage={currentPage} filters={filters} totalItems={totalProducts} totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  );
}
