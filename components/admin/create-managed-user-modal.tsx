'use client';

import { useRef, useState, useTransition } from 'react';
import { LoaderCircle, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createManagedUserAction } from '@/app/admin/(panel)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export function CreateManagedUserModal() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function closeDialog() {
    dialogRef.current?.close();
    setOpen(false);
    formRef.current?.reset();
  }

  return (
    <>
      <Button type="button" className="gap-2" onClick={() => { setOpen(true); dialogRef.current?.showModal(); }}>
        <UserPlus className="h-4 w-4" />
        Yönetici / Kullanıcı Ekle
      </Button>

      {open ? (
        <dialog ref={dialogRef} onClose={closeDialog} className="m-auto w-[min(94vw,34rem)] rounded-3xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50">
          <form
            ref={formRef}
            className="p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              startTransition(async () => {
                try {
                  await createManagedUserAction(formData);
                  toast.success('Kullanıcı Supabase üzerinde oluşturuldu.');
                  closeDialog();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Kullanıcı oluşturulamadı.');
                }
              });
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Yeni kullanıcı oluştur</h2>
                <p className="mt-1 text-sm text-gray-500">Auth hesabı ve seçilen rol Supabase’e kaydedilir.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Pencereyi kapat" onClick={closeDialog} disabled={pending}><X className="h-4 w-4" /></Button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2"><Label>Rol</Label><Select name="role" defaultValue="staff" required><option value="customer">Müşteri</option><option value="staff">Yetkili</option><option value="admin">Admin</option></Select></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Ad Soyad</Label><Input name="full_name" required /></div>
              <div className="grid gap-2 sm:col-span-2"><Label>E-posta</Label><Input name="email" type="email" autoComplete="off" required /></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Telefon</Label><Input name="phone" type="tel" /></div>
              <div className="grid gap-2"><Label>Şifre</Label><Input name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
              <div className="grid gap-2"><Label>Şifre tekrarı</Label><Input name="password_confirm" type="password" minLength={8} autoComplete="new-password" required /></div>
            </div>
            <p className="mt-3 text-xs text-gray-500">Şifre en az 8 karakter olmalı; büyük harf, küçük harf ve rakam içermelidir.</p>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>Vazgeç</Button>
              <Button type="submit" disabled={pending} className="gap-2">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{pending ? 'Oluşturuluyor…' : 'Supabase’e Kaydet'}</Button>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
