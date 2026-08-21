import Link from 'next/link';
import { LogIn, UserRound } from 'lucide-react';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';

export function StorefrontAccountAction({
  className = 'nav-link btn-login',
  isAuthenticated,
  nextPath,
}: {
  className?: string;
  isAuthenticated: boolean;
  nextPath: string;
}) {
  const safeNextPath = getSafeCustomerRedirectPath(nextPath, '/');
  const href = isAuthenticated
    ? '/hesabim/cari'
    : `/giris?next=${encodeURIComponent(safeNextPath)}`;
  const Icon = isAuthenticated ? UserRound : LogIn;

  return (
    <Link
      href={href}
      className={className}
      data-storefront-account-action
      aria-label={isAuthenticated ? 'Hesabım' : 'Giriş Yap'}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {isAuthenticated ? 'Hesabım' : 'Giriş Yap'}
    </Link>
  );
}
