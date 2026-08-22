-- Anonymous catalog visitors may read product metadata but never price fields.
-- Authenticated customers retain table SELECT; customer-specific price tables
-- remain protected by their existing ownership RLS policies.

revoke select on table public.products from anon;

grant select (
  badge,
  body,
  brand_id,
  capacity_kw,
  created_at,
  critical_stock,
  currency,
  energy_class,
  featured,
  featured_image_path,
  id,
  is_active,
  price_mode,
  price_note,
  published_at,
  seo_description,
  seo_title,
  sku,
  slug,
  status,
  stock_quantity,
  stock_status,
  summary,
  tags,
  title,
  updated_at,
  warranty_years
) on table public.products to anon;
