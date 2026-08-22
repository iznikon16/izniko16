import { getPublicCatalogProducts, getPublicHomeSlides } from '@/lib/catalog/queries';
import { getCustomerSession } from '@/lib/commerce/queries';
import { getCustomerPricedProducts } from '@/lib/pricing/queries';
import HomeClient from './HomeClient';
import type { CatalogProduct } from '@/lib/catalog/types';

export const revalidate = 60; // revalidate every 60 seconds or use on-demand revalidation

export default async function Home() {
  const catalogProducts = await getPublicCatalogProducts();
  const slides = await getPublicHomeSlides(5);
  const session = await getCustomerSession();
  
  let finalProducts: Array<CatalogProduct & { customerPrice?: number | null; customerPriceSource?: string }> = catalogProducts;
  if (session?.profile?.user_id) {
    finalProducts = await getCustomerPricedProducts(session.profile.user_id, catalogProducts);
  }
  
  // Map real database products to the format expected by the Storefront UI
  const products = finalProducts.map((p) => ({
    id: p.id,
    name: p.title,
    slug: p.slug,
    category: p.categories?.[0]?.name || 'Diğer',
    brand: p.brand?.name || 'İznikon',
    code: p.sku,
    price: session ? `₺${p.customerPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'}` : '',
    unit: p.price_note || 'Adet',
    img: p.images?.[0]?.publicUrl || '/logo.png',
    tags: p.tags || [],
    inStock: p.stock_status === 'in_stock',
    boxQty: '',
    minimumOrderQuantity: p.minimum_order_quantity,
    taxRate: p.tax_rate,
  }));

  return <HomeClient products={products} slides={slides} isAuthenticated={Boolean(session)} />;
}
