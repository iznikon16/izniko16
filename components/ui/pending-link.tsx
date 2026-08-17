'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type PendingLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
  onNavigate?: () => void;
  pendingLabel?: string;
  scroll?: boolean;
};

export function PendingLink({
  children,
  className,
  href,
  onNavigate,
  pendingLabel,
  scroll = true,
}: PendingLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    onNavigate?.();

    startTransition(() => {
      router.push(href, { scroll });
    });
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-disabled={isPending}
      className={cn(
        'relative transition-opacity',
        isPending && 'cursor-progress opacity-90',
        className
      )}
    >
      <span className={cn('inline-flex items-center justify-center gap-2', isPending && 'opacity-96')}>
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {isPending && pendingLabel ? pendingLabel : children}
      </span>
    </Link>
  );
}
