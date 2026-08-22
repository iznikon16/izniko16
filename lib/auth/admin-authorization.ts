import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import type { AdminUserRow } from '@/lib/catalog/types';

export type AdminAuthorizationStatus =
  | 'AUTHORIZED'
  | 'ADMIN_PROFILE_NOT_FOUND'
  | 'ADMIN_INACTIVE'
  | 'ADMIN_ROLE_INVALID'
  | 'ADMIN_RLS_QUERY_FAILED';

export type AdminAuthorizationResult =
  | { adminUser: AdminUserRow; status: 'AUTHORIZED' }
  | { adminUser: null; status: Exclude<AdminAuthorizationStatus, 'AUTHORIZED'> };

/**
 * Resolves admin authorization from the authenticated Supabase client.
 * The canonical identity is always auth.users.id; email/client role values
 * are never accepted as authorization input.
 */
export async function resolveAdminAuthorization(
  supabase: SupabaseClient<Database>,
  authenticatedUserId: string,
): Promise<AdminAuthorizationResult> {
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', authenticatedUserId)
    .maybeSingle();

  if (error) {
    return { adminUser: null, status: 'ADMIN_RLS_QUERY_FAILED' };
  }

  if (!adminUser) {
    return { adminUser: null, status: 'ADMIN_PROFILE_NOT_FOUND' };
  }

  if (adminUser.is_active === false) {
    return { adminUser: null, status: 'ADMIN_INACTIVE' };
  }

  if (!['admin', 'staff'].includes(adminUser.role)) {
    return { adminUser: null, status: 'ADMIN_ROLE_INVALID' };
  }

  return { adminUser: adminUser as AdminUserRow, status: 'AUTHORIZED' };
}
