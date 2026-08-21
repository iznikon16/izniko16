'use client';

import type { FormEvent, ReactNode } from 'react';
import { useTransition } from 'react';
import { KeyRound, LoaderCircle, Mail, Save, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  saveProfileAction,
  updateCustomerEmailAction,
  updateCustomerPasswordAction,
  type CustomerSettingsActionResult,
} from '@/lib/commerce/actions';

type Action = (formData: FormData) => Promise<CustomerSettingsActionResult>;

function SettingsForm({ action, children, resetOnSuccess = false }: { action: Action; children: ReactNode; resetOnSuccess?: boolean }) {
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        toast.error(result.error || 'İşlem tamamlanamadı.');
        return;
      }
      toast.success(result.message || 'Bilgiler güncellendi.');
      if (resetOnSuccess) form.reset();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <fieldset disabled={pending} className="grid gap-4">{children}</fieldset>
      <button type="submit" disabled={pending} className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-800 disabled:opacity-60">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {pending ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  );
}

const inputClass = 'rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10';

export function ProfileSettings({ email, fullName, marketingConsent, phone }: { email: string; fullName: string; marketingConsent: boolean; phone: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><UserRound className="h-5 w-5 text-sky-700" /><div><h2 className="font-black text-slate-950">İletişim bilgileri</h2><p className="text-sm text-slate-500">Sipariş ve teslimat iletişim bilgileriniz.</p></div></div>
        <SettingsForm action={saveProfileAction}>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Ad soyad<input className={inputClass} name="full_name" defaultValue={fullName} required autoComplete="name" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Telefon<input className={inputClass} name="phone" defaultValue={phone} required autoComplete="tel" inputMode="tel" /></label>
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700"><input type="checkbox" name="marketing_consent" defaultChecked={marketingConsent} className="mt-1 h-4 w-4" /><span><strong className="block text-slate-900">Kampanya bilgilendirmesi</strong>E-posta ve SMS ile fırsatlardan haberdar olmak istiyorum.</span></label>
        </SettingsForm>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3"><Mail className="h-5 w-5 text-sky-700" /><div><h2 className="font-black text-slate-950">E-posta adresi</h2><p className="text-sm text-slate-500">Mevcut adres: {email}</p></div></div>
        <SettingsForm action={updateCustomerEmailAction}>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Yeni e-posta<input className={inputClass} name="email" type="email" required autoComplete="email" /></label>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Adres değişince yeni e-postayı doğrulamanız gerekir. Doğrulama tamamlanana kadar müşteri portalı erişimi durur.</p>
        </SettingsForm>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <div className="mb-5 flex items-center gap-3"><KeyRound className="h-5 w-5 text-sky-700" /><div><h2 className="font-black text-slate-950">Şifre değiştir</h2><p className="text-sm text-slate-500">En az 8 karakter; büyük/küçük harf ve rakam kullanın.</p></div></div>
        <SettingsForm action={updateCustomerPasswordAction} resetOnSuccess>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-slate-700">Mevcut şifre<input className={inputClass} name="current_password" type="password" required autoComplete="current-password" /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Yeni şifre<input className={inputClass} name="password" type="password" required autoComplete="new-password" minLength={8} /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Yeni şifre tekrar<input className={inputClass} name="password_confirm" type="password" required autoComplete="new-password" minLength={8} /></label>
          </div>
        </SettingsForm>
      </section>
    </div>
  );
}
