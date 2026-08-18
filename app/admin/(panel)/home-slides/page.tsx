import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import { deleteHomeSlideAction, saveHomeSlideAction } from '@/app/admin/(panel)/actions';
import { AdminFilePicker, AdminFormPendingNotice } from '@/components/admin/admin-form-feedback';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getAdminHomeSlides } from '@/lib/admin/commerce-queries';
import type { HomeSlide } from '@/lib/catalog/types';

function HomeSlideForm({ slide }: { slide?: HomeSlide }) {
  return (
    <details open={!slide} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 outline-none marker:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">{slide ? `Sıra ${slide.sort_order}` : 'Yeni Slider'}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{slide?.title ?? 'Ana sayfa slider kaydı oluştur'}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {slide ? (
            <span
              className={
                slide.is_active
                  ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700'
                  : 'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500'
              }
            >
              {slide.is_active ? 'Aktif' : 'Pasif'}
            </span>
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
        {slide?.imageUrl ? (
          <div className="mb-4 overflow-hidden rounded-[18px] border border-gray-200 bg-gray-50">
            <div className="relative aspect-[16/6]">
              <Image src={slide.imageUrl} alt={slide.alt_text || slide.title} fill sizes="(max-width: 1024px) 100vw, 820px" className="object-cover object-left" />
            </div>
          </div>
        ) : null}

        <form action={saveHomeSlideAction} encType="multipart/form-data" className="grid gap-3">
          {slide?.id ? <input type="hidden" name="id" value={slide.id} /> : null}

          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <input
              name="title"
              defaultValue={slide?.title ?? ''}
              placeholder="Slider başlığı"
              required
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <input
              name="href"
              defaultValue={slide?.href ?? '/'}
              placeholder="/kampanya/ilkbahar"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              name="alt_text"
              defaultValue={slide?.alt_text ?? ''}
              placeholder="Alternatif metin"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            <input
              name="sort_order"
              type="number"
              defaultValue={slide?.sort_order ?? 0}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <AdminFilePicker
            name="image_file"
            label={slide ? 'Görseli değiştir' : 'Slider görseli yükle'}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
            required={!slide}
            helperText="PNG, JPG, WEBP veya AVIF. Maksimum 2 MB."
          />

          <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <input name="is_active" type="checkbox" defaultChecked={slide?.is_active ?? true} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
            Ana sayfada aktif göster
          </label>

          <AdminFormPendingNotice
            label={slide ? 'Slider güncelleniyor...' : 'Slider yükleniyor...'}
            description="Görsel yükleniyor ve kayıt Supabase tarafında güncelleniyor."
          />

          <div className="flex flex-wrap gap-2">
            <FormSubmitButton
              idleLabel={slide ? 'Sliderı Güncelle' : 'Slider Ekle'}
              pendingLabel={slide ? 'Güncelleniyor...' : 'Yükleniyor...'}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-700 disabled:opacity-70 shadow-sm"
            />
          </div>
        </form>

        {slide?.id ? (
          <form action={deleteHomeSlideAction} className="mt-2">
            <input type="hidden" name="id" value={slide.id} />
            <FormSubmitButton
              idleLabel="Sil"
              pendingLabel="Siliniyor..."
              className="inline-flex items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-red-100 transition-colors hover:border-red-500/35 hover:bg-red-500/15 disabled:opacity-70"
            />
          </form>
        ) : null}
      </div>
    </details>
  );
}

export default async function AdminHomeSlidesPage() {
  const slides = await getAdminHomeSlides();

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Ana Sayfa Slider</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Slider yönetimi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Ana sayfa slider görsellerini, yönlendirme linklerini, sıralamayı ve aktif/pasif durumunu bu ekrandan yönetin.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <HomeSlideForm />
          {slides.map((slide) => (
            <HomeSlideForm key={slide.id} slide={slide} />
          ))}
        </div>
      </section>
    </div>
  );
}

