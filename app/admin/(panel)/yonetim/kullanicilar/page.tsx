import Link from 'next/link';
import { ChevronDown, Crown, Shield, ShieldCheck, UserCog, UsersRound, WalletCards } from 'lucide-react';
import { deleteManagedUserAction, resetManagedUserMfaAction, updateManagedUserAction } from '@/app/admin/(panel)/actions';
import { ChangeUserPasswordForm } from '@/components/admin/change-user-password-form';
import { CreateManagedUserModal } from '@/components/admin/create-managed-user-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmActionForm } from '@/components/ui/confirm-action-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getManagedUsers, type ManagedUserRole } from '@/lib/admin/managed-users';
import { requireAdminPermission } from '@/lib/auth/admin';
import { hasSuperAdminAccess, ROLE_LABELS } from '@/lib/auth/roles';
import { getAvatarPublicUrl } from '@/lib/profile/avatar';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

const roleSummary = [
  { role: 'customer' as const, icon: UsersRound, label: 'Müşteri' },
  { role: 'staff' as const, icon: Shield, label: 'Yetkili' },
  { role: 'admin' as const, icon: Crown, label: 'Süper Admin' },
];

export default async function ManagedUsersPage() {
  const [users, session] = await Promise.all([
    getManagedUsers(),
    requireAdminPermission('user.manage'),
  ]);
  const counts = users.reduce((result, user) => {
    result[user.role] += 1;
    return result;
  }, { admin: 0, customer: 0, staff: 0 } satisfies Record<ManagedUserRole, number>);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-7">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Yönetim</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">Kullanıcı ve Rol Yönetimi</h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600 sm:text-base">
            Supabase Auth hesaplarını, Müşteri / Yetkili / Admin rollerini, e-posta adreslerini ve hesap durumlarını yönetin.
          </p>
        </div>
        <CreateManagedUserModal />
      </header>

      <section aria-label="Rol özeti" className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3">
        {roleSummary.map(({ role, icon: Icon, label }, index) => (
          <div key={role} className={`flex min-h-28 items-center gap-5 px-6 py-5 sm:px-8 ${index > 0 ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''}`}>
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600"><Icon className="h-7 w-7" strokeWidth={1.8} /></span>
            <div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{counts[role]}</p></div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-6 sm:px-7">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Yetkili kullanıcılar</h2>
          <p className="mt-2 text-sm text-slate-500">Şifreler görüntülenemez veya saklanamaz; yalnızca güvenli şekilde yeni şifre atanabilir.</p>
        </div>

        <div className="hidden grid-cols-[minmax(300px,1.35fr)_180px_210px_150px_200px_32px] items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-7 py-4 text-xs font-bold text-slate-500 xl:grid">
          <span>Kullanıcı</span><span>Rol</span><span>İki faktörlü doğrulama</span><span>Durum</span><span>Oluşturulma</span><span />
        </div>

        <div className="divide-y divide-slate-200">
          {users.map((user) => (
            <details key={user.userId} className="group bg-white open:bg-slate-50/50">
              <summary className="grid cursor-pointer list-none gap-4 px-5 py-5 marker:hidden transition hover:bg-sky-50/40 sm:px-7 xl:grid-cols-[minmax(300px,1.35fr)_180px_210px_150px_200px_32px] xl:items-center">
                <div className="flex min-w-0 items-center gap-4">
                  <UserAvatar avatarUrl={getAvatarPublicUrl(user.avatarPath)} email={user.email} name={user.fullName || 'İsimsiz kullanıcı'} className="h-14 w-14 shrink-0 text-sm shadow-sm ring-1 ring-slate-200" />
                  <div className="min-w-0"><p className="truncate text-base font-semibold text-slate-950">{user.fullName || 'İsimsiz kullanıcı'}</p><p className="mt-1 truncate text-sm text-slate-500">{user.email}</p></div>
                </div>
                <div><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 xl:hidden">Rol</span><Badge variant={user.role === 'admin' ? 'info' : user.role === 'staff' ? 'muted' : 'outline'} className="rounded-md px-3 py-1.5 tracking-[0.08em]">{ROLE_LABELS[user.role]}</Badge></div>
                <div><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 xl:hidden">İki faktörlü doğrulama</span><Badge variant={user.mfaEnabled ? 'success' : 'outline'} className="rounded-md px-3 py-1.5 tracking-[0.08em]">{user.mfaEnabled ? '2FA Etkin' : '2FA Kapalı'}</Badge></div>
                <div><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 xl:hidden">Durum</span><Badge variant={user.isActive ? 'success' : 'destructive'} className="rounded-md px-3 py-1.5 tracking-[0.08em]">{user.isActive ? 'Aktif' : 'Pasif'}</Badge></div>
                <div><span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400 xl:hidden">Oluşturulma</span><p className="text-sm font-medium text-slate-600">{dateFormatter.format(new Date(user.createdAt))}</p></div>
                <ChevronDown className="hidden h-5 w-5 text-slate-400 transition group-open:rotate-180 xl:block" />
              </summary>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-6 sm:px-7">
                <div className="mb-5 flex flex-col gap-1"><h3 className="font-semibold text-slate-900">Hesap Ayarları</h3><p className="text-xs text-slate-500">Son giriş: {user.lastSignInAt ? dateFormatter.format(new Date(user.lastSignInAt)) : 'Henüz giriş yapılmadı'}</p></div>
                <ToastActionForm
                  action={updateManagedUserAction}
                  successMessage="Kullanıcı Supabase üzerinde güncellendi."
                  errorMessage="Kullanıcı güncellenemedi. Yetkinizi ve alanları kontrol edin."
                  confirmation={{ title: 'Kullanıcı bilgileri güncellensin mi?', description: 'E-posta, rol veya aktiflik değişikliği kullanıcının erişimini doğrudan etkiler.', confirmLabel: 'Güncelle' }}
                  className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_180px_auto] lg:items-end"
                >
                  <input type="hidden" name="user_id" value={user.userId} />
                  <div className="grid gap-2"><Label>Ad Soyad</Label><Input name="full_name" defaultValue={user.fullName} required /></div>
                  <div className="grid gap-2"><Label>E-posta</Label><Input name="email" type="email" defaultValue={user.email} required /></div>
                  <div className="grid gap-2"><Label>Rol</Label><Select name="role" defaultValue={user.role}><option value="customer">Müşteri</option><option value="staff">Yetkili</option><option value="admin">Admin</option></Select></div>
                  <div className="flex flex-wrap items-center gap-3"><Label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2"><Checkbox name="is_active" defaultChecked={user.isActive} />Aktif</Label><Button type="submit">Kaydet</Button></div>
                </ToastActionForm>

                <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                  <ChangeUserPasswordForm userId={user.userId} userLabel={user.email} />
                  {session.adminUser.role === 'admin' && user.mfaEnabled ? <ConfirmActionForm action={resetManagedUserMfaAction} fields={{ user_id: user.userId }} buttonLabel="2FA Sıfırla" title="Kullanıcının 2FA kaydı sıfırlansın mı?" description="Authenticator faktörleri kaldırılır ve kullanıcının tüm mevcut oturumları Supabase tarafından kapatılır." confirmLabel="2FA’yı Sıfırla" successMessage="Kullanıcının iki aşamalı doğrulaması sıfırlandı." errorMessage="İki aşamalı doğrulama sıfırlanamadı." variant="destructive" /> : null}
                  {user.role === 'customer' ? <><Link href={`/admin/accounting/${user.userId}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-sky-500 hover:bg-sky-50"><WalletCards className="h-4 w-4" />Cari Hesap / Bakiye</Link><Link href="/admin/customers" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-sky-500 hover:bg-sky-50"><UsersRound className="h-4 w-4" />Müşteri Detayı</Link></> : <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600"><ShieldCheck className="h-4 w-4" />Panel erişimi RBAC ile sınırlandırılır</span>}
                  {hasSuperAdminAccess(session.adminUser) && (user.role === 'customer' || user.role === 'staff') ? <ConfirmActionForm action={deleteManagedUserAction} fields={{ user_id: user.userId }} buttonLabel={user.role === 'staff' ? 'Yetkiliyi Sil' : 'Müşteriyi Sil'} title={`${ROLE_LABELS[user.role]} hesabı kalıcı olarak silinsin mi?`} description={user.role === 'customer' ? `${user.email} Supabase Auth ve müşteri profilinden silinecek. Sipariş, ödeme veya cari geçmişi varsa işlem güvenlik nedeniyle reddedilir.` : `${user.email} Supabase Auth ve yetkili profilinden kalıcı olarak silinecek.`} confirmLabel="Kalıcı Olarak Sil" successMessage={`${ROLE_LABELS[user.role]} hesabı Supabase üzerinden silindi.`} errorMessage="Hesap silinemedi. Yetkinizi veya kullanıcının işlem geçmişini kontrol edin." variant="destructive" /> : null}
                </div>
              </div>
            </details>
          ))}
        </div>

        {users.length === 0 ? <div className="p-14 text-center text-sm text-slate-500"><UserCog className="mx-auto mb-3 h-7 w-7 text-slate-400" />Supabase üzerinde kullanıcı bulunamadı.</div> : null}
      </section>
    </div>
  );
}
