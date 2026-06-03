create extension if not exists "pg_cron" with schema extensions;
create extension if not exists "pg_net" with schema extensions;

do $$
begin
  perform cron.unschedule('smartkia-daily-wa-notifications');
exception
  when others then null;
end $$;

select cron.schedule(
  'smartkia-daily-wa-notifications',
  '0 1 * * *',
  $$
  select net.http_post(
    url := current_setting('app.edge_function_base_url', true) || '/send-scheduled-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body := jsonb_build_object(
      'source', 'pg_cron',
      'timezone', 'Asia/Jakarta',
      'run_at', now()
    )
  );
  $$
);
