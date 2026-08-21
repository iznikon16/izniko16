import { getPasswordPolicyError } from '@/lib/auth/password-policy';

describe('customer password policy', () => {
  it('kısa şifreyi reddeder', () => expect(getPasswordPolicyError('Aa1')).toMatch(/8 karakter/));
  it('büyük ve küçük harfi zorunlu tutar', () => expect(getPasswordPolicyError('BUYUK123')).toMatch(/büyük ve küçük/));
  it('rakamı zorunlu tutar', () => expect(getPasswordPolicyError('GuvenliSifre')).toMatch(/rakam/));
  it('boşluğu reddeder', () => expect(getPasswordPolicyError('Guvenli 1A')).toMatch(/boşluk/));
  it('geçerli güçlü şifreyi kabul eder', () => expect(getPasswordPolicyError('Guvenli1A')).toBeNull());
});
