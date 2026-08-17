import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OdealSettingsRow } from '@/lib/catalog/types';
import { saveOdealSettingsAction } from '@/app/admin/(panel)/integrations/odeal/actions';

export const dynamic = 'force-dynamic';

export default async function OdealPage() {
  await requireAdminSession();
  const supabase = createAdminClient();
  const { data } = await supabase.from('odeal_settings').select('*').eq('id', 'main').maybeSingle();
  const settings = (data ?? null) as OdealSettingsRow | null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ödeal Ödeme</h1>
        <p className="mt-1 text-gray-500">Ödeal online ödeme altyapısı yapılandırması.</p>
      </div>

      <div className="max-w-2xl rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
        <h2 className="mb-4 font-semibold text-gray-900">API Yapılandırması</h2>
        <form action={saveOdealSettingsAction} className="grid gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">API Key</label>
            <input
              type="text"
              name="api_key"
              defaultValue={settings?.api_key ?? ''}
              placeholder="Ödeal API Key"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Secret Key</label>
            <input
              type="password"
              name="secret_key"
              defaultValue={settings?.secret_key ?? ''}
              placeholder="Ödeal Secret Key"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" name="is_test_mode" defaultChecked={settings?.is_test_mode ?? true} />
              Test Modu
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" name="is_enabled" defaultChecked={settings?.is_enabled ?? false} />
              Aktif
            </label>
          </div>
          <div className="flex justify-end">
            <button className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">Kaydet</button>
          </div>
        </form>
        <p className="mt-4 text-xs text-gray-500">
          Ödeal entegrasyonu ayrı bir payment provider abstraction üzerinden çalışır. Başarılı tahsilat → doğrulama → cari alacak hareketi akışı
          idempotent (aynı callback iki kez bakiyeyi etkilemez) olarak uygulanır. Resmi Ödeal API detayları eklenirken bu ayarlar esas alınır.
        </p>
      </div>
    </div>
  );
}
