'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function SecretInput({ defaultValue, name, placeholder }: { defaultValue?: string; name: string; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input type={visible ? 'text' : 'password'} name={name} defaultValue={defaultValue} placeholder={placeholder} className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 pr-11 text-sm text-[#020617] outline-none transition-all focus:border-[#0ea5e9] focus:ring-2 focus:ring-sky-100" />
      <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Anahtarı gizle' : 'Anahtarı göster'} className="absolute right-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#475569] hover:bg-sky-50 hover:text-[#0284c7]">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
    </div>
  );
}
