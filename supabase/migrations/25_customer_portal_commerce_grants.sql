grant select, insert, update, delete on table public.customer_addresses to authenticated;

grant select, insert, delete on table public.customer_favorites to authenticated;
revoke update on table public.customer_favorites from authenticated;

grant select, insert, update, delete on table public.cart_items to authenticated;
