import {
  getAdminSupabaseConfig,
  getPublicSupabaseConfig,
  getSupabaseConfigurationDiagnostic,
  SupabaseConfigurationError,
} from '@/lib/supabase/config';

const originalEnv = { ...process.env };

describe('Supabase configuration', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project-a.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key-with-safe-length';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-with-safe-length';
    process.env.SUPABASE_JWKS_URL = 'https://project-a.supabase.co/auth/v1/.well-known/jwks.json';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('geçerli public ve server yapılandırmasını çözer', () => {
    expect(getPublicSupabaseConfig()).toMatchObject({ url: 'https://project-a.supabase.co' });
    expect(getAdminSupabaseConfig()).toMatchObject({ url: 'https://project-a.supabase.co' });
  });

  it('eksik ayarlarda dummy client yerine fail-closed hata üretir', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    expect(getPublicSupabaseConfig).toThrow(SupabaseConfigurationError);
  });

  it('service-role anahtarı eksikse yalnız admin client yapılandırmasını reddeder', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(getPublicSupabaseConfig).not.toThrow();
    expect(getAdminSupabaseConfig).toThrow(SupabaseConfigurationError);
  });

  it('URL/JWKS proje uyuşmazlığını secretsız durum olarak raporlar', () => {
    process.env.SUPABASE_JWKS_URL = 'https://project-b.supabase.co/auth/v1/.well-known/jwks.json';
    expect(getSupabaseConfigurationDiagnostic()).toEqual({
      jwksUrl: 'CONFIGURED',
      projectMatch: 'MISMATCH',
      publishableKey: 'CONFIGURED',
      serviceRoleKey: 'CONFIGURED',
      supabaseUrl: 'CONFIGURED',
    });
  });
});
