'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowLeft, Check, ChevronDown, ImagePlus, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import type { BrandRow, CategoryRow, ProductAttributeRow, ProductHighlightRow, ProductImageRow, ProductRow } from '@/lib/catalog/types';
import { getStoragePublicUrl, serializeTagInput, slugify } from '@/lib/catalog/utils';

type ProductEditorProps = {
  action: (formData: FormData) => void | Promise<void>;
  brands: BrandRow[];
  categories: CategoryRow[];
  initialProduct: ProductRow | null;
  initialSelectedCategoryIds: string[];
  initialImages: ProductImageRow[];
  initialHighlights: ProductHighlightRow[];
  initialAttributes: ProductAttributeRow[];
};

type EditableImage = Pick<ProductImageRow, 'id' | 'storage_path' | 'alt_text' | 'caption' | 'sort_order' | 'is_featured'> & {
  remove?: boolean;
};

type EditableHighlight = Pick<ProductHighlightRow, 'content' | 'sort_order'>;
type EditableAttribute = Pick<ProductAttributeRow, 'attribute_group' | 'name' | 'value' | 'sort_order'>;
type CategoryOption = {
  depth: number;
  id: string;
  isRoot: boolean;
  name: string;
  parentId: string | null;
  slug: string;
};

function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-gray-900 transition-all hover:-translate-y-0.5 hover:bg-[#f05a3f] disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {pending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Ürünü Oluştur'}
    </button>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="border-b border-gray-100 pb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}

function CollapsibleSection({ children, description, eyebrow, title }: { children: ReactNode; description: string; eyebrow: string; title: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">{eyebrow}</span>
          <span className="mt-1 block text-xl font-semibold tracking-tight text-gray-900">{title}</span>
          <span className="mt-1 block text-sm leading-relaxed text-gray-500">{description}</span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500">
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {isOpen ? <div className="mt-5 border-t border-gray-100 pt-5">{children}</div> : null}
    </section>
  );
}

function ProductImageThumbnail({ image }: { image: EditableImage }) {
  const [imageFailed, setImageFailed] = useState(false);
  const previewUrl = getStoragePublicUrl(image.storage_path);

  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden rounded-[18px] border border-gray-100 bg-[#0d0d0d] ${
        image.remove ? 'opacity-45 grayscale' : ''
      }`}
    >
      {previewUrl && !imageFailed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={image.alt_text || image.caption || 'Ürün görseli'}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-400">
          <ImagePlus className="h-8 w-8" />
        </div>
      )}

      {image.is_featured ? (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-900">
          <Check className="h-3 w-3" />
          Kapak
        </span>
      ) : null}
    </div>
  );
}

function buildCategoryOptions(categories: CategoryRow[]) {
  const childrenByParentId = new Map<string | null, CategoryRow[]>();

  for (const category of categories) {
    const key = category.parent_id ?? null;
    const group = childrenByParentId.get(key) ?? [];
    group.push(category);
    childrenByParentId.set(key, group);
  }

  const sortGroup = (group: CategoryRow[]) =>
    group
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, 'tr'));

  const options: CategoryOption[] = [];

  function visit(category: CategoryRow, depth: number) {
    options.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      depth,
      isRoot: !category.parent_id,
      parentId: category.parent_id,
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

function collectAncestorIds(categoryId: string, categoriesById: Map<string, CategoryRow>) {
  const lineage: string[] = [];
  let current = categoriesById.get(categoryId) ?? null;

  while (current) {
    lineage.unshift(current.id);
    current = current.parent_id ? categoriesById.get(current.parent_id) ?? null : null;
  }

  return lineage;
}

function collectDescendantIds(categoryId: string, childrenByParentId: Map<string | null, CategoryRow[]>) {
  const ids = [categoryId];

  for (const child of childrenByParentId.get(categoryId) ?? []) {
    ids.push(...collectDescendantIds(child.id, childrenByParentId));
  }

  return ids;
}

export function ProductEditor({
  action,
  brands,
  categories,
  initialProduct,
  initialSelectedCategoryIds,
  initialImages,
  initialHighlights,
  initialAttributes,
}: ProductEditorProps) {
  const [title, setTitle] = useState(initialProduct?.title ?? '');
  const [slug, setSlug] = useState(initialProduct?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProduct?.slug));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialSelectedCategoryIds);
  const [isCategoryTreeOpen, setIsCategoryTreeOpen] = useState(false);
  const [images, setImages] = useState<EditableImage[]>(initialImages);
  const [newImageSelectionLabel, setNewImageSelectionLabel] = useState('Henüz dosya seçilmedi.');
  const [highlights, setHighlights] = useState<EditableHighlight[]>(
    initialHighlights.length > 0 ? initialHighlights.map(({ content, sort_order }) => ({ content, sort_order })) : [{ content: '', sort_order: 0 }]
  );
  const [attributes, setAttributes] = useState<EditableAttribute[]>(
    initialAttributes.length > 0
      ? initialAttributes.map(({ attribute_group, name, value, sort_order }) => ({ attribute_group, name, value, sort_order }))
      : [
          {
            attribute_group: 'Genel',
            name: '',
            value: '',
            sort_order: 0,
          },
        ]
  );
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const childrenByParentId = new Map<string | null, CategoryRow[]>();

  for (const category of categories) {
    const key = category.parent_id ?? null;
    const group = childrenByParentId.get(key) ?? [];
    group.push(category);
    childrenByParentId.set(key, group);
  }

  const categoryOptions = buildCategoryOptions(categories);
  const orderedCategoryIds = categoryOptions.map((option) => option.id);
  const selectedRootCategories = categoryOptions.filter((option) => option.isRoot && selectedCategoryIds.includes(option.id));

  function handleTitleChange(value: string) {
    setTitle(value);

    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function toggleCategory(categoryId: string) {
    const ancestorIds = collectAncestorIds(categoryId, categoriesById);
    const branchRootId = ancestorIds[0] ?? categoryId;
    const descendantIds = collectDescendantIds(categoryId, childrenByParentId);

    setSelectedCategoryIds((current) => {
      if (current.includes(categoryId)) {
        const next = new Set(current);

        for (const id of descendantIds) {
          next.delete(id);
        }

        return orderedCategoryIds.filter((id) => next.has(id));
      }

      const next = new Set(
        current.filter((id) => {
          const rootId = collectAncestorIds(id, categoriesById)[0] ?? id;
          return rootId === branchRootId;
        })
      );

      for (const id of ancestorIds) {
        next.add(id);
      }

      return orderedCategoryIds.filter((id) => next.has(id));
    });
  }

  function updateImage(index: number, patch: Partial<EditableImage>) {
    setImages((current) => current.map((image, imageIndex) => (imageIndex === index ? { ...image, ...patch } : image)));
  }

  function setFeaturedImage(index: number) {
    setImages((current) => current.map((image, imageIndex) => ({ ...image, is_featured: imageIndex === index })));
  }

  function handleNewImageSelection(files: FileList | null) {
    if (!files || files.length === 0) {
      setNewImageSelectionLabel('Henüz dosya seçilmedi.');
      return;
    }

    setNewImageSelectionLabel(files.length === 1 ? files[0].name : `${files.length} görsel seçildi.`);
  }

  function addHighlight() {
    setHighlights((current) => [...current, { content: '', sort_order: current.length }]);
  }

  function updateHighlight(index: number, patch: Partial<EditableHighlight>) {
    setHighlights((current) => current.map((highlight, highlightIndex) => (highlightIndex === index ? { ...highlight, ...patch } : highlight)));
  }

  function removeHighlight(index: number) {
    setHighlights((current) =>
      current.filter((_, highlightIndex) => highlightIndex !== index).map((highlight, newIndex) => ({ ...highlight, sort_order: newIndex }))
    );
  }

  function addAttribute() {
    setAttributes((current) => [
      ...current,
      {
        attribute_group: 'Genel',
        name: '',
        value: '',
        sort_order: current.length,
      },
    ]);
  }

  function updateAttribute(index: number, patch: Partial<EditableAttribute>) {
    setAttributes((current) => current.map((attribute, attributeIndex) => (attributeIndex === index ? { ...attribute, ...patch } : attribute)));
  }

  function removeAttribute(index: number) {
    setAttributes((current) =>
      current.filter((_, attributeIndex) => attributeIndex !== index).map((attribute, newIndex) => ({ ...attribute, sort_order: newIndex }))
    );
  }

  const isEdit = Boolean(initialProduct?.id);

  return (
    <form action={action} className="grid gap-4">
      {initialProduct?.id ? <input type="hidden" name="id" value={initialProduct.id} /> : null}
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="selectedCategoryIds" value={JSON.stringify(selectedCategoryIds)} />
      <input type="hidden" name="highlights" value={JSON.stringify(highlights)} />
      <input type="hidden" name="attributes" value={JSON.stringify(attributes)} />
      <input type="hidden" name="existingImages" value={JSON.stringify(images)} />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Ürün listesine dön
            </Link>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-gray-900">{isEdit ? 'Ürün Düzenle' : 'Yeni Ürün Oluştur'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Metin, fiyat, galeri, kategori, arama görünümü ve teknik detayları tek form üzerinden yönetin.
            </p>
          </div>
          <SubmitButton isEdit={isEdit} />
        </div>

        <div className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid auto-rows-max gap-4 self-start">
            <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5 md:p-6">
              <SectionTitle
                eyebrow="Temel"
                title="Temel bilgiler"
                description="Başlık, URL anahtarı ve açıklama metinleri burada tutulur."
              />

              <div className="mt-5 grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-900">Ürün Başlığı</label>
                  <input
                    name="title"
                    value={title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    required
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-900">URL Anahtarı</label>
                    <input
                      value={slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        setSlug(slugify(event.target.value));
                      }}
                      className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-900">Stok Kodu</label>
                    <input
                      name="sku"
                      defaultValue={initialProduct?.sku ?? ''}
                      required
                      className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-900">Kısa Açıklama</label>
                  <textarea
                    name="summary"
                    rows={6}
                    defaultValue={initialProduct?.summary ?? ''}
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-900">Detaylı Açıklama</label>
                  <RichTextEditor name="body" initialValue={initialProduct?.body ?? ''} />
                </div>
              </div>
            </section>

            <CollapsibleSection
              eyebrow="Vurgular"
              title="Öne çıkan maddeler"
              description="Kart görünümünde veya detay sayfasında kullanılacak kısa vurgu maddelerini yönetin."
            >

              <div className="mt-5 grid gap-3">
                {highlights.map((highlight, index) => (
                  <div key={`${highlight.sort_order}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid flex-1 gap-3">
                        <textarea
                          rows={3}
                          value={highlight.content}
                          onChange={(event) => updateHighlight(index, { content: event.target.value })}
                          className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                        />
                        <div className="grid gap-2 md:grid-cols-[160px_minmax(0,1fr)]">
                          <div className="grid gap-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Sıra</label>
                            <input
                              type="number"
                              value={highlight.sort_order}
                              onChange={(event) => updateHighlight(index, { sort_order: Number(event.target.value) || 0 })}
                              className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeHighlight(index)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addHighlight}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Madde Ekle
              </button>
            </CollapsibleSection>

            <CollapsibleSection
              eyebrow="Teknik"
              title="Teknik özellikler"
              description="Grup bazlı teknik özellikler detay sayfasında tablo olarak gösterilir."
            >

              <div className="mt-5 grid gap-3">
                {attributes.map((attribute, index) => (
                  <div key={`${attribute.attribute_group}-${attribute.name}-${index}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_100px_52px]">
                      <input
                        value={attribute.attribute_group}
                        onChange={(event) => updateAttribute(index, { attribute_group: event.target.value })}
                        placeholder="Grup"
                        className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                      />
                      <input
                        value={attribute.name}
                        onChange={(event) => updateAttribute(index, { name: event.target.value })}
                        placeholder="Özellik adı"
                        className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                      />
                      <input
                        value={attribute.value}
                        onChange={(event) => updateAttribute(index, { value: event.target.value })}
                        placeholder="Değer"
                        className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                      />
                      <input
                        type="number"
                        value={attribute.sort_order}
                        onChange={(event) => updateAttribute(index, { sort_order: Number(event.target.value) || 0 })}
                        className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttribute(index)}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addAttribute}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Özellik Ekle
              </button>
            </CollapsibleSection>

            <CollapsibleSection
              eyebrow="Galeri"
              title="Galeri ve medya"
              description="Mevcut görselleri güncelleyin, öne çıkan görseli seçin ve yeni dosyalar yükleyin."
            >

              <div className="mt-5 grid gap-4">
                {images.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-white/[0.02] px-4 py-6 text-sm text-gray-500">
                    Henüz yüklenmiş görsel bulunmuyor.
                  </div>
                ) : (
                  images.map((image, index) => (
                    <div key={image.id ?? image.storage_path} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <ProductImageThumbnail image={image} />
                        <div className="grid gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setFeaturedImage(index)}
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
                                image.is_featured
                                  ? 'border-blue-300/40 bg-blue-600 text-gray-900'
                                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-200 hover:text-white'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              {image.is_featured ? 'Öne Çıkan' : 'Öne Çıkan Yap'}
                            </button>
                            <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                              <input
                                type="checkbox"
                                checked={Boolean(image.remove)}
                                onChange={(event) => updateImage(index, { remove: event.target.checked })}
                                className="h-4 w-4 rounded border-gray-200 bg-transparent"
                              />
                              Silme için işaretle
                            </label>
                          </div>

                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                            <input
                              value={image.alt_text}
                              onChange={(event) => updateImage(index, { alt_text: event.target.value })}
                              placeholder="Alternatif metin"
                              className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                            />
                            <input
                              value={image.caption}
                              onChange={(event) => updateImage(index, { caption: event.target.value })}
                              placeholder="Açıklama"
                              className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                            />
                            <input
                              type="number"
                              value={image.sort_order}
                              onChange={(event) => updateImage(index, { sort_order: Number(event.target.value) || 0 })}
                              placeholder="Sıra"
                              className="rounded-2xl border border-gray-200 bg-[#0d0d0d] px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <label className="grid cursor-pointer gap-3 rounded-2xl border border-dashed border-white/14 bg-white/[0.02] p-5 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2 font-medium text-gray-900">
                    <ImagePlus className="h-4 w-4 text-blue-600" />
                    Yeni görseller yükle
                  </span>
                  <span className="inline-flex w-fit items-center rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-900">
                    Görsel seç
                  </span>
                  <span className="text-sm text-gray-500">{newImageSelectionLabel}</span>
                  <input
                    type="file"
                    name="new_images"
                    multiple
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
                    onChange={(event) => handleNewImageSelection(event.target.files)}
                    className="sr-only"
                  />
                </label>
              </div>
            </CollapsibleSection>
          </div>

          <aside className="grid auto-rows-max gap-4 self-start">
            <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5 md:p-6">
              <SectionTitle
                eyebrow="Yayın"
                title="Yayın ve fiyat"
                description="Listeleme, stok ve fiyat davranışı bu blokta kontrol edilir."
              />

              <div className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-900">Durum</label>
                    <select
                      name="status"
                      defaultValue={initialProduct?.status ?? 'draft'}
                      className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                    >
                      <option value="draft">Taslak</option>
                      <option value="published">Yayında</option>
                      <option value="archived">Arşiv</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-900">Stok Durumu</label>
                    <select
                      name="stock_status"
                      defaultValue={initialProduct?.stock_status ?? 'in_stock'}
                      className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                    >
                      <option value="in_stock">Stokta</option>
                      <option value="out_of_stock">Tükendi</option>
                      <option value="on_request">Sorunuz</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-gray-900">Fiyat Modu</label>
                    <select
                      name="price_mode"
                      defaultValue={initialProduct?.price_mode ?? 'fixed'}
                      className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                    >
                      <option value="fixed">Sabit fiyat</option>
                      <option value="contact">İletişim ile fiyat</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={initialProduct?.price ?? ''}
                    placeholder="Satış fiyatı"
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                  <input
                    name="compare_at_price"
                    type="number"
                    step="0.01"
                    defaultValue={initialProduct?.compare_at_price ?? ''}
                    placeholder="Eski fiyat"
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                </div>

                <input
                  name="price_note"
                  defaultValue={initialProduct?.price_note ?? ''}
                  placeholder="Fiyat notu"
                  className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    name="warranty_years"
                    type="number"
                    defaultValue={initialProduct?.warranty_years ?? ''}
                    placeholder="Garanti"
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                  <input
                    name="capacity_kw"
                    type="number"
                    step="0.01"
                    defaultValue={initialProduct?.capacity_kw ?? ''}
                    placeholder="kW"
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                  <input
                    name="energy_class"
                    defaultValue={initialProduct?.energy_class ?? ''}
                    placeholder="Enerji sınıfı"
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                </div>

                <input
                  name="badge"
                  defaultValue={initialProduct?.badge ?? ''}
                  placeholder="Rozet / vurgu"
                  className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                />

                <div className="grid gap-3">
                  <label className="inline-flex items-center gap-3 rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <input type="checkbox" name="featured" defaultChecked={initialProduct?.featured ?? false} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
                    Öne çıkan ürün olarak işaretle
                  </label>
                  <label className="inline-flex items-center gap-3 rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                    <input type="checkbox" name="is_active" defaultChecked={initialProduct?.is_active ?? true} className="h-4 w-4 rounded border-gray-200 bg-transparent" />
                    Ürün katalogda aktif kalsın
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5 md:p-6">
              <SectionTitle
                eyebrow="Sınıflandırma"
                title="Marka ve kategoriler"
                description="Marka seçimi ve kategori ağacı bu bölümden yönetilir. Ana kategori vitrin ailesini belirler."
              />

              <div className="mt-5 grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-900">Marka</label>
                  <select
                    name="brand_id"
                    defaultValue={initialProduct?.brand_id ?? ''}
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  >
                    <option value="">Marka seçin</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-900">Etiketler</label>
                  <input
                    name="tags"
                    defaultValue={serializeTagInput(initialProduct?.tags)}
                    placeholder="Yoğuşmalı, Premix, Sessiz"
                    className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                  />
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Ana kategori</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedRootCategories.length > 0 ? (
                      selectedRootCategories.map((category) => (
                        <span key={category.id} className="rounded-full border border-blue-300/28 bg-blue-600/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-900">
                          {category.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Henüz ana kategori seçilmedi.</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    Alt kategori seçtiğinizde bağlı olduğu ana kategori otomatik eklenir. Farklı ana kategoriler aynı üründe birlikte tutulmaz.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                  <button
                    type="button"
                    onClick={() => setIsCategoryTreeOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[#0d0d0d] px-4 py-3 text-left"
                    aria-expanded={isCategoryTreeOpen}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">Kategori ağacı</span>
                      <span className="mt-1 block text-xs text-gray-500">{selectedCategoryIds.length} kategori seçili</span>
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-500">
                      <ChevronDown className={`h-4 w-4 transition-transform ${isCategoryTreeOpen ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {isCategoryTreeOpen ? (
                    <div className="mt-3 grid max-h-[360px] gap-3 overflow-y-auto pr-1">
                      {categoryOptions.map((category) => {
                        const isSelected = selectedCategoryIds.includes(category.id);

                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => toggleCategory(category.id)}
                            className={`flex items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition-all ${
                              isSelected
                                ? 'border-blue-300/35 bg-blue-600/15 text-gray-900'
                                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100 hover:text-white'
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="block font-medium" style={{ paddingLeft: `${category.depth * 16}px` }}>
                                  {category.name}
                                </span>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${category.isRoot ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-500'}`}>
                                  {category.isRoot ? 'Ana kategori' : 'Alt kategori'}
                                </span>
                              </span>
                              <span className="mt-1 block text-xs text-gray-500" style={{ paddingLeft: `${category.depth * 16}px` }}>
                                {category.slug}
                              </span>
                            </span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-500'}`}>
                              {isSelected ? 'Seçili' : 'Ekle'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <CollapsibleSection
              eyebrow="Arama"
              title="Arama görünümü"
              description="Başlık ve açıklama arama alanları buradan yönetilir."
            >

              <div className="mt-5 grid gap-3">
                <input
                  name="seo_title"
                  defaultValue={initialProduct?.seo_title ?? ''}
                  placeholder="Arama başlığı"
                  className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                />
                <textarea
                  name="seo_description"
                  rows={4}
                  defaultValue={initialProduct?.seo_description ?? ''}
                  placeholder="Arama açıklaması"
                  className="rounded-[18px] border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none transition-colors focus:border-blue-300/40"
                />
              </div>
            </CollapsibleSection>
          </aside>
        </div>
      </section>
    </form>
  );
}
