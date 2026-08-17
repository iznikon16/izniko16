-- ============================================================================
-- İZNİKO B2B + ÖN MUHASEBE — SUPABASE MIGRATION
-- 10_stok.sql — Stok alanları (products üzerinde güncel stok) + stok fonksiyonu
-- ----------------------------------------------------------------------------
-- 09_cari.sql'de zaten stock_movements tablosu tanımlandı. Bu migration,
-- products tablosuna güncel stok ve kritik stok kolonlarını ekler.
-- ============================================================================

-- Products tablosuna stok kolonları
alter table public.products
  add column if not exists stock_quantity integer not null default 0;

alter table public.products
  add column if not exists critical_stock integer not null default 5;

-- ----------------------------------------------------------------------------
-- apply_stock_change: Stok hareketi uygular (ürün stok güncelleme + kayıt)
-- Idempotent: aynı idempotency_key ikinci kez uygulanırsa dokunmaz.
-- ----------------------------------------------------------------------------
create or replace function public.apply_stock_change(
  p_product_id uuid,
  p_quantity_change integer,
  p_type text,
  p_reference text,
  p_order_id uuid,
  p_actor_user_id uuid,
  p_idempotency_key text
)
returns table(previous_quantity integer, resulting_quantity integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev integer;
  v_result integer;
  v_existing bigint;
begin
  -- Idempotency kontrolü
  select count(*) into v_existing
  from public.stock_movements
  where idempotency_key = p_idempotency_key;

  if v_existing > 0 then
    return query
      select prev.quantity_change::integer, prev.resulting_quantity::integer
      from public.stock_movements prev
      where prev.idempotency_key = p_idempotency_key;
    return;
  end if;

  -- Güncel stok
  select coalesce(stock_quantity, 0) into v_prev
  from public.products
  where id = p_product_id
  for update;

  v_result := v_prev + p_quantity_change;

  if v_result < 0 then
    raise exception 'Yetersiz stok. Ürün: %, mevcut: %, talep: %', p_product_id, v_prev, p_quantity_change;
  end if;

  -- Ürün stok güncelle
  update public.products
  set
    stock_quantity = v_result,
    stock_status = case
      when v_result <= 0 then 'out_of_stock'::public.stock_status
      else 'in_stock'::public.stock_status
    end,
    updated_at = now()
  where id = p_product_id;

  -- Stok hareket kaydı
  insert into public.stock_movements (
    product_id, quantity_change, previous_quantity, resulting_quantity,
    type, reference, order_id, actor_user_id, idempotency_key
  )
  values (
    p_product_id, p_quantity_change, v_prev, v_result,
    p_type, coalesce(p_reference, ''), p_order_id, p_actor_user_id, p_idempotency_key
  );

  return query
    select p_quantity_change::integer, v_result::integer;
end;
$$;

-- Stok kolonları için index
create index if not exists idx_products_stock_quantity on public.products (stock_quantity);
create index if not exists idx_stock_movements_idempotency on public.stock_movements (idempotency_key);
