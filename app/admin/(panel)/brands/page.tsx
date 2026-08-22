import { Hash, ImageIcon, Plus, Search } from 'lucide-react';
import { saveBrandAction, deleteBrandAction } from '@/app/admin/(panel)/actions';
import { AdminFilePicker, AdminFormPendingNotice } from '@/components/admin/admin-form-feedback';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getAdminTaxonomies } from '@/lib/catalog/queries';
import { getStoragePublicUrl } from '@/lib/catalog/utils';

type BrandInput = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_path: string | null;
  sort_order: number;
  is_active: boolean;
};

function QuickBrandForm() {
  return (
    <form action={saveBrandAction} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input name="name" required placeholder="Marka adı" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
      </label>
      <label className="relative">
        <Hash className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input name="slug" placeholder="URL anahtarı" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
      </label>
      <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-sky-500 bg-white px-5 text-sm font-semibold text-sky-600 hover:bg-sky-50">
        <Plus className="size-4" /> Ekle
      </button>
    </form>
  );
}

function BrandForm({ brand }: { brand: BrandInput }) {
  const logoPreviewUrl = getStoragePublicUrl(brand.logo_path);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <form action={saveBrandAction} className="grid gap-4 xl:grid-cols-[280px_minmax(220px,1fr)_minmax(220px,.8fr)_100px_110px_auto] xl:items-start">
        <input type="hidden" name="id" value={brand.id} />

        <div className="grid gap-2 xl:row-span-2">
          <p className="text-xs font-semibold text-slate-700">Logo</p>
          <div className="flex gap-3">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {logoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreviewUrl} alt={`${brand.name} logosu`} className="max-h-14 max-w-[68px] object-contain" />
              ) : (
                <div className="grid justify-items-center gap-1 text-slate-400"><ImageIcon className="size-5" /><span className="text-[10px]">Logo yok</span></div>
              )}
            </div>
            <AdminFilePicker name="logo_file" label="Logo yükle" accept="image/png,image/jpeg,image/jpg,image/webp,image/avif,image/svg+xml" helperText="PNG, JPG, WEBP, AVIF veya SVG. 200×200 px önerilir." className="min-w-0 flex-1 gap-1.5 border-slate-200 bg-white px-3 py-2" />
          </div>
          {logoPreviewUrl ? <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" name="remove_logo" className="size-4 accent-sky-500" /> Logoyu kaldır</label> : null}
        </div>

        <Field label="Marka"><input name="name" defaultValue={brand.name} required className={inputClass} /></Field>
        <Field label="URL anahtarı"><input name="slug" defaultValue={brand.slug} className={inputClass} /></Field>
        <Field label="Sıra"><input name="sort_order" type="number" defaultValue={brand.sort_order} className={inputClass} /></Field>
        <Field label="Durum"><span className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-700"><input type="checkbox" name="is_active" defaultChecked={brand.is_active} className="size-4 accent-sky-500" /> Aktif</span></Field>

        <div className="flex gap-2 pt-[22px] xl:justify-end">
          <FormSubmitButton idleLabel="Güncelle" pendingLabel="Güncelleniyor..." className="rounded-lg px-4 text-sm font-semibold" />
          <FormSubmitButton formAction={deleteBrandAction} idleLabel="Sil" pendingLabel="Siliniyor..." variant="destructive" className="rounded-lg px-3 text-sm font-semibold" />
        </div>

        <Field label="Açıklama" className="xl:col-span-4"><textarea name="description" rows={2} defaultValue={brand.description ?? ''} placeholder="Açıklama" className={`${inputClass} min-h-10 py-2`} /></Field>
        <div className="xl:col-span-5"><AdminFormPendingNotice label="Marka güncelleniyor..." description="Logo ve marka bilgileri kaydediliyor." /></div>
      </form>
    </article>
  );
}

const inputClass = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

function Field({ children, className = '', label }: { children: React.ReactNode; className?: string; label: string }) {
  return <label className={`grid gap-1.5 text-xs font-semibold text-slate-700 ${className}`}>{label}{children}</label>;
}

export default async function BrandsPage() {
  const { brands } = await getAdminTaxonomies();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Markalar</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">Marka Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-500">Marka adı, URL anahtarı, logo ve sıralama bilgilerini yönetin.</p>
      </header>
      <div className="mt-4 grid gap-3">
        <QuickBrandForm />
        {brands.map((brand) => <BrandForm key={brand.id} brand={brand as BrandInput} />)}
      </div>
    </section>
  );
}
