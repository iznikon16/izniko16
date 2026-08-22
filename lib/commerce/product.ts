import type { CatalogProduct } from '@/lib/catalog/types';
type CheckoutPricedProduct = CatalogProduct & { customerPrice?: number | null };

export function getProductCheckoutPrice(product: CheckoutPricedProduct) {
  if (product.price_mode !== 'fixed' || typeof product.customerPrice !== 'number') {
    return null;
  }

  return product.customerPrice;
}

export function getProductHref(product: CatalogProduct) {
  return `/urunler/${product.slug}`;
}
