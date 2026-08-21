'use client';

import { useActionState } from 'react';
import { AlertCircle, BadgeCheck, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import {
  completeCustomerPasswordResetAction,
  requestCustomerPasswordResetAction,
  type AuthActionResult,
} from '@/lib/auth/customer-actions';

const INITIAL_STATE: AuthActionResult = { ok: false };
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-950 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10';

function Feedback({ state }: { state: AuthActionResult }) {
  if (state.error) return <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{state.error}</div>;
  if (state.message) return <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><BadgeCheck className="h-5 w-5 shrink-0" />{state.message}</div>;
  return null;
}

export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState(requestCustomerPasswordResetAction, INITIAL_STATE);
  return <form action={action} className="grid gap-5"><label className="grid gap-2 text-sm font-bold text-slate-700">E-posta adresi<div className="relative"><Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-600" /><input className={`${inputClass} pl-12`} name="email" type="email" required autoComplete="email" /></div></label><Feedback state={state} /><button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3.5 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}{pending ? 'Gönderiliyor…' : 'Yenileme bağlantısı gönder'}</button></form>;
}

export function PasswordResetCompleteForm() {
  const [state, action, pending] = useActionState(completeCustomerPasswordResetAction, INITIAL_STATE);
  return <form action={action} className="grid gap-5"><label className="grid gap-2 text-sm font-bold text-slate-700">Yeni şifre<input className={inputClass} name="password" type="password" required minLength={8} autoComplete="new-password" /></label><label className="grid gap-2 text-sm font-bold text-slate-700">Yeni şifre tekrar<input className={inputClass} name="password_confirm" type="password" required minLength={8} autoComplete="new-password" /></label><p className="text-xs leading-5 text-slate-500">En az 8 karakter, büyük ve küçük harf ile en az bir rakam kullanın.</p><Feedback state={state} /><button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3.5 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{pending ? 'Güncelleniyor…' : 'Şifremi güncelle'}</button></form>;
}
