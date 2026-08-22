begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select has_column('public', 'audit_logs', 'deleted_at', 'audit logs support soft delete');
select has_column('public', 'audit_logs', 'deleted_by', 'audit logs record the deleting super admin');
select has_column('public', 'audit_logs', 'deletion_reason', 'audit logs keep a deletion reason');

select ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_audit_logs_action_created'),
  'audit action filter has an index'
);

select ok(
  exists(select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_audit_logs_actor_created'),
  'audit actor filter has an index'
);

select * from finish();
rollback;
