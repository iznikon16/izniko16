import {
  getActiveCustomerNavigationHref,
  isCustomerNavigationHrefActive,
} from '@/lib/customer/navigation';

describe('customer navigation', () => {
  it('does not keep Cari Hesabım active on Siparişlerim', () => {
    expect(isCustomerNavigationHrefActive('/hesabim/siparislerim', '/hesabim/cari')).toBe(false);
    expect(isCustomerNavigationHrefActive('/hesabim/siparislerim', '/hesabim/siparislerim')).toBe(true);
  });

  it('keeps the parent menu active on its detail pages', () => {
    expect(isCustomerNavigationHrefActive('/hesabim/siparislerim/order-1', '/hesabim/siparislerim')).toBe(true);
  });

  it('selects only the matching account menu', () => {
    expect(getActiveCustomerNavigationHref('/hesabim/faturalarim/invoice-1', [
      '/hesabim/cari',
      '/hesabim/siparislerim',
      '/hesabim/faturalarim',
    ])).toBe('/hesabim/faturalarim');
  });
});
