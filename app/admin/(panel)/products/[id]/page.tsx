import { notFound } from 'next/navigation';
import { ProductEditor } from '@/components/admin/product-editor';
import { saveProductAction } from '@/app/admin/(panel)/actions';
import { getAdminProductEditor, getAdminTaxonomies } from '@/lib/catalog/queries';

type ProductEditorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductEditorPage({ params }: ProductEditorPageProps) {
  const { id } = await params;
  const [{ brands, categories }, productEditorData] = await Promise.all([getAdminTaxonomies(), getAdminProductEditor(id)]);

  if (!productEditorData) {
    notFound();
  }

  return (
    <ProductEditor
      action={saveProductAction}
      brands={brands}
      categories={categories}
      initialProduct={productEditorData.product}
      initialSelectedCategoryIds={productEditorData.selectedCategoryIds}
      initialImages={productEditorData.images}
      initialHighlights={productEditorData.highlights}
      initialAttributes={productEditorData.attributes}
    />
  );
}
