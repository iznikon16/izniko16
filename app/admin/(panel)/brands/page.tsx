import { ImageIcon } from 'lucide-react';
import { saveBrandAction, deleteBrandAction } from '@/app/admin/(panel)/actions';
import { AdminFilePicker, AdminFormPendingNotice } from '@/components/admin/admin-form-feedback';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getAdminTaxonomies } from '@/lib/catalog/queries';
import { getStoragePublicUrl } from '@/lib/catalog/utils';

function BrandForm({
  brand,
}: {
  brand?: {
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    logo_path?: string | null;
    sort_order?: number;
    is_active?: boolean;
  };
}) {
  const logoPreviewUrl = getStoragePublicUrl(brand?.logo_path);

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
      <form action={saveBrandAction} encType="multipart/form-data">
        {brand?.id ? <input type="hidden" name="id" value={brand.id} /> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_160px_auto]">
          <input
            name="name"
            defaultValue={brand?.name ?? ''}
            placeholder="Marka adı"
            required
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
          />
          <input
            name="slug"
            defaultValue={brand?.slug ?? ''}
            placeholder="URL anahtarı"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
          />
          <input
            name="sort_order"
            type="number"
            defaultValue={brand?.sort_order ?? 0}
            placeholder="Sıra"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
          />
          <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <input type="checkbox" name="is_active" defaultChecked={brand?.is_active ?? true} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
            Aktif
          </label>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[18px] border border-gray-200 bg-white p-3">
            <div className="flex h-24 items-center justify-center rounded-[14px] border border-gray-100 bg-white">
              {logoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreviewUrl} alt={brand?.name ? `${brand.name} logosu` : 'Marka logosu'} className="max-h-14 max-w-[210px] object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-black/34">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Logo yok</span>
                </div>
              )}
            </div>
            {brand?.id && logoPreviewUrl ? (
              <label className="mt-3 flex items-center gap-2 rounded-[14px] border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                <input type="checkbox" name="remove_logo" className="h-4 w-4 rounded border-gray-200 bg-transparent" />
                Logoyu kaldır
              </label>
            ) : null}
          </div>

          <div className="grid gap-3">
            <AdminFilePicker
              name="logo_file"
              label={brand?.id ? 'Yeni logo yükle' : 'Logo yükle'}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
              helperText="PNG, JPG, WEBP veya AVIF. Maksimum 2 MB."
              className="bg-white/[0.025]"
            />

            <textarea
              name="description"
              rows={3}
              defaultValue={brand?.description ?? ''}
              placeholder="Açıklama"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-colors focus:border-blue-300/40"
            />
          </div>
        </div>

        <AdminFormPendingNotice
          label={brand?.id ? 'Marka güncelleniyor...' : 'Marka kaydediliyor...'}
          description="Logo dosyası ve marka bilgileri Supabase tarafına aktarılıyor."
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <FormSubmitButton
            idleLabel={brand?.id ? 'Güncelle' : 'Marka Ekle'}
            pendingLabel={brand?.id ? 'Güncelleniyor...' : 'Kaydediliyor...'}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-gray-900 transition-colors hover:bg-[#f05a3f] disabled:opacity-70"
          />
        </div>
      </form>
      {brand?.id ? (
        <div className="mt-2">
          <form action={deleteBrandAction}>
            <input type="hidden" name="id" value={brand.id} />
            <FormSubmitButton
              idleLabel="Sil"
              pendingLabel="Siliniyor..."
              className="inline-flex items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-red-100 transition-colors hover:border-red-500/35 hover:bg-red-500/15 disabled:opacity-70"
            />
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default async function BrandsPage() {
  const { brands } = await getAdminTaxonomies();

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Markalar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Marka yönetimi</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
            Marka adı, slug, logo yükleme ve sıralamayı aynı ekrandan yönetin.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <BrandForm />
          {brands.map((brand) => (
            <BrandForm key={brand.id} brand={brand} />
          ))}
        </div>
      </section>
    </div>
  );
}
