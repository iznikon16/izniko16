import { getPublicProductBySlug } from '@/lib/catalog/queries';
import { getCustomerSession } from '@/lib/commerce/queries';
import { getCustomerPricedProducts } from '@/lib/pricing/queries';
import { notFound } from 'next/navigation';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 60; // revalidate every 60 seconds

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await getPublicProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const session = await getCustomerSession();
  let finalProduct = product as any;
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
    price: `₺${(finalProduct.customerPrice ?? finalProduct.price)?.toLocaleString('tr-TR', { minimumFractionDigits: 2 }) || '0,00'}`,
    unit: finalProduct.price_note || 'Adet',
    img: finalProduct.images?.[0]?.publicUrl || '/logo.png',
    tags: finalProduct.tags || [],
    inStock: finalProduct.stock_status === 'in_stock',
    boxQty: '',
    description: finalProduct.description || '',
    customerPriceSource: finalProduct.customerPriceSource || null,
  };

  return <ProductDetailClient product={simpleProduct} />;
}
