'use client';

import { useState, useSyncExternalStore, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, LoaderCircle, Lock, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { adminLoginAction } from './login-actions';

const subscribeToHydration = () => () => {};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const isHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await adminLoginAction(formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push(result.mfaRequired ? '/admin/mfa' : '/admin');
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Yönetici E-Posta Adresi
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#090e1a] px-4 py-3.5 transition-all focus-within:border-sky-500/70 focus-within:ring-2 focus-within:ring-sky-500/20">
          <Mail className="h-5 w-5 text-amber-500" />
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="admin@iznikon.com"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Şifre
        </label>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#090e1a] px-4 py-3.5 transition-all focus-within:border-sky-500/70 focus-within:ring-2 focus-within:ring-sky-500/20">
          <Lock className="h-5 w-5 text-amber-500" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="••••••••"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[transition:background-color_5000s_ease-in-out_0s]"
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input 
          type="checkbox" 
          id="remember" 
          name="remember" 
          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/30"
        />
        <label htmlFor="remember" className="text-xs font-medium text-slate-400 cursor-pointer select-none">
          Beni Hatırla
        </label>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!isHydrated || isPending}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        Yönetim Paneline Giriş Yap
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}



