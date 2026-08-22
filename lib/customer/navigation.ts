export function isCustomerNavigationHrefActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveCustomerNavigationHref(pathname: string, hrefs: readonly string[]) {
  return hrefs
    .filter((href) => isCustomerNavigationHrefActive(pathname, href))
    .sort((left, right) => right.length - left.length)[0];
}
