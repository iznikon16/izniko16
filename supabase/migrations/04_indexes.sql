-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 04_indexes.sql — Indexler
-- ============================================================================

create index if not exists idx_products_status_active on public.products (status, is_active);
create index if not exists idx_products_brand_id on public.products (brand_id);
create index if not exists idx_products_sku on public.products (sku);
create index if not exists idx_products_created_at on public.products (created_at desc);

create index if not exists idx_product_images_product_id on public.product_images (product_id);
create index if not exists idx_product_categories_category_id on public.product_categories (category_id);
create index if not exists idx_product_highlights_product_id on public.product_highlights (product_id);
create index if not exists idx_product_attributes_product_id on public.product_attributes (product_id);

create index if not exists idx_categories_parent_id on public.categories (parent_id);

create index if not exists idx_customer_profiles_email on public.customer_profiles (email);
create index if not exists idx_customer_addresses_user_id on public.customer_addresses (user_id);
create index if not exists idx_customer_favorites_user_id on public.customer_favorites (user_id);
create index if not exists idx_cart_items_user_id on public.cart_items (user_id);
create index if not exists idx_cart_items_product_id on public.cart_items (product_id);

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_order_number on public.orders (order_number);

create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_product_id on public.order_items (product_id);

create index if not exists idx_payment_attempts_order_id on public.payment_attempts (order_id);
create index if not exists idx_payment_attempts_provider_ref on public.payment_attempts (provider, provider_reference);

create index if not exists idx_customer_inquiries_status on public.customer_inquiries (status);
create index if not exists idx_customer_inquiries_created_at on public.customer_inquiries (created_at desc);

create index if not exists idx_email_logs_created_at on public.email_logs (created_at desc);
create index if not exists idx_email_verification_tokens_user_id on public.email_verification_tokens (user_id);

create index if not exists idx_coupons_code on public.coupons (code);
create index if not exists idx_campaigns_slug on public.campaigns (slug);
