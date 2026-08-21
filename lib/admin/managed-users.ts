import 'server-only';

import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type ManagedUserRole = 'customer' | 'staff' | 'admin';

export type ManagedUserRecord = {
  createdAt: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastSignInAt: string | null;
  role: ManagedUserRole;
  userId: string;
};

function normalizeManagedRole(role: string | null | undefined): ManagedUserRole {
  return role === 'admin' || role === 'staff' ? role : 'customer';
}

export async function getManagedUsers(): Promise<ManagedUserRecord[]> {
  await requireAdminPermission('user.manage');
  const supabase = createAdminClient();
  const [{ data: authData, error: authError }, adminResult, customerResult] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabase.from('admin_users').select('user_id, email, full_name, role, is_active, is_super_admin'),
    supabase.from('customer_profiles').select('user_id, email, full_name, is_blocked'),
  ]);

  if (authError) throw new Error('Supabase kullanıcıları alınamadı.');
  if (adminResult.error) throw new Error(adminResult.error.message);
  if (customerResult.error) throw new Error(customerResult.error.message);

  const adminsById = new Map((adminResult.data ?? []).map((record) => [record.user_id, record]));
  const customersById = new Map((customerResult.data ?? []).map((record) => [record.user_id, record]));

  return authData.users
    .map((user) => {
      const admin = adminsById.get(user.id);
      const customer = customersById.get(user.id);
      const role = normalizeManagedRole(admin?.role);

      return {
        createdAt: user.created_at,
        email: user.email ?? admin?.email ?? customer?.email ?? '',
        fullName: admin?.full_name ?? customer?.full_name ?? String(user.user_metadata?.full_name ?? ''),
        isActive: admin ? admin.is_active : customer ? !customer.is_blocked : false,
        isSuperAdmin: admin?.is_super_admin ?? false,
        lastSignInAt: user.last_sign_in_at ?? null,
        role,
        userId: user.id,
      } satisfies ManagedUserRecord;
    })
    .sort((left, right) => left.fullName.localeCompare(right.fullName, 'tr'));
}
