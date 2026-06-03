# SmartKIA Supabase Setup

## Environment secrets

Set these secrets before deploying Edge Functions:

```bash
supabase secrets set FONNTE_TOKEN=...
supabase secrets set OTP_HASH_SECRET=...
supabase secrets set SUPABASE_JWT_SECRET=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set CRON_SECRET=...
```

For local testing without Fonnte, set `ALLOW_DEBUG_OTP=true`.

## Cron configuration

The migration creates one pg_cron job that runs every day at 08:00 WIB:

```cron
0 1 * * *
```

Set the database values used by the cron job:

```sql
alter database postgres set app.edge_function_base_url = 'https://PROJECT_REF.functions.supabase.co';
alter database postgres set app.cron_secret = 'same-value-as-CRON_SECRET';
```

Deploy the functions:

```bash
supabase functions deploy send-otp
supabase functions deploy verify-otp
supabase functions deploy send-scheduled-notifications
```

Admin/bidan should create a Supabase Auth user first, then insert `public.ibu` with the same `id` and normalized WhatsApp number, for example `6281234567890`.
