import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OdealSettingsRow } from '@/lib/catalog/types';
import { saveOdealSettingsAction } from '@/app/admin/(panel)/integrations/odeal/actions';
import { SECRET_MASK } from '@/lib/integrations/security';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { SecretInput } from '@/components/admin/secret-input';
import { Code2, Info, Save, ShieldCheck, TriangleAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OdealPage() {
  await requireAdminSession();
  const supabase = createAdminClient();
  const { data } = await supabase.from('odeal_settings').select('*').eq('id', 'main').maybeSingle();
  const settings = (data ?? null) as OdealSettingsRow | null;

  return (
    <div className="mx-auto grid w-full max-w-[980px] gap-5 py-1">
      <header className="text-center"><div className="inline-flex items-center gap-3"><ShieldCheck className="size-9 text-sky-500" /><h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Ödeal Ödeme</h1></div><p className="mt-2 text-base text-slate-500">Ödeal online ödeme altyapısı yapılandırması.</p></header>

      <section className="rounded-2xl border border-[#cbd5e1] bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm md:p-6">
        <div className="mb-5 flex items-center gap-4 border-b border-[#cbd5e1] pb-5"><div className="grid size-12 place-items-center rounded-xl border border-sky-200 bg-white text-sky-500"><Code2 className="size-6" /></div><div><h2 className="text-xl font-semibold text-slate-900">API Yapılandırması</h2><span className="mt-1.5 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"><span className="size-2 rounded-full bg-slate-500" />{settings?.is_enabled ? 'Yapılandırıldı' : 'Yapılandırılmadı'}</span></div></div>
        <ToastActionForm action={saveOdealSettingsAction} successMessage="Ödeal ayarları kaydedildi." errorMessage="Ödeal ayarları kaydedilemedi." className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">API Key<SecretInput name="api_key" defaultValue={settings?.api_key ? SECRET_MASK : ''} placeholder="Ödeal API Key" /></label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-800">Secret Key<SecretInput name="secret_key" defaultValue={settings?.secret_key ? SECRET_MASK : ''} placeholder="Ödeal Secret Key" /></label>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <SwitchField name="is_test_mode" label="Test Modu" defaultChecked={settings?.is_test_mode ?? true} />
              <SwitchField name="is_enabled" label="Aktif" defaultChecked={settings?.is_enabled ?? false} />
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"><Save className="size-4" /> Kaydet</button>
          </div>
        </ToastActionForm>
        <p className="mt-5 flex gap-2.5 text-xs leading-5 text-slate-600"><Info className="mt-0.5 size-4 shrink-0 text-sky-500" />
          Ödeal entegrasyonu ayrı bir payment provider abstraction üzerinden çalışır. Başarılı tahsilat → doğrulama → cari alacak hareketi akışı
          idempotent (aynı callback iki kez bakiyeyi etkilemez) olarak uygulanır. Resmi Ödeal API detayları eklenirken bu ayarlar esas alınır.
        </p>
        <div className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          Anahtarlar şifreli ve maskeli saklanır. Ödeal canlı ödeme adaptörü, resmi hesabınız ve test anahtarlarınızla kabul testinden geçmeden aktif kabul edilmez.
        </div>
      </section>
    </div>
  );
}

function SwitchField({ defaultChecked, label, name }: { defaultChecked: boolean; label: string; name: string }) {
  return <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-800"><span className="relative inline-flex"><input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" /><span className="h-7 w-12 rounded-full bg-slate-200 peer-checked:bg-sky-500" /><span className="absolute left-1 top-1 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" /></span>{label}</label>;
}
