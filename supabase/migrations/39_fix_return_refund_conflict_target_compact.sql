-- Faz 24: Daha önce yerelde derlenen boşluksuz ON CONFLICT ifadesini de düzelt.

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.transition_return_request(uuid,text,text,uuid)'::regprocedure)
  into v_definition;

  if position('on conflict(return_request_id) do update' in lower(v_definition)) > 0 then
    execute replace(
      v_definition,
      'on conflict(return_request_id) do update',
      'on conflict on constraint refund_transactions_return_request_id_key do update'
    );
  end if;
end;
$migration$;
