import { resolveProductPriceForCustomer } from '@/lib/pricing/queries';

describe('member pricing priority', () => {
  const baseContext = {
    discountPercent: 10,
    priceListId: 'list-1',
    priceListItems: new Map<string, { discount_percent: number | null; price: number | null; product_id: string; price_list_id: string; created_at: string; id: string; updated_at: string }>(),
    specialPrices: new Map<string, number>(),
  };

  it('müşteri özel fiyatını diğer kurallardan önce uygular', () => {
    const context = { ...baseContext, specialPrices: new Map([['product-1', 70]]) };
    expect(resolveProductPriceForCustomer(context, { customerId: 'customer-1', productId: 'product-1', standardPrice: 100 })).toMatchObject({
      price: 70,
      source: 'customer_special',
    });
  });

  it('özel fiyat yoksa fiyat listesi, indirim ve standart fiyat sırasını korur', () => {
    const context = {
      ...baseContext,
      priceListItems: new Map([['product-1', {
        created_at: '', discount_percent: null, id: 'item-1', price: 80,
        price_list_id: 'list-1', product_id: 'product-1', updated_at: '',
      }]]),
    };
    expect(resolveProductPriceForCustomer(context, { customerId: 'customer-1', productId: 'product-1', standardPrice: 100 })).toMatchObject({ price: 80, source: 'price_list' });
    expect(resolveProductPriceForCustomer(baseContext, { customerId: 'customer-1', productId: 'product-2', standardPrice: 100 })).toMatchObject({ price: 90, source: 'customer_discount' });
    expect(resolveProductPriceForCustomer({ ...baseContext, discountPercent: 0 }, { customerId: 'customer-1', productId: 'product-2', standardPrice: 100 })).toMatchObject({ price: 100, source: 'standard' });
  });
});
