import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NetgsmSettingsRow, SmsTemplateRow, SmsLogRow } from '@/lib/catalog/types';
import { saveNetgsmSettingsAction, saveSmsTemplateAction, deleteSmsTemplateAction, sendTestSmsActionResult } from '@/app/admin/(panel)/integrations/netgsm/actions';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { MessageSquareText, Send } from 'lucide-react';

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATES = [
  { key: 'order_created', name: 'Yeni Sipariş', body: 'Sayın {{customerName}}, {{orderNumber}} numaralı siparişiniz alınmıştır.' },
  { key: 'order_status', name: 'Sipariş Durumu', body: 'Sayın {{customerName}}, {{orderNumber}} numaralı siparişiniz {{status}} durumundadır.' },
  { key: 'payment_due_approaching', name: 'Vade Yaklaşıyor', body: 'Sayın {{customerName}}, {{dueDate}} vadeli {{amount}} TL ödemenizin vadesi yaklaşmaktadır.' },
  { key: 'payment_overdue', name: 'Vade Geçti', body: 'Sayın {{customerName}}, {{remainingAmount}} TL bakiyenizin vadesi geçmiştir.' },
  { key: 'payment_received', name: 'Tahsilat Alındı', body: 'Sayın {{customerName}}, {{amount}} TL tahsilatınız işlenmiştir.' },
] as const;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function NetgsmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPermission('settings.view');
  const params = await searchParams;
  const testState = getParam(params.test);
  const supabase = createAdminClient();

  const [settingsRes, templatesRes, logsRes] = await Promise.all([
    supabase.from('netgsm_settings').select('*').eq('id', 'main').maybeSingle(),
    supabase.from('sms_templates').select('*').order('name', { ascending: true }),
    supabase.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(20),
  ]);

  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (templatesRes.error) throw new Error(templatesRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  let settings = (settingsRes.data ?? null) as NetgsmSettingsRow | null;
  if (settings?.password) {
    settings = { ...settings, password: '******' };
  }
  const templates = (templatesRes.data ?? []) as SmsTemplateRow[];
  const logs = (logsRes.data ?? []) as SmsLogRow[];

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between md:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">İletişim</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Netgsm SMS</h1><p className="mt-2 text-sm text-slate-500">SMS API ayarlarını, bildirim şablonlarını ve gönderim kayıtlarını yönetin.</p></div><span className={`inline-flex items-center gap-2 self-start rounded-xl border px-4 py-2 text-sm font-medium ${settings?.is_enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><span className={`size-2 rounded-full ${settings?.is_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />Bağlantı: {settings?.is_enabled ? 'Etkin' : 'Pasif'}</span></header>

      {testState === 'sent' && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Test SMS&apos;i gönderildi.
        </div>
      )}
      {testState === 'failed' && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Test SMS&apos;i gönderilemedi. Ayarları ve Netgsm durumunu kontrol edin.
        </div>
      )}
      {testState === 'hata' && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Telefon ve mesaj zorunludur.
        </div>
      )}

      {/* API Ayarları */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-900"><MessageSquareText className="size-5 text-sky-500" /> API Ayarları</h2>
        <ToastActionForm action={saveNetgsmSettingsAction} successMessage="Netgsm ayarları kaydedildi." errorMessage="Netgsm ayarları kaydedilemedi." className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <input type="text" name="username" defaultValue={settings?.username ?? ''} placeholder="Kullanıcı adı" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input type="password" name="password" defaultValue={settings?.password ?? ''} placeholder="Şifre" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input type="text" name="header" defaultValue={settings?.header ?? ''} placeholder="Başlık (Header)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <div className="flex items-end justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" name="is_enabled" defaultChecked={settings?.is_enabled ?? false} />
              Aktif
            </label>
            <button className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600">Kaydet</button>
          </div>
        </ToastActionForm>

        {/* Test SMS */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Test SMS Gönder</h3>
          <ToastActionForm action={sendTestSmsActionResult} successMessage="Test SMS gönderildi." errorMessage="Test SMS gönderilemedi." className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
            <input type="text" name="phone" placeholder="05xx xxx xx xx" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <input type="text" name="message" placeholder="Test mesajı" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
            <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"><Send className="size-4" /> Gönder</button>
          </ToastActionForm>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Netgsm API ayarları resmi dokümantasyona göre yapılandırılır. Gönderimler sms_logs tablosuna kaydedilir.
        </p>
      </section>

      {/* Şablonlar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">SMS Şablonları</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {templates.length === 0 && DEFAULT_TEMPLATES.map((t) => (
            <ToastActionForm key={t.key} action={saveSmsTemplateAction} successMessage="SMS şablonu oluşturuldu." errorMessage="SMS şablonu oluşturulamadı." className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <input type="hidden" name="key" value={t.key} />
              <div className="flex items-center gap-2">
                <input type="text" name="name" defaultValue={t.name} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium" />
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" name="is_enabled" defaultChecked /> Aktif
                </label>
              </div>
              <input type="text" name="body" defaultValue={t.body} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <div className="mt-2 flex justify-end">
                <button className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-sky-600">Şablonu Oluştur</button>
              </div>
            </ToastActionForm>
          ))}

          {templates.map((t) => (
            <form key={t.key} action={saveSmsTemplateAction} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <input type="hidden" name="key" value={t.key} />
              <div className="flex items-center gap-2">
                <input type="text" name="name" defaultValue={t.name} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium" />
                <code className="text-xs text-gray-500">{t.key}</code>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" name="is_enabled" defaultChecked={t.is_enabled} /> Aktif
                </label>
              </div>
              <input type="text" name="body" defaultValue={t.body} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              <div className="mt-2 flex justify-end gap-2">
                <FormSubmitButton idleLabel="Kaydet" pendingLabel="Kaydediliyor..." size="sm" />
                <FormSubmitButton formAction={deleteSmsTemplateAction} idleLabel="Sil" pendingLabel="Siliniyor..." variant="destructive" size="sm" />
              </div>
            </form>
          ))}
        </div>
      </section>

      {/* Loglar */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">Son Gönderimler</h2>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Telefon</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Şablon</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">İçerik</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">Durum</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Tarih</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700">{log.recipient_phone}</td>
                <td className="px-4 py-3 text-gray-500">{log.template_key || '—'}</td>
                <td className="max-w-[280px] truncate px-4 py-3 text-gray-500">{log.body}</td>
                <td className="px-4 py-3 text-center">
                  <span className={log.status === 'sent' ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600' : 'rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600'}>
                    {log.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{new Date(log.created_at).toLocaleString('tr-TR')}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Henüz SMS gönderilmedi.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
