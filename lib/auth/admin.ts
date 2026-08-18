import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { AdminUserRow } from '@/lib/catalog/types';
import { createClient } from '@/lib/supabase/server';

export type AdminSession = {
  user: User;
  adminUser: AdminUserRow;
};

const isProd = process.env.NODE_ENV === 'production';
if (isProd && process.env.DEV_BYPASS_AUTH === 'true') {
  console.error('CRITICAL SECURITY ERROR: DEV_BYPASS_AUTH is active in production!');
  throw new Error('Security Violation: DEV_BYPASS_AUTH cannot be used in production.');
}
const DEV_BYPASS = !isProd && process.env.DEV_BYPASS_AUTH === 'true';

const DEV_FAKE_SESSION: AdminSession = {
  user: {
    id: 'dev-user-id',
    email: 'dev@localhost',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
  } as User,
  adminUser: {
    user_id: 'dev-user-id',
    email: 'dev@localhost',
    full_name: 'Geliştirici',
    role: 'admin',
    is_super_admin: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as AdminUserRow,
};

export async function getAdminSession() {
  if (DEV_BYPASS) return DEV_FAKE_SESSION;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !adminUser) {
    return null;
  }

  return {
    user,
    adminUser,
  } satisfies AdminSession;
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  return session;
}

export async function requireAdminPermission(permission?: string) {
  const session = await requireAdminSession();
  
  if (permission && session.adminUser.role !== 'admin') {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const supabase = createAdminClient();
      
      const { data: roleData, error } = await supabase
        .from('roles')
        .select(`
          name,
          role_permissions(
            permissions(key)
          )
        `)
        .eq('name', session.adminUser.role)
        .maybeSingle();

      let hasPermission = false;
      if (!error && roleData && roleData.role_permissions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hasPermission = roleData.role_permissions.some((rp: any) => {
          const pKey = rp.permissions?.key;
          return pKey === permission || pKey === '*';
        });
      }

      if (!hasPermission) {
        const { PermissionError } = await import('@/lib/auth/permissions');
        throw new PermissionError(permission);
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'name' in err && err.name === 'PermissionError') {
        throw err;
      }
      
      // DB hatası durumunda fallback (Geliştirme veya seed edilmemiş DB için)
      const { assertPermission } = await import('@/lib/auth/permissions');
      assertPermission(session.adminUser.role ?? 'staff', permission);
    }
  }
  
  return session;
}
