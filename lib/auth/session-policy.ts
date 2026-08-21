export function isProtectedAdminPath(pathname: string) {
  return pathname === '/admin' || (pathname.startsWith('/admin/') && pathname !== '/admin/login');
}

export function isProtectedCustomerPath(pathname: string) {
  return pathname === '/hesabim' || pathname.startsWith('/hesabim/');
}
