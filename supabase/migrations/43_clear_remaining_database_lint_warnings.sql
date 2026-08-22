-- Faz 24: İki güvenli PL/pgSQL lint false-positive kaynağını açık denetimlerle gider.

create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_number text;
  attempt int := 0;
begin
  loop
    attempt := attempt + 1;
    new_number := 'SP-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    if not exists (select 1 from public.orders where order_number = new_number) then
      return new_number;
    end if;
    if attempt > 10 then
      raise exception 'Sipariş numarası üretilemedi';
    end if;
  end loop;
  return new_number;
end;
$$;

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.charge_checkout_to_account(uuid,uuid)'::regprocedure) into v_definition;
  v_definition := regexp_replace(v_definition, E'\\s*v_method public\\.payment_methods%rowtype;', '');
  v_definition := replace(v_definition, 'select * into v_method', 'perform 1');
  execute v_definition;
end;
$migration$;
