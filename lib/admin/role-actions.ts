'use server';

import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/audit/queries';
import { requireAdminSession } from '@/lib/auth/admin';
import { hasSuperAdminAccess } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function updateRolePermissionsAction(formData: FormData) {
  const session = await requireAdminSession();
  if (!hasSuperAdminAccess(session.adminUser)) throw new Error('Bu işlem yalnızca Süper Admin tarafından yapılabilir.');
  const roleName = String(formData.get('role') || '');
  if (roleName !== 'staff' && roleName !== 'customer') throw new Error('Bu rolün izinleri düzenlenemez.');
  const requested = [...new Set(formData.getAll('permission').map(String).map((value) => value.trim()).filter(Boolean))];
  if (requested.includes('role.manage')) throw new Error('Rol yönetimi izni alt rollere atanamaz.');
  const admin = createAdminClient();
  const { data: permissions, error: permissionError } = await admin.from('permissions').select('key').in('key', requested.length ? requested : ['__none__']);
  if (permissionError || (permissions?.length ?? 0) !== requested.length) throw new Error('Geçersiz izin seçimi.');

  const { data: role } = await admin.from('roles').select('id').eq('name', roleName).single();
  if (!role) throw new Error('Rol bulunamadı.');
  const { data: previousRows } = await admin.from('role_permissions').select('permissions(key)').eq('role_id', role.id);
  const previous = (previousRows ?? []).flatMap((entry) => {
    const relation = entry.permissions;
    const key = Array.isArray(relation) ? relation[0]?.key : relation?.key;
    return key ? [key] : [];
  }).sort();

  const client = await createClient();
  const { error } = await client.rpc('set_editable_role_permissions', { p_permission_keys: requested, p_role_name: roleName });
  if (error) throw new Error('Rol izinleri güncellenemedi.');
  await writeAuditLog({ actorUserId: session.user.id, action: 'role_permissions_updated', resourceId: roleName, resourceType: 'role', oldValue: { permissions: previous }, newValue: { permissions: [...requested].sort() } });
  revalidatePath('/admin', 'layout');
  revalidatePath('/admin/yonetim/roller');
  return { ok: true };
}

export const updateStaffPermissionsAction = updateRolePermissionsAction;
