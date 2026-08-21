import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';
import { requireAdminSession } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();

  return (
    <AdminLayoutClient>
      {/* Main Content Area */}
      <AdminHeader />
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </AdminLayoutClient>
  );
}
