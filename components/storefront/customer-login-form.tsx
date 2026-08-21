'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { submitCustomerLoginAction, type AuthActionResult } from '@/lib/auth/customer-actions';

const INITIAL_STATE: AuthActionResult = { ok: false };

export function CustomerLoginForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(submitCustomerLoginAction, INITIAL_STATE);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="next" value={nextPath} />

      <div className="grid gap-2">
        <label htmlFor="customer-email" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          E-posta adresi
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10">
          <Mail className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <input
            id="customer-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="ornek@firma.com"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3"><label htmlFor="customer-password" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Şifre</label><Link href="/sifremi-unuttum" className="text-xs font-black text-amber-700 hover:underline">Şifremi unuttum</Link></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10">
          <LockKeyhole className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <input
            id="customer-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state.error ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-amber-950/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
        {isPending ? 'Giriş yapılıyor…' : 'Hesabıma giriş yap'}
        {!isPending ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
