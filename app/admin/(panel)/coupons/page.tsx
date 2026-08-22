import { deleteCouponAction, saveCouponAction } from '@/app/admin/(panel)/actions';
import { getAdminCoupons } from '@/lib/admin/commerce-queries';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { formatCommercePrice } from '@/lib/commerce/format';
import type { CouponRow } from '@/lib/catalog/types';
import { ChevronDown } from 'lucide-react';

function toDateTimeLocal(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function CouponForm({ coupon }: { coupon?: CouponRow }) {
  const usageLabel = coupon?.usage_limit ? `${coupon.usage_count}/${coupon.usage_limit}` : `${coupon?.usage_count ?? 0} kullanım`;
  const discountLabel = coupon ? (coupon.discount_type === 'percent' ? `%${coupon.discount_value}` : formatCommercePrice(coupon.discount_value)) : null;

  return (
    <details open={!coupon} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 outline-none marker:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">{coupon ? coupon.code : 'Yeni Kupon'}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{coupon?.title ?? 'Kupon Kodu oluştur'}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {coupon ? (
            <>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {discountLabel}
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">{usageLabel}</span>
              <span className={coupon.is_active ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700' : 'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500'}>
                {coupon.is_active ? 'Aktif' : 'Pasif'}
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
        <form action={saveCouponAction} className="grid gap-3">
          {coupon?.id ? <input type="hidden" name="id" value={coupon.id} /> : null}

          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <input
              name="title"
              defaultValue={coupon?.title ?? ''}
              placeholder="Kupon başlığı"
              required
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="code"
              defaultValue={coupon?.code ?? ''}
              placeholder="KOMBI10"
              required
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm uppercase text-gray-900 outline-none"
            />
          </div>

          <textarea
            name="description"
            rows={2}
            defaultValue={coupon?.description ?? ''}
            placeholder="Kupon açıklaması"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none"
          />

          <div className="grid gap-3 md:grid-cols-4">
            <select name="discount_type" defaultValue={coupon?.discount_type ?? 'fixed'} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none">
              <option value="fixed">Sabit indirim</option>
              <option value="percent">Yüzde indirim</option>
            </select>
            <input
              name="discount_value"
              type="number"
              step="0.01"
              defaultValue={coupon?.discount_value ?? 0}
              placeholder="İndirim"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="minimum_order_total"
              type="number"
              step="0.01"
              defaultValue={coupon?.minimum_order_total ?? 0}
              placeholder="Minimum tutar"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="maximum_discount"
              type="number"
              step="0.01"
              defaultValue={coupon?.maximum_discount ?? ''}
              placeholder="Maksimum indirim"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              name="usage_limit"
              type="number"
              defaultValue={coupon?.usage_limit ?? ''}
              placeholder="Kullanım limiti"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="usage_count"
              type="number"
              defaultValue={coupon?.usage_count ?? 0}
              placeholder="Mevcut kullanım"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(coupon?.starts_at)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(coupon?.ends_at)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <input name="is_active" type="checkbox" defaultChecked={coupon?.is_active ?? true} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
              Aktif kupon
            </label>
            <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <input name="stackable" type="checkbox" defaultChecked={coupon?.stackable ?? false} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
              Diğer indirimlerle birlikte çalışabilir
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <FormSubmitButton idleLabel={coupon ? 'Kuponu Güncelle' : 'Kupon Ekle'} pendingLabel="Kaydediliyor..." className="px-5 text-sm font-semibold" />
            {coupon?.id ? <FormSubmitButton formAction={deleteCouponAction} idleLabel="Sil" pendingLabel="Siliniyor..." variant="destructive" className="px-5 text-sm font-semibold" /> : null}
          </div>
        </form>

      </div>
    </details>
  );
}

export default async function AdminCouponsPage() {
  const coupons = await getAdminCoupons();

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Kuponlar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Kupon yönetimi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Kod, indirim tipi, kullanım limiti ve tarih penceresini aynı ekrandan yönetin. Kullanım sayaçları gerektiğinde elle düzeltilebilir.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <CouponForm />
          {coupons.map((coupon) => (
            <CouponForm key={coupon.id} coupon={coupon} />
          ))}
        </div>
      </section>
    </div>
  );
}

