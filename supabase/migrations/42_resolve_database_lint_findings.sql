-- Faz 24 doğrulamasında bulunan eski fonksiyon lint bulgularını davranışı değiştirmeden gider.

do $migration$
declare
  v_definition text;
begin
  select pg_get_functiondef('public.charge_checkout_to_account(uuid,uuid)'::regprocedure) into v_definition;
  v_definition := replace(v_definition, 'update public.orders' || chr(10), 'update public.orders as target_order' || chr(10));
  v_definition := replace(
    v_definition,
    'payment_reference = coalesce(nullif(payment_reference, ''''), ''CARI-'' || order_number)',
    'payment_reference = coalesce(nullif(target_order.payment_reference, ''''), ''CARI-'' || target_order.order_number)'
  );
  execute v_definition;

  select pg_get_functiondef('public.record_payment_result_with_accounting(uuid,text,jsonb,text,boolean)'::regprocedure) into v_definition;
  v_definition := replace(
    v_definition,
    'v_payment_status := case when p_paid then ''paid'' else ''failed'' end;',
    'v_payment_status := case when p_paid then ''paid''::public.payment_status else ''failed''::public.payment_status end;'
  );
  execute v_definition;

  select pg_get_functiondef('public.generate_order_number()'::regprocedure) into v_definition;
  if position('return new_number;' || chr(10) || 'end;' in v_definition) = 0 then
    v_definition := replace(v_definition, '  end loop;' || chr(10) || 'end;', '  end loop;' || chr(10) || '  return new_number;' || chr(10) || 'end;');
    execute v_definition;
  end if;
end;
$migration$;
