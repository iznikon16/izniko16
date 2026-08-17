'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)] text-gray-900 font-sans">
      {/* Sidebar */}
      <div 
        className={cn(
          "shrink-0 border-r border-gray-200 bg-white hidden lg:block transition-all duration-300",
          isCollapsed ? "w-[80px]" : "w-[240px]"
        )}
      >
        <div className="sticky top-0 h-screen overflow-y-auto overflow-x-hidden">
           <AdminSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col transition-all">
        {children}
      </div>
    </div>
  );
}
