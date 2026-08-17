import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { AdminUserRow } from '@/lib/catalog/types';
import { createClient } from '@/lib/supabase/server';

export type AdminSession = {
  user: User;
  adminUser: AdminUserRow;
};

// DEV bypass: Supabase olmadan admin paneline erişim
const DEV_BYPASS = process.env.DEV_BYPASS_AUTH === 'true';

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
