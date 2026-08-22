import Image from 'next/image';
import { ChevronDown, ImageIcon, ImagePlus } from 'lucide-react';
import { deleteHomeSlideAction, saveHomeSlideAction } from '@/app/admin/(panel)/actions';
import { AdminFilePicker, AdminFormPendingNotice } from '@/components/admin/admin-form-feedback';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { getAdminHomeSlides } from '@/lib/admin/commerce-queries';
import type { HomeSlide } from '@/lib/catalog/types';

function HomeSlideForm({ slide }: { slide?: HomeSlide }) {
  if (!slide) {
    return (
      <details open className="group overflow-hidden rounded-2xl border border-[#cbd5e1] bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-6 py-4 marker:hidden">
          <h3 className="text-lg font-semibold text-slate-900">Ana Sayfa Slider Kaydı Oluştur</h3>
          <div className="flex items-center gap-2"><span className="rounded-xl border border-[#0ea5e9] bg-white px-4 py-2 text-xs font-semibold text-[#0284c7]">YENİ KAYIT</span><span className="inline-flex items-center gap-2 rounded-xl border border-[#cbd5e1] px-4 py-2 text-xs font-semibold text-[#475569]">FORMU GİZLE <ChevronDown className="size-4 transition-transform group-open:rotate-180" /></span></div>
        </summary>
        <form action={saveHomeSlideAction} className="grid gap-4 border-t border-slate-200 p-6">
          <div className="grid gap-4 md:grid-cols-2"><FieldLabel label="Slider başlığı"><input name="title" required className={slideInputClass} /></FieldLabel><FieldLabel label="Yönlendirme yolu"><input name="href" defaultValue="/" className={slideInputClass} /></FieldLabel></div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]"><FieldLabel label="Alternatif metin"><input name="alt_text" className={slideInputClass} /></FieldLabel><FieldLabel label="Sıralama (küçükten büyüğe)"><input name="sort_order" type="number" defaultValue={0} className={slideInputClass} /></FieldLabel></div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,.95fr)]">
            <div><p className="mb-2 text-sm font-medium text-slate-700">Slider görseli yükle</p><AdminFilePicker name="image_file" label="Slider görseli yükle" accept="image/png,image/jpeg,image/jpg,image/webp,image/avif" required helperText="PNG, JPG, WEBP veya AVIF. Maksimum 2 MB." className="min-h-52 content-center justify-items-stretch bg-white" /></div>
            <div className="grid min-h-52 place-items-center rounded-2xl border border-[#cbd5e1] bg-[#e8edf4] text-[#475569]"><div className="grid justify-items-center gap-2"><ImageIcon className="size-20 text-slate-300" /><span className="text-sm">Önizleme</span></div></div>
          </div>
          <label className="flex items-center gap-3 border-l-2 border-slate-200 pl-3 text-sm text-slate-700"><input name="is_active" type="checkbox" defaultChecked className="size-4 accent-sky-500" /> Ana sayfada aktif göster</label>
          <AdminFormPendingNotice label="Slider yükleniyor..." description="Görsel ve slider bilgileri kaydediliyor." />
          <FormSubmitButton idleLabel="Slider Ekle" pendingLabel="Yükleniyor..." icon={<ImagePlus className="size-4" />} className="w-fit rounded-lg px-5 text-sm font-semibold" />
        </form>
      </details>
    );
  }

  return (
    <details open={!slide} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 outline-none marker:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">{slide ? `Sıra ${slide.sort_order}` : 'Yeni Slider'}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{slide?.title ?? 'Ana Sayfa Slider Kaydı Oluştur'}</h3>
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
            <span className="rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-500">
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

        <form action={saveHomeSlideAction} className="grid gap-3">
          {slide?.id ? <input type="hidden" name="id" value={slide.id} /> : null}

          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <input
              name="title"
              defaultValue={slide?.title ?? ''}
              placeholder="Slider başlığı"
              required
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
            <input
              name="href"
              defaultValue={slide?.href ?? '/'}
              placeholder="/kampanya/ilkbahar"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              name="alt_text"
              defaultValue={slide?.alt_text ?? ''}
              placeholder="Alternatif metin"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
            <input
              name="sort_order"
              type="number"
              defaultValue={slide?.sort_order ?? 0}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
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
              className="px-5 text-sm font-semibold"
            />
            {slide?.id ? (
              <FormSubmitButton
                formAction={deleteHomeSlideAction}
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

const slideInputClass = 'h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3 text-sm text-[#020617] outline-none transition-all focus:border-[#0ea5e9] focus:ring-2 focus:ring-sky-100';

function FieldLabel({ children, label }: { children: React.ReactNode; label: string }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700">{label}{children}</label>;
}

export default async function AdminHomeSlidesPage() {
  const slides = await getAdminHomeSlides();

  return (
    <div className="grid gap-4">
      <section className="rounded-[2rem] border border-[#cbd5e1] bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm md:p-8">
        <div className="border-b border-[#cbd5e1] pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0284c7]">Ana Sayfa Slider</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#020617]">Slider Yönetimi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#475569]">
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

