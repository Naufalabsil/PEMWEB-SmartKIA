import { createDemoDashboard, KIA_BOOK_URL } from "@/lib/demo-data";
import { addDays, daysBetween, toISODate } from "@/lib/date";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase-browser";
import type { DashboardData, KbRecord, SmartKiaSession, TimelineStatus } from "@/lib/types";

type IbuRow = {
  id: string;
  nama_lengkap: string;
  nomor_wa: string;
  tanggal_lahir: string | null;
};

type AnakRow = {
  id: string;
  nama_anak: string;
  tanggal_lahir: string | null;
};

type PertumbuhanRow = {
  tanggal_periksa: string;
  berat_badan: number;
  tinggi_badan: number;
  usia_bulan: number | null;
  zscore_bbu: number | null;
  zscore_bbtb: number | null;
  status_gizi: string | null;
};

type KbRow = {
  id: string;
  jenis_kb: "1_bulan" | "3_bulan";
  tanggal_suntik: string;
  tanggal_berikutnya: string;
  catatan: string | null;
};

type VaccineRow = {
  id: string;
  nama_vaksin: string;
  urutan: number;
  tanggal_diberikan: string | null;
  jadwal_ideal: string;
};

export async function loadDashboardData(session: SmartKiaSession | null): Promise<DashboardData> {
  if (!session || !hasSupabaseConfig()) {
    return createDemoDashboard();
  }

  const supabase = createSupabaseBrowserClient(session.accessToken);
  if (!supabase) {
    return createDemoDashboard();
  }

  try {
    const { data: ibu, error: ibuError } = await supabase
      .from("ibu")
      .select("id,nama_lengkap,nomor_wa,tanggal_lahir")
      .eq("id", session.ibuId)
      .single<IbuRow>();

    if (ibuError || !ibu) {
      return createDemoDashboard();
    }

    const { data: anakRows } = await supabase
      .from("anak")
      .select("id,nama_anak,tanggal_lahir")
      .eq("ibu_id", ibu.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .returns<AnakRow[]>();

    const anak = anakRows?.[0];
    if (!anak) {
      return createDemoDashboard();
    }

    const [{ data: growthRows }, { data: kbRows }, { data: vaccineRows }] = await Promise.all([
      supabase
        .from("pertumbuhan_anak")
        .select(
          "tanggal_periksa,berat_badan,tinggi_badan,usia_bulan,zscore_bbu,zscore_bbtb,status_gizi",
        )
        .eq("anak_id", anak.id)
        .order("tanggal_periksa", { ascending: true })
        .returns<PertumbuhanRow[]>(),
      supabase
        .from("suntik_kb")
        .select("id,jenis_kb,tanggal_suntik,tanggal_berikutnya,catatan")
        .eq("ibu_id", ibu.id)
        .order("tanggal_suntik", { ascending: true })
        .returns<KbRow[]>(),
      supabase
        .from("vaksinasi_anak")
        .select("id,nama_vaksin,urutan,tanggal_diberikan,jadwal_ideal")
        .eq("anak_id", anak.id)
        .order("jadwal_ideal", { ascending: true })
        .returns<VaccineRow[]>(),
    ]);

    const today = new Date();
    const kbRecords = (kbRows ?? []).map<KbRecord>((row) => ({
      id: row.id,
      jenisKb: row.jenis_kb,
      tanggalSuntik: row.tanggal_suntik,
      tanggalBerikutnya: row.tanggal_berikutnya,
      catatan: row.catatan ?? "Catatan belum diisi",
      status: getKbStatus(row.tanggal_berikutnya, today),
    }));

    const nextKb =
      kbRecords.find((record) => record.status === "overdue") ??
      kbRecords.find((record) => record.status === "next") ??
      kbRecords[kbRecords.length - 1] ??
      createDemoDashboard().nextKb;

    const lastGrowth = growthRows?.[growthRows.length - 1];
    const demo = createDemoDashboard();

    const nextVaccineRow =
      vaccineRows?.find((row) => !row.tanggal_diberikan && daysBetween(today, new Date(row.jadwal_ideal)) >= 0) ??
      vaccineRows?.find((row) => !row.tanggal_diberikan);

    return {
      mother: {
        id: ibu.id,
        nama: ibu.nama_lengkap,
        usia: ibu.tanggal_lahir ? `${ageInYears(ibu.tanggal_lahir)} tahun` : demo.mother.usia,
        beratBadan: demo.mother.beratBadan,
        tinggiBadan: demo.mother.tinggiBadan,
        nomorWa: ibu.nomor_wa,
      },
      child: {
        id: anak.id,
        nama: anak.nama_anak,
        usia: anak.tanggal_lahir ? `${ageInMonths(anak.tanggal_lahir)} bln` : demo.child.usia,
        beratBadan: Number(lastGrowth?.berat_badan ?? demo.child.beratBadan),
        tinggiBadan: Number(lastGrowth?.tinggi_badan ?? demo.child.tinggiBadan),
        tanggalPemeriksaan: lastGrowth?.tanggal_periksa ?? demo.child.tanggalPemeriksaan,
        statusGizi: lastGrowth?.status_gizi ?? demo.child.statusGizi,
      },
      growthBbu: buildGrowth(growthRows ?? [], "bbu", demo),
      growthBbpb: buildGrowth(growthRows ?? [], "bbpb", demo),
      kbRecords: kbRecords.length ? kbRecords : demo.kbRecords,
      nextKb,
      nextVaccine: nextVaccineRow
        ? {
            id: nextVaccineRow.id,
            namaVaksin: nextVaccineRow.nama_vaksin,
            urutan: nextVaccineRow.urutan,
            tanggalDiberikan: nextVaccineRow.tanggal_diberikan,
            jadwalIdeal: nextVaccineRow.jadwal_ideal,
          }
        : demo.nextVaccine,
      education: demo.education,
      bookUrl: KIA_BOOK_URL,
    };
  } catch {
    return createDemoDashboard();
  }
}

function getKbStatus(date: string, today: Date): TimelineStatus {
  const diff = daysBetween(today, new Date(date));
  if (diff < 0) {
    return "overdue";
  }
  return diff <= 90 ? "next" : "done";
}

function ageInYears(date: string): number {
  const birth = new Date(date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

function ageInMonths(date: string): number {
  const birth = new Date(date);
  const today = new Date();
  return Math.max(0, (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth());
}

function buildGrowth(rows: PertumbuhanRow[], mode: "bbu" | "bbpb", demo: DashboardData) {
  if (!rows.length) {
    return mode === "bbu" ? demo.growthBbu : demo.growthBbpb;
  }

  return rows.map((row) => {
    const axis = mode === "bbu" ? Number(row.usia_bulan ?? 0) : Number(row.tinggi_badan);
    const median = mode === "bbu" ? estimateMedianBbu(axis) : estimateMedianBbpb(axis);
    const spread = mode === "bbu" ? 2.4 : 2.1;

    return {
      label: String(axis),
      x: axis,
      p3: Number((median - spread).toFixed(2)),
      p50: Number(median.toFixed(2)),
      p97: Number((median + spread).toFixed(2)),
      anak: Number(row.berat_badan),
      zscore: Number((mode === "bbu" ? row.zscore_bbu : row.zscore_bbtb) ?? 0),
    };
  });
}

function estimateMedianBbu(month: number): number {
  return Number((3.3 + Math.min(month, 24) * 0.37).toFixed(2));
}

function estimateMedianBbpb(lengthCm: number): number {
  return Number((3.4 + Math.max(0, lengthCm - 50) * 0.22).toFixed(2));
}

export function calculateNextKbDate(tanggalSuntik: string, jenisKb: "1_bulan" | "3_bulan"): string {
  return toISODate(addDays(new Date(tanggalSuntik), jenisKb === "1_bulan" ? 28 : 90));
}
