import { getPublicCatalogProducts } from '@/lib/catalog/queries';
import { getCustomerSession } from '@/lib/commerce/queries';
import { getCustomerPricedProducts } from '@/lib/pricing/queries';
import CategoryClient from './CategoryClient';
import { notFound } from 'next/navigation';

export const revalidate = 60; // revalidate every 60 seconds

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const catalogProducts = await getPublicCatalogProducts();
  const session = await getCustomerSession();
  
  let finalProducts: any[] = catalogProducts;
  if (session?.profile?.user_id) {
    finalProducts = await getCustomerPricedProducts(session.profile.user_id, catalogProducts);
  }
  
  // Actually, we can filter them by category in memory or rely on getPublicCatalogProducts(params.slug)
  // Let's filter manually to be absolutely sure we map the tags right
  const products = finalProducts
    .filter(p => {
      // Check if product's primary category slug matches the URL slug
      // For fallback, also check tags if category mapping is missing
      const catSlugs = p.categories?.map((c: any) => c.slug) || [];
      return catSlugs.includes(params.slug) || (p.tags || []).includes(params.slug) || params.slug === 'tum-urunler';
    })
    .map(p => ({
      id: p.id,
      name: p.title,
      slug: p.slug,
      category: p.categories?.[0]?.name || 'Diğer',
      brand: p.brand?.name || 'İznikon',
      code: p.sku,
      price: `₺${(p.customerPrice ?? p.price)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'}`,
      unit: p.price_note || 'Adet',
      img: p.images?.[0]?.publicUrl || '/logo.png',
      tags: p.tags || [],
      inStock: p.stock_status === 'in_stock',
      boxQty: ''
    }));

  return <CategoryClient products={products} />;
}
