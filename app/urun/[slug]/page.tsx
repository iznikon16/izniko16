import { getPublicProductBySlug } from '@/lib/catalog/queries';
import { getCustomerSession } from '@/lib/commerce/queries';
import { getCustomerPricedProducts } from '@/lib/pricing/queries';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';
import type { CatalogProduct } from '@/lib/catalog/types';

export const revalidate = 60; // revalidate every 60 seconds

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const session = await getCustomerSession();
  let finalProduct: CatalogProduct & { customerPrice?: number | null; customerPriceSource?: string } = product;
  if (session?.profile?.user_id) {
    const pricedArr = await getCustomerPricedProducts(session.profile.user_id, [product]);
    finalProduct = pricedArr[0];
  }

  // Map to the simple format used in the storefront
  const simpleProduct = {
    id: finalProduct.id,
    name: finalProduct.title,
    slug: finalProduct.slug,
    category: finalProduct.categories?.[0]?.name || 'Diğer',
    brand: finalProduct.brand?.name || 'İznikon',
    code: finalProduct.sku,
    price: session ? `₺${finalProduct.customerPrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'}` : '',
    unit: finalProduct.price_note || 'Adet',
    img: finalProduct.images?.[0]?.publicUrl || '/logo.png',
    tags: finalProduct.tags || [],
    inStock: finalProduct.stock_status === 'in_stock',
    boxQty: '',
    description: finalProduct.body || '',
    customerPriceSource: finalProduct.customerPriceSource || null,
    minimumOrderQuantity: finalProduct.minimum_order_quantity,
    taxRate: finalProduct.tax_rate,
  };

  return <ProductDetailClient product={simpleProduct} isAuthenticated={Boolean(session)} />;
}
