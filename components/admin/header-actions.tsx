'use client';

import { Bell, Maximize, Printer } from 'lucide-react';

export function HeaderActions() {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNotifications = () => {
    alert('Şu an yeni bir bildiriminiz bulunmuyor.');
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={handleNotifications}
        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        title="Bildirimler"
      >
        <Bell className="h-5 w-5" />
      </button>
      <button 
        onClick={toggleFullscreen}
        className="hidden h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 sm:flex"
        title="Tam Ekran"
      >
        <Maximize className="h-5 w-5" />
      </button>
      <button 
        onClick={handlePrint}
        className="hidden h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 sm:flex"
        title="Sayfayı Yazdır"
      >
        <Printer className="h-5 w-5" />
      </button>

    </div>
  );
}
