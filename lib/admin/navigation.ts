export function canViewAdminNavigationItem(permission: string | undefined, permissions: ReadonlySet<string>) {
  return !permission || permissions.has('*') || permissions.has(permission);
}

export function isAdminNavigationHrefActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveAdminNavigationHref(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((href) => isAdminNavigationHrefActive(pathname, href))
    .sort((left, right) => right.length - left.length)[0];
}
