import Link from 'next/link';
import { Activity, CheckCircle2, CircleAlert, CreditCard, Mail, MessageSquareText, WalletCards } from 'lucide-react';
import { checkIntegrationConfigurationAction } from '@/app/admin/(panel)/integrations/actions';
import { requireAdminPermission } from '@/lib/auth/admin';
import { getLatestIntegrationChecks, type IntegrationKey } from '@/lib/integrations/health';
import { getSiteOrigin } from '@/lib/mail/mailer';

export const dynamic = 'force-dynamic';

const integrations = [
  { key: 'paytr', label: 'PayTR', href: '/admin/payment-methods', Icon: CreditCard, callback: '/api/payments/paytr/callback', adapter: 'Checkout adaptörü mevcut' },
  { key: 'iyzico', label: 'iyzico', href: '/admin/payment-methods', Icon: CreditCard, callback: '/api/payments/iyzico/callback', adapter: 'Checkout adaptörü mevcut' },
  { key: 'odeal', label: 'Ödeal', href: '/admin/integrations/odeal', Icon: WalletCards, callback: '/api/payments/odeal', adapter: 'Canlı ödeme adaptörü' },
  { key: 'netgsm', label: 'Netgsm', href: '/admin/integrations/netgsm', Icon: MessageSquareText, callback: '', adapter: 'Teslimat testi ayrıca ve ücretli olabilir' },
  { key: 'smtp', label: 'SMTP', href: '/admin/mail', Icon: Mail, callback: '', adapter: 'Bağlantı ve teslimat testleri ayrı tutulur' },
] as const;

export default async function IntegrationsPage() {
  await requireAdminPermission('settings.view');
  const latest = await getLatestIntegrationChecks();
  const origin = getSiteOrigin();

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-4 border-b border-gray-100 pb-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-500"><Activity className="h-6 w-6" /></span>
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">Entegrasyonlar</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">Entegrasyon Durumu</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">API anahtarları gelmeden alanları, ortamı ve callback adreslerini hazırlayın. Bu kontrol dış servise istek göndermez ve ücretli işlem üretmez.</p></div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {integrations.map(({ key, label, href, Icon, callback, adapter }) => {
            const last = latest.get(key as IntegrationKey);
            const ready = last?.status === 'ready' || last?.status === 'success';
            return (
              <article key={key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
                <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-500"><Icon className="h-5 w-5" /></span><div><h2 className="font-semibold text-gray-900">{label}</h2><p className="mt-1 text-xs text-gray-500">{adapter}</p></div></div><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{ready ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}{last ? (ready ? 'Hazır' : 'Eksik') : 'Kontrol edilmedi'}</span></div>
                {callback ? <div className="mt-4 rounded-xl border border-gray-200 bg-white px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Callback / Webhook</p><code className="mt-1 block break-all text-xs text-gray-700">{origin}{callback}</code></div> : null}
                <p className="mt-4 min-h-5 text-xs text-gray-500">{last?.message ?? 'Henüz yapılandırma kontrolü çalıştırılmadı.'}</p>
                {last ? <p className="mt-1 text-[10px] text-gray-400">Son kontrol: {new Date(last.checked_at).toLocaleString('tr-TR')} · {last.environment}</p> : null}
                <div className="mt-4 flex flex-wrap gap-2"><Link href={href} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">Ayarları aç</Link><form action={checkIntegrationConfigurationAction}><input type="hidden" name="integration_key" value={key} /><button className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-sky-700">Yapılandırmayı kontrol et</button></form></div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
