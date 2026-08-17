import { ProductEditor } from '@/components/admin/product-editor';
import { saveProductAction } from '@/app/admin/(panel)/actions';
import { getAdminTaxonomies } from '@/lib/catalog/queries';

export default async function NewProductPage() {
  const { brands, categories } = await getAdminTaxonomies();

  return (
    <ProductEditor
      action={saveProductAction}
      brands={brands}
      categories={categories}
      initialProduct={null}
      initialSelectedCategoryIds={[]}
      initialImages={[]}
      initialHighlights={[]}
      initialAttributes={[]}
    />
  );
}
