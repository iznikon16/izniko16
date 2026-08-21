'use client';

import type { FormEvent } from 'react';
import { useState, useTransition } from 'react';
import { CheckCircle2, LoaderCircle, MapPin, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmActionForm } from '@/components/ui/confirm-action-form';
import type { CustomerAddressRow } from '@/lib/catalog/types';
import { deleteAddressAction, saveAddressAction, setDefaultAddressAction } from '@/lib/commerce/actions';

const inputClass = 'rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10';

export function AddressManager({ addresses, defaultName, defaultPhone }: { addresses: CustomerAddressRow[]; defaultName: string; defaultPhone: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CustomerAddressRow | null | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function run(action: (data: FormData) => Promise<{ error?: string; message?: string; ok: boolean }>, data: FormData, done?: () => void) {
    startTransition(async () => {
      const result = await action(data);
      if (!result.ok) {
        toast.error(result.error || 'İşlem tamamlanamadı.');
        return;
      }
      toast.success(result.message || 'İşlem tamamlandı.');
      done?.();
      router.refresh();
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(saveAddressAction, new FormData(event.currentTarget), () => setEditing(undefined));
  }

  function idData(id: string) { const data = new FormData(); data.set('id', id); return data; }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <section className="grid content-start gap-4">
        <button type="button" onClick={() => setEditing(null)} className="inline-flex w-fit items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white hover:bg-sky-800"><Plus className="h-4 w-4" />Yeni adres</button>
        {addresses.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Henüz kayıtlı adresiniz yok.</div> : addresses.map((address) => (
          <article key={address.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><MapPin className="mt-1 h-5 w-5 shrink-0 text-sky-700" /><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-950">{address.label}</h2>{address.is_default ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Varsayılan</span> : null}</div><p className="mt-2 text-sm font-semibold text-slate-700">{address.full_name} · {address.phone}</p><p className="mt-1 text-sm leading-6 text-slate-600">{address.address_line}, {address.neighborhood ? `${address.neighborhood}, ` : ''}{address.district}/{address.city} {address.postal_code}</p></div></div></div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setEditing(address)} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"><Pencil className="h-4 w-4" />Düzenle</button>
              {!address.is_default ? <button type="button" disabled={pending} onClick={() => run(setDefaultAddressAction, idData(address.id))} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="h-4 w-4" />Varsayılan yap</button> : null}
              <span className="[&_button]:h-auto [&_button]:gap-2 [&_button]:rounded-lg [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:py-2 [&_button]:text-xs [&_button]:font-bold [&_button]:text-red-700 [&_button]:shadow-none hover:[&_button]:bg-red-50"><ConfirmActionForm action={deleteAddressAction} fields={{ id: address.id }} buttonLabel="Sil" title="Adres silinsin mi?" description={`${address.label} adresi kalıcı olarak silinecek.`} confirmLabel="Adresi sil" successMessage="Adres silindi." errorMessage="Adres silinemedi." variant="destructive" /></span>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {editing === undefined ? <div className="grid min-h-72 place-items-center text-center"><div><MapPin className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Yeni adres ekleyin veya mevcut bir adresi düzenleyin.</p></div></div> : (
          <form key={editing?.id || 'new'} onSubmit={submit} className="grid gap-4">
            <input type="hidden" name="id" value={editing?.id || ''} />
            <h2 className="text-xl font-black text-slate-950">{editing ? 'Adresi düzenle' : 'Yeni adres'}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-slate-700">Adres başlığı<input className={inputClass} name="address_label" defaultValue={editing?.label || 'Teslimat'} required /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Ad soyad<input className={inputClass} name="customer_name" defaultValue={editing?.full_name || defaultName} required autoComplete="name" /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Telefon<input className={inputClass} name="customer_phone" defaultValue={editing?.phone || defaultPhone} required autoComplete="tel" /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Şehir<input className={inputClass} name="city" defaultValue={editing?.city || ''} required autoComplete="address-level1" /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">İlçe<input className={inputClass} name="district" defaultValue={editing?.district || ''} required autoComplete="address-level2" /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Mahalle<input className={inputClass} name="neighborhood" defaultValue={editing?.neighborhood || ''} /></label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">Posta kodu<input className={inputClass} name="postal_code" defaultValue={editing?.postal_code || ''} autoComplete="postal-code" /></label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Açık adres<textarea className={`${inputClass} min-h-28 resize-y`} name="address_line" defaultValue={editing?.address_line || ''} required autoComplete="street-address" /></label>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_default" defaultChecked={editing?.is_default || addresses.length === 0} className="h-4 w-4" />Varsayılan teslimat adresim yap</label>
            <div className="flex gap-3"><button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{pending ? 'Kaydediliyor…' : 'Adresi kaydet'}</button><button type="button" onClick={() => setEditing(undefined)} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100">Vazgeç</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
