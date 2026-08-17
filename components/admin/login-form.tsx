'use client';

import { useState, useTransition } from 'react';
import { AlertCircle, ArrowRight, LoaderCircle, Lock, Mail, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(getAuthErrorMessage(error.message));
        return;
      }

      window.location.href = '/admin';
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Yönetici E-Posta Adresi
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 transition-all focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <Mail className="h-5 w-5 text-indigo-500/70" />
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="admin@iznikon.com"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Şifre
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 transition-all focus-within:border-indigo-500/70 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <Lock className="h-5 w-5 text-indigo-500/70" />
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-600"
          />
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-950 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Yönetim Paneline Giriş Yap
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLocaleLowerCase('tr');

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'E-posta adresi henüz doğrulanmamış.';
  }

  if (normalizedMessage.includes('too many requests')) {
    return 'Çok fazla deneme yapıldı. Lütfen kısa süre sonra tekrar deneyin.';
  }

  return message;
}
