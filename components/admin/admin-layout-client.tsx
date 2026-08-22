'use client';

import { Suspense, useState } from 'react';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminQueryToast } from '@/components/admin/admin-query-toast';

type AdminLayoutClientProps = {
  avatarUrl: string | null;
  children: React.ReactNode;
  permissions: string[];
  userName: string;
  userRole: string;
};

export function AdminLayoutClient({ avatarUrl, children, permissions, userName, userRole }: AdminLayoutClientProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#eef2f7] font-sans text-[#020617]">
      <Suspense fallback={null}><AdminQueryToast /></Suspense>
      {/* Sidebar */}
      <div 
        className={cn(
          "hidden shrink-0 border-r border-[#cbd5e1] bg-white/95 backdrop-blur-sm transition-all duration-300 lg:block",
          isCollapsed ? "w-[80px]" : "w-[272px]"
        )}
      >
        <div className="sticky top-0 h-screen overflow-y-auto overflow-x-hidden">
           <AdminSidebar avatarUrl={avatarUrl} isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} permissions={permissions} userName={userName} userRole={userRole} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all">
        {children}
      </div>
    </div>
  );
}
