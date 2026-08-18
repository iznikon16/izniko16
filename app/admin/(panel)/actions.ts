'use server';

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminPermission } from '@/lib/auth/admin';
import { sanitizeProductHtml } from '@/lib/catalog/html';
import { CATALOG_BASE_PATHS, getCatalogBasePath, STORAGE_BUCKET, parseTagInput, slugify } from '@/lib/catalog/utils';
import { isPaymentProviderKey, PAYMENT_PROVIDER_DEFINITIONS } from '@/lib/commerce/payment-provider-presets';
import { encryptToken } from '@/lib/security/encryption';
import { sendOrderUpdateEmails } from '@/lib/mail/notifications';
import { createAdminClient } from '@/lib/supabase/admin';
import { postOrderToAccount, cancelOrderInAccount } from '@/lib/accounting/mutations';
import type { Database } from '@/lib/supabase/database.types';
import { createClient as createServerClient } from '@/lib/supabase/server';

type HighlightInput = {
  id?: string;
  content: string;
  sort_order: number;
};

type AttributeInput = {
  id?: string;
  attribute_group: string;
  name: string;
  value: string;
  sort_order: number;
};

type ExistingImageInput = {
  id?: string;
  storage_path: string;
  alt_text: string;
  caption: string;
  sort_order: number;
  is_featured: boolean;
  remove?: boolean;
};

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type CategoryRecord = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'parent_id' | 'slug'>;
type ProductCategoryRecord = Pick<Database['public']['Tables']['product_categories']['Row'], 'category_id' | 'is_primary' | 'sort_order'>;
type PriceMode = Database['public']['Enums']['price_mode'];
type ProductStatus = Database['public']['Enums']['product_status'];
type StockStatus = Database['public']['Enums']['stock_status'];
type OrderStatus = Database['public']['Enums']['order_status'];
type PaymentProvider = Database['public']['Enums']['payment_provider'];
type PaymentStatus = Database['public']['Enums']['payment_status'];
type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert'];
type CouponInsert = Database['public']['Tables']['coupons']['Insert'];
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];
type HomeSlideInsert = Database['public']['Tables']['home_slides']['Insert'];
type HomeVideoSettingsInsert = Database['public']['Tables']['home_video_settings']['Insert'];
type ProjectReferenceInsert = Database['public']['Tables']['project_references']['Insert'];
type PaymentIntegrationType = 'manual' | 'redirect' | 'api';
type CouponDiscountType = 'fixed' | 'percent';
type CampaignType = 'banner' | 'discount' | 'bundle' | 'seasonal';

const BRAND_LOGO_MAX_SIZE = 2 * 1024 * 1024;
const BRAND_LOGO_EXTENSIONS = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);
const HOME_SLIDE_IMAGE_MAX_SIZE = 2 * 1024 * 1024;
const HOME_SLIDE_IMAGE_EXTENSIONS = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);
const REFERENCE_IMAGE_MAX_SIZE = 2 * 1024 * 1024;
const REFERENCE_IMAGE_EXTENSIONS = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);

function revalidateCatalogIndexes() {
  const paths = new Set<string>(Object.values(CATALOG_BASE_PATHS));

  for (const path of paths) {
    revalidatePath(path);
  }
}

function revalidateCatalogProduct(rootCategorySlug?: string | null, slug?: string | null) {
  const basePath = getCatalogBasePath(rootCategorySlug);
  if (!basePath) {
    return;
  }

  revalidatePath(basePath);

  if (slug) {
    revalidatePath(`${basePath}/${slug}`);
  }
}

function revalidateHomeSlides() {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/home-slides');
}

function revalidateHomeVideo() {
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/admin/home-video');
}

function revalidateProjectReferences() {
  revalidatePath('/referanslar');
  revalidatePath('/admin');
  revalidatePath('/admin/references');
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = getText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getOptionalInteger(formData: FormData, key: string) {
  const value = getText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getOptionalDateTime(formData: FormData, key: string) {
  const value = getText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getOptionalDate(formData: FormData, key: string) {
  const value = getText(formData, key);

  if (!value) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function parseJsonObjectField(formData: FormData, key: string) {
  const rawValue = formData.get(key);

  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON object expected.');
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${key} alanı geçerli JSON nesnesi olmalıdır.`);
  }
}

function parseJsonField<T>(formData: FormData, key: string, fallback: T) {
  const rawValue = formData.get(key);

  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

function parsePriceMode(value: string): PriceMode {
  return value === 'contact' ? 'contact' : 'fixed';
}

function parseProductStatus(value: string): ProductStatus {
  if (value === 'published' || value === 'archived') {
    return value;
  }

  return 'draft';
}

function parseStockStatus(value: string): StockStatus {
  if (value === 'out_of_stock' || value === 'on_request') {
    return value;
  }

  return 'in_stock';
}

function parseOrderStatus(value: string): OrderStatus {
  if (value === 'confirmed' || value === 'preparing' || value === 'shipped' || value === 'completed' || value === 'cancelled') {
    return value;
  }

  return 'pending_payment';
}

function parsePaymentStatus(value: string): PaymentStatus {
  if (value === 'pending' || value === 'paid' || value === 'failed' || value === 'refunded') {
    return value;
  }

  return 'unpaid';
}

function parsePaymentProvider(value: string): PaymentProvider {
  if (isPaymentProviderKey(value)) {
    return value;
  }

  return 'offline';
}

function parsePaymentIntegrationType(value: string): PaymentIntegrationType {
  if (value === 'redirect' || value === 'api') {
    return value;
  }

  return 'manual';
}

function parseCouponDiscountType(value: string): CouponDiscountType {
  return value === 'percent' ? 'percent' : 'fixed';
}

function parseCampaignType(value: string): CampaignType {
  if (value === 'banner' || value === 'discount' || value === 'bundle') {
    return value;
  }

  return 'seasonal';
}

function extractYouTubeVideoId(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  try {
    const url = new URL(trimmedValue);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

    if (hostname === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtube-nocookie.com') {
      const queryId = url.searchParams.get('v');
      if (queryId && /^[a-zA-Z0-9_-]{11}$/.test(queryId)) {
        return queryId;
      }

      const parts = url.pathname.split('/').filter(Boolean);
      const knownPathIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live');
      const pathId = knownPathIndex >= 0 ? parts[knownPathIndex + 1] : null;
      return pathId && /^[a-zA-Z0-9_-]{11}$/.test(pathId) ? pathId : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isDirectVideoUrl(value: string) {
  return /\.(?:mp4|webm|ogg)(?:[?#].*)?$/i.test(value.trim());
}

function getHomeVideoId(value: string) {
  const youtubeId = extractYouTubeVideoId(value);

  if (youtubeId) {
    return youtubeId;
  }

  if (!isDirectVideoUrl(value)) {
    return null;
  }

  const fileName = value
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/\.(?:mp4|webm|ogg)$/i, '');

  return `direct-${slugify(fileName || 'video').slice(0, 56) || 'video'}`;
}

function revalidateAdminCommerce() {
  revalidatePath('/admin');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/customers');
  revalidatePath('/admin/coupons');
  revalidatePath('/admin/campaigns');
  revalidatePath('/admin/payment-methods');
  revalidatePath('/odeme');
  revalidatePath('/hesabim');
  revalidatePath('/hesabim/siparislerim');
}

function getMimeType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.avif':
      return 'image/avif';
    default:
      return 'image/jpeg';
  }
}

function getUploadedFile(formData: FormData, key: string) {
  const entry = formData.get(key);
  return entry instanceof File && entry.size > 0 ? entry : null;
}

function isManagedBrandLogoPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith('brands/'));
}

async function removeManagedBrandLogo(supabase: ReturnType<typeof createAdminClient>, value: string | null | undefined) {
  if (!isManagedBrandLogoPath(value)) {
    return;
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([value!]);
}

function isManagedHomeSlideImagePath(value: string | null | undefined) {
  return Boolean(value && value.startsWith('home-slides/'));
}

async function removeManagedHomeSlideImage(supabase: ReturnType<typeof createAdminClient>, value: string | null | undefined) {
  if (!isManagedHomeSlideImagePath(value)) {
    return;
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([value!]);
}

async function uploadBrandLogo(supabase: ReturnType<typeof createAdminClient>, brandSlug: string, file: File) {
  if (file.size > BRAND_LOGO_MAX_SIZE) {
    throw new Error('Marka logosu en fazla 2 MB olabilir.');
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!BRAND_LOGO_EXTENSIONS.has(extension)) {
    throw new Error('Marka logosu PNG, JPG, WEBP veya AVIF formatında olmalıdır.');
  }

  const fileStem = slugify(file.name.replace(extension, '')) || 'logo';
  const storagePath = `brands/${brandSlug}/${randomUUID()}-${fileStem}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    cacheControl: '31536000',
    contentType: getMimeType(file.name),
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return storagePath;
}

async function uploadHomeSlideImage(supabase: ReturnType<typeof createAdminClient>, slideTitle: string, file: File) {
  if (file.size > HOME_SLIDE_IMAGE_MAX_SIZE) {
    throw new Error('Slider görseli en fazla 2 MB olabilir.');
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!HOME_SLIDE_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error('Slider görseli PNG, JPG, WEBP veya AVIF formatında olmalıdır.');
  }

  const folderName = slugify(slideTitle) || 'slide';
  const fileStem = slugify(file.name.replace(extension, '')) || 'gorsel';
  const storagePath = `home-slides/${folderName}/${randomUUID()}-${fileStem}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    cacheControl: '31536000',
    contentType: getMimeType(file.name),
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return storagePath;
}

function isManagedReferenceImagePath(value: string | null | undefined) {
  return Boolean(value && value.startsWith('references/'));
}

async function removeManagedReferenceImage(supabase: ReturnType<typeof createAdminClient>, value: string | null | undefined) {
  if (!isManagedReferenceImagePath(value)) {
    return;
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([value!]);
}

async function uploadReferenceImage(supabase: ReturnType<typeof createAdminClient>, referenceTitle: string, file: File) {
  if (file.size > REFERENCE_IMAGE_MAX_SIZE) {
    throw new Error('Referans görseli en fazla 2 MB olabilir.');
  }

  const extension = path.extname(file.name).toLowerCase();

  if (!REFERENCE_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error('Referans görseli PNG, JPG, WEBP veya AVIF formatında olmalıdır.');
  }

  const folderName = slugify(referenceTitle) || 'referans';
  const fileStem = slugify(file.name.replace(extension, '')) || 'gorsel';
  const storagePath = `references/${folderName}/${randomUUID()}-${fileStem}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    cacheControl: '31536000',
    contentType: getMimeType(file.name),
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return storagePath;
}

async function ensureAdmin(permission?: string) {
  await requireAdminPermission(permission);
  return createAdminClient();
}



async function getCategoryRecords(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase.from('categories').select('id, slug, parent_id');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function collectAncestorIds(categoryId: string, categoriesById: Map<string, CategoryRecord>) {
  const lineage: string[] = [];
  let current = categoriesById.get(categoryId) ?? null;

  while (current) {
    lineage.unshift(current.id);
    current = current.parent_id ? categoriesById.get(current.parent_id) ?? null : null;
  }

  return lineage;
}

function resolveProductCategorySelection(categories: CategoryRecord[], rawSelectedCategoryIds: string[]) {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const requestedCategoryIds = [...new Set(rawSelectedCategoryIds.map((value) => value.trim()).filter(Boolean))];

  if (requestedCategoryIds.length === 0) {
    throw new Error('En az bir kategori seçin.');
  }

  const normalizedCategoryIds: string[] = [];
  const rootSlugs = new Set<string>();

  for (const categoryId of requestedCategoryIds) {
    const lineage = collectAncestorIds(categoryId, categoriesById);

    if (lineage.length === 0) {
      continue;
    }

    const rootCategory = categoriesById.get(lineage[0]);

    if (!rootCategory?.slug) {
      continue;
    }

    rootSlugs.add(rootCategory.slug);

    for (const ancestorId of lineage) {
      if (!normalizedCategoryIds.includes(ancestorId)) {
        normalizedCategoryIds.push(ancestorId);
      }
    }
  }

  if (normalizedCategoryIds.length === 0) {
    throw new Error('Seçilen kategoriler bulunamadı.');
  }

  if (rootSlugs.size > 1) {
    throw new Error('Ürün yalnızca tek bir ana kategori altında kaydedilebilir.');
  }

  return {
    rootCategorySlug: [...rootSlugs][0] ?? null,
    selectedCategoryIds: normalizedCategoryIds,
  };
}

function resolveRootCategorySlug(categories: CategoryRecord[], productCategories: ProductCategoryRecord[]) {
  const orderedCategoryIds = productCategories
    .slice()
    .sort((left, right) => Number(right.is_primary) - Number(left.is_primary) || left.sort_order - right.sort_order)
    .map((category) => category.category_id);

  const rootSlugs = new Set<string>();
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  for (const categoryId of orderedCategoryIds) {
    const lineage = collectAncestorIds(categoryId, categoriesById);
    const rootCategory = categoriesById.get(lineage[0] ?? '');

    if (rootCategory?.slug) {
      rootSlugs.add(rootCategory.slug);
    }
  }

  return [...rootSlugs][0] ?? null;
}

async function getProductRouteInfo(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string,
  categories: CategoryRecord[]
) {
  const [{ data: product, error: productError }, { data: productCategories, error: productCategoriesError }] = await Promise.all([
    supabase.from('products').select('slug').eq('id', productId).maybeSingle(),
    supabase
      .from('product_categories')
      .select('category_id, is_primary, sort_order')
      .eq('product_id', productId),
  ]);

  if (productError) {
    throw new Error(productError.message);
  }

  if (productCategoriesError) {
    throw new Error(productCategoriesError.message);
  }

  return {
    slug: product?.slug ?? null,
    rootCategorySlug: resolveRootCategorySlug(categories, productCategories ?? []),
  };
}

async function syncTaxonomy(table: 'brands' | 'categories', formData: FormData, extra: Record<string, unknown> = {}) {
  const supabase = await ensureAdmin('settings.view');
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');

  if (!name) {
    throw new Error('İsim alanı zorunludur.');
  }

  const payload = {
    name,
    slug: getText(formData, 'slug') || slugify(name),
    description: getText(formData, 'description'),
    sort_order: getOptionalInteger(formData, 'sort_order') ?? 0,
    is_active: formData.get('is_active') === 'on',
    ...extra,
  };

  if (table === 'brands') {
    if (id) {
      const { error } = await supabase.from('brands').update(payload).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from('brands').insert(payload);
      if (error) throw new Error(error.message);
    }

    return;
  }

  if (id) {
    const { error } = await supabase.from('categories').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('categories').insert(payload);
    if (error) throw new Error(error.message);
  }
}

async function removeTaxonomy(table: 'brands' | 'categories', formData: FormData) {
  const supabase = await ensureAdmin('settings.view');
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

async function uploadProductImages(productId: string, productSlug: string, files: File[]) {
  const supabase = createAdminClient();
  const uploadedRows: Array<{
    product_id: string;
    storage_path: string;
    alt_text: string;
    caption: string;
    sort_order: number;
    is_featured: boolean;
  }> = [];

  const { data: existingImages } = await supabase
    .from('product_images')
    .select('sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const baseSortOrder = (existingImages?.[0]?.sort_order ?? -1) + 1;

  for (const [index, file] of files.entries()) {
    const extension = path.extname(file.name) || '.jpg';
    const fileName = `${randomUUID()}-${slugify(file.name.replace(extension, ''))}${extension.toLowerCase()}`;
    const storagePath = `${productSlug}/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      upsert: true,
      contentType: getMimeType(file.name),
      cacheControl: '31536000',
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    uploadedRows.push({
      product_id: productId,
      storage_path: storagePath,
      alt_text: '',
      caption: '',
      sort_order: baseSortOrder + index,
      is_featured: baseSortOrder + index === 0,
    });
  }

  if (uploadedRows.length > 0) {
    const { error } = await supabase.from('product_images').insert(uploadedRows);
    if (error) throw new Error(error.message);
  }
}

async function syncProductFeaturedImagePath(supabase: ReturnType<typeof createAdminClient>, productId: string) {
  const { data: refreshedImages, error: refreshedImagesError } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (refreshedImagesError) {
    throw new Error(refreshedImagesError.message);
  }

  const featuredImage = refreshedImages?.find((image: { is_featured: boolean; id: string; storage_path: string }) => image.is_featured) ?? refreshedImages?.[0];

  if (featuredImage && !featuredImage.is_featured) {
    const { error: featuredImageError } = await supabase
      .from('product_images')
      .update({ is_featured: true })
      .eq('id', featuredImage.id);

    if (featuredImageError) {
      throw new Error(featuredImageError.message);
    }
  }

  const { error: productError } = await supabase
    .from('products')
    .update({
      featured_image_path: featuredImage?.storage_path ?? null,
    })
    .eq('id', productId);

  if (productError) {
    throw new Error(productError.message);
  }
}

async function syncProductImages(productId: string, existingImages: ExistingImageInput[]) {
  const supabase = createAdminClient();
  const removableImages = existingImages.filter((image) => image.remove && image.id);
  const remainingImages = existingImages.filter((image) => !image.remove && image.id);

  if (removableImages.length > 0) {
    const removableIds = removableImages.map((image) => image.id!).filter(Boolean);
    const removablePaths = removableImages.map((image) => image.storage_path).filter(Boolean);

    const { error: deleteError } = await supabase.from('product_images').delete().in('id', removableIds);
    if (deleteError) throw new Error(deleteError.message);

    if (removablePaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(removablePaths);
    }
  }

  for (const image of remainingImages) {
    const { error } = await supabase
      .from('product_images')
      .update({
        alt_text: image.alt_text,
        caption: image.caption,
        sort_order: image.sort_order,
        is_featured: image.is_featured,
      })
      .eq('id', image.id!);

    if (error) {
      throw new Error(error.message);
    }
  }

  await syncProductFeaturedImagePath(supabase, productId);
}

async function revalidateProductMediaChanges(supabase: ReturnType<typeof createAdminClient>, productId: string) {
  const availableCategories = await getCategoryRecords(supabase);
  const productRouteInfo = await getProductRouteInfo(supabase, productId, availableCategories);

  revalidatePath('/admin');
  revalidatePath('/admin/media');
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}`);
  revalidateCatalogProduct(productRouteInfo.rootCategorySlug, productRouteInfo.slug);
}

export async function saveBrandAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');

  if (!name) {
    throw new Error('İsim alanı zorunludur.');
  }

  const slug = getText(formData, 'slug') || slugify(name);
  const logoFile = getUploadedFile(formData, 'logo_file');
  const removeLogo = formData.get('remove_logo') === 'on';
  const { data: existingBrand, error: existingBrandError } = id
    ? await supabase.from('brands').select('logo_path').eq('id', id).maybeSingle()
    : { data: null, error: null };

  if (existingBrandError) {
    throw new Error(existingBrandError.message);
  }

  const payload: Database['public']['Tables']['brands']['Insert'] = {
    description: getText(formData, 'description'),
    is_active: formData.get('is_active') === 'on',
    name,
    slug,
    sort_order: getOptionalInteger(formData, 'sort_order') ?? 0,
  };

  if (logoFile) {
    payload.logo_path = await uploadBrandLogo(supabase, slug, logoFile);
  } else if (!id || removeLogo) {
    payload.logo_path = null;
  }

  if (id) {
    const { error } = await supabase.from('brands').update(payload).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('brands').insert(payload);
    if (error) throw new Error(error.message);
  }

  if (logoFile || removeLogo) {
    await removeManagedBrandLogo(supabase, existingBrand?.logo_path);
  }

  revalidatePath('/admin/brands');
  revalidatePath('/admin/products');
  revalidateCatalogIndexes();
}

export async function deleteBrandAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { data: brand, error: brandError } = await supabase.from('brands').select('logo_path').eq('id', id).maybeSingle();

  if (brandError) {
    throw new Error(brandError.message);
  }

  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await removeManagedBrandLogo(supabase, brand?.logo_path);
  revalidatePath('/admin/brands');
  revalidatePath('/admin/products');
  revalidateCatalogIndexes();
}

export async function saveCategoryAction(formData: FormData) {
  await syncTaxonomy('categories', formData, {
    parent_id: getText(formData, 'parent_id') || null,
  });
  revalidatePath('/admin/categories');
  revalidatePath('/admin/products');
  revalidateCatalogIndexes();
}

export async function deleteCategoryAction(formData: FormData) {
  await removeTaxonomy('categories', formData);
  revalidatePath('/admin/categories');
  revalidatePath('/admin/products');
  revalidateCatalogIndexes();
}

export async function saveProductAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const productId = getText(formData, 'id');
  const title = getText(formData, 'title');

  if (!title) {
    throw new Error('Ürün başlığı zorunludur.');
  }

  const slug = getText(formData, 'slug') || slugify(title);
  const status = parseProductStatus(getText(formData, 'status'));
  const rawSelectedCategoryIds = parseJsonField<string[]>(formData, 'selectedCategoryIds', []);
  const availableCategories = await getCategoryRecords(supabase);
  const normalizedCategorySelection = resolveProductCategorySelection(availableCategories, rawSelectedCategoryIds);
  const previousProduct = productId ? await getProductRouteInfo(supabase, productId, availableCategories) : null;
  const productPayload: ProductInsert = {
    sku: getText(formData, 'sku'),
    title,
    slug,
    status,
    stock_status: parseStockStatus(getText(formData, 'stock_status')),
    brand_id: getText(formData, 'brand_id') || null,
    currency: 'TRY',
    price_mode: parsePriceMode(getText(formData, 'price_mode')),
    price: getOptionalNumber(formData, 'price'),
    compare_at_price: getOptionalNumber(formData, 'compare_at_price'),
    price_note: getText(formData, 'price_note') || null,
    summary: getText(formData, 'summary'),
    body: sanitizeProductHtml(getText(formData, 'body')),
    warranty_years: getOptionalInteger(formData, 'warranty_years'),
    capacity_kw: getOptionalNumber(formData, 'capacity_kw'),
    energy_class: getText(formData, 'energy_class') || null,
    badge: getText(formData, 'badge') || null,
    tags: parseTagInput(getText(formData, 'tags')),
    featured: formData.get('featured') === 'on',
    is_active: formData.get('is_active') === 'on',
    seo_title: getText(formData, 'seo_title') || null,
    seo_description: getText(formData, 'seo_description') || null,
    published_at: status === 'published' ? new Date().toISOString() : null,
  };

  const { data: product, error: productError } = productId
    ? await supabase.from('products').update(productPayload).eq('id', productId).select().single()
    : await supabase.from('products').insert(productPayload).select().single();

  if (productError || !product) {
    throw new Error(productError?.message ?? 'Ürün kaydedilemedi.');
  }

  const highlights = parseJsonField<HighlightInput[]>(formData, 'highlights', []).filter((highlight) => highlight.content?.trim());
  const attributes = parseJsonField<AttributeInput[]>(formData, 'attributes', []).filter((attribute) => attribute.name?.trim());
  const existingImages = parseJsonField<ExistingImageInput[]>(formData, 'existingImages', []);

  await Promise.all([
    supabase.from('product_categories').delete().eq('product_id', product.id),
    supabase.from('product_highlights').delete().eq('product_id', product.id),
    supabase.from('product_attributes').delete().eq('product_id', product.id),
  ]);

  if (normalizedCategorySelection.selectedCategoryIds.length > 0) {
    const { error } = await supabase.from('product_categories').insert(
      normalizedCategorySelection.selectedCategoryIds.map((categoryId, index) => ({
        product_id: product.id,
        category_id: categoryId,
        is_primary: index === 0,
        sort_order: index,
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (highlights.length > 0) {
    const { error } = await supabase.from('product_highlights').insert(
      highlights.map((highlight, index) => ({
        product_id: product.id,
        content: highlight.content,
        sort_order: highlight.sort_order ?? index,
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (attributes.length > 0) {
    const { error } = await supabase.from('product_attributes').insert(
      attributes.map((attribute, index) => ({
        product_id: product.id,
        attribute_group: attribute.attribute_group || 'Genel',
        name: attribute.name,
        value: attribute.value,
        sort_order: attribute.sort_order ?? index,
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  await syncProductImages(product.id, existingImages);

  const newImages = formData
    .getAll('new_images')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (newImages.length > 0) {
    await uploadProductImages(product.id, slug, newImages);
    await syncProductImages(product.id, []);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${product.id}`);
  revalidateCatalogProduct(previousProduct?.rootCategorySlug, previousProduct?.slug);
  revalidateCatalogProduct(normalizedCategorySelection.rootCategorySlug, product.slug);

  redirect(`/admin/products/${product.id}`);
}

export async function deleteProductAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const productId = getText(formData, 'id');

  if (!productId) {
    return;
  }

  const availableCategories = await getCategoryRecords(supabase);
  const productRouteInfo = await getProductRouteInfo(supabase, productId, availableCategories);

  const { data: images, error: imagesError } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId);

  if (imagesError) {
    throw new Error(imagesError.message);
  }

  if (images && images.length > 0) {
    await supabase.storage.from(STORAGE_BUCKET).remove(images.map((image) => image.storage_path));
  }

  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw new Error(error.message);

  revalidatePath('/admin');
  revalidatePath('/admin/products');
  revalidateCatalogProduct(productRouteInfo.rootCategorySlug, productRouteInfo.slug);
  redirect('/admin/products');
}

export async function uploadMediaImagesAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const productId = getText(formData, 'product_id');
  const newImages = formData
    .getAll('new_images')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!productId) {
    throw new Error('Görsel yüklemek için ürün seçin.');
  }

  if (newImages.length === 0) {
    throw new Error('Yüklenecek en az bir görsel seçin.');
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, slug')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    throw new Error(productError.message);
  }

  if (!product) {
    throw new Error('Seçilen ürün bulunamadı.');
  }

  await uploadProductImages(product.id, product.slug, newImages);
  await syncProductFeaturedImagePath(supabase, product.id);
  await revalidateProductMediaChanges(supabase, product.id);

  redirect(`/admin/media?productId=${product.id}`);
}

export async function setFeaturedProductImageAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const imageId = getText(formData, 'id');

  if (!imageId) {
    return;
  }

  const { data: image, error: imageError } = await supabase
    .from('product_images')
    .select('id, product_id')
    .eq('id', imageId)
    .maybeSingle();

  if (imageError) {
    throw new Error(imageError.message);
  }

  if (!image) {
    return;
  }

  const { error: resetError } = await supabase
    .from('product_images')
    .update({ is_featured: false })
    .eq('product_id', image.product_id);

  if (resetError) {
    throw new Error(resetError.message);
  }

  const { error: updateError } = await supabase
    .from('product_images')
    .update({ is_featured: true })
    .eq('id', image.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await syncProductFeaturedImagePath(supabase, image.product_id);
  await revalidateProductMediaChanges(supabase, image.product_id);
}

export async function deleteProductImageAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const imageId = getText(formData, 'id');

  if (!imageId) {
    return;
  }

  const { data: image, error: imageError } = await supabase
    .from('product_images')
    .select('id, product_id, storage_path')
    .eq('id', imageId)
    .maybeSingle();

  if (imageError) {
    throw new Error(imageError.message);
  }

  if (!image) {
    return;
  }

  const { error: deleteError } = await supabase.from('product_images').delete().eq('id', image.id);
  if (deleteError) throw new Error(deleteError.message);

  await supabase.storage.from(STORAGE_BUCKET).remove([image.storage_path]);
  await syncProductFeaturedImagePath(supabase, image.product_id);
  await revalidateProductMediaChanges(supabase, image.product_id);
}

export async function saveOrderAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const orderId = getText(formData, 'id');

  if (!orderId) {
    return;
  }

  const { data: previousOrder, error: previousOrderError } = await supabase
    .from('orders')
    .select('id, status, payment_status, user_id, total')
    .eq('id', orderId)
    .maybeSingle();

  if (previousOrderError) {
    throw new Error(previousOrderError.message);
  }

  const paymentMethodId = getText(formData, 'payment_method_id') || null;
  let paymentProvider = parsePaymentProvider(getText(formData, 'payment_provider'));

  if (paymentMethodId) {
    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from('payment_methods')
      .select('id, provider')
      .eq('id', paymentMethodId)
      .maybeSingle();

    if (paymentMethodError) {
      throw new Error(paymentMethodError.message);
    }

    if (!paymentMethod) {
      throw new Error('Seçilen ödeme yöntemi bulunamadı.');
    }

    paymentProvider = paymentMethod.provider;
  }

  const payload: Database['public']['Tables']['orders']['Update'] = {
    admin_note: getText(formData, 'admin_note'),
    note: getText(formData, 'note'),
    payment_method_id: paymentMethodId,
    payment_provider: paymentProvider,
    payment_reference: getText(formData, 'payment_reference') || null,
    payment_status: parsePaymentStatus(getText(formData, 'payment_status')),
    status: parseOrderStatus(getText(formData, 'status')),
  };

  const { data: updatedOrder, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', orderId)
    .select('id, status, payment_status')
    .single();

  if (error || !updatedOrder) {
    throw new Error(error?.message ?? 'Sipariş güncellenemedi.');
  }

  const { data: latestAttempt, error: latestAttemptError } = await supabase
    .from('payment_attempts')
    .select('id')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestAttemptError) {
    throw new Error(latestAttemptError.message);
  }

  if (latestAttempt) {
    const { error: updateAttemptError } = await supabase
      .from('payment_attempts')
      .update({
        payment_method_id: paymentMethodId,
        provider: paymentProvider,
        provider_reference: payload.payment_reference,
        status: payload.payment_status,
      })
      .eq('id', latestAttempt.id);

    if (updateAttemptError) {
      console.error('Payment attempt sync failed after admin order update:', updateAttemptError.message);
    }
  }

  if (previousOrder) {
    await sendOrderUpdateEmails({
      orderId,
      previousPaymentStatus: previousOrder.payment_status,
      previousStatus: previousOrder.status,
    }).catch((mailError) => {
      console.error('Order update email notification failed:', mailError);
    });
  }

  if (previousOrder) {
    // Sipariş → Cari otomatik işleme
    const becamePaid = payload.payment_status === 'paid' && previousOrder.payment_status !== 'paid';
    const becameFulfilled =
      (payload.status === 'confirmed' || payload.status === 'preparing' || payload.status === 'shipped' || payload.status === 'completed') &&
      previousOrder.status !== payload.status;
    const becameCancelled = payload.status === 'cancelled' && previousOrder.status !== 'cancelled';
    const orderTotal = Number(previousOrder.total) || 0;

    if (previousOrder.user_id && orderTotal > 0 && (becamePaid || becameFulfilled)) {
      await postOrderToAccount(previousOrder.user_id, { id: orderId, total: orderTotal }).catch((err) => {
        console.error('Order→cari işlenemedi:', err);
      });
    }

    if (previousOrder.user_id && orderTotal > 0 && becameCancelled) {
      await cancelOrderInAccount(previousOrder.user_id, { id: orderId, total: orderTotal }).catch((err) => {
        console.error('Sipariş iptali cariye işlenemedi:', err);
      });
    }
  }

  revalidateAdminCommerce();
  revalidatePath('/admin/accounting/hareketler');
  redirect('/admin/orders');
}

export async function deleteOrderAction(formData: FormData) {
  const supabase = await ensureAdmin('product.update');
  const orderId = getText(formData, 'id');

  if (!orderId) {
    return;
  }

  const { error } = await supabase.from('orders').delete().eq('id', orderId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
  redirect('/admin/orders');
}

export async function createCustomerAction(formData: FormData) {
  const supabase = await ensureAdmin('order.changeStatus');
  const email = getText(formData, 'email');
  const password = getText(formData, 'password');
  const fullName = getText(formData, 'full_name');
  const phone = getText(formData, 'phone');

  if (!email || !password) {
    throw new Error('E-posta ve şifre zorunludur.');
  }

  // Create user in Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      phone: phone,
    }
  });

  if (authError) {
    throw new Error(authError.message);
  }

  // Attempt to update profile (if trigger created it, it might exist, otherwise it's created automatically)
  // We can just try to update it, or wait for the trigger.
  // The trigger on public.users might just pull metadata.
  // To be safe, we do an update/upsert on customer_profiles if possible, but usually triggers handle it.
  if (authData?.user) {
    await supabase.from('customer_profiles').update({
      full_name: fullName,
      phone: phone
    }).eq('user_id', authData.user.id);
  }

  revalidateAdminCommerce();
}

export async function saveCustomerAction(formData: FormData) {
  const supabase = await ensureAdmin('order.cancel');
  const userId = getText(formData, 'user_id');

  if (!userId) {
    return;
  }

  const { error } = await supabase
    .from('customer_profiles')
    .update({
      admin_note: getText(formData, 'admin_note'),
      full_name: getText(formData, 'full_name'),
      is_blocked: formData.get('is_blocked') === 'on',
      phone: getText(formData, 'phone'),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
}

export async function deleteCustomerAction(formData: FormData) {
  const supabase = await ensureAdmin('customer.create');
  const userId = getText(formData, 'user_id');

  if (!userId) {
    return;
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
  redirect('/admin/customers');
}

export async function saveCouponAction(formData: FormData) {
  const supabase = await ensureAdmin('customer.update');
  const id = getText(formData, 'id');
  const title = getText(formData, 'title');
  const code = getText(formData, 'code').toUpperCase().replace(/\s+/g, '');

  if (!title || !code) {
    throw new Error('Kupon başlığı ve kodu zorunludur.');
  }

  const payload: CouponInsert = {
    code,
    description: getText(formData, 'description'),
    discount_type: parseCouponDiscountType(getText(formData, 'discount_type')),
    discount_value: getOptionalNumber(formData, 'discount_value') ?? 0,
    is_active: formData.get('is_active') === 'on',
    maximum_discount: getOptionalNumber(formData, 'maximum_discount'),
    minimum_order_total: getOptionalNumber(formData, 'minimum_order_total') ?? 0,
    stackable: formData.get('stackable') === 'on',
    starts_at: getOptionalDateTime(formData, 'starts_at'),
    title,
    usage_count: getOptionalInteger(formData, 'usage_count') ?? 0,
    usage_limit: getOptionalInteger(formData, 'usage_limit'),
    ends_at: getOptionalDateTime(formData, 'ends_at'),
  };

  const { error } = id ? await supabase.from('coupons').update(payload).eq('id', id) : await supabase.from('coupons').insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
}

export async function deleteCouponAction(formData: FormData) {
  const supabase = await ensureAdmin('customer.update');
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { error } = await supabase.from('coupons').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
}

export async function saveCampaignAction(formData: FormData) {
  const supabase = await ensureAdmin('product.managePrice');
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');

  if (!name) {
    throw new Error('Kampanya adı zorunludur.');
  }

  const payload: CampaignInsert = {
    campaign_type: parseCampaignType(getText(formData, 'campaign_type')),
    description: getText(formData, 'description'),
    discount_type: parseCouponDiscountType(getText(formData, 'discount_type')),
    discount_value: getOptionalNumber(formData, 'discount_value') ?? 0,
    ends_at: getOptionalDateTime(formData, 'ends_at'),
    headline: getText(formData, 'headline'),
    is_active: formData.get('is_active') === 'on',
    is_featured: formData.get('is_featured') === 'on',
    metadata: parseJsonObjectField(formData, 'metadata') as CampaignInsert['metadata'],
    minimum_order_total: getOptionalNumber(formData, 'minimum_order_total') ?? 0,
    name,
    slug: getText(formData, 'slug') || slugify(name),
    starts_at: getOptionalDateTime(formData, 'starts_at'),
  };

  const { error } = id ? await supabase.from('campaigns').update(payload).eq('id', id) : await supabase.from('campaigns').insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
}

export async function deleteCampaignAction(formData: FormData) {
  const supabase = await ensureAdmin('product.managePrice');
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { error } = await supabase.from('campaigns').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
}

export async function saveHomeSlideAction(formData: FormData) {
  const supabase = await ensureAdmin('product.managePrice');
  const id = getText(formData, 'id');
  const title = getText(formData, 'title');
  const imageFile = getUploadedFile(formData, 'image_file');

  if (!title) {
    throw new Error('Slider başlığı zorunludur.');
  }

  const { data: existingSlide, error: existingSlideError } = id
    ? await supabase.from('home_slides').select('id, image_path').eq('id', id).maybeSingle()
    : { data: null, error: null };

  if (existingSlideError) {
    throw new Error(existingSlideError.message);
  }

  if (!id && !imageFile) {
    throw new Error('Yeni slider kaydı için görsel seçin.');
  }

  const payload: Database['public']['Tables']['home_slides']['Update'] = {
    alt_text: getText(formData, 'alt_text') || title,
    href: getText(formData, 'href') || '/',
    is_active: formData.get('is_active') === 'on',
    sort_order: getOptionalInteger(formData, 'sort_order') ?? 0,
    title,
  };

  if (imageFile) {
    payload.image_path = await uploadHomeSlideImage(supabase, title, imageFile);
  }

  const imagePath = payload.image_path;

  if (!id && !imagePath) {
    throw new Error('Yeni slider kaydı için görsel seçin.');
  }

  if (id) {
    const { error } = await supabase.from('home_slides').update(payload).eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    if (!imagePath) {
      throw new Error('Yeni slider kaydı için görsel seçin.');
    }

    const insertPayload: HomeSlideInsert = {
      alt_text: payload.alt_text ?? title,
      href: payload.href ?? '/',
      image_path: imagePath,
      is_active: payload.is_active ?? true,
      sort_order: payload.sort_order ?? 0,
      title,
    };
    const { error } = await supabase.from('home_slides').insert(insertPayload);

    if (error) {
      throw new Error(error.message);
    }
  }

  if (imageFile && existingSlide?.image_path && existingSlide.image_path !== payload.image_path) {
    await removeManagedHomeSlideImage(supabase, existingSlide.image_path);
  }

  revalidateHomeSlides();
}

export async function deleteHomeSlideAction(formData: FormData) {
  const supabase = await ensureAdmin('product.managePrice');
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { data: existingSlide, error: existingSlideError } = await supabase
    .from('home_slides')
    .select('id, image_path')
    .eq('id', id)
    .maybeSingle();

  if (existingSlideError) {
    throw new Error(existingSlideError.message);
  }

  if (!existingSlide) {
    return;
  }

  const { error } = await supabase.from('home_slides').delete().eq('id', existingSlide.id);

  if (error) {
    throw new Error(error.message);
  }

  await removeManagedHomeSlideImage(supabase, existingSlide.image_path);
  revalidateHomeSlides();
}

export async function saveHomeVideoAction(formData: FormData) {
  const supabase = await ensureAdmin('settings.view');
  const videoUrl = getText(formData, 'video_url');
  const videoId = getHomeVideoId(videoUrl);
  const title = getText(formData, 'title');

  if (!videoUrl || !videoId) {
    throw new Error('Geçerli bir YouTube veya MP4 video bağlantısı girin.');
  }

  if (!title) {
    throw new Error('Video başlığı zorunludur.');
  }

  const payload: HomeVideoSettingsInsert = {
    description: getText(formData, 'description'),
    eyebrow: getText(formData, 'eyebrow') || 'Video',
    id: 'main',
    is_active: formData.get('is_active') === 'on',
    title,
    video_id: videoId,
    video_url: videoUrl,
  };

  const { error } = await supabase.from('home_video_settings').upsert(payload, { onConflict: 'id' });

  if (error) {
    throw new Error(error.message);
  }

  revalidateHomeVideo();
}

export async function saveProjectReferenceAction(formData: FormData) {
  const supabase = await ensureAdmin('settings.view');
  const id = getText(formData, 'id');
  const title = getText(formData, 'title');

  if (!title) {
    throw new Error('Referans başlığı zorunludur.');
  }

  const slug = getText(formData, 'slug') || slugify(title);
  const imageFile = getUploadedFile(formData, 'image_file');
  const removeImage = formData.get('remove_image') === 'on';
  const { data: existingReference, error: existingReferenceError } = id
    ? await supabase.from('project_references').select('id, image_path').eq('id', id).maybeSingle()
    : { data: null, error: null };

  if (existingReferenceError) {
    throw new Error(existingReferenceError.message);
  }

  const payload: Database['public']['Tables']['project_references']['Update'] = {
    completed_at: getOptionalDate(formData, 'completed_at'),
    customer_name: getText(formData, 'customer_name'),
    description: getText(formData, 'description'),
    image_alt: getText(formData, 'image_alt') || title,
    is_active: formData.get('is_active') === 'on',
    is_featured: formData.get('is_featured') === 'on',
    location: getText(formData, 'location'),
    service_type: getText(formData, 'service_type'),
    slug,
    sort_order: getOptionalInteger(formData, 'sort_order') ?? 0,
    title,
  };

  if (imageFile) {
    payload.image_path = await uploadReferenceImage(supabase, title, imageFile);
  } else if (!id || removeImage) {
    payload.image_path = null;
  }

  if (id) {
    const { error } = await supabase.from('project_references').update(payload).eq('id', id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const insertPayload: ProjectReferenceInsert = {
      completed_at: payload.completed_at ?? null,
      customer_name: payload.customer_name ?? '',
      description: payload.description ?? '',
      image_alt: payload.image_alt ?? title,
      image_path: payload.image_path ?? null,
      is_active: payload.is_active ?? true,
      is_featured: payload.is_featured ?? false,
      location: payload.location ?? '',
      service_type: payload.service_type ?? '',
      slug,
      sort_order: payload.sort_order ?? 0,
      title,
    };
    const { error } = await supabase.from('project_references').insert(insertPayload);

    if (error) {
      throw new Error(error.message);
    }
  }

  if ((imageFile || removeImage) && existingReference?.image_path && existingReference.image_path !== payload.image_path) {
    await removeManagedReferenceImage(supabase, existingReference.image_path);
  }

  revalidateProjectReferences();
}

export async function deleteProjectReferenceAction(formData: FormData) {
  const supabase = await ensureAdmin('settings.view');
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { data: existingReference, error: existingReferenceError } = await supabase
    .from('project_references')
    .select('id, image_path')
    .eq('id', id)
    .maybeSingle();

  if (existingReferenceError) {
    throw new Error(existingReferenceError.message);
  }

  if (!existingReference) {
    return;
  }

  const { error } = await supabase.from('project_references').delete().eq('id', existingReference.id);

  if (error) {
    throw new Error(error.message);
  }

  await removeManagedReferenceImage(supabase, existingReference.image_path);
  revalidateProjectReferences();
}

export async function savePaymentMethodAction(formData: FormData) {
  const supabase = await ensureAdmin('settings.view');
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');
  const code = getText(formData, 'code') || slugify(name);

  if (!name || !code) {
    throw new Error('Ödeme yöntemi adı ve kodu zorunludur.');
  }

  const providerKey = parsePaymentProvider(getText(formData, 'provider'));
  const rawConfig = parseJsonObjectField(formData, 'config');
  const finalConfig: Record<string, unknown> = { ...rawConfig };

  const providerDef = PAYMENT_PROVIDER_DEFINITIONS[providerKey];
  if (providerDef) {
    const secretKeys = new Set(providerDef.configFields.filter(f => f.secret).map(f => f.key));
    if (secretKeys.size > 0) {
      let existingConfig: Record<string, unknown> = {};
      if (id) {
        const { data: existingMethod } = await supabase.from('payment_methods').select('config').eq('id', id).maybeSingle();
        if (existingMethod?.config && typeof existingMethod.config === 'object') {
          existingConfig = existingMethod.config as Record<string, unknown>;
        }
      }

      for (const key of secretKeys) {
        const val = finalConfig[key];
        if (val === '******') {
          finalConfig[key] = existingConfig[key] ?? null;
        } else if (typeof val === 'string' && val.trim() !== '') {
          finalConfig[key] = encryptToken(val.trim());
        }
      }
    }
  }

  const payload: PaymentMethodInsert = {
    code,
    config: finalConfig as PaymentMethodInsert['config'],
    description: getText(formData, 'description'),
    instructions: getText(formData, 'instructions'),
    integration_type: parsePaymentIntegrationType(getText(formData, 'integration_type')),
    is_active: formData.get('is_active') === 'on',
    name,
    provider: providerKey,
    sort_order: getOptionalInteger(formData, 'sort_order') ?? 0,
  };

  const { error } = id
    ? await supabase.from('payment_methods').update(payload).eq('id', id)
    : await supabase.from('payment_methods').insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
}

export async function deletePaymentMethodAction(formData: FormData) {
  const supabase = await ensureAdmin('settings.view');
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { error } = await supabase.from('payment_methods').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdminCommerce();
}

export async function signOutAction() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
