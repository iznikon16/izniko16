-- Faz 23: Müşteri sevkiyat okumaları için açık grant ve güvenli ownership kontrolü.

create or replace function public.can_view_order(p_order_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.orders o where o.id = p_order_id and o.user_id = p_user_id);
$$;

create or replace function public.can_view_shipment(p_shipment_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql security definer set search_path = public stable as $$
  select exists(
    select 1 from public.shipments s join public.orders o on o.id = s.order_id
    where s.id = p_shipment_id and o.user_id = p_user_id
  );
$$;

revoke all on function public.can_view_order(uuid,uuid) from public, anon;
revoke all on function public.can_view_shipment(uuid,uuid) from public, anon;
grant execute on function public.can_view_order(uuid,uuid) to authenticated, service_role;
grant execute on function public.can_view_shipment(uuid,uuid) to authenticated, service_role;

grant select on public.shipments, public.shipment_items, public.shipment_status_history to authenticated;
grant all on public.shipments, public.shipment_items, public.shipment_status_history to service_role;

drop policy if exists "Customers view own shipments" on public.shipments;
create policy "Customers view own shipments" on public.shipments
  for select using (public.can_view_order(order_id));

drop policy if exists "Customers view own shipment items" on public.shipment_items;
create policy "Customers view own shipment items" on public.shipment_items
  for select using (public.can_view_shipment(shipment_id));

drop policy if exists "Customers view own shipment history" on public.shipment_status_history;
create policy "Customers view own shipment history" on public.shipment_status_history
  for select using (public.can_view_shipment(shipment_id));
