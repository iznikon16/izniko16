import { deletePaymentMethodAction, savePaymentMethodAction } from '@/app/admin/(panel)/actions';
import { PaymentMethodConfigFields } from '@/components/admin/payment-method-config-fields';
import { getAdminPaymentMethods } from '@/lib/admin/commerce-queries';
import type { PaymentMethodRow } from '@/lib/catalog/types';
import { getPaymentIntegrationTypeLabel, getPaymentProviderDefinition, type PaymentProviderKey } from '@/lib/commerce/payment-provider-presets';
import { ChevronDown, CreditCard, Landmark, Plus, Settings, WalletCards } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { maskPaymentConfig } from '@/lib/integrations/security';
import { requireAdminPermission } from '@/lib/auth/admin';

function PaymentMethodForm({ paymentMethod }: { paymentMethod?: PaymentMethodRow }) {
  const provider = (paymentMethod?.provider ?? 'offline') as PaymentProviderKey;
  const providerDefinition = getPaymentProviderDefinition(provider);
  const title = paymentMethod?.name ?? 'Ödeme yöntemi oluştur';
  const eyebrow = paymentMethod ? paymentMethod.code : 'Yeni Yöntem';
  const MethodIcon = !paymentMethod ? Plus : paymentMethod.code.includes('cari') ? WalletCards : paymentMethod.code.includes('havale') || paymentMethod.code.includes('eft') ? Landmark : CreditCard;

  return (
    <details open={!paymentMethod} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-5 px-6 py-6 outline-none marker:hidden">
        <div className="flex items-center gap-5">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600"><MethodIcon className="h-9 w-9" strokeWidth={1.8} /></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p><h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-500">{paymentMethod?.description || 'Checkout’ta sunulacak yeni bir ödeme yöntemi ekleyin ve yapılandırın.'}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {paymentMethod ? (
            <>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {providerDefinition.label}
              </span>
              <span className="rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {getPaymentIntegrationTypeLabel(paymentMethod.integration_type)}
              </span>
              <span className={paymentMethod.is_active ? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700' : 'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500'}>
                {paymentMethod.is_active ? 'Aktif' : 'Pasif'}
              </span>
            </>
          ) : <span className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-medium text-white"><Plus className="h-4 w-4" />Yeni Kayıt</span>}
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition group-open:bg-slate-50">
            <Settings className="h-4 w-4" /><span className="group-open:hidden">Ayarları Aç</span>
            <span className="hidden group-open:inline">Formu gizle</span>
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </span>
        </div>
      </summary>

      <div className="border-t border-slate-200 bg-slate-50/60 px-6 pb-6 pt-5">
        {paymentMethod ? (
          <div className="mb-4 grid gap-2 rounded-[18px] border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500 sm:grid-cols-3">
            <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Kod: {paymentMethod.code}
            </span>
            <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Sağlayıcı: {providerDefinition.label}
            </span>
            <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              Sıra: {paymentMethod.sort_order ?? 0}
            </span>
          </div>
        ) : null}

        <form action={savePaymentMethodAction} className="grid gap-3">
          {paymentMethod?.id ? <input type="hidden" name="id" value={paymentMethod.id} /> : null}

          <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
            <Input
              name="name"
              defaultValue={paymentMethod?.name ?? ''}
              placeholder="Ödeme yöntemi adı"
              required
            />
            <Input
              name="code"
              defaultValue={paymentMethod?.code ?? ''}
              placeholder={providerDefinition.defaultCode}
            />
          </div>

          <Textarea
            name="description"
            rows={2}
            defaultValue={paymentMethod?.description ?? ''}
            placeholder="Checkout kartında görünecek kısa açıklama"
          />

          <Textarea
            name="instructions"
            rows={2}
            defaultValue={paymentMethod?.instructions ?? ''}
            placeholder="Müşteriye gösterilecek yönlendirme veya ödeme adımı"
          />

          <Label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 cursor-pointer">
            <Checkbox name="is_active" defaultChecked={paymentMethod?.is_active ?? true} />
            Checkout&apos;ta aktif göster
          </Label>

          <PaymentMethodConfigFields
            config={paymentMethod ? maskPaymentConfig(provider, paymentMethod.config) : {}}
            integrationType={paymentMethod?.integration_type ?? providerDefinition.defaultIntegrationType}
            provider={provider}
            sortOrder={paymentMethod?.sort_order ?? 0}
          />

          <p className="text-xs leading-5 text-gray-500">
            API anahtarları ve gizli değerler `config` içinde sadece sunucuda saklanır. Checkout tarafına yalnızca ad, açıklama, yönerge ve tip bilgisi gönderilir.
          </p>

          <div className="flex flex-wrap gap-2">
            <FormSubmitButton idleLabel={paymentMethod ? 'Yöntemi Güncelle' : 'Yöntem Ekle'} pendingLabel="Kaydediliyor..." />
            {paymentMethod?.id ? <FormSubmitButton formAction={deletePaymentMethodAction} idleLabel="Sil" pendingLabel="Siliniyor..." variant="destructive" /> : null}
          </div>
        </form>
      </div>
    </details>
  );
}

export default async function AdminPaymentMethodsPage() {
  await requireAdminPermission('settings.view');
  const paymentMethods = await getAdminPaymentMethods();

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-4">
      <section>
        <div className="border-b border-gray-100 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">Ödeme Yöntemleri</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Ödeme Yöntemi Yönetimi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Checkout&apos;ta gösterilecek yöntemleri, entegrasyon tipini ve API / gizli anahtar konfigürasyonunu bu ekrandan yönetin.
          </p>
        </div>

        <div className="mt-6 grid gap-5">
          <PaymentMethodForm />
          {paymentMethods.map((paymentMethod) => (
            <PaymentMethodForm key={paymentMethod.id} paymentMethod={paymentMethod} />
          ))}
        </div>
      </section>
    </div>
  );
}
