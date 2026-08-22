import {
  canViewAdminNavigationItem,
  getActiveAdminNavigationHref,
  isAdminNavigationHrefActive,
} from '@/lib/admin/navigation';

describe('admin navigation', () => {
  it('shows only granted navigation items', () => {
    const permissions = new Set(['product.view', 'order.view']);
    expect(canViewAdminNavigationItem('product.view', permissions)).toBe(true);
    expect(canViewAdminNavigationItem('audit.view', permissions)).toBe(false);
    expect(canViewAdminNavigationItem(undefined, permissions)).toBe(true);
  });

  it('allows every navigation item for wildcard admins', () => {
    expect(canViewAdminNavigationItem('settings.view', new Set(['*']))).toBe(true);
  });

  it('keeps dashboard matching exact', () => {
    expect(isAdminNavigationHrefActive('/admin', '/admin')).toBe(true);
    expect(isAdminNavigationHrefActive('/admin/orders', '/admin')).toBe(false);
  });

  it('selects the most specific nested route', () => {
    expect(getActiveAdminNavigationHref('/admin/integrations/xml/aktarimlar', [
      '/admin/integrations', '/admin/integrations/xml', '/admin/integrations/xml/aktarimlar',
    ])).toBe('/admin/integrations/xml/aktarimlar');
  });
});
