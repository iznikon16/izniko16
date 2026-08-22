'use client';

import { type FormEvent, useEffect, useRef, useState, useTransition } from 'react';
import { Camera, LoaderCircle, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Button } from '@/components/ui/button';
import { removeOwnAvatarAction, uploadOwnAvatarAction } from '@/lib/profile/actions';
import { AVATAR_MAX_BYTES } from '@/lib/profile/avatar';

export function AvatarManager({ avatarUrl, email, name }: { avatarUrl: string | null; email: string; name: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function chooseFile(selected: File | undefined) {
    if (!selected) return;
    if (selected.size > AVATAR_MAX_BYTES) {
      toast.error('Profil fotoğrafı en fazla 5 MB olabilir.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      toast.error('Yalnızca JPEG, PNG veya WEBP fotoğraf seçebilirsiniz.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(selected);
    setPreviewUrl(previewRef.current);
    setFile(selected);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return toast.error('Önce bir fotoğraf seçin.');
    const formData = new FormData();
    formData.set('avatar', file);
    startTransition(async () => {
      const result = await uploadOwnAvatarAction(formData);
      if (!result.ok) {
        toast.error(result.error || 'Profil fotoğrafı yüklenemedi.');
        return;
      }
      toast.success(result.message || 'Profil fotoğrafınız güncellendi.');
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreviewUrl(null);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    });
  }

  function removeAvatar() {
    startTransition(async () => {
      const result = await removeOwnAvatarAction();
      if (!result.ok) {
        toast.error(result.error || 'Profil fotoğrafı kaldırılamadı.');
        return;
      }
      dialogRef.current?.close();
      toast.success(result.message || 'Profil fotoğrafınız kaldırıldı.');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative w-fit">
        <UserAvatar avatarUrl={previewUrl || avatarUrl} email={email} name={name} className="h-24 w-24 border-4 border-white text-xl shadow-lg shadow-slate-300/60 ring-1 ring-slate-200 sm:h-28 sm:w-28 sm:text-2xl" />
        <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-4 border-white bg-sky-600 text-white shadow-sm"><Camera className="h-4 w-4" aria-hidden="true" /></span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-black text-slate-950">{name}</h3>
        <p className="mt-1 truncate text-sm text-slate-500">{email}</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">JPEG, PNG veya WEBP · En fazla 5 MB</p>
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            onChange={(event) => chooseFile(event.target.files?.[0])}
            className="sr-only"
            id="profile-avatar-input"
          />
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />{avatarUrl ? 'Fotoğrafı Değiştir' : 'Fotoğraf Yükle'}
          </Button>
          {file ? <Button type="submit" size="sm" disabled={pending}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}Yüklemeyi Onayla</Button> : null}
          {avatarUrl ? <Button type="button" size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" disabled={pending} onClick={() => dialogRef.current?.showModal()}><Trash2 className="h-4 w-4" />Kaldır</Button> : null}
        </form>
        {file ? <p className="mt-2 truncate text-xs font-semibold text-sky-700">Önizleme: {file.name}</p> : null}
      </div>

      <dialog ref={dialogRef} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40">
        <div className="p-6">
          <h2 className="text-lg font-black text-slate-950">Profil fotoğrafı kaldırılsın mı?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Fotoğraf Storage alanından silinecek ve hesabınız varsayılan avatara dönecek.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => dialogRef.current?.close()}>Vazgeç</Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={removeAvatar}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Fotoğrafı Kaldır</Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
