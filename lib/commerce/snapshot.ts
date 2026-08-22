import type { CommerceCart } from '@/lib/commerce/queries';
import type { CommerceCartSnapshot } from '@/lib/commerce/contracts';

export function serializeCommerceCart(cart: CommerceCart): CommerceCartSnapshot {
  return {
    checkoutReady: cart.checkoutReady,
    coupon: cart.coupon
      ? {
          code: cart.coupon.code,
          description: cart.coupon.description,
          discountAmount: cart.coupon.discountAmount,
          discountType: cart.coupon.discountType,
          discountValue: cart.coupon.discountValue,
          title: cart.coupon.title,
        }
      : null,
    discountTotal: cart.discountTotal,
    itemCount: cart.itemCount,
    lines: cart.lines.map((line) => ({
      id: line.id,
      lineTotal: line.lineTotal,
      product: {
        brandName: line.product.brand?.name ?? line.product.categories[0]?.name ?? null,
        featuredImageUrl: line.product.featuredImageUrl,
        id: line.product.id,
        priceLabel: line.product.priceLabel,
        summary: line.product.summary,
        title: line.product.title,
      },
      productHref: line.productHref,
      quantity: line.quantity,
      taxAmount: line.taxAmount,
      taxRate: line.taxRate,
      unitPrice: line.unitPrice,
    })),
    subtotal: cart.subtotal,
    taxTotal: cart.taxTotal,
    total: cart.total,
  };
}
