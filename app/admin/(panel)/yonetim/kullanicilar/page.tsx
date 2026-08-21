import Link from 'next/link';
import { ShieldCheck, UserCog, UsersRound, WalletCards } from 'lucide-react';
import { updateManagedUserAction } from '@/app/admin/(panel)/actions';
import { ChangeUserPasswordForm } from '@/components/admin/change-user-password-form';
import { CreateManagedUserModal } from '@/components/admin/create-managed-user-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { getManagedUsers, type ManagedUserRole } from '@/lib/admin/managed-users';

const roleLabels: Record<ManagedUserRole, string> = {
  admin: 'Admin',
  customer: 'Müşteri',
  staff: 'Yetkili',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });

export default async function ManagedUsersPage() {
  const users = await getManagedUsers();
  const counts = users.reduce((result, user) => {
    result[user.role] += 1;
    return result;
  }, { admin: 0, customer: 0, staff: 0 } satisfies Record<ManagedUserRole, number>);

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Yönetim</p>
            <CardTitle className="mt-3">Kullanıcı ve rol yönetimi</CardTitle>
            <CardDescription className="mt-2 max-w-3xl">
              Supabase Auth hesaplarını, Müşteri / Yetkili / Admin rollerini, e-posta adreslerini ve hesap durumlarını yönetin.
            </CardDescription>
          </div>
          <CreateManagedUserModal />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['customer', 'staff', 'admin'] as const).map((role) => (
              <div key={role} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">{roleLabels[role]}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{counts[role]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supabase kullanıcıları</CardTitle>
          <CardDescription>Şifreler görüntülenemez veya saklanmaz; yalnızca yeni şifre atanabilir.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {users.map((user) => (
            <details key={user.userId} className="group rounded-2xl border border-gray-200 bg-white">
              <summary className="grid cursor-pointer list-none gap-3 px-4 py-4 marker:hidden md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_140px_140px] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{user.fullName || 'İsimsiz kullanıcı'}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'staff' ? 'muted' : 'outline'}>{roleLabels[user.role]}</Badge>
                  {user.isSuperAdmin ? <Badge variant="success">Süper Admin</Badge> : null}
                </div>
                <Badge variant={user.isActive ? 'success' : 'destructive'}>{user.isActive ? 'Aktif' : 'Pasif'}</Badge>
                <p className="text-xs text-gray-500">{user.lastSignInAt ? dateFormatter.format(new Date(user.lastSignInAt)) : 'Giriş yok'}</p>
              </summary>

              <div className="border-t border-gray-100 bg-gray-50 p-4">
                <ToastActionForm
                  action={updateManagedUserAction}
                  successMessage="Kullanıcı Supabase üzerinde güncellendi."
                  errorMessage="Kullanıcı güncellenemedi. Yetkinizi ve alanları kontrol edin."
                  confirmation={{
                    title: 'Kullanıcı bilgileri güncellensin mi?',
                    description: 'E-posta, rol veya aktiflik değişikliği kullanıcının erişimini doğrudan etkiler.',
                    confirmLabel: 'Güncelle',
                  }}
                  className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_170px_auto] lg:items-end"
                >
                  <input type="hidden" name="user_id" value={user.userId} />
                  <div className="grid gap-2"><Label>Ad Soyad</Label><Input name="full_name" defaultValue={user.fullName} required /></div>
                  <div className="grid gap-2"><Label>E-posta</Label><Input name="email" type="email" defaultValue={user.email} required /></div>
                  <div className="grid gap-2"><Label>Rol</Label><Select name="role" defaultValue={user.role}><option value="customer">Müşteri</option><option value="staff">Yetkili</option><option value="admin">Admin</option></Select></div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2"><Checkbox name="is_active" defaultChecked={user.isActive} />Aktif</Label>
                    <Button type="submit">Kaydet</Button>
                  </div>
                </ToastActionForm>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-200 pt-4">
                  <ChangeUserPasswordForm userId={user.userId} userLabel={user.email} />
                  {user.role === 'customer' ? (
                    <>
                      <Link href={`/admin/accounting/${user.userId}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 hover:border-sky-500 hover:bg-sky-50">
                        <WalletCards className="h-4 w-4" /> Cari Hesap / Bakiye
                      </Link>
                      <Link href="/admin/customers" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 hover:border-sky-500 hover:bg-sky-50">
                        <UsersRound className="h-4 w-4" /> Müşteri Detayı
                      </Link>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600"><ShieldCheck className="h-4 w-4" /> Panel erişimi RBAC ile sınırlandırılır</span>
                  )}
                </div>
              </div>
            </details>
          ))}

          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500"><UserCog className="mx-auto mb-3 h-6 w-6" />Supabase üzerinde kullanıcı bulunamadı.</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
