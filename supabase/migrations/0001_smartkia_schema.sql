create extension if not exists "pgcrypto" with schema extensions;

do $$
begin
  create type public.jenis_kelamin as enum ('L', 'P');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.jenis_kb as enum ('1_bulan', '3_bulan');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notif_jenis as enum ('kb_h3', 'kb_h1', 'vaksin_h3', 'vaksin_h1');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.notif_status as enum ('sent', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.ibu (
  id uuid primary key references auth.users(id) on delete cascade,
  nama_lengkap text not null,
  nomor_wa text not null unique check (nomor_wa ~ '^62[0-9]{8,15}$'),
  tanggal_lahir date,
  golongan_darah text,
  alamat text,
  nama_suami text,
  foto_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.anak (
  id uuid primary key default gen_random_uuid(),
  ibu_id uuid not null references public.ibu(id) on delete cascade,
  nama_anak text not null,
  tanggal_lahir date not null,
  jenis_kelamin public.jenis_kelamin not null,
  tempat_lahir text,
  nama_ayah text,
  created_at timestamptz not null default now()
);

create table if not exists public.suntik_kb (
  id uuid primary key default gen_random_uuid(),
  ibu_id uuid not null references public.ibu(id) on delete cascade,
  jenis_kb public.jenis_kb not null,
  tanggal_suntik date not null,
  tanggal_berikutnya date generated always as (
    tanggal_suntik + case
      when jenis_kb = '1_bulan'::public.jenis_kb then 28
      else 90
    end
  ) stored,
  notif_h3_sent boolean not null default false,
  notif_h1_sent boolean not null default false,
  catatan text,
  created_at timestamptz not null default now()
);

create table if not exists public.pertumbuhan_anak (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  tanggal_periksa date not null,
  berat_badan numeric(5,2) not null check (berat_badan > 0),
  tinggi_badan numeric(5,2) not null check (tinggi_badan > 0),
  lingkar_kepala numeric(5,2) check (lingkar_kepala > 0),
  usia_bulan int,
  zscore_bbu numeric(4,2),
  zscore_tbu numeric(4,2),
  zscore_bbtb numeric(4,2),
  status_gizi text generated always as (
    case
      when zscore_bbu is null then null
      when zscore_bbu < -3 then 'Berat badan sangat kurang'
      when zscore_bbu < -2 then 'Berat badan kurang'
      when zscore_bbu <= 1 then 'Berat sesuai umur'
      when zscore_bbu <= 2 then 'Risiko berat badan lebih'
      else 'Berat badan lebih'
    end
  ) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.vaksinasi_anak (
  id uuid primary key default gen_random_uuid(),
  anak_id uuid not null references public.anak(id) on delete cascade,
  nama_vaksin text not null,
  urutan int not null default 1 check (urutan > 0),
  tanggal_diberikan date,
  jadwal_ideal date not null,
  notif_h3_sent boolean not null default false,
  notif_h1_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.notif_log (
  id uuid primary key default gen_random_uuid(),
  nomor_wa text not null,
  jenis public.notif_jenis not null,
  referensi_id uuid not null,
  status public.notif_status not null,
  message text,
  response jsonb,
  sent_at timestamptz not null default now()
);

create table if not exists public.wa_otp (
  id uuid primary key default gen_random_uuid(),
  ibu_id uuid not null references public.ibu(id) on delete cascade,
  nomor_wa text not null,
  kode_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ibu_nomor_wa_idx on public.ibu (nomor_wa);
create index if not exists anak_ibu_id_idx on public.anak (ibu_id);
create index if not exists suntik_kb_ibu_tanggal_idx on public.suntik_kb (ibu_id, tanggal_suntik desc);
create index if not exists suntik_kb_notif_idx on public.suntik_kb (tanggal_berikutnya, notif_h3_sent, notif_h1_sent);
create index if not exists pertumbuhan_anak_tanggal_idx on public.pertumbuhan_anak (anak_id, tanggal_periksa desc);
create index if not exists vaksinasi_anak_jadwal_idx on public.vaksinasi_anak (anak_id, jadwal_ideal);
create index if not exists vaksinasi_anak_notif_idx on public.vaksinasi_anak (jadwal_ideal, notif_h3_sent, notif_h1_sent);
create index if not exists notif_log_ref_idx on public.notif_log (referensi_id, jenis);
create index if not exists wa_otp_lookup_idx on public.wa_otp (nomor_wa, created_at desc) where consumed_at is null;

create or replace function public.set_usia_bulan_pertumbuhan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  lahir date;
begin
  select tanggal_lahir into lahir
  from public.anak
  where id = new.anak_id;

  if lahir is null then
    raise exception 'Tanggal lahir anak tidak ditemukan';
  end if;

  new.usia_bulan :=
    greatest(
      0,
      (date_part('year', age(new.tanggal_periksa, lahir))::int * 12)
        + date_part('month', age(new.tanggal_periksa, lahir))::int
    );

  return new;
end;
$$;

drop trigger if exists set_usia_bulan_pertumbuhan on public.pertumbuhan_anak;
create trigger set_usia_bulan_pertumbuhan
before insert or update of anak_id, tanggal_periksa
on public.pertumbuhan_anak
for each row
execute function public.set_usia_bulan_pertumbuhan();

alter table public.ibu enable row level security;
alter table public.anak enable row level security;
alter table public.suntik_kb enable row level security;
alter table public.pertumbuhan_anak enable row level security;
alter table public.vaksinasi_anak enable row level security;
alter table public.notif_log enable row level security;
alter table public.wa_otp enable row level security;

drop policy if exists "Ibu dapat membaca profil sendiri" on public.ibu;
create policy "Ibu dapat membaca profil sendiri"
on public.ibu for select
using (id = auth.uid());

drop policy if exists "Ibu dapat memperbarui profil sendiri" on public.ibu;
create policy "Ibu dapat memperbarui profil sendiri"
on public.ibu for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Ibu dapat membaca data anak sendiri" on public.anak;
create policy "Ibu dapat membaca data anak sendiri"
on public.anak for select
using (ibu_id = auth.uid());

drop policy if exists "Ibu dapat membaca riwayat KB sendiri" on public.suntik_kb;
create policy "Ibu dapat membaca riwayat KB sendiri"
on public.suntik_kb for select
using (ibu_id = auth.uid());

drop policy if exists "Ibu dapat membaca pertumbuhan anak sendiri" on public.pertumbuhan_anak;
create policy "Ibu dapat membaca pertumbuhan anak sendiri"
on public.pertumbuhan_anak for select
using (
  exists (
    select 1
    from public.anak
    where anak.id = pertumbuhan_anak.anak_id
      and anak.ibu_id = auth.uid()
  )
);

drop policy if exists "Ibu dapat membaca vaksin anak sendiri" on public.vaksinasi_anak;
create policy "Ibu dapat membaca vaksin anak sendiri"
on public.vaksinasi_anak for select
using (
  exists (
    select 1
    from public.anak
    where anak.id = vaksinasi_anak.anak_id
      and anak.ibu_id = auth.uid()
  )
);
