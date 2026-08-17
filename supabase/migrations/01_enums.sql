-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 01_enums.sql — Enum tipleri
-- ============================================================================

create type public.order_status as enum (
  'pending_payment',
  'confirmed',
  'preparing',
  'shipped',
  'completed',
  'cancelled'
);

create type public.payment_provider as enum (
  'offline',
  'saved_card',
  'iyzico',
  'stripe',
  'paytr',
  'param',
  'sipay',
  'paycell',
  'paynet',
  'paratika',
  'moka',
  'craftgate',
  'payu',
  'shopier',
  'papara',
  'hepsipay',
  'bank_pos',
  'custom'
);

create type public.payment_status as enum (
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded'
);

create type public.price_mode as enum (
  'fixed',
  'contact'
);

create type public.product_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.stock_status as enum (
  'in_stock',
  'out_of_stock',
  'on_request'
);
