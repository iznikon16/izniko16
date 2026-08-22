'use client';

import { useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, LoaderCircle, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

type AdminFilePickerProps = {
  accept?: string;
  className?: string;
  helperText?: string;
  label: string;
  multiple?: boolean;
  name: string;
  required?: boolean;
};

export function AdminFilePicker({ accept, className, helperText, label, multiple = false, name, required = false }: AdminFilePickerProps) {
  const inputId = useId();
  const { pending } = useFormStatus();
  const [selectionLabel, setSelectionLabel] = useState('Henüz dosya seçilmedi.');

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'grid cursor-pointer gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:border-sky-400',
        pending && 'cursor-progress opacity-75',
        className
      )}
    >
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2 font-medium text-gray-900">
          <UploadCloud className="h-4 w-4 shrink-0 text-sky-500" />
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white">
          Seç
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span className="truncate">{selectionLabel}</span>
      </span>
      {helperText ? <span className="text-xs leading-5 text-gray-400">{helperText}</span> : null}
      <input
        id={inputId}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        required={required}
        disabled={pending}
        className="sr-only"
        onChange={(event) => {
          const files = event.target.files;

          if (!files || files.length === 0) {
            setSelectionLabel('Henüz dosya seçilmedi.');
            return;
          }

          setSelectionLabel(files.length === 1 ? files[0].name : `${files.length} dosya seçildi.`);
        }}
      />
    </label>
  );
}

type AdminFormPendingNoticeProps = {
  description?: string;
  label?: string;
};

export function AdminFormPendingNotice({
  description = 'İşlem tamamlanana kadar sayfayı kapatmayın.',
  label = 'Kaydediliyor...',
}: AdminFormPendingNoticeProps) {
  const { pending } = useFormStatus();

  if (!pending) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-[18px] border border-sky-300/24 bg-sky-500/12 px-4 py-3 text-sm text-gray-900 shadow-[0_14px_34px_rgba(235,68,37,0.12)]"
    >
      <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-sky-500" />
      <span>
        <span className="block font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-gray-500">{description}</span>
      </span>
    </div>
  );
}
