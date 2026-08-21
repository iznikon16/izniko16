import 'server-only';

import type {
  AdminCustomerFilters,
  AdminCustomerRecord,
  AdminOrderFilters,
  AdminOrderRecord,
  CampaignRow,
  CheckoutPaymentMethod,
  CouponRow,
  CustomerAddressRow,
  CustomerFavoriteRow,
  CustomerProfileRow,
  HomeSlide,
  HomeSlideRow,
  HomeVideoSettings,
  HomeVideoSettingsRow,
  OrderItemRow,
  OrderRow,
  PaymentMethodRow,
  ProjectReference,
  ProjectReferenceRow,
  ShipmentItemRow,
  ShipmentRecord,
  ShipmentRow,
  ShipmentStatusHistoryRow,
} from '@/lib/catalog/types';
import { getStoragePublicUrl } from '@/lib/catalog/utils';
import { createAdminClient } from '@/lib/supabase/admin';
import { PAYMENT_PROVIDER_DEFINITIONS, type PaymentProviderKey } from '@/lib/commerce/payment-provider-presets';
import { isCheckoutPaymentMethodReady } from '@/lib/commerce/payment-method-readiness';

function mapHomeVideoSettings(settings: HomeVideoSettingsRow): HomeVideoSettings {
  return {
    ...settings,
    embedUrl: `https://www.youtube-nocookie.com/embed/${settings.video_id}?rel=0&modestbranding=1`,
    thumbnailUrl: `https://i.ytimg.com/vi/${settings.video_id}/hqdefault.jpg`,
  };
}

function normalizeSearchTerm(value?: string) {
  return value?.replace(/[%_,]/g, ' ').trim() ?? '';
}

function emptyResult<T>() {
  return Promise.resolve({ data: [] as T[], error: null });
}

export async function getAdminOrders(filters?: AdminOrderFilters): Promise<AdminOrderRecord[]> {
  const supabase = createAdminClient();
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  const searchTerm = normalizeSearchTerm(filters?.query);

  if (searchTerm) {
    query = query.or(`order_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.paymentStatus) {
    query = query.eq('payment_status', filters.paymentStatus);
  }

  const { data: orders, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);
  const userIds = [...new Set(orders.map((order) => order.user_id))];
  const paymentMethodIds = [...new Set(orders.map((order) => order.payment_method_id).filter(Boolean))] as string[];
  const couponIds = [...new Set(orders.map((order) => order.coupon_id).filter(Boolean))] as string[];
  const campaignIds = [...new Set(orders.map((order) => order.campaign_id).filter(Boolean))] as string[];

  const [
    { data: items, error: itemsError },
    { data: profiles, error: profilesError },
    { data: paymentMethods, error: paymentMethodsError },
    { data: coupons, error: couponsError },
    { data: campaigns, error: campaignsError },
    { data: shipments, error: shipmentsError },
  ] = await Promise.all([
    supabase.from('order_items').select('*').in('order_id', orderIds).order('created_at', { ascending: true }),
    supabase.from('customer_profiles').select('*').in('user_id', userIds),
    paymentMethodIds.length > 0 ? supabase.from('payment_methods').select('*').in('id', paymentMethodIds) : emptyResult<PaymentMethodRow>(),
    couponIds.length > 0 ? supabase.from('coupons').select('*').in('id', couponIds) : emptyResult<CouponRow>(),
    campaignIds.length > 0 ? supabase.from('campaigns').select('*').in('id', campaignIds) : emptyResult<CampaignRow>(),
    supabase.from('shipments').select('*').in('order_id', orderIds).order('created_at', { ascending: false }),
  ]);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (paymentMethodsError) {
    throw new Error(paymentMethodsError.message);
  }

  if (couponsError) {
    throw new Error(couponsError.message);
  }

  if (campaignsError) {
    throw new Error(campaignsError.message);
  }

  if (shipmentsError) {
    throw new Error(shipmentsError.message);
  }

  const shipmentIds = (shipments ?? []).map((shipment) => shipment.id);
  const [{ data: shipmentItems, error: shipmentItemsError }, { data: shipmentHistory, error: shipmentHistoryError }] = await Promise.all([
    shipmentIds.length > 0 ? supabase.from('shipment_items').select('*').in('shipment_id', shipmentIds) : emptyResult<ShipmentItemRow>(),
    shipmentIds.length > 0
      ? supabase.from('shipment_status_history').select('*').in('shipment_id', shipmentIds).order('created_at', { ascending: false })
      : emptyResult<ShipmentStatusHistoryRow>(),
  ]);

  if (shipmentItemsError) throw new Error(shipmentItemsError.message);
  if (shipmentHistoryError) throw new Error(shipmentHistoryError.message);

  const itemsByOrderId = new Map<string, OrderItemRow[]>();
  for (const item of items ?? []) {
    const group = itemsByOrderId.get(item.order_id) ?? [];
    group.push(item);
    itemsByOrderId.set(item.order_id, group);
  }

  const profilesByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const paymentMethodsById = new Map((paymentMethods ?? []).map((method) => [method.id, method]));
  const couponsById = new Map((coupons ?? []).map((coupon) => [coupon.id, coupon]));
  const campaignsById = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign]));
  const orderItemsById = new Map((items ?? []).map((item) => [item.id, item]));
  const shipmentItemsByShipmentId = new Map<string, ShipmentRecord['items']>();
  for (const item of shipmentItems ?? []) {
    const group = shipmentItemsByShipmentId.get(item.shipment_id) ?? [];
    group.push({ ...item, orderItem: orderItemsById.get(item.order_item_id) ?? null });
    shipmentItemsByShipmentId.set(item.shipment_id, group);
  }
  const shipmentHistoryByShipmentId = new Map<string, ShipmentStatusHistoryRow[]>();
  for (const entry of shipmentHistory ?? []) {
    const group = shipmentHistoryByShipmentId.get(entry.shipment_id) ?? [];
    group.push(entry);
    shipmentHistoryByShipmentId.set(entry.shipment_id, group);
  }
  const shipmentsByOrderId = new Map<string, ShipmentRecord[]>();
  for (const shipment of (shipments ?? []) as ShipmentRow[]) {
    const group = shipmentsByOrderId.get(shipment.order_id) ?? [];
    group.push({
      ...shipment,
      history: shipmentHistoryByShipmentId.get(shipment.id) ?? [],
      items: shipmentItemsByShipmentId.get(shipment.id) ?? [],
    });
    shipmentsByOrderId.set(shipment.order_id, group);
  }

  return (orders as OrderRow[]).map((order) => ({
    ...order,
    items: itemsByOrderId.get(order.id) ?? [],
    profile: profilesByUserId.get(order.user_id) ?? null,
    shipments: shipmentsByOrderId.get(order.id) ?? [],
    paymentMethod: order.payment_method_id ? paymentMethodsById.get(order.payment_method_id) ?? null : null,
    coupon: order.coupon_id ? couponsById.get(order.coupon_id) ?? null : null,
    campaign: order.campaign_id ? campaignsById.get(order.campaign_id) ?? null : null,
  }));
}

export async function getAdminCustomers(filters?: AdminCustomerFilters): Promise<AdminCustomerRecord[]> {
  const supabase = createAdminClient();
  let query = supabase.from('customer_profiles').select('*').order('updated_at', { ascending: false });
  const searchTerm = normalizeSearchTerm(filters?.query);

  if (searchTerm) {
    query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
  }

  if (typeof filters?.blocked === 'boolean') {
    query = query.eq('is_blocked', filters.blocked);
  }

  const { data: profiles, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!profiles || profiles.length === 0) {
    return [];
  }

  const userIds = profiles.map((profile) => profile.user_id);
  const [{ data: orders, error: ordersError }, { data: addresses, error: addressesError }, { data: favorites, error: favoritesError }, { data: cartItems, error: cartItemsError }] =
    await Promise.all([
      supabase.from('orders').select('user_id, total, status, created_at').in('user_id', userIds),
      supabase.from('customer_addresses').select('user_id').in('user_id', userIds),
      supabase.from('customer_favorites').select('user_id').in('user_id', userIds),
      supabase.from('cart_items').select('user_id').in('user_id', userIds),
    ]);

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  if (addressesError) {
    throw new Error(addressesError.message);
  }

  if (favoritesError) {
    throw new Error(favoritesError.message);
  }

  if (cartItemsError) {
    throw new Error(cartItemsError.message);
  }

  const statsByUserId = new Map<
    string,
    {
      addressCount: number;
      cartItemCount: number;
      favoriteCount: number;
      lastOrderAt: string | null;
      orderCount: number;
      totalSpent: number;
    }
  >();

  function ensureStats(userId: string) {
    const existing = statsByUserId.get(userId);
    if (existing) {
      return existing;
    }

    const initial = {
      addressCount: 0,
      cartItemCount: 0,
      favoriteCount: 0,
      lastOrderAt: null as string | null,
      orderCount: 0,
      totalSpent: 0,
    };

    statsByUserId.set(userId, initial);
    return initial;
  }

  for (const order of (orders ?? []) as Pick<OrderRow, 'created_at' | 'status' | 'total' | 'user_id'>[]) {
    const stats = ensureStats(order.user_id);
    stats.orderCount += 1;

    if (order.status !== 'cancelled') {
      stats.totalSpent += Number(order.total ?? 0);
    }

    if (!stats.lastOrderAt || new Date(order.created_at).getTime() > new Date(stats.lastOrderAt).getTime()) {
      stats.lastOrderAt = order.created_at;
    }
  }

  for (const address of (addresses ?? []) as Pick<CustomerAddressRow, 'user_id'>[]) {
    ensureStats(address.user_id).addressCount += 1;
  }

  for (const favorite of (favorites ?? []) as Pick<CustomerFavoriteRow, 'user_id'>[]) {
    ensureStats(favorite.user_id).favoriteCount += 1;
  }

  for (const item of cartItems ?? []) {
    ensureStats(item.user_id).cartItemCount += 1;
  }

  return (profiles as CustomerProfileRow[]).map((profile) => ({
    ...profile,
    ...(statsByUserId.get(profile.user_id) ?? {
      addressCount: 0,
      cartItemCount: 0,
      favoriteCount: 0,
      lastOrderAt: null,
      orderCount: 0,
      totalSpent: 0,
    }),
  }));
}

export async function getAdminCoupons() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('coupons').select('*').order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CouponRow[];
}

export async function getAdminCampaigns() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('campaigns').select('*').order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CampaignRow[];
}

export async function getAdminHomeSlides(): Promise<HomeSlide[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('home_slides')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as HomeSlideRow[]).map((slide) => ({
    ...slide,
    imageUrl: getStoragePublicUrl(slide.image_path),
  }));
}

export async function getAdminHomeVideo(): Promise<HomeVideoSettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('home_video_settings').select('*').eq('id', 'main').maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapHomeVideoSettings(data as HomeVideoSettingsRow) : null;
}

export async function getAdminProjectReferences(): Promise<ProjectReference[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('project_references')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProjectReferenceRow[]).map((reference) => ({
    ...reference,
    imageUrl: getStoragePublicUrl(reference.image_path),
  }));
}

export async function getAdminPaymentMethods(): Promise<PaymentMethodRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('payment_methods').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PaymentMethodRow[]).map((method) => {
    const providerKey = method.provider as PaymentProviderKey;
    const providerDef = PAYMENT_PROVIDER_DEFINITIONS[providerKey];
    if (!providerDef || !method.config || typeof method.config !== 'object') {
      return method;
    }

    const secretKeys = new Set(providerDef.configFields.filter((f) => f.secret).map((f) => f.key));
    const maskedConfig = { ...(method.config as Record<string, unknown>) };
    
    for (const key of secretKeys) {
      if (typeof maskedConfig[key] === 'string' && maskedConfig[key]) {
        maskedConfig[key] = '******';
      }
    }

    return { ...method, config: maskedConfig as PaymentMethodRow['config'] };
  });
}

export async function getCheckoutPaymentMethods(): Promise<CheckoutPaymentMethod[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payment_methods')
    .select('id, code, name, description, instructions, provider, integration_type, config')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((method) => isCheckoutPaymentMethodReady(method.provider, method.integration_type, method.config))
    .map((method) => ({
      code: method.code,
      description: method.description,
      id: method.id,
      instructions: method.instructions,
      integration_type: method.integration_type,
      name: method.name,
      provider: method.provider,
    }) satisfies CheckoutPaymentMethod);
}

export async function getCheckoutPaymentMethodById(paymentMethodId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('id', paymentMethodId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as PaymentMethodRow | null;
}
