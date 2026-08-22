import { resolveAdminAuthorization } from '@/lib/auth/admin-authorization';
import type { AdminUserRow } from '@/lib/catalog/types';

function clientResult(data: AdminUserRow | null, error: { message: string } | null = null) {
  const maybeSingle = jest.fn().mockResolvedValue({ data, error });
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from }, eq, from, select };
}

const activeAdmin = {
  created_at: '2026-08-22T00:00:00.000Z',
  email: 'admin@example.com',
  full_name: 'Admin',
  is_active: true,
  is_super_admin: true,
  role: 'admin',
  updated_at: '2026-08-22T00:00:00.000Z',
  user_id: '00000000-0000-0000-0000-000000000001',
} satisfies AdminUserRow;

describe('admin authorization', () => {
  it('canonical auth user id ile authenticated client üzerinden yetki çözer', async () => {
    const { client, eq } = clientResult(activeAdmin);

    await expect(resolveAdminAuthorization(client as never, activeAdmin.user_id)).resolves.toEqual({
      adminUser: activeAdmin,
      status: 'AUTHORIZED',
    });
    expect(eq).toHaveBeenCalledWith('user_id', activeAdmin.user_id);
  });

  it('service-role anahtarı olmadan da yalnız verilen authenticated clientı kullanır', async () => {
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { client } = clientResult(activeAdmin);

    await expect(resolveAdminAuthorization(client as never, activeAdmin.user_id)).resolves.toMatchObject({
      status: 'AUTHORIZED',
    });
    process.env.SUPABASE_SERVICE_ROLE_KEY = previous;
  });

  it.each([
    [null, null, 'ADMIN_PROFILE_NOT_FOUND'],
    [{ ...activeAdmin, is_active: false }, null, 'ADMIN_INACTIVE'],
    [{ ...activeAdmin, role: 'customer' }, null, 'ADMIN_ROLE_INVALID'],
    [null, { message: 'permission denied' }, 'ADMIN_RLS_QUERY_FAILED'],
  ])('yetki durumunu güvenli kodla ayırır', async (data, error, status) => {
    const { client } = clientResult(data as AdminUserRow | null, error);
    await expect(resolveAdminAuthorization(client as never, activeAdmin.user_id)).resolves.toEqual({
      adminUser: null,
      status,
    });
  });
});
