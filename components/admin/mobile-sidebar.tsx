'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { AdminSidebar } from './admin-sidebar';

export function MobileSidebar({ permissions, userName, userRole }: { permissions: string[]; userName: string; userRole: string }) {
  const [isOpen, setIsOpen] = useState(false);

  // Handle scroll lock and Escape key
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsOpen(true)}
        className="mr-3 p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden"
        aria-label="Yönetim menüsünü aç"
        aria-expanded={isOpen}
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <div 
        className={`fixed top-0 bottom-0 left-0 z-50 w-[280px] bg-white transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="absolute right-4 top-4 z-50">
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            aria-label="Yönetim menüsünü kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="h-full w-full overflow-y-auto">
          <AdminSidebar permissions={permissions} userName={userName} userRole={userRole} onNavigate={() => setIsOpen(false)} />
        </div>
      </div>
    </>
  );
}
