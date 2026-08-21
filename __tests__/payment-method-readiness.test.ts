import { isCardPaymentProvider, isCheckoutPaymentMethodReady } from '@/lib/commerce/payment-method-readiness';

describe('checkout payment method readiness', () => {
  it('allows manual and offline methods without API credentials', () => {
    expect(isCheckoutPaymentMethodReady('offline', 'manual', {})).toBe(true);
    expect(isCheckoutPaymentMethodReady('custom', 'manual', {})).toBe(true);
  });

  it('requires all PayTR credentials', () => {
    expect(isCheckoutPaymentMethodReady('paytr', 'redirect', {
      merchantId: 'merchant', merchantKey: 'key', merchantSalt: 'salt',
    })).toBe(true);
    expect(isCheckoutPaymentMethodReady('paytr', 'redirect', { merchantId: 'merchant' })).toBe(false);
  });

  it('requires iyzico API and secret keys', () => {
    expect(isCheckoutPaymentMethodReady('iyzico', 'redirect', { apiKey: 'api', secretKey: 'secret' })).toBe(true);
    expect(isCheckoutPaymentMethodReady('iyzico', 'redirect', { apiKey: 'api' })).toBe(false);
  });

  it('marks only supported live adapters as card providers', () => {
    expect(isCardPaymentProvider('paytr', 'redirect')).toBe(true);
    expect(isCardPaymentProvider('iyzico', 'api')).toBe(true);
    expect(isCardPaymentProvider('offline', 'manual')).toBe(false);
    expect(isCardPaymentProvider('bank_pos', 'api')).toBe(false);
  });
});
