import { deleteCampaignAction, saveCampaignAction } from '@/app/admin/(panel)/actions';
import { getAdminCampaigns } from '@/lib/admin/commerce-queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import type { CampaignRow } from '@/lib/catalog/types';
import { ChevronDown } from 'lucide-react';

function toDateTimeLocal(value?: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}

function formatJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function CampaignForm({ campaign }: { campaign?: CampaignRow }) {
  const discountLabel = campaign ? (campaign.discount_type === 'percent' ? `%${campaign.discount_value}` : formatCommercePrice(campaign.discount_value)) : null;

  return (
    <details open={!campaign} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 outline-none marker:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">{campaign ? campaign.slug : 'Yeni Kampanya'}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{campaign?.name ?? 'Kampanya kurgusu oluştur'}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {campaign ? (
            <>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {discountLabel}
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {campaign.is_featured ? 'Öne çıkan' : 'Standart'}
              </span>
              <span className={campaign.is_active ? 'rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-100' : 'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500'}>
                {campaign.is_active ? 'Aktif' : 'Pasif'}
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
        <form action={saveCampaignAction} className="grid gap-3">
          {campaign?.id ? <input type="hidden" name="id" value={campaign.id} /> : null}

          <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
            <input
              name="name"
              defaultValue={campaign?.name ?? ''}
              placeholder="Kampanya adı"
              required
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="slug"
              defaultValue={campaign?.slug ?? ''}
              placeholder="kampanya-slug"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
          </div>

          <input
            name="headline"
            defaultValue={campaign?.headline ?? ''}
            placeholder="Manşet"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
          />

          <textarea
            name="description"
            rows={2}
            defaultValue={campaign?.description ?? ''}
            placeholder="Kampanya açıklaması"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none"
          />

          <div className="grid gap-3 md:grid-cols-4">
            <select name="campaign_type" defaultValue={campaign?.campaign_type ?? 'seasonal'} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none">
              <option value="seasonal">Sezonsal</option>
              <option value="discount">İndirim</option>
              <option value="banner">Banner</option>
              <option value="bundle">Bundle</option>
            </select>
            <select name="discount_type" defaultValue={campaign?.discount_type ?? 'percent'} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none">
              <option value="percent">Yüzde</option>
              <option value="fixed">Sabit</option>
            </select>
            <input
              name="discount_value"
              type="number"
              step="0.01"
              defaultValue={campaign?.discount_value ?? 0}
              placeholder="İndirim"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="minimum_order_total"
              type="number"
              step="0.01"
              defaultValue={campaign?.minimum_order_total ?? 0}
              placeholder="Minimum tutar"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(campaign?.starts_at)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={toDateTimeLocal(campaign?.ends_at)}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <input name="is_active" type="checkbox" defaultChecked={campaign?.is_active ?? true} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
              Aktif kampanya
            </label>
            <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <input name="is_featured" type="checkbox" defaultChecked={campaign?.is_featured ?? false} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
              Öne çıkar
            </label>
          </div>

          <details className="group/metadata overflow-hidden rounded-[18px] border border-gray-100 bg-gray-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 outline-none marker:hidden">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Metadata ayarları</span>
              <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open/metadata:rotate-180" />
            </summary>
            <textarea
              name="metadata"
              rows={4}
              defaultValue={formatJson(campaign?.metadata)}
              placeholder={'{\n  "hero": "bahar",\n  "segment": "yeni-musteri"\n}'}
              className="min-h-32 w-full border-t border-gray-100 bg-white px-4 py-3 font-mono text-sm leading-6 text-gray-900 outline-none"
            />
          </details>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.16em] text-gray-900 transition-colors hover:bg-[#f05a3f]">
              {campaign ? 'Kampanyayı Güncelle' : 'Kampanya Ekle'}
            </button>
          </div>
        </form>

        {campaign?.id ? (
          <form action={deleteCampaignAction} className="mt-2">
            <input type="hidden" name="id" value={campaign.id} />
            <button type="submit" className="inline-flex items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-red-100 transition-colors hover:border-red-500/35 hover:bg-red-500/15">
              Sil
            </button>
          </form>
        ) : null}
      </div>
    </details>
  );
}

export default async function AdminCampaignsPage() {
  const campaigns = await getAdminCampaigns();

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Kampanyalar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Kampanya yönetimi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Vitrin kampanyaları, dönemsel indirim kurguları ve operasyonel metadata kayıtları bu ekrandan yönetilir.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <CampaignForm />
          {campaigns.map((campaign) => (
            <CampaignForm key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </section>
    </div>
  );
}
