import {
  SECRET_MASK,
  assertNoUnknownSecrets,
  getPaymentSecretKeys,
  isSecretLikeKey,
  maskPaymentConfig,
} from '@/lib/integrations/security';

describe('integration secret safety', () => {
  it('treats API keys and common credential names as secret', () => {
    expect(getPaymentSecretKeys('iyzico')).toEqual(expect.objectContaining(new Set(['apiKey', 'secretKey'])));
    expect(isSecretLikeKey('access_token')).toBe(true);
    expect(isSecretLikeKey('callbackUrl')).toBe(false);
  });

  it('never exposes stored payment credentials to client components', () => {
    expect(maskPaymentConfig('iyzico', { apiKey: 'plain-or-cipher', secretKey: 'cipher', testMode: true })).toEqual({
      apiKey: SECRET_MASK,
      secretKey: SECRET_MASK,
      testMode: true,
    });
  });

  it('rejects unknown secret-like extra JSON fields', () => {
    expect(() => assertNoUnknownSecrets('custom', { accessToken: 'secret' })).toThrow(/accessToken/);
    expect(() => assertNoUnknownSecrets('custom', { locale: 'tr' })).not.toThrow();
  });
});
