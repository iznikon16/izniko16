import { normalizeAdminSearchQuery } from '@/lib/admin/global-search';

describe('admin global search safety', () => {
  it('normalizes whitespace and preserves Turkish characters', () => {
    expect(normalizeAdminSearchQuery('  Çağatay\n  Güney  ')).toBe('Çağatay Güney');
  });

  it('removes control characters and limits query length', () => {
    const query = normalizeAdminSearchQuery(`ürün\u0000${'x'.repeat(100)}`);
    expect(query).not.toContain('\u0000');
    expect(query.length).toBe(64);
  });

  it('accepts missing query safely', () => {
    expect(normalizeAdminSearchQuery(null)).toBe('');
  });
});
