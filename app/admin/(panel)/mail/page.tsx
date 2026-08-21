import { Activity, CheckCircle2, FileText, Mail, Send, Server, XCircle } from 'lucide-react';
import { saveEmailTemplateAction, saveSmtpSettingsAction, sendSmtpTestAction, verifySmtpConnectionAction } from '@/app/admin/(panel)/mail/actions';
import { Button } from '@/components/ui/button';
import { getAdminEmailTemplates, getAdminMailSettings, getRecentEmailLogs } from '@/lib/admin/mail-queries';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type AdminMailPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const templateVariables = [
  '{{customer_name}}',
  '{{customer_email}}',
  '{{customer_phone}}',
  '{{expires_in}}',
  '{{verification_url}}',
  '{{order_number}}',
  '{{order_total}}',
  '{{order_status}}',
  '{{payment_status}}',
  '{{payment_method}}',
  '{{payment_instructions}}',
  '{{order_items}}',
  '{{orders_url}}',
  '{{admin_order_url}}',
  '{{shipping_address}}',
  '{{site_url}}',
  '{{inquiry_id}}',
  '{{inquiry_subject}}',
  '{{inquiry_source}}',
  '{{inquiry_message}}',
  '{{inquiry_location}}',
  '{{product_title}}',
  '{{services}}',
  '{{admin_inquiry_url}}',
  '{{campaign_title}}',
  '{{campaign_headline}}',
  '{{campaign_body}}',
  '{{cta_url}}',
  '{{cta_label}}',
  '{{sent_at}}',
  '{{unsubscribe_note}}',
];

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function getLogTone(status: string) {
  if (status === 'sent') {
    return {
      Icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      label: 'Gönderildi',
    };
  }

  if (status === 'skipped') {
    return {
      Icon: Activity,
      className: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
      label: 'Atlandı',
    };
  }

  return {
    Icon: XCircle,
    className: 'border-red-500/20 bg-red-500/10 text-red-100',
    label: 'Hata',
  };
}

export default async function AdminMailPage({ searchParams }: AdminMailPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const saved = getSingleParam(resolvedSearchParams.saved);
  const test = getSingleParam(resolvedSearchParams.test);
  const connection = getSingleParam(resolvedSearchParams.connection);
  const [settings, templates, logs] = await Promise.all([getAdminMailSettings(), getAdminEmailTemplates(), getRecentEmailLogs()]);

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">E-posta Merkezi</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">SMTP ve E-posta Şablonları</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
              Üyelik doğrulama, sipariş bilgilendirme ve yönetici bildirimleri burada tanımlanan SMTP üzerinden gönderilir.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">SMTP</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{settings.is_enabled ? 'Aktif' : 'Pasif'}</p>
              <p className="mt-1 truncate text-xs text-gray-500">{settings.host || 'Sunucu girilmedi'}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Şablon</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{templates.filter((template) => template.is_enabled).length} aktif</p>
              <p className="mt-1 text-xs text-gray-500">{templates.length} toplam şablon</p>
            </div>
          </div>
        </div>

        {saved === 'smtp' ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            SMTP ayarları kaydedildi.
          </div>
        ) : null}

        {test === 'sent' ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Test E-postası gönderildi.
          </div>
        ) : null}

        {test === 'failed' ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            Test E-postası gönderilemedi. Lütfen ayarları kontrol edin.
          </div>
        ) : null}

        {connection === 'success' ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">SMTP bağlantısı doğrulandı; e-posta gönderilmedi.</div> : null}
        {connection === 'failed' ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">SMTP bağlantısı doğrulanamadı.</div> : null}

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <form action={saveSmtpSettingsAction} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-600">
                <Server className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">SMTP Ayarı</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-gray-900">Gönderici bağlantısı</h3>
                <p className="mt-1 text-sm leading-6 text-gray-500">Şifre alanını boş bırakırsanız mevcut kayıtlı şifre korunur.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
                <Checkbox name="is_enabled" id="is_enabled" defaultChecked={settings.is_enabled} />
                <Label htmlFor="is_enabled" className="cursor-pointer">SMTP gönderimini aktif et</Label>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Sunucu</Label>
                <Input name="host" defaultValue={settings.host} placeholder="smtp.domain.com" />
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Port</Label>
                <Input name="port" type="number" min={1} max={65535} defaultValue={settings.port} />
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Kullanıcı</Label>
                <Input name="username" defaultValue={settings.username} placeholder="Kullanıcı adı" />
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Şifre</Label>
                <Input name="password" type="password" placeholder={settings.password ? 'Kayıtlı şifre korunur' : 'SMTP şifresi'} />
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 md:col-span-2">
                <Checkbox name="secure" id="secure" defaultChecked={settings.secure} />
                <Label htmlFor="secure" className="cursor-pointer">SSL/TLS secure bağlantı kullan</Label>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Gönderen adı</Label>
                <Input name="from_name" defaultValue={settings.from_name} />
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Gönderen e-posta</Label>
                <Input name="from_email" type="email" defaultValue={settings.from_email} />
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Yanıt adresi</Label>
                <Input name="reply_to" type="email" defaultValue={settings.reply_to} />
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Admin bildirim e-postası</Label>
                <Input name="admin_notification_email" type="email" defaultValue={settings.admin_notification_email} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="submit" variant="default" className="gap-2 shadow-sm">
                SMTP Ayarını Kaydet
              </Button>
              <button type="submit" formAction={verifySmtpConnectionAction} className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-all hover:border-[#0ea5e9] hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                <Send className="h-4 w-4" />
                Bağlantıyı Doğrula
              </button>
            </div>
          </form>

          <div className="grid content-start gap-4">
            <form action={sendSmtpTestAction} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-gray-900">
                  <Send className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">Test</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-gray-900">SMTP bağlantısını dene</h3>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Alıcı e-posta</Label>
                <Input name="test_email" type="email" defaultValue={settings.admin_notification_email || settings.from_email} required />
              </div>
              <button type="submit" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#111111] transition-colors hover:bg-white/90">
                Test E-postası Gönder
              </button>
            </form>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-gray-900">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">Değişkenler</p>
                  <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-gray-900">Şablon anahtarları</h3>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {templateVariables.map((variable) => (
                  <span key={variable} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-500">
                    {variable}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Şablonlar</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Düzenlenebilir E-Postalar</h2>
        </div>

        <div className="mt-5 grid gap-3">
          {templates.map((template) => (
            <details key={template.key} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 transition-colors hover:bg-gray-50 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600">{template.key}</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-gray-900">{template.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-500">{template.description}</p>
                  </div>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${template.is_enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                  {template.is_enabled ? 'Aktif' : 'Pasif'}
                </span>
              </summary>

              <form action={saveEmailTemplateAction} className="grid gap-4 border-t border-gray-100 bg-gray-50 p-5">
                <input type="hidden" name="key" value={template.key} />
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <Checkbox name="is_enabled" id={`is_enabled_${template.key}`} defaultChecked={template.is_enabled} />
                  <Label htmlFor={`is_enabled_${template.key}`} className="cursor-pointer">Bu şablonu aktif kullan</Label>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Konu</Label>
                    <Input name="subject" defaultValue={template.subject} />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Preheader</Label>
                    <Input name="preheader" defaultValue={template.preheader} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">HTML gövde</Label>
                  <Textarea name="html_body" rows={12} defaultValue={template.html_body} className="font-mono text-xs" />
                </div>

                <div className="grid gap-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Düz metin gövde</Label>
                  <Textarea name="text_body" rows={4} defaultValue={template.text_body} />
                </div>

                <button type="submit" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-blue-700">
                  Şablonu Kaydet
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Log</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Son E-posta Hareketleri</h2>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
          {logs.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-gray-500">Henüz E-posta kaydı bulunamadı..</div>
          ) : (
            <div className="divide-y divide-white/8">
              {logs.map((log) => {
                const tone = getLogTone(log.status);
                const Icon = tone.Icon;

                return (
                  <div key={log.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[150px_minmax(0,1fr)_220px_170px] lg:items-center">
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone.className}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {tone.label}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{log.subject || log.template_key || 'Konu yok'}</p>
                      {log.error_message ? <p className="mt-1 truncate text-xs text-red-200/70">{log.error_message}</p> : null}
                    </div>
                    <p className="truncate text-sm text-gray-500">{log.recipient_email}</p>
                    <p className="text-sm text-gray-500 lg:text-right">{dateFormatter.format(new Date(log.created_at))}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}




