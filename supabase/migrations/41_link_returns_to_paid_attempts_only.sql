-- Faz 24: İadeyi başarısız/bekleyen denemeye değil yalnız gerçekleşmiş tahsilata bağla.

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.create_return_request(uuid,jsonb,text,text)'::regprocedure)
  into v_definition;

  v_definition := replace(
    v_definition,
    'where order_id=p_order_id order by (status=''paid'') desc, created_at desc limit 1',
    'where order_id=p_order_id and status=''paid'' order by created_at desc limit 1'
  );
  execute v_definition;
end;
$migration$;
