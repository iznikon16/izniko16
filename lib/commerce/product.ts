import type { CatalogProduct } from '@/lib/catalog/types';
import { getCatalogBasePath, getRootCategorySlug } from '@/lib/catalog/utils';

export function getProductCheckoutPrice(product: CatalogProduct) {
  if (product.price_mode !== 'fixed' || typeof product.price !== 'number') {
    return null;
  }

  return product.price;
}

export function getProductHref(product: CatalogProduct) {
  return `/urunler/${product.slug}`;
}
