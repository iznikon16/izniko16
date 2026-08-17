import Image from 'next/image';
import Link from 'next/link';
import { Edit3, ImageIcon, Search, SlidersHorizontal, Star, Trash2, UploadCloud, X } from 'lucide-react';
import { deleteProductImageAction, setFeaturedProductImageAction, uploadMediaImagesAction } from '@/app/admin/(panel)/actions';
import { AdminFilePicker, AdminFormPendingNotice } from '@/components/admin/admin-form-feedback';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getAdminMediaImages, getAdminMediaProducts } from '@/lib/catalog/queries';
import type { AdminMediaFilters } from '@/lib/catalog/types';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type AdminMediaPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): AdminMediaFilters {
  const query = getSingleParam(searchParams.query).trim();
  const productId = getSingleParam(searchParams.productId).trim();
  const featured = getSingleParam(searchParams.featured).trim() as AdminMediaFilters['featured'] | '';

  return {
    featured: featured || undefined,
    productId: productId || undefined,
    query: query || undefined,
  };
}

export default async function AdminMediaPage({ searchParams }: AdminMediaPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const filters = parseFilters(resolvedSearchParams);
  const [products, mediaImages] = await Promise.all([getAdminMediaProducts(), getAdminMediaImages(filters)]);

  const selectedProductName = filters.productId ? products.find((product) => product.id === filters.productId)?.title ?? null : null;
  const activeFilterCount = [filters.query, filters.productId, filters.featured].filter(Boolean).length;
  const activeFilterLabels = [
    filters.query ? `Arama: ${filters.query}` : null,
    selectedProductName ? `Ürün: ${selectedProductName}` : null,
    filters.featured ? `Görünüm: ${filters.featured === 'featured' ? 'Kapak görselleri' : 'Diğer görseller'}` : null,
  ].filter(Boolean) as string[];
  const featuredCount = mediaImages.filter((image) => image.is_featured).length;

  return (
    <div className="grid min-w-0 gap-4">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 border-b border-gray-100 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Medya</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Medya kütüphanesi</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
              Ürün görsellerini tek yerden tarayın, yeni dosya yükleyin, kapak görselini değiştirin veya gereksiz kayıtları kaldırın.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Toplam görsel</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-gray-900">{mediaImages.length}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Kapak görseli</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-gray-900">{featuredCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
          <form className="grid min-w-0 gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 md:p-4">
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(180px,220px)]">
              <label className="flex min-w-0 items-center gap-3 rounded-[14px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600">
                <Search className="h-4 w-4 text-gray-500" />
                <input
                  type="search"
                  name="query"
                  defaultValue={filters.query ?? ''}
                  placeholder="Ürün adı, açıklama veya dosya yolu ara"
                  className="min-w-0 w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-500"
                />
              </label>

              <select name="productId" defaultValue={filters.productId ?? ''} className="min-w-0 w-full rounded-[14px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none">
                <option value="">Tüm ürünler</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>

              <select name="featured" defaultValue={filters.featured ?? ''} className="min-w-0 w-full rounded-[14px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none">
                <option value="">Tüm görseller</option>
                <option value="featured">Kapak görselleri</option>
                <option value="regular">Diğer görseller</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 pt-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-[-0.04em] text-gray-900">{mediaImages.length} görsel</p>
                {activeFilterLabels.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeFilterLabels.map((label) => (
                      <span key={label} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111111] transition-colors hover:bg-white/90"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtrele
                </button>
                {activeFilterCount > 0 ? (
                  <Link
                    href="/admin/media"
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <X className="h-4 w-4" />
                    Temizle
                  </Link>
                ) : null}
              </div>
            </div>
          </form>

          <form action={uploadMediaImagesAction} encType="multipart/form-data" className="grid min-w-0 gap-3 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 p-3 md:p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">Yükleme</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-gray-900">Görsel ekle</h3>
              </div>
              <UploadCloud className="h-5 w-5 text-blue-600" />
            </div>

            <div className="grid min-w-0 gap-2.5">
              <select name="product_id" required defaultValue={filters.productId ?? ''} className="min-w-0 w-full rounded-[14px] border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none">
                <option value="">Ürün seçin</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title}
                  </option>
                ))}
              </select>

              <AdminFilePicker
                name="new_images"
                label="Yeni görseller"
                multiple
                required
                accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                helperText="Birden fazla görsel seçebilirsiniz."
                className="px-3 py-3"
              />

              <AdminFormPendingNotice label="Görseller yükleniyor..." description="Dosya sayısı ve boyutuna göre bu işlem birkaç saniye sürebilir." />

              <FormSubmitButton
                idleLabel="Yükle"
                pendingLabel="Yükleniyor..."
                icon={<UploadCloud className="h-4 w-4" />}
                className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-[#111111] transition-colors hover:bg-white/90 disabled:opacity-70"
              />
            </div>
          </form>
        </div>

        <div className="mt-6">
          {mediaImages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-14 text-center">
              <p className="text-sm text-gray-500">Bu filtrelerle görsel bulunamadı.</p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {mediaImages.map((media) => (
                <article key={media.id} className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                  <div className="relative aspect-[4/3] bg-white">
                    {media.publicUrl ? (
                      <Image src={media.publicUrl} alt={media.alt_text || media.product?.title || 'Ürün görseli'} fill sizes="(max-width: 768px) 100vw, (max-width: 1536px) 50vw, 33vw" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-500">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}
                    {media.is_featured ? (
                      <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-900">
                        <Star className="h-3.5 w-3.5" />
                        Kapak
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-4 p-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">{dateFormatter.format(new Date(media.created_at))}</p>
                      <h3 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight text-gray-900">{media.product?.title ?? 'Ürüne bağlı değil'}</h3>
                      <p className="mt-2 break-all text-xs leading-relaxed text-gray-500">{media.storage_path}</p>
                    </div>

                    <div className="grid gap-2 text-sm text-gray-500">
                      <p>{media.alt_text || 'Alternatif metin girilmemiş.'}</p>
                      {media.caption ? <p className="text-gray-500">{media.caption}</p> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {media.product ? (
                        <Link
                          href={`/admin/products/${media.product.id}`}
                          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                        >
                          <Edit3 className="h-4 w-4" />
                          Ürünü düzenle
                        </Link>
                      ) : null}

                      {!media.is_featured ? (
                        <form action={setFeaturedProductImageAction}>
                          <input type="hidden" name="id" value={media.id} />
                          <FormSubmitButton
                            idleLabel="Kapak yap"
                            pendingLabel="İşleniyor..."
                            icon={<Star className="h-4 w-4" />}
                            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                          />
                        </form>
                      ) : null}

                      <form action={deleteProductImageAction}>
                        <input type="hidden" name="id" value={media.id} />
                        <FormSubmitButton
                          idleLabel="Sil"
                          pendingLabel="Siliniyor..."
                          icon={<Trash2 className="h-4 w-4" />}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:border-red-500/35 hover:bg-red-500/15"
                        />
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
