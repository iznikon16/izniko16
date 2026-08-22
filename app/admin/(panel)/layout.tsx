import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';
import { getAdminPermissionKeys, requireAdminSession } from '@/lib/auth/admin';
import { getRoleLabel } from '@/lib/auth/roles';
import { getAvatarPublicUrl } from '@/lib/profile/avatar';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  const permissions = [...await getAdminPermissionKeys(session)];
  const userName = session.adminUser.full_name || session.user.email || 'Yönetici';
  const userRole = getRoleLabel(session.adminUser.role);
  const avatarUrl = getAvatarPublicUrl(session.adminUser.avatar_path);

  return (
    <AdminLayoutClient avatarUrl={avatarUrl} permissions={permissions} userName={userName} userRole={userRole}>
      {/* Main Content Area */}
      <AdminHeader avatarUrl={avatarUrl} permissions={permissions} userName={userName} userRole={userRole} />
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </AdminLayoutClient>
  );
}
