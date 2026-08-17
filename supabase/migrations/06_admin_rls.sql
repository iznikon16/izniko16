-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 06_admin_rls.sql — Admin politikaları (is_admin fonksiyonu üzerinden)
-- ============================================================================

create policy "Admin can read all admin users"
  on public.admin_users for select
  using (public.is_admin());

create policy "Admin can read all customers"
  on public.customer_profiles for select
  using (public.is_admin());

create policy "Admin can update customers"
  on public.customer_profiles for update
  using (public.is_admin());

create policy "Admin can read all orders"
  on public.orders for select
  using (public.is_admin());

create policy "Admin can update orders"
  on public.orders for update
  using (public.is_admin());

create policy "Admin can read all order items"
  on public.order_items for select
  using (public.is_admin());

create policy "Admin can read all payment attempts"
  on public.payment_attempts for select
  using (public.is_admin());

create policy "Admin can read all inquiries"
  on public.customer_inquiries for select
  using (public.is_admin());

create policy "Admin can update inquiries"
  on public.customer_inquiries for update
  using (public.is_admin());

create policy "Admin can read all email logs"
  on public.email_logs for select
  using (public.is_admin());

create policy "Admin can read smtp settings"
  on public.smtp_settings for select
  using (public.is_admin());

create policy "Admin can update smtp settings"
  on public.smtp_settings for update
  using (public.is_admin());

create policy "Admin can read email templates"
  on public.email_templates for select
  using (public.is_admin());

create policy "Admin can update email templates"
  on public.email_templates for update
  using (public.is_admin());

create policy "Admin can read all brands"
  on public.brands for select
  using (public.is_admin());

create policy "Admin can insert brands"
  on public.brands for insert
  with check (public.is_admin());

create policy "Admin can update brands"
  on public.brands for update
  using (public.is_admin());

create policy "Admin can delete brands"
  on public.brands for delete
  using (public.is_admin());

create policy "Admin can read all categories"
  on public.categories for select
  using (public.is_admin());

create policy "Admin can insert categories"
  on public.categories for insert
  with check (public.is_admin());

create policy "Admin can update categories"
  on public.categories for update
  using (public.is_admin());

create policy "Admin can delete categories"
  on public.categories for delete
  using (public.is_admin());

create policy "Admin can read all products"
  on public.products for select
  using (public.is_admin());

create policy "Admin can insert products"
  on public.products for insert
  with check (public.is_admin());

create policy "Admin can update products"
  on public.products for update
  using (public.is_admin());

create policy "Admin can delete products"
  on public.products for delete
  using (public.is_admin());

create policy "Admin can read all product images"
  on public.product_images for select
  using (public.is_admin());

create policy "Admin can insert product images"
  on public.product_images for insert
  with check (public.is_admin());

create policy "Admin can update product images"
  on public.product_images for update
  using (public.is_admin());

create policy "Admin can delete product images"
  on public.product_images for delete
  using (public.is_admin());

create policy "Admin can read all product categories"
  on public.product_categories for select
  using (public.is_admin());

create policy "Admin can insert product categories"
  on public.product_categories for insert
  with check (public.is_admin());

create policy "Admin can delete product categories"
  on public.product_categories for delete
  using (public.is_admin());

create policy "Admin can read all product highlights"
  on public.product_highlights for select
  using (public.is_admin());

create policy "Admin can insert product highlights"
  on public.product_highlights for insert
  with check (public.is_admin());

create policy "Admin can delete product highlights"
  on public.product_highlights for delete
  using (public.is_admin());

create policy "Admin can read all product attributes"
  on public.product_attributes for select
  using (public.is_admin());

create policy "Admin can insert product attributes"
  on public.product_attributes for insert
  with check (public.is_admin());

create policy "Admin can delete product attributes"
  on public.product_attributes for delete
  using (public.is_admin());

create policy "Admin can read all campaigns"
  on public.campaigns for select
  using (public.is_admin());

create policy "Admin can insert campaigns"
  on public.campaigns for insert
  with check (public.is_admin());

create policy "Admin can update campaigns"
  on public.campaigns for update
  using (public.is_admin());

create policy "Admin can delete campaigns"
  on public.campaigns for delete
  using (public.is_admin());

create policy "Admin can read all coupons"
  on public.coupons for select
  using (public.is_admin());

create policy "Admin can insert coupons"
  on public.coupons for insert
  with check (public.is_admin());

create policy "Admin can update coupons"
  on public.coupons for update
  using (public.is_admin());

create policy "Admin can delete coupons"
  on public.coupons for delete
  using (public.is_admin());

create policy "Admin can read all payment methods"
  on public.payment_methods for select
  using (public.is_admin());

create policy "Admin can insert payment methods"
  on public.payment_methods for insert
  with check (public.is_admin());

create policy "Admin can update payment methods"
  on public.payment_methods for update
  using (public.is_admin());

create policy "Admin can delete payment methods"
  on public.payment_methods for delete
  using (public.is_admin());

create policy "Admin can read all home slides"
  on public.home_slides for select
  using (public.is_admin());

create policy "Admin can insert home slides"
  on public.home_slides for insert
  with check (public.is_admin());

create policy "Admin can update home slides"
  on public.home_slides for update
  using (public.is_admin());

create policy "Admin can delete home slides"
  on public.home_slides for delete
  using (public.is_admin());

create policy "Admin can read all home video settings"
  on public.home_video_settings for select
  using (public.is_admin());

create policy "Admin can insert home video settings"
  on public.home_video_settings for insert
  with check (public.is_admin());

create policy "Admin can update home video settings"
  on public.home_video_settings for update
  using (public.is_admin());

create policy "Admin can delete home video settings"
  on public.home_video_settings for delete
  using (public.is_admin());

create policy "Admin can read all project references"
  on public.project_references for select
  using (public.is_admin());

create policy "Admin can insert project references"
  on public.project_references for insert
  with check (public.is_admin());

create policy "Admin can update project references"
  on public.project_references for update
  using (public.is_admin());

create policy "Admin can delete project references"
  on public.project_references for delete
  using (public.is_admin());

create policy "Admin can read all policy pages"
  on public.policy_pages for select
  using (public.is_admin());

create policy "Admin can insert policy pages"
  on public.policy_pages for insert
  with check (public.is_admin());

create policy "Admin can update policy pages"
  on public.policy_pages for update
  using (public.is_admin());

create policy "Admin can delete policy pages"
  on public.policy_pages for delete
  using (public.is_admin());

create policy "Admin can read all email verification tokens"
  on public.email_verification_tokens for select
  using (public.is_admin());

create policy "Admin can insert email verification tokens"
  on public.email_verification_tokens for insert
  with check (public.is_admin());
