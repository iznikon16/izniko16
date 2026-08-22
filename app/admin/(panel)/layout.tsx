import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';
import { getAdminPermissionKeys, requireAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();
  const permissions = [...await getAdminPermissionKeys(session)];
  const userName = session.adminUser.full_name || session.user.email || 'Yönetici';
  const userRole = session.adminUser.is_super_admin ? 'Süper Admin' : session.adminUser.role === 'staff' ? 'Yetkili' : 'Admin';

  return (
    <AdminLayoutClient permissions={permissions} userName={userName} userRole={userRole}>
      {/* Main Content Area */}
      <AdminHeader permissions={permissions} userName={userName} userRole={userRole} />
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </AdminLayoutClient>
  );
}
