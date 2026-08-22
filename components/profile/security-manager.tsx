'use client';

import { useRef, useState, useTransition } from 'react';
import { KeyRound, LoaderCircle, LogOut, QrCode, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/components/ui/safe-image';
import { createClient } from '@/lib/supabase/client';
import { recordMfaEnrollmentAction, recordMfaRemovalAction, signOutAllSessionsAction, signOutOtherSessionsAction } from '@/lib/auth/security-actions';

type Enrollment = { factorId: string; qrCode: string; secret: string };

export function SecurityManager({ initialFactorId, mfaEnabled, loginPath }: { initialFactorId: string | null; mfaEnabled: boolean; loginPath: '/admin/login' | '/giris' }) {
  const router = useRouter();
  const disableDialogRef = useRef<HTMLDialogElement>(null);
  const allSessionsDialogRef = useRef<HTMLDialogElement>(null);
  const [enabled, setEnabled] = useState(mfaEnabled);
  const [factorId, setFactorId] = useState(initialFactorId);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  function beginEnrollment() {
    startTransition(async () => {
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      for (const existing of existingFactors?.all ?? []) {
        if (existing.factor_type === 'totp' && existing.status === 'unverified') {
          await supabase.auth.mfa.unenroll({ factorId: existing.id });
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'İZNİKON Authenticator' });
      if (error || !data.totp) {
        toast.error('Authenticator kurulumu başlatılamadı.');
        return;
      }
      setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    });
  }

  function cancelEnrollment() {
    if (!enrollment) return;
    startTransition(async () => {
      await supabase.auth.mfa.unenroll({ factorId: enrollment.factorId });
      setEnrollment(null);
      setCode('');
    });
  }

  function verifyEnrollment() {
    if (!enrollment || !/^\d{6}$/.test(code)) return toast.error('Authenticator uygulamasındaki 6 haneli kodu girin.');
    startTransition(async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code });
      if (error) {
        toast.error('Doğrulama kodu geçersiz veya süresi dolmuş.');
        return;
      }
      const auditResult = await recordMfaEnrollmentAction();
      if (!auditResult.ok) {
        toast.error(auditResult.error || 'MFA durumu doğrulanamadı.');
        return;
      }
      setEnabled(true);
      setFactorId(enrollment.factorId);
      setEnrollment(null);
      setCode('');
      toast.success(auditResult.message);
      router.refresh();
    });
  }

  function disableMfa() {
    if (!factorId) return;
    startTransition(async () => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        toast.error('İki aşamalı doğrulama kapatılamadı. Önce yeniden giriş yapmanız gerekebilir.');
        return;
      }
      const auditResult = await recordMfaRemovalAction();
      if (!auditResult.ok) {
        toast.error(auditResult.error || 'MFA durumu güncellenemedi.');
        return;
      }
      disableDialogRef.current?.close();
      setEnabled(false);
      setFactorId(null);
      toast.success(auditResult.message);
      router.refresh();
    });
  }

  function revokeOthers() {
    startTransition(async () => {
      const result = await signOutOtherSessionsAction();
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  function revokeAll() {
    startTransition(async () => {
      const result = await signOutAllSessionsAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      allSessionsDialogRef.current?.close();
      router.replace(loginPath);
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
      <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Güvenlik merkezi</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">Giriş ve oturumlar</h2>
      </div>

      <div className="p-6 sm:p-7">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}><ShieldCheck className="h-5 w-5" /></span>
              <div><h3 className="font-black text-slate-950">İki aşamalı doğrulama</h3><p className="mt-1 text-sm leading-6 text-slate-500">Şifrenize ek olarak Authenticator uygulamasındaki tek kullanımlık kodla hesabınızı koruyun.</p></div>
            </div>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {enabled ? 'Etkin' : 'Kapalı'}
            </span>
          </div>

          {!enabled && !enrollment ? <Button type="button" className="mt-5" disabled={pending} onClick={beginEnrollment}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}Authenticator’ı Etkinleştir</Button> : null}
          {enrollment ? <div className="mt-5 grid gap-5 rounded-2xl border border-indigo-200 bg-white p-5 md:grid-cols-[156px_1fr] md:items-center"><SafeImage src={enrollment.qrCode} alt="Authenticator kurulum QR kodu" width={156} height={156} unoptimized className="h-36 w-36 rounded-xl bg-white p-2 ring-1 ring-slate-200" /><div><h3 className="font-black text-slate-950">QR kodunu uygulamanızla tarayın</h3><p className="mt-2 text-sm leading-6 text-slate-600">Tarayamıyorsanız kurulum anahtarını kullanın: <code className="mt-1 block break-all rounded-lg bg-slate-100 px-2 py-1.5 font-mono text-xs">{enrollment.secret}</code></p><label className="mt-4 grid max-w-xs gap-2 text-sm font-bold text-slate-700">6 haneli doğrulama kodu<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-black tracking-[0.35em] outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label><div className="mt-3 flex flex-wrap gap-2"><Button type="button" size="sm" disabled={pending || code.length !== 6} onClick={verifyEnrollment}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Doğrula ve Etkinleştir</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={cancelEnrollment}>Vazgeç</Button></div></div></div> : null}
          {enabled ? <Button type="button" size="sm" variant="outline" className="mt-5 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700" disabled={pending} onClick={() => disableDialogRef.current?.showModal()}><ShieldOff className="h-4 w-4" />İki Aşamalı Doğrulamayı Kapat</Button> : null}
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700"><Smartphone className="h-5 w-5" /></span><div><h3 className="font-black text-slate-950">Aktif oturumlar</h3><p className="mt-1 text-sm leading-6 text-slate-500">Tanımadığınız cihazların erişimini kaldırın veya güvenlik gerektiren durumlarda bütün oturumları sonlandırın.</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" className="w-full" disabled={pending} onClick={revokeOthers}><LogOut className="h-4 w-4" />Diğer cihazlardan çıkış</Button><Button type="button" variant="outline" className="w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700" disabled={pending} onClick={() => allSessionsDialogRef.current?.showModal()}><KeyRound className="h-4 w-4" />Tüm oturumları kapat</Button></div></div>
      </div>

      <dialog ref={disableDialogRef} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40"><div className="p-6"><h2 className="text-lg font-black text-slate-950">2FA kapatılsın mı?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Sonraki girişlerinizde Authenticator kodu istenmeyecek.</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => disableDialogRef.current?.close()}>Vazgeç</Button><Button type="button" variant="destructive" disabled={pending} onClick={disableMfa}>2FA’yı Kapat</Button></div></div></dialog>
      <dialog ref={allSessionsDialogRef} className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-950/40"><div className="p-6"><h2 className="text-lg font-black text-slate-950">Tüm oturumlar kapatılsın mı?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Bu cihaz dahil bütün Supabase oturumlarınız iptal edilir ve yeniden giriş yapmanız gerekir.</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => allSessionsDialogRef.current?.close()}>Vazgeç</Button><Button type="button" variant="destructive" disabled={pending} onClick={revokeAll}>Tümünü Kapat</Button></div></div></dialog>
    </section>
  );
}
