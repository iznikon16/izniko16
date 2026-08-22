'use client';

import { useState } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/profile/avatar';

export function UserAvatar({ avatarUrl, email = '', name, className }: { avatarUrl?: string | null; email?: string; name: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <span className={cn('relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sky-700 to-slate-900 text-sm font-black text-white', className)}>
      <span aria-hidden="true">{getInitials(name, email)}</span>
      {avatarUrl && failedUrl !== avatarUrl ? (
        <SafeImage
          src={avatarUrl}
          alt={`${name || email} profil fotoğrafı`}
          width={160}
          height={160}
          unoptimized
          onError={() => setFailedUrl(avatarUrl)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}
