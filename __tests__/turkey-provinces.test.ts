import { isTurkeyProvince, TURKEY_PROVINCES } from '@/lib/commerce/turkey-provinces';

describe('Turkey provinces', () => {
  it('lists İstanbul first and contains 81 unique provinces', () => {
    expect(TURKEY_PROVINCES[0]).toBe('İstanbul');
    expect(TURKEY_PROVINCES).toHaveLength(81);
    expect(new Set(TURKEY_PROVINCES).size).toBe(81);
  });

  it('rejects values outside the official province list', () => {
    expect(isTurkeyProvince('Bursa')).toBe(true);
    expect(isTurkeyProvince('Geçersiz')).toBe(false);
  });
});
