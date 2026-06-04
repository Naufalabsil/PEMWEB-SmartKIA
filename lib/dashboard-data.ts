import { addDays, daysBetween, toISODate } from "@/lib/date";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { DashboardData, KbRecord, SmartKiaSession, TimelineStatus } from "@/lib/types";

type IbuRow = {
  id: string;
  nama_lengkap: string;
  nomor_wa: string;
  tanggal_lahir: string | null;
  golongan_darah: string | null;
  alamat: string | null;
  nama_suami: string | null;
  berat_badan: number | null;
  tinggi_badan: number | null;
};

type AnakRow = {
  id: string;
  nama_anak: string;
  tanggal_lahir: string | null;
  jenis_kelamin: "L" | "P";
  golongan_darah: string | null;
  tempat_lahir: string;
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

export class DashboardLoadError extends Error {
  constructor(
    public readonly code:
      | "NO_SESSION"
      | "NO_SUPABASE"
      | "NO_PROFILE"
      | "NO_CHILD"
      | "FETCH_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "DashboardLoadError";
  }
}

export async function loadDashboardData(
  session: SmartKiaSession | null,
): Promise<DashboardData> {
  if (!session) {
    throw new DashboardLoadError("NO_SESSION", "Sesi tidak ditemukan. Silakan login kembali.");
  }

  const supabase = createSupabaseBrowserClient(session.accessToken);
  if (!supabase) {
    throw new DashboardLoadError(
      "NO_SUPABASE",
      "Konfigurasi Supabase tidak ditemukan. Hubungi administrator.",
    );
  }

  try {
    // --- Profil Ibu ---
    const { data: ibu, error: ibuError } = await supabase
      .from("ibu")
      .select(
        "id,nama_lengkap,nomor_wa,tanggal_lahir,golongan_darah,alamat,nama_suami",
      )
      .eq("id", session.ibuId)
      .single<IbuRow>();

    if (ibuError || !ibu) {
      console.log("IBU DATA:", ibu);
      console.log("IBU ERROR:", ibuError);
      throw new DashboardLoadError(
        "NO_PROFILE",
        "Profil ibu tidak ditemukan. Hubungi petugas Posyandu.",
      );
    }

    // --- Profil Anak ---
    const { data: anakRows, error: anakError } = await supabase
      .from("anak")
      .select("id,nama_anak,tanggal_lahir,jenis_kelamin,nama_ayah,tempat_lahir, golongan_darah")
      .eq("ibu_id", ibu.id)
      .order("created_at", { ascending: true })
      .returns<AnakRow[]>();

    if (anakError || !anakRows?.length) {
      throw new DashboardLoadError(
        "NO_CHILD",
        "Data anak belum terdaftar. Hubungi petugas Posyandu.",
      );
    }
    
    const anakIds = anakRows.map((anak) => anak.id);

    // --- Ambil semua data parallel ---
    const [
      { data: growthRows, error: growthError },
      { data: kbRows, error: kbError },
      { data: vaccineRows, error: vaccineError },
    ] = await Promise.all([
      supabase
        .from("pertumbuhan_anak")
        .select(
          "tanggal_periksa,berat_badan,tinggi_badan,usia_bulan,zscore_bbu,zscore_bbtb,status_gizi",
        )
        .in("anak_id", anakIds)
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
        .in("anak_id", anakIds)
        .order("jadwal_ideal", { ascending: true })
        .returns<VaccineRow[]>(),
    ]);

    if (growthError) throw new DashboardLoadError("FETCH_ERROR", growthError.message);
    if (kbError) throw new DashboardLoadError("FETCH_ERROR", kbError.message);
    if (vaccineError) throw new DashboardLoadError("FETCH_ERROR", vaccineError.message);

    const today = new Date();

    // --- KB Records ---
    const kbRecords = (kbRows ?? []).map<KbRecord>((row) => ({
      id: row.id,
      jenisKb: row.jenis_kb,
      tanggalSuntik: row.tanggal_suntik,
      tanggalBerikutnya: row.tanggal_berikutnya,
      catatan: row.catatan ?? "-",
      status: getKbStatus(row.tanggal_berikutnya, today),
    }));

    const nextKb =
      kbRecords.find((r) => r.status === "overdue") ??
      kbRecords.find((r) => r.status === "next") ??
      kbRecords[kbRecords.length - 1] ??
      null;

    // --- Vaksin berikutnya ---
    const nextVaccineRow =
      (vaccineRows ?? []).find(
        (r) => !r.tanggal_diberikan && daysBetween(today, new Date(r.jadwal_ideal)) >= 0,
      ) ?? (vaccineRows ?? []).find((r) => !r.tanggal_diberikan);

    // --- Pertumbuhan terakhir ---
    const lastGrowth = (growthRows ?? [])[(growthRows ?? []).length - 1] ?? null;

    return {
      mother: {
        id: ibu.id,
        nama: ibu.nama_lengkap,
        usia: ibu.tanggal_lahir ? `${ageInYears(ibu.tanggal_lahir)} tahun` : "-",
        beratBadan: ibu.berat_badan ?? 0,
        tinggiBadan: ibu.tinggi_badan ?? 0,
        nomorWa: ibu.nomor_wa,
        golonganDarah: ibu.golongan_darah ?? null,
        alamat: ibu.alamat ?? null,
        namaSuami: ibu.nama_suami ?? null,
        tanggalLahir: ibu.tanggal_lahir ?? null,
      },
      child: anakRows.map((item) => {
      
        return {
          id: item.id,
          nama: item.nama_anak,
          usia: item.tanggal_lahir
            ? `${ageInMonths(item.tanggal_lahir)} bln`
            : "-",
          beratBadan: lastGrowth ? Number(lastGrowth.berat_badan) : 0,
          tinggiBadan: lastGrowth ? Number(lastGrowth.tinggi_badan) : 0,
          tanggalPemeriksaan: lastGrowth?.tanggal_periksa ?? null,
          statusGizi: lastGrowth?.status_gizi ?? null,
          tanggalLahir: item.tanggal_lahir ?? null,
          jenisKelamin: item.jenis_kelamin,
          golonganDarah: item.golongan_darah,
          tempatLahir: item.tempat_lahir,
        };
      }),
      growthBbu: buildGrowth(growthRows ?? [], "bbu"),
      growthBbpb: buildGrowth(growthRows ?? [], "bbpb"),
      kbRecords,
      nextKb,
      nextVaccine: nextVaccineRow
        ? {
            id: nextVaccineRow.id,
            namaVaksin: nextVaccineRow.nama_vaksin,
            urutan: nextVaccineRow.urutan,
            tanggalDiberikan: nextVaccineRow.tanggal_diberikan,
            jadwalIdeal: nextVaccineRow.jadwal_ideal,
          }
        : null,
      allVaccines: (vaccineRows ?? []).map((r) => ({
        id: r.id,
        namaVaksin: r.nama_vaksin,
        urutan: r.urutan,
        tanggalDiberikan: r.tanggal_diberikan,
        jadwalIdeal: r.jadwal_ideal,
      })),
      education: [
        {
          title: "ASI Eksklusif 6 Bulan",
          subtitle: "Manfaat ASI dan cara menyusui yang benar",
          category: "Ibu",
        },
        {
          title: "MPASI Pertama Bayi",
          subtitle: "Kapan dan bagaimana memulai MPASI",
          category: "Anak",
        },
      ],
      bookUrl: "https://drive.google.com/file/d/18OeWy-0Uh9OkiJjpQ0JFD4F4DXWy2m13/view?usp=sharing",
    };
  } catch (err) {
    if (err instanceof DashboardLoadError) throw err;
    throw new DashboardLoadError("FETCH_ERROR", "Gagal memuat data. Coba lagi beberapa saat.");
  }
}

function getKbStatus(date: string, today: Date): TimelineStatus {
  const diff = daysBetween(today, new Date(date));
  if (diff < 0) return "overdue";
  return diff <= 90 ? "next" : "done";
}

function ageInYears(date: string): number {
  const birth = new Date(date);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Math.max(age, 0);
}

function ageInMonths(date: string): number {
  const birth = new Date(date);
  const today = new Date();
  return Math.max(
    0,
    (today.getFullYear() - birth.getFullYear()) * 12 +
      today.getMonth() -
      birth.getMonth(),
  );
}

function buildGrowth(rows: PertumbuhanRow[], mode: "bbu" | "bbpb") {
  return rows.map((row) => {
    const axis =
      mode === "bbu"
        ? Number(row.usia_bulan ?? 0)
        : Number(row.tinggi_badan);
    const median =
      mode === "bbu"
        ? estimateMedianBbu(axis)
        : estimateMedianBbpb(axis);
    const spread = mode === "bbu" ? 2.4 : 2.1;

    return {
      label: String(axis),
      x: axis,
      p3: Number((median - spread).toFixed(2)),
      p50: Number(median.toFixed(2)),
      p97: Number((median + spread).toFixed(2)),
      anak: Number(row.berat_badan),
      zscore: Number(
        ((mode === "bbu" ? row.zscore_bbu : row.zscore_bbtb) ?? 0).toFixed(2),
      ),
    };
  });
}

function estimateMedianBbu(month: number): number {
  return Number((3.3 + Math.min(month, 24) * 0.37).toFixed(2));
}

function estimateMedianBbpb(lengthCm: number): number {
  return Number((3.4 + Math.max(0, lengthCm - 50) * 0.22).toFixed(2));
}

export function calculateNextKbDate(
  tanggalSuntik: string,
  jenisKb: "1_bulan" | "3_bulan",
): string {
  return toISODate(addDays(new Date(tanggalSuntik), jenisKb === "1_bulan" ? 28 : 90));
}