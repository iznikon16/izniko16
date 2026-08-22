import type { Database } from '@/lib/supabase/database.types';

export type BrandRow = Database['public']['Tables']['brands']['Row'];
export type CategoryRow = Database['public']['Tables']['categories']['Row'];
export type ProductRow = Database['public']['Tables']['products']['Row'];
export type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
export type ProductHighlightRow = Database['public']['Tables']['product_highlights']['Row'];
export type ProductAttributeRow = Database['public']['Tables']['product_attributes']['Row'];
export type AdminUserRow = Database['public']['Tables']['admin_users']['Row'];
export type CartItemRow = Database['public']['Tables']['cart_items']['Row'];
export type CustomerAddressRow = Database['public']['Tables']['customer_addresses']['Row'];
export type CustomerFavoriteRow = Database['public']['Tables']['customer_favorites']['Row'];
export type CustomerInquiryRow = Database['public']['Tables']['customer_inquiries']['Row'];
export type CustomerProfileRow = Database['public']['Tables']['customer_profiles']['Row'];
export type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
export type CouponRow = Database['public']['Tables']['coupons']['Row'];
export type HomeSlideRow = Database['public']['Tables']['home_slides']['Row'];
export type HomeVideoSettingsRow = Database['public']['Tables']['home_video_settings']['Row'];
export type ProjectReferenceRow = Database['public']['Tables']['project_references']['Row'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type ShipmentRow = Database['public']['Tables']['shipments']['Row'];
export type ShipmentItemRow = Database['public']['Tables']['shipment_items']['Row'];
export type ShipmentStatusHistoryRow = Database['public']['Tables']['shipment_status_history']['Row'];
export type ReturnRequestRow = Database['public']['Tables']['return_requests']['Row'];
export type ReturnItemRow = Database['public']['Tables']['return_items']['Row'];
export type ReturnStatusHistoryRow = Database['public']['Tables']['return_status_history']['Row'];
export type RefundTransactionRow = Database['public']['Tables']['refund_transactions']['Row'];
export type InvoiceRow = Database['public']['Tables']['invoices']['Row'];
export type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row'];
export type InvoiceProviderAttemptRow = Database['public']['Tables']['invoice_provider_attempts']['Row'];
export type PaymentAttemptRow = Database['public']['Tables']['payment_attempts']['Row'];
export type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];
export type PolicyPageRow = Database['public']['Tables']['policy_pages']['Row'];
export type EmailLogRow = Database['public']['Tables']['email_logs']['Row'];
export type EmailTemplateRow = Database['public']['Tables']['email_templates']['Row'];
export type EmailVerificationTokenRow = Database['public']['Tables']['email_verification_tokens']['Row'];
export type SmtpSettingsRow = Database['public']['Tables']['smtp_settings']['Row'];
export type CustomerAccountRow = Database['public']['Tables']['customer_accounts']['Row'];
export type AccountTransactionRow = Database['public']['Tables']['account_transactions']['Row'];
export type PaymentRow = Database['public']['Tables']['payments']['Row'];
export type PaymentAllocationRow = Database['public']['Tables']['payment_allocations']['Row'];
export type StockMovementRow = Database['public']['Tables']['stock_movements']['Row'];
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type SmsTemplateRow = Database['public']['Tables']['sms_templates']['Row'];
export type SmsLogRow = Database['public']['Tables']['sms_logs']['Row'];
export type SystemSettingRow = Database['public']['Tables']['system_settings']['Row'];
export type XmlSourceRow = Database['public']['Tables']['xml_sources']['Row'];
export type XmlFieldMappingRow = Database['public']['Tables']['xml_field_mappings']['Row'];
export type XmlSyncRunRow = Database['public']['Tables']['xml_sync_runs']['Row'];
export type XmlSyncErrorRow = Database['public']['Tables']['xml_sync_errors']['Row'];
export type NetgsmSettingsRow = Database['public']['Tables']['netgsm_settings']['Row'];
export type OdealSettingsRow = Database['public']['Tables']['odeal_settings']['Row'];
export type IntegrationHealthCheckRow = Database['public']['Tables']['integration_health_checks']['Row'];

export type XmlTargetField =
  | 'name'
  | 'sku'
  | 'price'
  | 'retail_price'
  | 'stock'
  | 'image'
  | 'category'
  | 'brand'
  | 'description'
  | 'barcode';

export type PriceListRow = Database['public']['Tables']['price_lists']['Row'];
export type PriceListItemRow = Database['public']['Tables']['price_list_items']['Row'];
export type CustomerPriceListRow = Database['public']['Tables']['customer_price_lists']['Row'];
export type CustomerProductPriceRow = Database['public']['Tables']['customer_product_prices']['Row'];
export type CustomerDiscountRow = Database['public']['Tables']['customer_discounts']['Row'];
export type RoleRow = Database['public']['Tables']['roles']['Row'];
export type PermissionRow = Database['public']['Tables']['permissions']['Row'];
export type RolePermissionRow = Database['public']['Tables']['role_permissions']['Row'];

export type AccountTransactionType =
  | 'ORDER'
  | 'PAYMENT'
  | 'PARTIAL_PAYMENT'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'CANCELLATION'
  | 'OPENING_BALANCE';

export type StockMovementType =
  | 'order_in'
  | 'order_out'
  | 'xml_update'
  | 'manual_in'
  | 'manual_out'
  | 'order_cancel';

export type CouponDiscountType = 'fixed' | 'percent';
export type CampaignType = 'banner' | 'discount' | 'bundle' | 'seasonal';
export type PaymentIntegrationType = 'manual' | 'redirect' | 'api';

export type CatalogImage = ProductImageRow & {
  publicUrl: string;
};

export type CatalogAttributeGroup = {
  group: string;
  items: ProductAttributeRow[];
};

export type CatalogProduct = ProductRow & {
  brand: BrandRow | null;
  categories: CategoryRow[];
  images: CatalogImage[];
  highlights: ProductHighlightRow[];
  attributes: ProductAttributeRow[];
  attributeGroups: CatalogAttributeGroup[];
  featuredImageUrl: string | null;
  priceLabel: string;
};

export type HomeSlide = HomeSlideRow & {
  imageUrl: string | null;
};

export type HomeVideoSettings = HomeVideoSettingsRow & {
  embedUrl: string;
  thumbnailUrl: string;
};

export type ProjectReference = ProjectReferenceRow & {
  imageUrl: string | null;
};

export type ProductEditorPayload = {
  product: ProductRow | null;
  categories: CategoryRow[];
  selectedCategoryIds: string[];
  brand: BrandRow | null;
  images: ProductImageRow[];
  highlights: ProductHighlightRow[];
  attributes: ProductAttributeRow[];
};

export type AdminDashboardMetrics = {
  totalProducts: number;
  publishedProducts: number;
  onRequestProducts: number;
  featuredProducts: number;
  totalBrands: number;
  totalCategories: number;
    totalCustomers: number;
    activeCustomers: number;
    totalOrders: number;
    todayOrders: number;
  pendingOrders: number;
  activeCoupons: number;
  activeCampaigns: number;
  activePaymentMethods: number;
};

export type AdminProductFilters = {
  brandId?: string;
  query?: string;
  rootCategoryId?: string;
  status?: ProductRow['status'];
  stockStatus?: ProductRow['stock_status'];
};

export type AdminMediaProduct = Pick<ProductRow, 'featured_image_path' | 'id' | 'slug' | 'title' | 'updated_at'>;

export type AdminMediaImage = ProductImageRow & {
  product: AdminMediaProduct | null;
  publicUrl: string;
};

export type AdminMediaFilters = {
  featured?: 'featured' | 'regular';
  productId?: string;
  query?: string;
};

export type AdminOrderFilters = {
  paymentStatus?: OrderRow['payment_status'];
  query?: string;
  status?: OrderRow['status'];
};

export type AdminCustomerFilters = {
  blocked?: boolean;
  query?: string;
};

export type AdminInquiryFilters = {
  query?: string;
  source?: CustomerInquiryRow['source'];
  status?: CustomerInquiryRow['status'];
};

export type AdminCustomerRecord = CustomerProfileRow & {
  addressCount: number;
  cartItemCount: number;
  favoriteCount: number;
  lastOrderAt: string | null;
  orderCount: number;
  totalSpent: number;
};

export type AdminOrderRecord = OrderRow & {
  campaign: CampaignRow | null;
  coupon: CouponRow | null;
  items: OrderItemRow[];
  paymentMethod: PaymentMethodRow | null;
  profile: CustomerProfileRow | null;
  shipments: ShipmentRecord[];
};

export type ShipmentRecord = ShipmentRow & {
  history: ShipmentStatusHistoryRow[];
  items: Array<ShipmentItemRow & { orderItem: OrderItemRow | null }>;
};

export type CheckoutPaymentMethod = Pick<
  PaymentMethodRow,
  'code' | 'description' | 'id' | 'instructions' | 'integration_type' | 'name' | 'provider'
>;
