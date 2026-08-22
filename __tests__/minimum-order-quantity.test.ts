import { assertOrderQuantity, getOrderQuantityError } from '@/lib/commerce/quantity';

describe('minimum order quantity', () => {
  const product = { minimum_order_quantity: 5, stock_quantity: 100 };

  it('minimum altını reddeder ve minimum/adet üstünü kabul eder', () => {
    expect(getOrderQuantityError(product, 4)).toBe("Bu ürün için minimum sipariş adedi 5'tir.");
    expect(getOrderQuantityError(product, 5)).toBeNull();
    expect(getOrderQuantityError(product, 10)).toBeNull();
  });

  it('stok minimumdan düşükse siparişi reddeder', () => {
    expect(() => assertOrderQuantity({ minimum_order_quantity: 5, stock_quantity: 3 }, 5)).toThrow('Talep edilen miktar mevcut stoktan fazla.');
  });
});
