import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';

export const dynamic = 'force-dynamic';

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
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
