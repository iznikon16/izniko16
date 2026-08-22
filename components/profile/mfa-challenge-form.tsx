'use client';

import { useState, useTransition } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { recordMfaChallengeSuccessAction } from '@/lib/auth/security-actions';

export function MfaChallengeForm({ factorId, destination }: { factorId: string; destination: string }) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function verify() {
    if (!/^\d{6}$/.test(code)) {
      setError('Authenticator uygulamasındaki 6 haneli kodu girin.');
      return;
    }
    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (verifyError) {
        setError('Doğrulama kodu geçersiz veya süresi dolmuş.');
        return;
      }
      const result = await recordMfaChallengeSuccessAction();
      if (!result.ok) {
        setError(result.error || 'Güvenli oturum doğrulanamadı.');
        return;
      }
      router.replace(destination);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck className="h-7 w-7" /></div>
      <div className="text-center"><h1 className="text-2xl font-black text-slate-950">İki aşamalı doğrulama</h1><p className="mt-2 text-sm leading-6 text-slate-600">Authenticator uygulamanızda görünen kodu girin.</p></div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">6 haneli güvenlik kodu<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(event) => { if (event.key === 'Enter') verify(); }} inputMode="numeric" autoComplete="one-time-code" autoFocus className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center text-2xl font-black tracking-[0.45em] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /></label>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
      <button type="button" disabled={pending || code.length !== 6} onClick={verify} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{pending ? 'Doğrulanıyor…' : 'Güvenli Girişi Tamamla'}</button>
    </div>
  );
}
