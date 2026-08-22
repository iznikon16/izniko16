import { requireAdminSession } from '@/lib/auth/admin';
import { getXmlSources } from '@/lib/xml/queries';
import { deleteXmlSourceAction, runXmlSyncAction, saveXmlSourceAction } from '@/app/admin/(panel)/integrations/xml/actions';
import type { XmlTargetField } from '@/lib/catalog/types';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { DatabaseZap, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

const TARGET_LABELS: Record<XmlTargetField, string> = {
  name: 'Ürün Adı',
  sku: 'Stok Kodu (SKU)',
  price: 'Satış Fiyatı',
  retail_price: 'Perakende Fiyatı',
  stock: 'Stok',
  image: 'Görsel',
  category: 'Kategori',
  brand: 'Marka',
  description: 'Açıklama',
  barcode: 'Barkod',
};

export default async function XmlSourcesPage() {
  await requireAdminSession();
  const sources = await getXmlSources();

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Entegrasyon</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">XML Kaynakları</h1><p className="mt-2 text-sm text-slate-500">Tedarikçi XML kaynaklarını, fiyat/stok senkronizasyonunu ve alan eşlemelerini yönetin.</p></header>

      {/* Yeni Kaynak Formu */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-900"><DatabaseZap className="size-5 text-sky-500" /> Yeni XML Kaynağı Ekle</h2>
        <ToastActionForm action={saveXmlSourceAction} successMessage="XML kaynağı kaydedildi." errorMessage="XML kaynağı kaydedilemedi." className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <input type="hidden" name="id" value="" />
          <input
            type="text"
            name="name"
            required
            placeholder="Kaynak adı (ör. TEDAŞ Toptan)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-2"
          />
          <input
            type="url"
            name="url"
            required
            placeholder="https://tedarikci.com/urunler.xml"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-2"
          />
          <input
            type="number"
            name="price_markup"
            defaultValue="0"
            step="0.01"
            placeholder="Fiyat %"
            title="Fiyat pazarlama (markup) yüzdesi"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex items-end gap-2">
            <label className="flex flex-1 items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" name="is_active" defaultChecked />
              Aktif
            </label>
            <button className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600">
              Kaydet
            </button>
          </div>
          <input
            type="text"
            name="schedule_minutes"
            defaultValue="60"
            placeholder="Sıklık (dk)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="text"
            name="mappings"
            placeholder='Mapping JSON (örn. [{"source":"ProductName","target":"name"},{"source":"ProductCode","target":"sku"},{"source":"Price","target":"price"},{"source":"Quantity","target":"stock"}])'
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm lg:col-span-5"
          />
        </ToastActionForm>
        <p className="mt-2 text-xs text-gray-500">
          Hedef alanlar: {Object.entries(TARGET_LABELS).map(([k, v]) => `${k} (${v})`).join(' · ')}
        </p>
      </section>

      {/* Kaynaklar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Kaynak</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">URL</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Markup</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Son Çalışma</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Mapping</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sources.map((source) => (
              <tr key={source.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{source.name}</span>
                  <p className="text-xs text-gray-500">Her {source.schedule_minutes} dk</p>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-gray-500">{source.url}</td>
                <td className="px-4 py-3 text-right text-gray-600">%{source.price_markup}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      source.last_status === 'success'
                        ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600'
                        : source.last_status === 'error'
                          ? 'rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600'
                          : source.last_status === 'running'
                            ? 'rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-500'
                            : 'rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500'
                    }
                  >
                    {source.is_active ? (source.last_status || 'idle') : 'pasif'}
                  </span>
                  {source.last_message && <p className="mt-1 max-w-[200px] truncate text-xs text-gray-500">{source.last_message}</p>}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">
                  {source.last_run_at ? new Date(source.last_run_at).toLocaleString('tr-TR') : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600">
                    {source.mappings.length} alan
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <ToastActionForm action={runXmlSyncAction} successMessage="XML senkronizasyonu tamamlandı." errorMessage="XML senkronizasyonu tamamlanamadı.">
                      <input type="hidden" name="id" value={source.id} />
                      <button className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-600">
                        Senkronize Et
                      </button>
                    </ToastActionForm>
                    <ToastActionForm action={deleteXmlSourceAction} successMessage="XML kaynağı silindi." errorMessage="XML kaynağı silinemedi.">
                      <input type="hidden" name="id" value={source.id} />
                      <button className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">
                        Sil
                      </button>
                    </ToastActionForm>
                  </div>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center text-gray-500"><Inbox className="mx-auto mb-4 size-14 rounded-full bg-sky-50 p-3 text-sky-500" /><p className="font-medium text-slate-700">Henüz XML kaynağı eklenmemiş.</p></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
