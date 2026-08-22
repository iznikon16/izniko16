import Link from 'next/link';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { saveCategoryAction, deleteCategoryAction } from '@/app/admin/(panel)/actions';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Checkbox } from '@/components/ui/checkbox';
import { getAdminTaxonomies } from '@/lib/catalog/queries';
import type { CategoryRow } from '@/lib/catalog/types';

type CategoriesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type CategoryStatusFilter = 'active' | 'inactive';
type CategoryLevelFilter = 'root' | 'child';

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>) {
  const query = getSingleParam(searchParams.query).trim();
  const status = getSingleParam(searchParams.status).trim() as CategoryStatusFilter | '';
  const level = getSingleParam(searchParams.level).trim() as CategoryLevelFilter | '';
  const parentId = getSingleParam(searchParams.parentId).trim();

  return {
    level: level || undefined,
    parentId: parentId || undefined,
    query: query || undefined,
    status: status || undefined,
  };
}

function buildCategoryOptions(
  categories: Array<{
    id: string;
    name: string;
    parent_id?: string | null;
    sort_order?: number | null;
  }>
) {
  const childrenByParentId = new Map<string | null, typeof categories>();

  for (const category of categories) {
    const key = category.parent_id ?? null;
    const group = childrenByParentId.get(key) ?? [];
    group.push(category);
    childrenByParentId.set(key, group);
  }

  const sortGroup = (group: typeof categories) =>
    group
      .slice()
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0) || left.name.localeCompare(right.name, 'tr'));

  const options: Array<{ id: string; name: string }> = [];

  function visit(category: (typeof categories)[number], depth: number) {
    options.push({
      id: category.id,
      name: depth === 0 ? category.name : `${'— '.repeat(depth)}${category.name}`,
    });

    for (const child of sortGroup(childrenByParentId.get(category.id) ?? [])) {
      visit(child, depth + 1);
    }
  }

  for (const root of sortGroup(childrenByParentId.get(null) ?? [])) {
    visit(root, 0);
  }

  return options;
}

function filterCategories(
  categories: CategoryRow[],
  filters: ReturnType<typeof parseFilters>
) {
  const normalizedQuery = filters.query?.toLocaleLowerCase('tr');

  return categories.filter((category) => {
    if (normalizedQuery) {
      const searchableText = [category.name, category.slug, category.description].join(' ').toLocaleLowerCase('tr');

      if (!searchableText.includes(normalizedQuery)) {
        return false;
      }
    }

    if (filters.status === 'active' && !category.is_active) {
      return false;
    }

    if (filters.status === 'inactive' && category.is_active) {
      return false;
    }

    if (filters.level === 'root' && category.parent_id) {
      return false;
    }

    if (filters.level === 'child' && !category.parent_id) {
      return false;
    }

    if (filters.parentId && category.parent_id !== filters.parentId) {
      return false;
    }

    return true;
  });
}

function CategoryForm({
  category,
  categoryOptions,
}: {
  categoryOptions: Array<{
    id: string;
    name: string;
  }>;
  category?: {
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    parent_id?: string | null;
    sort_order?: number;
    is_active?: boolean;
  };
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 mb-4">
      <form action={saveCategoryAction}>
        {category?.id ? <input type="hidden" name="id" value={category.id} /> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_160px_auto]">
          <Input
            name="name"
            defaultValue={category?.name ?? ''}
            placeholder="Kategori adı"
            required
          />
          <Input
            name="slug"
            defaultValue={category?.slug ?? ''}
            placeholder="URL anahtarı"
          />
          <Select
            name="parent_id"
            defaultValue={category?.parent_id ?? ''}
          >
            <option value="">Üst kategori yok</option>
            {categoryOptions
              .filter((option) => option.id !== category?.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
          </Select>
          <Input
            name="sort_order"
            type="number"
            defaultValue={category?.sort_order ?? 0}
            placeholder="Sıra"
          />
          <label className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm cursor-pointer">
            <Checkbox name="is_active" defaultChecked={category?.is_active ?? true} />
            <span className="font-medium">Aktif</span>
          </label>
        </div>
        <Textarea
          name="description"
          rows={3}
          defaultValue={category?.description ?? ''}
          placeholder="Açıklama"
          className="mt-3 w-full"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <FormSubmitButton idleLabel={category?.id ? 'Güncelle' : 'Kategori Ekle'} pendingLabel="Kaydediliyor..." />
          {category?.id ? <FormSubmitButton formAction={deleteCategoryAction} idleLabel="Sil" pendingLabel="Siliniyor..." variant="destructive" /> : null}
        </div>
      </form>
    </div>
  );
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const filters = parseFilters(resolvedSearchParams);
  const { categories } = await getAdminTaxonomies();
  const categoryOptions = buildCategoryOptions(categories);
  const filteredCategories = filterCategories(categories, filters);
  const activeFilterCount = [filters.query, filters.status, filters.level, filters.parentId].filter(Boolean).length;
  const parentCategoryName = filters.parentId ? categoryOptions.find((option) => option.id === filters.parentId)?.name ?? null : null;
  const activeFilterLabels = [
    filters.query ? `Arama: ${filters.query}` : null,
    filters.status ? `Durum: ${filters.status === 'active' ? 'Aktif' : 'Pasif'}` : null,
    filters.level ? `Seviye: ${filters.level === 'root' ? 'Ana kategori' : 'Alt kategori'}` : null,
    parentCategoryName ? `Üst kategori: ${parentCategoryName}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Kategoriler</p>
          <CardTitle className="mt-3">Kategori yönetimi</CardTitle>
          <CardDescription className="mt-2 max-w-2xl">
            Ana kategori ve alt kategori ilişkilerini, sıralamayı ve görünürlüğü bu bölümden yönetin.
          </CardDescription>
        </CardHeader>

        <CardContent>
        <div className="grid gap-4">
          <form className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="search"
                  name="query"
                  defaultValue={filters.query ?? ''}
                  placeholder="Kategori adı, URL anahtarı veya açıklama ara"
                  className="pl-11"
                />
              </div>

              <Select name="status" defaultValue={filters.status ?? ''}>
                <option value="">Tüm durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </Select>

              <Select name="level" defaultValue={filters.level ?? ''}>
                <option value="">Tüm seviyeler</option>
                <option value="root">Ana kategori</option>
                <option value="child">Alt kategori</option>
              </Select>

              <Select name="parentId" defaultValue={filters.parentId ?? ''}>
                <option value="">Tüm üst kategoriler</option>
                {categoryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">Sonuç</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{filteredCategories.length} kategori</p>
                {activeFilterLabels.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeFilterLabels.map((label) => (
                      <Badge key={label} variant="muted">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="secondary" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtrele
                </Button>
                {activeFilterCount > 0 ? (
                  <Link
                    href="/admin/categories"
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <X className="h-4 w-4" />
                    Temizle
                  </Link>
                ) : null}
              </div>
            </div>
          </form>

          <CategoryForm categoryOptions={categoryOptions} />
          {filteredCategories.length === 0 ? (
            <EmptyState
              className="mt-2"
              title="Kategori bulunamadı"
              description="Bu filtrelerle eşleşen kategori kaydı bulunmamaktadır."
            />
          ) : (
            filteredCategories.map((category) => (
              <CategoryForm
                key={category.id}
                category={category}
                categoryOptions={categoryOptions}
              />
            ))
          )}
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
