'use client';

import { useRef, useState, useTransition } from 'react';
import { Eye, EyeOff, KeyRound, LoaderCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { changeManagedUserPasswordAction } from '@/app/admin/(panel)/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ChangeUserPasswordForm({ userId, userLabel }: { userId: string; userLabel: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  function closeDialog() {
    dialogRef.current?.close();
    setOpen(false);
    setShowPassword(false);
    formRef.current?.reset();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
      >
        <KeyRound className="h-4 w-4" />
        Şifre Değiştir
      </Button>

      {open ? (
        <dialog ref={dialogRef} onClose={closeDialog} className="m-auto w-[min(92vw,30rem)] rounded-3xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/50">
          <form
            ref={formRef}
            className="p-6"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              startTransition(async () => {
                try {
                  await changeManagedUserPasswordAction(formData);
                  toast.success('Kullanıcı şifresi Supabase Auth üzerinde güncellendi.');
                  closeDialog();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Şifre güncellenemedi.');
                }
              });
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Kullanıcı şifresini değiştir</h2>
                <p className="mt-1 text-sm text-gray-500">{userLabel}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Pencereyi kapat" onClick={closeDialog} disabled={pending}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <input type="hidden" name="user_id" value={userId} />
            <div className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`password-${userId}`}>Yeni şifre</Label>
                <div className="relative">
                  <Input id={`password-${userId}`} name="password" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" required className="pr-11" />
                  <button type="button" aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">En az 8 karakter; büyük harf, küçük harf ve rakam içermelidir.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`password-confirm-${userId}`}>Yeni şifre tekrarı</Label>
                <Input id={`password-confirm-${userId}`} name="password_confirm" type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="new-password" required />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>Vazgeç</Button>
              <Button type="submit" disabled={pending} className="gap-2">
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {pending ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
              </Button>
            </div>
          </form>
        </dialog>
      ) : null}
    </>
  );
}
