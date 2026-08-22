'use client';

import { Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminQueryToast } from '@/components/admin/admin-query-toast';

type AdminLayoutClientProps = {
  children: React.ReactNode;
  permissions: string[];
  userName: string;
  userRole: string;
};

export function AdminLayoutClient({ children, permissions, userName, userRole }: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] text-gray-900 font-sans">
      <Suspense fallback={null}><AdminQueryToast /></Suspense>
      {/* Sidebar */}
      <div 
        className={cn(
          "shrink-0 border-r border-gray-200 bg-white hidden lg:block transition-all duration-300",
          isCollapsed ? "w-[80px]" : "w-[272px]"
        )}
      >
        <div className="sticky top-0 h-screen overflow-y-auto overflow-x-hidden">
           <AdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} permissions={permissions} userName={userName} userRole={userRole} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all">
        {children}
      </div>
    </div>
  );
}
