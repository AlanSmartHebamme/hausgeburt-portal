-- Schedule the request-booster function to run once every hour
select
  cron.schedule(
    'hourly-request-booster',
    '0 * * * *', -- cron syntax for every hour
    $$
      select
        net.http_post(
          'https://heqvyynwqtejzemdgyub.supabase.co/functions/v1/request-booster',
headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcXZ5eW53cXRlanplbWRneXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4MDUyOTYsImV4cCI6MjA3MDM4MTI5Nn0.syMNh6zVWE6iOMAc0aS4RhP4geK5_bUEnAnNcxUAZWg"}'::jsonb
        ) as request_id;
    $$
  );

-- NOTE: You MUST replace YOUR_PROJECT_REF and YOUR_SUPABASE_ANON_KEY with your actual
-- project reference and anon key from the Supabase dashboard (Project Settings -> API).
-- After replacing them, run `npx supabase db push` to apply this migration.
