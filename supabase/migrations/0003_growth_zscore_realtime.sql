alter table public.pertumbuhan_anak
  add column if not exists zscore_imtu numeric(4,2);

create or replace function public.set_growth_zscores_pertumbuhan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  anak_row record;
  age_month int;
  bbu_median double precision;
  bbu_sd double precision;
  tbu_median double precision;
  tbu_sd double precision;
  bbtb_median double precision;
  bbtb_sd double precision;
  imt_value double precision;
  imtu_median double precision;
  imtu_sd double precision;
  height_m double precision;
begin
  select tanggal_lahir, jenis_kelamin
  into anak_row
  from public.anak
  where id = new.anak_id;

  if anak_row.tanggal_lahir is null then
    raise exception 'Tanggal lahir anak tidak ditemukan';
  end if;

  age_month :=
    greatest(
      0,
      (date_part('year', age(new.tanggal_periksa, anak_row.tanggal_lahir))::int * 12)
        + date_part('month', age(new.tanggal_periksa, anak_row.tanggal_lahir))::int
    );

  new.usia_bulan := age_month;

  if anak_row.jenis_kelamin = 'L' then
    if age_month <= 3 then
      bbu_median := 3.3 + age_month * 0.80;
      tbu_median := 49.9 + age_month * 3.20;
    elsif age_month <= 6 then
      bbu_median := 5.7 + (age_month - 3) * 0.45;
      tbu_median := 59.5 + (age_month - 3) * 2.00;
    elsif age_month <= 12 then
      bbu_median := 7.05 + (age_month - 6) * 0.32;
      tbu_median := 65.5 + (age_month - 6) * 1.25;
    elsif age_month <= 24 then
      bbu_median := 8.97 + (age_month - 12) * 0.22;
      tbu_median := 73.0 + (age_month - 12) * 0.80;
    else
      bbu_median := 11.61 + (age_month - 24) * 0.14;
      tbu_median := 82.6 + (age_month - 24) * 0.55;
    end if;
  else
    if age_month <= 3 then
      bbu_median := 3.2 + age_month * 0.74;
      tbu_median := 49.1 + age_month * 3.05;
    elsif age_month <= 6 then
      bbu_median := 5.42 + (age_month - 3) * 0.42;
      tbu_median := 58.25 + (age_month - 3) * 1.92;
    elsif age_month <= 12 then
      bbu_median := 6.68 + (age_month - 6) * 0.30;
      tbu_median := 64.01 + (age_month - 6) * 1.18;
    elsif age_month <= 24 then
      bbu_median := 8.48 + (age_month - 12) * 0.20;
      tbu_median := 71.09 + (age_month - 12) * 0.76;
    else
      bbu_median := 10.88 + (age_month - 24) * 0.13;
      tbu_median := 80.21 + (age_month - 24) * 0.53;
    end if;
  end if;

  bbu_sd := 0.72 + least(age_month, 60) * 0.035;
  tbu_sd := 1.75 + least(age_month, 60) * 0.060;

  bbtb_median :=
    2.9
    + greatest(new.tinggi_badan::double precision - 45, 0) * 0.22
    + case when anak_row.jenis_kelamin = 'L' then 0.05 else -0.12 end;
  bbtb_sd := 0.78 + greatest(new.tinggi_badan::double precision - 65, 0) * 0.020;

  height_m := new.tinggi_badan::double precision / 100.0;
  imt_value := new.berat_badan::double precision / nullif(height_m * height_m, 0);
  imtu_median := bbtb_median / nullif(height_m * height_m, 0);
  imtu_sd := 1.20 + least(age_month, 60) * 0.005;

  new.zscore_bbu := round(((new.berat_badan::double precision - bbu_median) / nullif(bbu_sd, 0))::numeric, 2);
  new.zscore_tbu := round(((new.tinggi_badan::double precision - tbu_median) / nullif(tbu_sd, 0))::numeric, 2);
  new.zscore_bbtb := round(((new.berat_badan::double precision - bbtb_median) / nullif(bbtb_sd, 0))::numeric, 2);
  new.zscore_imtu := round(((imt_value - imtu_median) / nullif(imtu_sd, 0))::numeric, 2);

  return new;
end;
$$;

drop trigger if exists z_set_growth_zscores_pertumbuhan on public.pertumbuhan_anak;
create trigger z_set_growth_zscores_pertumbuhan
before insert or update of anak_id, tanggal_periksa, berat_badan, tinggi_badan
on public.pertumbuhan_anak
for each row
execute function public.set_growth_zscores_pertumbuhan();

update public.pertumbuhan_anak
set tanggal_periksa = tanggal_periksa;

do $$
begin
  alter publication supabase_realtime add table public.pertumbuhan_anak;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
