import 'server-only';

import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { AdminUserRow } from '@/lib/catalog/types';
import { createClient } from '@/lib/supabase/server';

export type AdminSession = {
  user: User;
  adminUser: AdminUserRow;
};

export async function getAdminSession() {
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.warn('Supabase auth error in admin auth:', error instanceof Error ? error.message : error);
  }
  if (!user) return null;

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (
    error ||
    !adminUser ||
    adminUser.is_active === false ||
    !['admin', 'staff'].includes(adminUser.role)
  ) return null;

  return { user, adminUser } satisfies AdminSession;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

export async function requireAdminPermission(permission?: string) {
  const session = await requireAdminSession();
  if (!permission || session.adminUser.role === 'admin' || session.adminUser.is_super_admin) return session;

  const [{ createAdminClient }, { PermissionError }] = await Promise.all([
    import('@/lib/supabase/admin'),
    import('@/lib/auth/permissions'),
  ]);
  const supabase = createAdminClient();
  const { data: roleData, error } = await supabase
    .from('roles')
    .select('name, role_permissions(permissions(key))')
    .eq('name', session.adminUser.role)
    .maybeSingle();

  if (error || !roleData) throw new PermissionError(permission);
  const hasPermission = roleData.role_permissions.some((entry) => {
    const relation = entry.permissions;
    const key = Array.isArray(relation) ? relation[0]?.key : relation?.key;
    return key === permission || key === '*';
  });
  if (!hasPermission) throw new PermissionError(permission);
  return session;
}
