import { Badge } from '@/components/ui/badge';
import { AvatarManager } from '@/components/profile/avatar-manager';
import { requireAdminSession } from '@/lib/auth/admin';
import { getRoleLabel } from '@/lib/auth/roles';
import { getAvatarPublicUrl } from '@/lib/profile/avatar';
import { SecurityManager } from '@/components/profile/security-manager';
import { createClient } from '@/lib/supabase/server';
import { getMfaStatus } from '@/lib/auth/mfa';
import { CalendarDays, Clock3, Mail, ShieldCheck, UserRound } from 'lucide-react';

export const metadata = { title: 'Profilim | İZNİKON Yönetim' };

export default async function AdminProfilePage() {
  const session = await requireAdminSession();
  const name = session.adminUser.full_name || session.user.email || 'Yönetici';
  const email = session.user.email || session.adminUser.email;
  const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
  const mfaStatus = await getMfaStatus(await createClient());

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 px-6 py-7 text-white shadow-lg shadow-slate-950/10 sm:px-8">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute bottom-0 right-24 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-sky-300">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              Hesap merkezi
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Profil ve güvenlik</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Yönetim hesabınızın kimlik bilgilerini, profil fotoğrafını ve oturum güvenliğini tek noktadan yönetin.
            </p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Hesap durumu</p>
              <p className="mt-1 text-sm font-bold text-white">Aktif ve korunuyor</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-600">Kişisel bilgiler</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Yönetici profili</h2>
          </div>
          <div className="p-6 sm:p-7">
            <AvatarManager avatarUrl={getAvatarPublicUrl(session.adminUser.avatar_path)} email={email} name={name} />

            <dl className="mt-7 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm"><Mail className="h-4 w-4" /></span>
                <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">E-posta adresi</dt><dd className="mt-1 truncate text-sm font-semibold text-slate-800">{email}</dd></div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm"><ShieldCheck className="h-4 w-4" /></span>
                <div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Yetki seviyesi</dt><dd className="mt-1"><Badge>{getRoleLabel(session.adminUser.role)}</Badge></dd></div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Clock3 className="h-4 w-4" /></span>
                <div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Son giriş</dt><dd className="mt-1 text-sm font-semibold leading-5 text-slate-800">{session.user.last_sign_in_at ? dateFormatter.format(new Date(session.user.last_sign_in_at)) : 'İlk giriş'}</dd></div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-amber-700 shadow-sm"><CalendarDays className="h-4 w-4" /></span>
                <div><dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Hesap oluşturma</dt><dd className="mt-1 text-sm font-semibold leading-5 text-slate-800">{dateFormatter.format(new Date(session.user.created_at))}</dd></div>
              </div>
            </dl>
          </div>
        </section>

        <SecurityManager initialFactorId={mfaStatus.verifiedFactorId} mfaEnabled={mfaStatus.enabled} loginPath="/admin/login" />
      </div>
    </div>
  );
}
