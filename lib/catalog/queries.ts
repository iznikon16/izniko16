import type { User } from '@supabase/supabase-js';
import type { AdminDashboardMetrics, AdminMediaFilters, AdminMediaImage, AdminMediaProduct, AdminProductFilters, BrandRow, CampaignRow, CatalogProduct, CategoryRow, HomeSlide, HomeSlideRow, HomeVideoSettings, HomeVideoSettingsRow, ProductAttributeRow, ProductEditorPayload, ProductHighlightRow, ProductImageRow, ProjectReference, ProjectReferenceRow, ProductRow } from '@/lib/catalog/types';
import { buildPriceLabel, getRootCategory, getRootCategorySlug, getStoragePublicUrl, groupAttributes, mapImage, pickFeaturedImage, sortAttributes, sortCategories, sortHighlights, sortImages } from '@/lib/catalog/utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

const catalogSelect = `
  *,
  brand:brands(*),
  product_categories(
    is_primary,
    sort_order,
    category:categories(*)
  ),
  product_images(*),
  product_highlights(*),
  product_attributes(*)
`;

type RawCatalogProduct = {
  product_attributes: ProductAttributeRow[];
  product_highlights: ProductHighlightRow[];
  product_images: ProductImageRow[];
  brand: BrandRow | null;
  product_categories: Array<{
    is_primary: boolean;
    sort_order: number;
    category: CategoryRow | null;
  }>;
} & ProductRow;

type RawAdminMediaImage = ProductImageRow & {
  product: AdminMediaProduct | null;
};

function mapCatalogProduct(rawProduct: RawCatalogProduct): CatalogProduct {
  const images = sortImages(rawProduct.product_images).map(mapImage);
  const categories = sortCategories(
    rawProduct.product_categories
      .map((relation) => relation.category)
      .filter((category): category is CategoryRow => Boolean(category))
  );
  const highlights = sortHighlights(rawProduct.product_highlights);
  const attributes = sortAttributes(rawProduct.product_attributes);

  return {
    ...rawProduct,
    categories,
    images,
    highlights,
    attributes,
    attributeGroups: groupAttributes(attributes),
    featuredImageUrl: pickFeaturedImage(images, rawProduct.featured_image_path),
    priceLabel: buildPriceLabel(rawProduct),
  };
}

export async function getPublicCatalogProducts(rootCategorySlug?: string) {
  const supabase = await createServerClient();
  const query = supabase
    .from('products')
    .select(catalogSelect)
    .eq('status', 'published')
    .eq('is_active', true)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const products = (data as unknown as RawCatalogProduct[]).map(mapCatalogProduct);

  if (!rootCategorySlug) {
    return products;
  }

  return products.filter((product) => getRootCategorySlug(product.categories) === rootCategorySlug);
}

export async function getFeaturedPublicProducts(limit = 4) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select(catalogSelect)
    .eq('status', 'published')
    .eq('is_active', true)
    .eq('featured', true)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const featuredProducts = (data as unknown as RawCatalogProduct[]) ?? [];

  if (featuredProducts.length >= limit) {
    return featuredProducts.map(mapCatalogProduct);
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from('products')
    .select(catalogSelect)
    .eq('status', 'published')
    .eq('is_active', true)
    .eq('featured', false)
    .order('updated_at', { ascending: false })
    .limit(limit - featuredProducts.length);

  if (fallbackError) {
    throw new Error(fallbackError.message);
  }

  return [...featuredProducts, ...((fallbackData as unknown as RawCatalogProduct[]) ?? [])].map(mapCatalogProduct);
}

function isCampaignCurrentlyActive(campaign: CampaignRow) {
  const now = Date.now();
  const startsAt = campaign.starts_at ? new Date(campaign.starts_at).getTime() : null;
  const endsAt = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;

  if (startsAt && startsAt > now) {
    return false;
  }

  if (endsAt && endsAt < now) {
    return false;
  }

  return campaign.is_active;
}

export async function getActivePublicCampaigns(limit = 3) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('starts_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as CampaignRow[]).filter(isCampaignCurrentlyActive).slice(0, limit);
}

export async function getPublicHomeSlides(limit = 8): Promise<HomeSlide[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('home_slides')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as HomeSlideRow[]).map((slide) => ({
    ...slide,
    imageUrl: getStoragePublicUrl(slide.image_path),
  }));
}

function mapHomeVideoSettings(settings: HomeVideoSettingsRow): HomeVideoSettings {
  return {
    ...settings,
    embedUrl: `https://www.youtube-nocookie.com/embed/${settings.video_id}?rel=0&modestbranding=1`,
    thumbnailUrl: `https://i.ytimg.com/vi/${settings.video_id}/hqdefault.jpg`,
  };
}

export async function getPublicHomeVideo(): Promise<HomeVideoSettings | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('home_video_settings')
    .select('*')
    .eq('id', 'main')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapHomeVideoSettings(data as HomeVideoSettingsRow) : null;
}

export async function getPublicProjectReferences(limit?: number): Promise<ProjectReference[]> {
  const supabase = await createServerClient();
  let query = supabase
    .from('project_references')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('completed_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectReferenceRow[]).map((reference) => ({
    ...reference,
    imageUrl: getStoragePublicUrl(reference.image_path),
  }));
}

export async function getPublicProductsByIds(productIds: string[]) {
  if (productIds.length === 0) {
    return [];
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('products')
    .select(catalogSelect)
    .in('id', productIds)
    .eq('status', 'published')
    .eq('is_active', true);

  if (error) {
    throw new Error(error.message);
  }

  return (data as unknown as RawCatalogProduct[]).map(mapCatalogProduct);
}

export function deriveCatalogTaxonomies(products: CatalogProduct[]) {
  const brandsById = new Map<string, BrandRow>();
  const categoriesById = new Map<string, CategoryRow>();

  for (const product of products) {
    if (product.brand) {
      brandsById.set(product.brand.id, product.brand);
    }

    for (const category of product.categories) {
      categoriesById.set(category.id, category);
    }
  }

  return {
    brands: [...brandsById.values()].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, 'tr')),
    categories: [...categoriesById.values()].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, 'tr')),
  };
}

export async function getPublicCatalogTaxonomies() {
  const supabase = await createServerClient();

  const [{ data: brands, error: brandsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from('brands').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('name', { ascending: true }),
  ]);

  if (brandsError) {
    throw new Error(brandsError.message);
  }

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  return {
    brands: brands ?? [],
    categories: categories ?? [],
  };
}

export async function getPublicProductBySlug(slug: string, rootCategorySlug?: string) {
  const supabase = await createServerClient();
  const query = supabase
    .from('products')
    .select(catalogSelect)
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('is_active', true);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const product = mapCatalogProduct(data as unknown as RawCatalogProduct);

  if (rootCategorySlug && getRootCategorySlug(product.categories) !== rootCategorySlug) {
    return null;
  }

  return product;
}

export async function getAdminTaxonomies() {
  const supabase = createAdminClient();

  const [{ data: brands, error: brandsError }, { data: categories, error: categoriesError }] = await Promise.all([
    supabase.from('brands').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
  ]);

  if (brandsError) {
    throw new Error(brandsError.message);
  }

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  return {
    brands: brands ?? [],
    categories: categories ?? [],
  };
}

export async function getAdminProducts(filters?: AdminProductFilters) {
  const supabase = createAdminClient();
  let query = supabase
    .from('products')
    .select(catalogSelect)
    .order('updated_at', { ascending: false });

  if (filters?.query) {
    const searchTerm = filters.query.replace(/[%_,]/g, ' ').trim();

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
    }
  }

  if (filters?.brandId) {
    query = query.eq('brand_id', filters.brandId);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.stockStatus) {
    query = query.eq('stock_status', filters.stockStatus);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const products = (data as unknown as RawCatalogProduct[]).map(mapCatalogProduct);

  if (!filters?.rootCategoryId) {
    return products;
  }

  return products.filter((product) => getRootCategory(product.categories)?.id === filters.rootCategoryId);
}

export async function getAdminProductEditor(productId: string): Promise<ProductEditorPayload | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select(catalogSelect)
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const rawProduct = data as unknown as RawCatalogProduct;

  return {
    product: rawProduct,
    categories: rawProduct.product_categories
      .map((relation) => relation.category)
      .filter((category): category is CategoryRow => Boolean(category)),
    selectedCategoryIds: rawProduct.product_categories
      .slice()
      .sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || left.sort_order - right.sort_order)
      .map((relation) => relation.category?.id)
      .filter((id): id is string => Boolean(id)),
    brand: rawProduct.brand,
    images: sortImages(rawProduct.product_images),
    highlights: sortHighlights(rawProduct.product_highlights),
    attributes: sortAttributes(rawProduct.product_attributes),
  };
}

export async function getAdminDashboardMetrics(days?: number): Promise<AdminDashboardMetrics> {
  void days;
  const supabase = createAdminClient();

  const [
    { count: totalProducts },
    { count: publishedProducts },
    { count: onRequestProducts },
    { count: featuredProducts },
    { count: totalBrands },
    { count: totalCategories },
    { count: totalCustomers },
    { count: totalOrders },
    { count: pendingOrders },
    { count: activeCoupons },
    { count: activeCampaigns },
    { count: activePaymentMethods },
  ] =
    await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('price_mode', 'contact'),
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('featured', true),
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('categories').select('*', { count: 'exact', head: true }),
      supabase.from('customer_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment'),
      supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('payment_methods').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

  return {
    activeCampaigns: activeCampaigns ?? 0,
    activeCoupons: activeCoupons ?? 0,
    activePaymentMethods: activePaymentMethods ?? 0,
    totalProducts: totalProducts ?? 0,
    publishedProducts: publishedProducts ?? 0,
    onRequestProducts: onRequestProducts ?? 0,
    featuredProducts: featuredProducts ?? 0,
    totalBrands: totalBrands ?? 0,
    totalCategories: totalCategories ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalOrders: totalOrders ?? 0,
    pendingOrders: pendingOrders ?? 0,
  };
}

export async function getRecentAdminProducts(limit = 5) {
  const products = await getAdminProducts();
  return products.slice(0, limit);
}

export async function getAdminMediaProducts(): Promise<AdminMediaProduct[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, title, slug, featured_image_path, updated_at')
    .order('title', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getAdminMediaImages(filters?: AdminMediaFilters): Promise<AdminMediaImage[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from('product_images')
    .select('*, product:products(id, title, slug, featured_image_path, updated_at)')
    .order('created_at', { ascending: false });

  if (filters?.productId) {
    query = query.eq('product_id', filters.productId);
  }

  if (filters?.featured) {
    query = query.eq('is_featured', filters.featured === 'featured');
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedQuery = filters?.query?.toLocaleLowerCase('tr').trim();
  const images = ((data ?? []) as unknown as RawAdminMediaImage[]).map((image) => ({
    ...image,
    publicUrl: getStoragePublicUrl(image.storage_path) ?? '',
  }));

  if (!normalizedQuery) {
    return images;
  }

  return images.filter((image) => {
    const searchableText = [
      image.alt_text,
      image.caption,
      image.product?.title,
      image.storage_path,
    ]
      .join(' ')
      .toLocaleLowerCase('tr');

    return searchableText.includes(normalizedQuery);
  });
}

export async function getAdminIdentity(user: User) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
