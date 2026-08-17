import type {
  CatalogAttributeGroup,
  CatalogImage,
  CategoryRow,
  ProductAttributeRow,
  ProductHighlightRow,
  ProductImageRow,
  ProductRow,
} from '@/lib/catalog/types';

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

const priceFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');

export const STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET ?? 'product-media').trim();
export const CATALOG_BASE_PATHS = {
  'filtre-gruplari': '/urunler',
  'fren-sistemleri': '/urunler',
  'motor-parcalari': '/urunler',
  'aydinlatma-elektrik': '/urunler',
  'suspansiyon-direksiyon': '/urunler',
} as const;

export function slugify(value: string) {
  return value
    .trim()
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (letter) => TURKISH_CHAR_MAP[letter] ?? letter)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function normalizeTextBlock(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function summarizeText(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getStoragePublicUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith('/')) {
    return path;
  }

  if (!SUPABASE_PUBLIC_URL) {
    return path;
  }

  return `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

export function getCatalogBasePath(rootCategorySlug?: string | null) {
  if (!rootCategorySlug) {
    return null;
  }

  return CATALOG_BASE_PATHS[rootCategorySlug as keyof typeof CATALOG_BASE_PATHS] ?? null;
}

export function getCatalogRootSlugByBasePath(basePath: string) {
  const matches = Object.entries(CATALOG_BASE_PATHS).filter(([, path]) => path === basePath);

  return matches.length === 1 ? matches[0][0] : null;
}

export function formatPrice(value: number | null | undefined, priceMode: ProductRow['price_mode'], priceNote: string | null) {
  if (priceMode === 'contact') {
    return priceNote || 'Fiyat için iletişime geçin';
  }

  if (value == null) {
    return priceNote || 'Teklif isteyin';
  }

  return priceFormatter.format(value);
}

export function buildPriceLabel(product: Pick<ProductRow, 'price' | 'price_mode' | 'price_note'>) {
  return formatPrice(product.price, product.price_mode, product.price_note);
}

export function groupAttributes(attributes: ProductAttributeRow[]): CatalogAttributeGroup[] {
  const grouped = new Map<string, ProductAttributeRow[]>();

  attributes
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .forEach((attribute) => {
      const key = attribute.attribute_group || 'Genel';
      const items = grouped.get(key) ?? [];
      items.push(attribute);
      grouped.set(key, items);
    });

  return [...grouped.entries()].map(([group, items]) => ({ group, items }));
}

export function mapImage(image: ProductImageRow): CatalogImage {
  return {
    ...image,
    publicUrl: getStoragePublicUrl(image.storage_path) ?? '',
  };
}

export function pickFeaturedImage(images: CatalogImage[], fallbackPath: string | null) {
  return images.find((image) => image.is_featured)?.publicUrl ?? getStoragePublicUrl(fallbackPath);
}

export function uniqueById<T extends { id: string }>(values: T[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    if (seen.has(value.id)) {
      return false;
    }

    seen.add(value.id);
    return true;
  });
}

export function parseTagInput(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function serializeTagInput(tags: string[] | null | undefined) {
  return (tags ?? []).join(', ');
}

export function plainTextParagraphs(value: string) {
  return normalizeTextBlock(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function sortCategories(categories: CategoryRow[]) {
  return categories.slice().sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, 'tr'));
}

export function getRootCategory(categories: CategoryRow[]) {
  return categories.find((category) => !category.parent_id) ?? categories[0] ?? null;
}

export function getRootCategorySlug(categories: CategoryRow[]) {
  return getRootCategory(categories)?.slug ?? null;
}

export function sortHighlights(highlights: ProductHighlightRow[]) {
  return highlights.slice().sort((left, right) => left.sort_order - right.sort_order);
}

export function sortImages(images: ProductImageRow[]) {
  return images.slice().sort((left, right) => left.sort_order - right.sort_order);
}

export function sortAttributes(attributes: ProductAttributeRow[]) {
  return attributes
    .slice()
    .sort((left, right) => left.attribute_group.localeCompare(right.attribute_group, 'tr') || left.sort_order - right.sort_order);
}
