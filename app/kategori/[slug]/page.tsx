import { getPublicCatalogProducts } from '@/lib/catalog/queries';
import { getCustomerSession } from '@/lib/commerce/queries';
import { getCustomerPricedProducts } from '@/lib/pricing/queries';
import CategoryClient from './CategoryClient';
import type { CatalogProduct } from '@/lib/catalog/types';

export const revalidate = 60; // revalidate every 60 seconds

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalogProducts = await getPublicCatalogProducts();
  const session = await getCustomerSession();
  
  let finalProducts: Array<CatalogProduct & { customerPrice?: number | null; customerPriceSource?: string }> = catalogProducts;
  if (session?.profile?.user_id) {
    finalProducts = await getCustomerPricedProducts(session.profile.user_id, catalogProducts);
  }
  
  // Actually, we can filter them by category in memory or rely on getPublicCatalogProducts(params.slug)
  // Let's filter manually to be absolutely sure we map the tags right
  const products = finalProducts
    .filter(p => {
      // Check if product's primary category slug matches the URL slug
      // For fallback, also check tags if category mapping is missing
      const catSlugs = p.categories?.map((category) => category.slug) || [];
      return catSlugs.includes(slug) || (p.tags || []).includes(slug) || slug === 'tum-urunler';
    })
    .map(p => ({
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

  return <CategoryClient products={products} isAuthenticated={Boolean(session)} />;
}
