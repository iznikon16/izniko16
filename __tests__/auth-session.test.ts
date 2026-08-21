import { invalidateSupabaseSession } from '@/lib/auth/session-invalidation';
import { getCustomerAccessStatus } from '@/lib/auth/customer-access';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import { isProtectedAdminPath, isProtectedCustomerPath } from '@/lib/auth/session-policy';

describe('auth session policy', () => {
  it('login hariç tüm admin alt yollarını korumalı kabul eder', () => {
    expect(isProtectedAdminPath('/admin')).toBe(true);
    expect(isProtectedAdminPath('/admin/accounting')).toBe(true);
    expect(isProtectedAdminPath('/admin/login')).toBe(false);
    expect(isProtectedAdminPath('/hesabim')).toBe(false);
  });

  it('hesabım kökünü ve tüm alt yollarını müşteri korumalı kabul eder', () => {
    expect(isProtectedCustomerPath('/hesabim')).toBe(true);
    expect(isProtectedCustomerPath('/hesabim/cari')).toBe(true);
    expect(isProtectedCustomerPath('/hesabim/cari/pdf')).toBe(true);
    expect(isProtectedCustomerPath('/giris')).toBe(false);
    expect(isProtectedCustomerPath('/hesabimiz')).toBe(false);
  });
});

describe('customer safe redirect policy', () => {
  it('güvenli mağaza yollarını sorgu ve hash ile korur', () => {
    expect(getSafeCustomerRedirectPath('/sepet?kupon=YAZ#ozet')).toBe('/sepet?kupon=YAZ#ozet');
    expect(getSafeCustomerRedirectPath('/hesabim/cari')).toBe('/hesabim/cari');
  });

  it.each([
    'https://evil.example',
    '//evil.example/path',
    '///evil.example/path',
    '/\\evil.example/path',
    '/%5cevil.example/path',
    '%2F%2Fevil.example/path',
    '/%252f%252fevil.example/path',
    '/giris?next=/giris',
    '/giris%2Ftekrar',
    '/admin',
    '/admin/accounting',
    '/admin%2Faccounting',
    '/admin%252Faccounting',
  ])('güvensiz veya kapsam dışı hedefi fallback yoluna düşürür: %s', (target) => {
    expect(getSafeCustomerRedirectPath(target)).toBe('/hesabim/cari');
  });

  it('özel fallback değeri de güvenli değilse sabit müşteri yolunu kullanır', () => {
    expect(getSafeCustomerRedirectPath('//evil.example', '//other.example')).toBe('/hesabim/cari');
    expect(getSafeCustomerRedirectPath('//evil.example', '/admin%2Faccounting')).toBe('/hesabim/cari');
  });
});

describe('customer access policy', () => {
  it('yalnız doğrulanmış ve engellenmemiş profili aktif kabul eder', () => {
    expect(getCustomerAccessStatus(null)).toBe('missing_profile');
    expect(getCustomerAccessStatus({ email_verified_at: null, is_blocked: false })).toBe('unverified');
    expect(getCustomerAccessStatus({ email_verified_at: '2026-08-21T00:00:00.000Z', is_blocked: true })).toBe('blocked');
    expect(getCustomerAccessStatus({ email_verified_at: '2026-08-21T00:00:00.000Z', is_blocked: false })).toBe('active');
  });
});

describe('Supabase session invalidation', () => {
  it('kullanıcıyı çözer ve global signOut tamamlanmadan başarılı dönmez', async () => {
    const calls: string[] = [];
    const client = {
      auth: {
        getUser: async () => {
          calls.push('getUser');
          return { data: { user: { id: 'admin-1' } } };
        },
        signOut: async ({ scope }: { scope: 'global' }) => {
          calls.push(`signOut:${scope}`);
          return { error: null };
        },
      },
    };

    await expect(invalidateSupabaseSession(client)).resolves.toEqual({ ok: true, userId: 'admin-1' });
    expect(calls).toEqual(['getUser', 'signOut:global']);
  });

  it('provider signOut hatasını güvenli başarısızlık olarak döndürür', async () => {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: null } }),
        signOut: async () => ({ error: { message: 'provider detail' } }),
      },
    };
    await expect(invalidateSupabaseSession(client)).resolves.toEqual({ ok: false, userId: null });
  });
});
