# SmartKIA

SmartKIA adalah frontend Next.js untuk login WhatsApp OTP, dashboard ibu-anak, grafik pertumbuhan, jadwal KB, vaksinasi, dan edukasi KIA.

## Jalankan lokal

```bash
npm install --cache .npm-cache
npm run dev -- --port 3000
```

Buka `http://localhost:3000`.

Jika `.env.local` belum diisi, login berjalan dalam mode demo:

- Nomor WhatsApp bebas dengan format Indonesia, contoh `81234567890`
- Kode OTP demo: `123456`

## Environment frontend

Salin `.env.example` ke `.env.local`, lalu isi:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Supabase

Schema, RLS, cron, dan Edge Functions ada di folder `supabase/`.

Edge Functions:

- `send-otp`: cek nomor WA terdaftar, buat OTP 6 digit, kirim via Fonnte, expire 5 menit.
- `verify-otp`: validasi OTP dan mint JWT Supabase untuk RLS.
- `send-scheduled-notifications`: dipanggil pg_cron setiap 08.00 WIB untuk reminder KB/vaksin H-3 dan H-1.

Detail deploy ada di `supabase/README.md`.
