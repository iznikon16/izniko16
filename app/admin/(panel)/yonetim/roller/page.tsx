import { Check, ChevronRight, LockKeyhole, ShieldCheck, UserCog, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { updateRolePermissionsAction } from '@/lib/admin/role-actions';
import { requireAdminSession } from '@/lib/auth/admin';
import { hasSuperAdminAccess, ROLE_LABELS, type RoleName } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToastActionForm } from '@/components/ui/toast-action-form';

export const metadata = { title: 'Roller ve Yetkiler | İZNİKON' };

type PageProps = { searchParams: Promise<{ role?: string }> };

const roleDetails: Record<RoleName, { description: string; icon: typeof ShieldCheck }> = {
  admin: { description: 'Sistem genelinde tam ve değiştirilemez yetki', icon: ShieldCheck },
  staff: { description: 'Yönetim paneli için görev bazlı izinler', icon: UserCog },
  customer: { description: 'Müşteri rolü için tanımlanan erişim izinleri', icon: UsersRound },
};

export default async function RolesPage({ searchParams }: PageProps) {
  const session = await requireAdminSession();
  if (!hasSuperAdminAccess(session.adminUser)) redirect('/admin');

  const rawRole = (await searchParams).role;
  const selectedRole: RoleName = rawRole === 'admin' || rawRole === 'customer' ? rawRole : 'staff';
  const supabase = createAdminClient();
  const [{ data: permissions, error: permissionsError }, { data: role, error: roleError }] = await Promise.all([
    supabase.from('permissions').select('id, key, description').order('key'),
    supabase.from('roles').select('id, role_permissions(permission_id)').eq('name', selectedRole).single(),
  ]);

  if (permissionsError || roleError || !role) throw new Error('Rol izinleri alınamadı.');
  const selectedIds = new Set(role.role_permissions.map((entry) => entry.permission_id));
  const editable = selectedRole !== 'admin';

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-6">
      <Card className="overflow-hidden rounded-[2rem]">
        <CardHeader className="border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-600"><ShieldCheck className="h-5 w-5" /></span>
            <div><CardTitle>Roller ve Yetkiler</CardTitle><CardDescription className="mt-2">İzinlerini görmek veya düzenlemek istediğiniz rolü seçin.</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          <nav aria-label="Rol seçimi" className="grid gap-3 md:grid-cols-3">
            {(['admin', 'staff', 'customer'] as const).map((roleName) => {
              const active = selectedRole === roleName;
              const Icon = roleDetails[roleName].icon;
              return (
                <Link
                  key={roleName}
                  href={`/admin/yonetim/roller?role=${roleName}`}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex min-h-28 items-center gap-4 rounded-2xl border p-4 transition-all ${active ? 'border-sky-500 bg-sky-50 shadow-sm ring-2 ring-sky-100' : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-sm'}`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${active ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-sky-700'}`}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="text-sm text-slate-950">{ROLE_LABELS[roleName]}</strong>{active ? <Badge variant="success">Seçili</Badge> : null}</span><span className="mt-1.5 block text-xs leading-5 text-slate-500">{roleDetails[roleName].description}</span></span>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-sky-600' : 'text-slate-300'}`} />
                </Link>
              );
            })}
          </nav>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[2rem]">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><CardTitle>{ROLE_LABELS[selectedRole]} izinleri</CardTitle><CardDescription className="mt-2">{editable ? 'Seçimler veritabanına transaction içinde kaydedilir ve sonraki sunucu isteğinde uygulanır.' : 'Süper Admin rolü sistemin tamamına erişir; güvenlik nedeniyle izinleri daraltılamaz.'}</CardDescription></div>
            <Badge variant={editable ? 'warning' : 'success'}>{editable ? 'Düzenlenebilir rol' : 'Tam yetki'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6">
          {editable ? (
            <ToastActionForm
              action={updateRolePermissionsAction}
              successMessage={`${ROLE_LABELS[selectedRole]} izinleri güncellendi.`}
              errorMessage="Rol izinleri güncellenemedi."
              confirmation={{ title: `${ROLE_LABELS[selectedRole]} izinleri güncellensin mi?`, description: 'Açık oturumlar bir sonraki sunucu isteğinde yeni izinlerle değerlendirilecektir.', confirmLabel: 'Yetkileri Güncelle' }}
              className="grid gap-5"
            >
              <input type="hidden" name="role" value={selectedRole} />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(permissions ?? []).filter((permission) => permission.key !== 'role.manage').map((permission) => (
                  <Label key={permission.id} className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300 hover:bg-sky-50/50">
                    <Checkbox name="permission" value={permission.key} defaultChecked={selectedIds.has(permission.id)} />
                    <span><strong className="block text-sm text-slate-900">{permission.key}</strong><span className="mt-1 block text-xs leading-5 text-slate-500">{permission.description || 'Açıklama bulunmuyor.'}</span></span>
                  </Label>
                ))}
              </div>
              <button type="submit" className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-full bg-sky-600 px-6 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-700 hover:shadow-md"><Check className="h-4 w-4" />{ROLE_LABELS[selectedRole]} İzinlerini Kaydet</button>
            </ToastActionForm>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/60 px-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><LockKeyhole className="h-6 w-6" /></span>
              <h3 className="mt-4 font-black text-slate-950">Sistem tarafından korunan rol</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">Süper Admin tüm yönetim izinlerine sahiptir. Son Süper Admin koruması ve tam yetki yapısı bu ekrandan değiştirilemez.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
