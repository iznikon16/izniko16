import Link from 'next/link';
import { CheckCircle2, MailCheck, Megaphone, Send, UsersRound, XCircle } from 'lucide-react';
import { sendMarketingEmailAction } from '@/app/admin/(panel)/marketing/actions';
import { getMarketingDashboardData } from '@/lib/admin/marketing-queries';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type AdminMarketingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

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

  return {
    Icon: XCircle,
    className: 'border-rose-200 bg-rose-50 text-rose-700',
    label: status === 'skipped' ? 'Atlandı' : 'Hata',
  };
}

export default async function AdminMarketingPage({ searchParams }: AdminMarketingPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const sent = getSingleParam(resolvedSearchParams.sent);
  const failed = getSingleParam(resolvedSearchParams.failed);
  const skipped = getSingleParam(resolvedSearchParams.skipped);
  const { audience, consentCount, eligibleCount, logs, settings, templates } = await getMarketingDashboardData();
  const defaultTemplateKey = templates[0]?.key ?? 'marketing_campaign_announcement';

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="p-6 md:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">Pazarlama</p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 md:text-4xl">
              İzinli Müşterilere SMTP ile Toplu E-Posta Gönderin
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-500">
              Hedef kitle sadece pazarlama izni açık, bloklanmamış ve e-postası doğrulanmış müşterilerden oluşur. Hazır şablonlar Mail Merkezi üzerinden de düzenlenebilir.
            </p>

            {sent || failed || skipped ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                Gönderim tamamlandı. Gönderilen: {sent || 0}, hata: {failed || 0}, atlanan: {skipped || 0}.
              </div>
            ) : null}
          </div>

          <div className="border-t border-gray-100 bg-gray-50/50 p-6 xl:border-l xl:border-t-0 md:p-8">
            <div className="grid gap-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-500">
                    <UsersRound className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Gönderilebilir Kitle</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{eligibleCount} kişi</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">İzinli</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">{consentCount}</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">SMTP</p>
                  <p className="mt-2 text-xl font-semibold text-gray-900">{settings?.is_enabled ? 'Aktif' : 'Pasif'}</p>
                </div>
              </div>

              <Link href="/admin/mail" className="inline-flex items-center justify-center rounded-lg border border-sky-500 bg-white px-5 py-3 text-sm font-semibold text-sky-600 hover:bg-sky-50">
                Mail Şablonlarını Düzenle
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <form action={sendMarketingEmailAction} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
              <Send className="h-5 w-5" />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">Kampanya E-Posta Hazırla</h3>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Hazır şablon</Label>
              <Select name="template_key" defaultValue={defaultTemplateKey}>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Mail konusu</Label>
              <Input name="campaign_title" required placeholder="Örn: Periyodik Bakım Filtre Kampanyası" />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Ana başlık</Label>
              <Input name="campaign_headline" required placeholder="Örn: Fren Disk ve Balatalarında %15 İndirim" />
            </div>

            <div className="grid gap-2">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">İçerik</Label>
              <Textarea name="campaign_body" rows={7} required placeholder="Kampanya metni, avantajlar ve çağrı..." />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Buton metni</Label>
                <Input name="cta_label" defaultValue="Detayları İncele" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Buton linki</Label>
                <Input name="cta_url" defaultValue={settings ? '' : undefined} placeholder="https://yedekparcagaraji.com/urunler" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={eligibleCount === 0 || templates.length === 0}
              className="mt-2"
            >
              <Megaphone className="h-4 w-4" />
              {eligibleCount} kişiye gönder
            </Button>
          </div>
        </form>

        <div className="grid content-start gap-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
                <MailCheck className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold text-slate-900">Son İzinli Müşteriler</h3>
            </div>

            <div className="mt-4 grid gap-2">
              {audience.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-7 text-sm text-slate-500">Gönderilebilir müşteri yok.</p>
              ) : (
                audience.map((member) => (
                  <div key={member.user_id} className="rounded-[18px] border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-gray-900">{member.full_name || 'İsimsiz müşteri'}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">{member.email}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-900"><span className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-500"><MailCheck className="size-5" /></span>Son Gönderimler</h3>
            <div className="mt-4 grid gap-2">
              {logs.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-7 text-sm text-slate-500">Pazarlama mail logu yok.</p>
              ) : (
                logs.map((log) => {
                  const tone = getLogTone(log.status);
                  const Icon = tone.Icon;

                  return (
                    <div key={log.id} className="rounded-[18px] border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${tone.className}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {tone.label}
                        </span>
                        <span className="text-xs text-gray-500">{dateFormatter.format(new Date(log.created_at))}</span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-gray-900">{log.subject || log.template_key}</p>
                      <p className="mt-1 truncate text-xs text-gray-500">{log.recipient_email}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

