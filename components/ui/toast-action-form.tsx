'use client';

import type { ReactNode } from 'react';
import { useRef, useState, useTransition } from 'react';
import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type Confirmation = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export function ToastActionForm({
  action,
  className,
  children,
  id,
  successMessage,
  errorMessage,
  confirmation,
}: {
  action: (formData: FormData) => Promise<unknown>;
  className?: string;
  children: ReactNode;
  id?: string;
  successMessage?: string;
  errorMessage?: string;
  confirmation?: Confirmation;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runAction() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      try {
        const result = await action(formData);
        if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
          const message = 'message' in result && typeof result.message === 'string' ? result.message : errorMessage;
          throw new Error(message ?? 'İşlem tamamlanamadı.');
        }
        const resultMessage = result && typeof result === 'object' && 'message' in result && typeof result.message === 'string' ? result.message : null;
        toast.success(resultMessage ?? successMessage ?? 'İşlem başarıyla tamamlandı.');
        window.dispatchEvent(new CustomEvent('toast-action-success', { detail: { formId: id } }));
        dialogRef.current?.close();
        setDialogOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : errorMessage ?? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.');
      }
    });
  }

  return (
    <>
      <form
        ref={formRef}
        id={id}
        className={className}
        onSubmit={(event) => {
          event.preventDefault();
          if (confirmation) {
            setDialogOpen(true);
            dialogRef.current?.showModal();
          } else {
            runAction();
          }
        }}
      >
        <fieldset disabled={pending} className="contents">{children}</fieldset>
        {pending ? <span className="sr-only" role="status">İşlem devam ediyor</span> : null}
      </form>
      {confirmation && dialogOpen ? (
        <dialog ref={dialogRef} onClose={() => setDialogOpen(false)} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900">{confirmation.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{confirmation.description}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" disabled={pending} onClick={() => dialogRef.current?.close()}>Vazgeç</Button>
              <Button type="button" variant={confirmation.destructive ? 'destructive' : 'default'} disabled={pending} onClick={runAction}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {pending ? 'İşleniyor…' : confirmation.confirmLabel ?? 'Onayla'}
              </Button>
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
