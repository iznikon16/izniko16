import { sanitizeAuditRecord } from '@/lib/audit/sanitize';

describe('audit sanitization', () => {
  it('redacts secrets recursively while preserving useful old/new values', () => {
    expect(sanitizeAuditRecord({
      status: 'active',
      config: { apiKey: 'secret-value', nested: { access_token: 'token-value' } },
      password: 'Password123!',
    })).toEqual({
      status: 'active',
      config: { apiKey: '[GİZLENDİ]', nested: { access_token: '[GİZLENDİ]' } },
      password: '[GİZLENDİ]',
    });
  });

  it('limits oversized strings', () => {
    expect((sanitizeAuditRecord({ note: 'a'.repeat(2100) }).note as string).length).toBe(2001);
  });
});
