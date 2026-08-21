'use client';

import { useRef, useState, useTransition } from 'react';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function ConfirmActionForm({
  action,
  fields,
  buttonLabel,
  title,
  description,
  confirmLabel = 'Onayla',
  successMessage,
  errorMessage,
  variant = 'default',
}: {
  action: (formData: FormData) => Promise<unknown>;
  fields: Record<string, string>;
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel?: string;
  successMessage: string;
  errorMessage: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function showDialog() {
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    setOpen(false);
  }

  function submit() {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
          toast.error(errorMessage);
          return;
        }
        toast.success(successMessage);
        closeDialog();
      } catch {
        toast.error(errorMessage);
      }
    });
  }

  return (
    <>
      <Button type="button" variant={variant} onClick={showDialog} disabled={pending}>{buttonLabel}</Button>
      {open ? (
        <dialog ref={dialogRef} onClose={() => setOpen(false)} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>Vazgeç</Button>
              <Button type="button" variant={variant} onClick={submit} disabled={pending} aria-busy={pending}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {pending ? 'İşleniyor…' : confirmLabel}
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
