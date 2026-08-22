import 'server-only';

import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { AdminUserRow } from '@/lib/catalog/types';
import { createClient } from '@/lib/supabase/server';
import { resolveAdminAuthorization } from '@/lib/auth/admin-authorization';
import { getMfaStatus } from '@/lib/auth/mfa';

export type AdminSession = {
  user: User;
  adminUser: AdminUserRow;
};

export async function getAdminPrimarySession() {
  const supabase = await createClient();
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.warn('Supabase auth error in admin auth:', error instanceof Error ? error.message : error);
  }
  if (!user) return null;

  const authorization = await resolveAdminAuthorization(supabase, user.id);
  if (authorization.status !== 'AUTHORIZED') return null;

  return { user, adminUser: authorization.adminUser } satisfies AdminSession;
}

export async function getAdminSession() {
  const session = await getAdminPrimarySession();
  if (!session) return null;
  const mfaStatus = await getMfaStatus(await createClient());
  return !mfaStatus.available || mfaStatus.requiresChallenge ? null : session;
}

export async function requireAdminSession() {
  const session = await getAdminPrimarySession();
  if (!session) redirect('/admin/login');
  const mfaStatus = await getMfaStatus(await createClient());
  if (!mfaStatus.available) redirect('/admin/mfa?durum=kontrol-hatasi');
  if (mfaStatus.requiresChallenge) redirect('/admin/mfa');
  return session;
}

export async function getAdminPermissionKeys(session: AdminSession): Promise<Set<string>> {
  if (session.adminUser.role === 'admin' || session.adminUser.is_super_admin) return new Set(['*']);

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();
  const { data: roleData, error } = await supabase
    .from('roles')
    .select('name, role_permissions(permissions(key))')
    .eq('name', session.adminUser.role)
    .maybeSingle();

  if (error || !roleData) return new Set();
  return new Set(roleData.role_permissions.flatMap((entry) => {
    const relation = entry.permissions;
    const key = Array.isArray(relation) ? relation[0]?.key : relation?.key;
    return key ? [key] : [];
  }));
}

export async function requireAdminPermission(permission?: string) {
  const session = await requireAdminSession();
  if (!permission) return session;
  const [{ PermissionError }, permissions] = await Promise.all([
    import('@/lib/auth/permissions'),
    getAdminPermissionKeys(session),
  ]);
  const hasPermission = permissions.has(permission) || permissions.has('*');
  if (!hasPermission) throw new PermissionError(permission);
  return session;
}
