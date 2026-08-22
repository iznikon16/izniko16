import { CalendarDays, ChevronDown, ImageIcon, MapPin, Star } from 'lucide-react';
import { deleteProjectReferenceAction, saveProjectReferenceAction } from '@/app/admin/(panel)/actions';
import { AdminFilePicker, AdminFormPendingNotice } from '@/components/admin/admin-form-feedback';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getAdminProjectReferences } from '@/lib/admin/commerce-queries';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { ProjectReference } from '@/lib/catalog/types';

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function ReferenceForm({ reference }: { reference?: ProjectReference }) {
  return (
    <details open={!reference} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 outline-none marker:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">{reference ? reference.slug : 'Yeni Referans'}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{reference?.title ?? 'Referans kaydı oluştur'}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reference ? (
            <>
              {reference.service_type ? (
                <span className="rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {reference.service_type}
                </span>
              ) : null}
              <span className={reference.is_featured ? 'rounded-full border border-blue-300/24 bg-blue-600/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600' : 'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500'}>
                {reference.is_featured ? 'Öne çıkan' : 'Standart'}
              </span>
              <span className={reference.is_active ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700' : 'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500'}>
                {reference.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </>
          ) : (
            <span className="rounded-full border border-blue-300/20 bg-blue-600/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              Yeni kayıt
            </span>
          )}
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 transition-colors group-open:bg-gray-50">
            <span className="group-open:hidden">Ayarları aç</span>
            <span className="hidden group-open:inline">Formu gizle</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </span>
        </div>
      </summary>

      <div className="border-t border-gray-100 px-5 pb-5 pt-4">
        <form action={saveProjectReferenceAction} encType="multipart/form-data" className="grid gap-4">
          {reference?.id ? <input type="hidden" name="id" value={reference.id} /> : null}

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_150px]">
            <Input
              name="title"
              defaultValue={reference?.title ?? ''}
              placeholder="Referans başlığı"
              required
            />
            <Input
              name="slug"
              defaultValue={reference?.slug ?? ''}
              placeholder="referans-slug"
            />
            <Input
              name="sort_order"
              type="number"
              defaultValue={reference?.sort_order ?? 0}
              placeholder="Sıra"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                name="location"
                defaultValue={reference?.location ?? ''}
                placeholder="Lokasyon"
                className="pl-11"
              />
            </div>
            <Input
              name="service_type"
              defaultValue={reference?.service_type ?? ''}
              placeholder="Hizmet tipi"
            />
            <Input
              name="customer_name"
              defaultValue={reference?.customer_name ?? ''}
              placeholder="Müşteri / site adı"
            />
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                name="completed_at"
                type="date"
                defaultValue={toDateInput(reference?.completed_at)}
                className="pl-11"
              />
            </div>
          </div>

          <Textarea
            name="description"
            rows={4}
            defaultValue={reference?.description ?? ''}
            placeholder="Kısa referans açıklaması"
          />

          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[18px] border border-gray-200 bg-white p-3">
              <div className="flex h-44 items-center justify-center overflow-hidden rounded-[14px] border border-gray-100 bg-gray-50">
                {reference?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reference.imageUrl} alt={reference.image_alt || reference.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Görsel yok</span>
                  </div>
                )}
              </div>
              {reference?.id && reference.imageUrl ? (
                <Label className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer">
                  <Checkbox name="remove_image" />
                  Görseli kaldır
                </Label>
              ) : null}
            </div>

            <div className="grid gap-3">
              <AdminFilePicker
                name="image_file"
                label={reference?.id ? 'Yeni görsel yükle' : 'Görsel yükle'}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                helperText="PNG, JPG, WEBP veya AVIF. Maksimum 2 MB."
                className="bg-white/[0.025]"
              />

              <Input
                name="image_alt"
                defaultValue={reference?.image_alt ?? ''}
                placeholder="Görsel alt metni"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 cursor-pointer">
                  <Checkbox name="is_active" defaultChecked={reference?.is_active ?? true} />
                  Aktif referans
                </Label>
                <Label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 cursor-pointer">
                  <Checkbox name="is_featured" defaultChecked={reference?.is_featured ?? false} />
                  <Star className="h-4 w-4 text-blue-600" />
                  Öne çıkar
                </Label>
              </div>
            </div>
          </div>

          <AdminFormPendingNotice
            label={reference ? 'Referans güncelleniyor...' : 'Referans kaydediliyor...'}
            description="Görsel ve referans bilgileri veritabanına işleniyor."
          />

          <div className="flex flex-wrap gap-2">
            <FormSubmitButton
              idleLabel={reference ? 'Referansı Güncelle' : 'Referans Ekle'}
              pendingLabel={reference ? 'Güncelleniyor...' : 'Kaydediliyor...'}
              className="px-5 text-sm font-semibold"
            />
            {reference?.id ? (
              <FormSubmitButton
                formAction={deleteProjectReferenceAction}
                idleLabel="Sil"
                pendingLabel="Siliniyor..."
                variant="destructive"
                className="px-5 text-sm font-semibold"
              />
            ) : null}
          </div>
        </form>
      </div>
    </details>
  );
}

export default async function AdminReferencesPage() {
  const references = await getAdminProjectReferences();

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Referanslar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Referans yönetimi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Tamamlanan işleri hizmet tipi, lokasyon, görsel ve yayın durumuyla aynı ekrandan yönetin.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <ReferenceForm />
          {references.map((reference) => (
            <ReferenceForm key={reference.id} reference={reference} />
          ))}
        </div>
      </section>
    </div>
  );
}

