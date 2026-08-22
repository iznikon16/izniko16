-- Faz 24: RPC çıktı kolonuyla ledger fonksiyonunun resulting_balance kolonu arasındaki çakışmayı gider.

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.finalize_return_refund(uuid,boolean,text,text,uuid)'::regprocedure)
  into v_definition;

  v_definition := replace(
    v_definition,
    'select transaction_id,resulting_balance into',
    'select append_account_transaction.transaction_id,append_account_transaction.resulting_balance into'
  );
  execute v_definition;
end;
$migration$;
