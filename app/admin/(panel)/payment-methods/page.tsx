import { deletePaymentMethodAction, savePaymentMethodAction } from '@/app/admin/(panel)/actions';
import { PaymentMethodConfigFields } from '@/components/admin/payment-method-config-fields';
import { getAdminPaymentMethods } from '@/lib/admin/commerce-queries';
import type { PaymentMethodRow } from '@/lib/catalog/types';
import { getPaymentIntegrationTypeLabel, getPaymentProviderDefinition, type PaymentProviderKey } from '@/lib/commerce/payment-provider-presets';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { maskPaymentConfig } from '@/lib/integrations/security';

function PaymentMethodForm({ paymentMethod }: { paymentMethod?: PaymentMethodRow }) {
  const provider = (paymentMethod?.provider ?? 'offline') as PaymentProviderKey;
  const providerDefinition = getPaymentProviderDefinition(provider);
  const title = paymentMethod?.name ?? 'Ödeme yöntemi oluştur';
  const eyebrow = paymentMethod ? paymentMethod.code : 'Yeni Yöntem';

  return (
    <details open={!paymentMethod} className="group overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 outline-none marker:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">{title}</h3>
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
          ) : (
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
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
            <Button type="submit">
              {paymentMethod ? 'Yöntemi Güncelle' : 'Yöntem Ekle'}
            </Button>
          </div>
        </form>

        {paymentMethod?.id ? (
          <form action={deletePaymentMethodAction} className="mt-2">
            <input type="hidden" name="id" value={paymentMethod.id} />
            <Button type="submit" variant="destructive">
              Sil
            </Button>
          </form>
        ) : null}
      </div>
    </details>
  );
}

export default async function AdminPaymentMethodsPage() {
  const paymentMethods = await getAdminPaymentMethods();

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-gray-100 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Ödeme Yöntemleri</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Ödeme yöntemi yönetimi</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Checkout&apos;ta gösterilecek yöntemleri, entegrasyon tipini ve API / gizli anahtar konfigürasyonunu bu ekrandan yönetin.
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          <PaymentMethodForm />
          {paymentMethods.map((paymentMethod) => (
            <PaymentMethodForm key={paymentMethod.id} paymentMethod={paymentMethod} />
          ))}
        </div>
      </section>
    </div>
  );
}
