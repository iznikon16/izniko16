"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { AlertCircle, CreditCard, Loader2, LockKeyhole, MapPin, ShieldCheck, WalletCards } from "lucide-react";
import { toast } from "sonner";
import type { CheckoutPaymentMethod, CustomerAddressRow } from "@/lib/catalog/types";
import type { CommerceCartSnapshot } from "@/lib/commerce/contracts";
import { submitOrderAction, type CheckoutActionState } from "@/lib/commerce/actions";
import { isCardPaymentProvider } from '@/lib/commerce/payment-method-readiness';
import type { CheckoutAccountStatus } from '@/lib/accounting/checkout';

const initialState: CheckoutActionState = { ok: false };

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount);
}

export default function CheckoutForm({
  addresses,
  accountStatus,
  cart,
  checkoutIdempotencyKey,
  customer,
  paymentMethods,
}: {
  addresses: CustomerAddressRow[];
  accountStatus: CheckoutAccountStatus | null;
  cart: CommerceCartSnapshot;
  checkoutIdempotencyKey: string;
  customer: { email: string; fullName: string; phone: string };
  paymentMethods: CheckoutPaymentMethod[];
}) {
  const [state, formAction, pending] = useActionState(submitOrderAction, initialState);
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? "new");
  const usesNewAddress = selectedAddressId === "new";
  const accountPaymentUnavailable = accountStatus ? !accountStatus.allowed || accountStatus.requiresApproval : true;
  const cardPaymentMethods = paymentMethods.filter((method) => isCardPaymentProvider(method.provider, method.integration_type));
  const otherPaymentMethods = paymentMethods.filter((method) => !isCardPaymentProvider(method.provider, method.integration_type));
  const firstEnabledMethod = paymentMethods.find((method) => method.code !== 'cari-bakiye' || !accountPaymentUnavailable);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(firstEnabledMethod?.id ?? '');
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === selectedPaymentMethodId);
  const cardPaymentSelected = Boolean(selectedPaymentMethod && isCardPaymentProvider(selectedPaymentMethod.provider, selectedPaymentMethod.integration_type));
  const hasUsablePaymentMethod = Boolean(firstEnabledMethod);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="checkout_idempotency_key" value={checkoutIdempotencyKey} />
      <input type="hidden" name="selected_address_id" value={usesNewAddress ? "" : selectedAddressId} />
      <input type="hidden" name="customer_email" value={customer.email} />

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700"><MapPin className="h-5 w-5" /></span>
            <div><h2 className="font-black text-slate-950">Teslimat adresi</h2><p className="text-xs text-slate-500">Siparişinizin gönderileceği adresi seçin.</p></div>
          </div>

          {addresses.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => (
                <label key={address.id} className={`cursor-pointer rounded-2xl border p-4 ${selectedAddressId === address.id ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}>
                  <input type="radio" className="sr-only" checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} />
                  <span className="block text-sm font-black text-slate-900">{address.label}</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-600">{address.address_line}, {address.district} / {address.city}</span>
                </label>
              ))}
              <label className={`cursor-pointer rounded-2xl border p-4 ${usesNewAddress ? "border-sky-500 bg-sky-50" : "border-slate-200"}`}>
                <input type="radio" className="sr-only" checked={usesNewAddress} onChange={() => setSelectedAddressId("new")} />
                <span className="block text-sm font-black text-slate-900">Yeni adres kullan</span>
                <span className="mt-2 block text-xs text-slate-500">Bu sipariş için farklı teslimat adresi girin.</span>
              </label>
            </div>
          )}

          {usesNewAddress && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-slate-700">Ad soyad / firma
                <input name="customer_name" required defaultValue={customer.fullName} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-sky-500" />
              </label>
              <label className="text-sm font-bold text-slate-700">Telefon
                <input name="customer_phone" required defaultValue={customer.phone} inputMode="tel" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-sky-500" />
              </label>
              <label className="text-sm font-bold text-slate-700">Şehir
                <input name="city" required defaultValue="Bursa" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-sky-500" />
              </label>
              <label className="text-sm font-bold text-slate-700">İlçe
                <input name="district" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-sky-500" />
              </label>
              <label className="text-sm font-bold text-slate-700 sm:col-span-2">Açık adres
                <textarea name="address_line" required rows={3} className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-sky-500" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2"><input type="checkbox" name="save_address" className="h-4 w-4 rounded" /> Bu adresi hesabıma kaydet</label>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><CreditCard className="h-5 w-5" /></span>
            <div><h2 className="font-black text-slate-950">Ödeme yöntemi</h2><p className="text-xs text-slate-500">Cari Bakiyeden Öde veya diğer aktif yöntemlerden birini seçin.</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {paymentMethods.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Aktif ödeme yöntemi bulunmuyor. Lütfen yöneticiyle iletişime geçin.</div>
            ) : otherPaymentMethods.map((method) => {
              const isAccountPayment = method.code === 'cari-bakiye';
              const disabled = isAccountPayment && accountPaymentUnavailable;
              return (
                <label key={method.id} className={`flex items-start gap-3 rounded-2xl border p-4 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 ${disabled ? 'cursor-not-allowed border-red-200 bg-red-50 opacity-75' : 'cursor-pointer border-slate-200'}`}>
                  <input type="radio" name="payment_method_id" value={method.id} required disabled={disabled} checked={selectedPaymentMethodId === method.id} onChange={() => setSelectedPaymentMethodId(method.id)} className="mt-1 h-4 w-4" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-black text-slate-900">{isAccountPayment ? <WalletCards className="h-4 w-4 text-sky-700" /> : null}{method.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{method.description || method.instructions || "Güvenli ödeme yöntemi"}</span>
                    {isAccountPayment && accountStatus ? (
                      <span className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs sm:grid-cols-3">
                        <span><span className="block text-slate-400">Cari durum</span><strong className={accountStatus.balance > 0 ? 'text-red-700' : 'text-emerald-700'}>{accountStatus.balance > 0 ? `${formatCurrency(accountStatus.balance)} borç` : accountStatus.balance < 0 ? `${formatCurrency(Math.abs(accountStatus.balance))} alacak` : '₺0,00'}</strong></span>
                        <span><span className="block text-slate-400">Kullanılabilir</span><strong>{accountStatus.riskLimit > 0 ? formatCurrency(accountStatus.availableLimit) : 'Limitsiz'}</strong></span>
                        <span><span className="block text-slate-400">Sipariş sonrası</span><strong>{formatCurrency(accountStatus.projectedBalance)} bakiye</strong></span>
                      </span>
                    ) : null}
                    {disabled ? <span className="mt-2 block text-xs font-bold text-red-700">Cari limit bu işlem için uygun değil veya yönetici onayı gerekiyor.</span> : null}
                  </span>
                </label>
              );
            })}

            <div className={`rounded-2xl border p-4 ${cardPaymentSelected ? 'border-sky-500 bg-sky-50' : cardPaymentMethods.length > 0 ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-75'}`}>
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  aria-label="Kredi Kartı ile Öde"
                  checked={cardPaymentSelected}
                  disabled={cardPaymentMethods.length === 0}
                  onChange={() => setSelectedPaymentMethodId(cardPaymentMethods[0]?.id ?? '')}
                  className="mt-1 h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-900"><CreditCard className="h-4 w-4 text-violet-700" /> Kredi Kartı ile Öde</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Aktif sanal POS sağlayıcınızı seçin. Kart bilgilerinizi bir sonraki güvenli ödeme ekranında gireceksiniz.</p>

                  {cardPaymentMethods.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {cardPaymentMethods.map((method) => (
                        <label key={method.id} className={`cursor-pointer rounded-xl border bg-white p-3 transition ${selectedPaymentMethodId === method.id ? 'border-violet-500 ring-2 ring-violet-100' : 'border-slate-200 hover:border-violet-300'}`}>
                          <input type="radio" name="payment_method_id" value={method.id} required checked={selectedPaymentMethodId === method.id} onChange={() => setSelectedPaymentMethodId(method.id)} className="sr-only" />
                          <span className="block text-sm font-black text-slate-900">{method.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">{method.description || `${method.provider.toUpperCase()} güvenli sanal POS`}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      Aktif ve API bilgileri tamamlanmış bir sanal POS bulunmuyor. Yönetim panelinden PayTR veya iyzico yapılandırıldığında burada otomatik görünecek.
                    </div>
                  )}

                  <div className="mt-3 flex gap-2 text-xs leading-5 text-emerald-700"><ShieldCheck className="h-4 w-4 shrink-0" /> Kart numarası ve CVV İZNİKON sunucularında saklanmaz.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="text-sm font-bold text-slate-700">Sipariş notu
            <textarea name="note" maxLength={2000} rows={3} placeholder="Teslimat veya sipariş notunuz…" className="mt-2 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-sky-500" />
          </label>
          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <label className="flex items-start gap-3"><input type="checkbox" name="legal_acceptance" required className="mt-1 h-4 w-4" /><span>Ön bilgilendirme formunu ve mesafeli satış sözleşmesini okudum, kabul ediyorum.</span></label>
            <label className="flex items-start gap-3"><input type="checkbox" name="privacy_acceptance" required className="mt-1 h-4 w-4" /><span>KVKK aydınlatma ve gizlilik metinlerini okudum, kabul ediyorum.</span></label>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-lg font-black text-slate-950">Ödeme özeti</h2>
        <div className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-1">
          {cart.lines.map((line) => (
            <div key={line.id} className="flex gap-3 border-b border-slate-100 pb-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- legacy catalog images may come from configured supplier URLs */}
              <img src={line.product.featuredImageUrl || "/logo.png"} alt="" className="h-14 w-14 rounded-lg bg-slate-50 object-contain p-1" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{line.product.title}</p><p className="mt-1 text-xs text-slate-500">{line.quantity} adet</p></div>
              <p className="text-sm font-black text-slate-900">{formatCurrency(line.lineTotal)}</p>
            </div>
          ))}
        </div>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Ara toplam</dt><dd className="font-bold">{formatCurrency(cart.subtotal)}</dd></div>
          {cart.discountTotal > 0 && <div className="flex justify-between text-emerald-700"><dt>İndirim</dt><dd className="font-bold">−{formatCurrency(cart.discountTotal)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-4 text-lg"><dt className="font-black">Toplam</dt><dd className="font-black text-sky-700">{formatCurrency(cart.total)}</dd></div>
        </dl>
        {state.error && <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{state.error}</div>}
        <button disabled={pending || !hasUsablePaymentMethod} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
          {pending ? "Sipariş oluşturuluyor…" : cardPaymentSelected ? "Güvenli kart ekranına geç" : "Siparişi güvenle tamamla"}
        </button>
        <div className="mt-4 flex gap-2 text-xs leading-5 text-emerald-700"><ShieldCheck className="h-5 w-5 shrink-0" /> Tutarlar sunucuda yeniden hesaplanır; aynı işlem iki kez sipariş oluşturmaz.</div>
        <Link href="/sepet" className="mt-4 block text-center text-xs font-bold text-slate-500 hover:text-slate-800">Sepete geri dön</Link>
      </aside>
    </form>
  );
}
