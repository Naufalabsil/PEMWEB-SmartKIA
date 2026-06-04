export type GrowthMode = "bbu" | "bbpb";

export type KbType = "1_bulan" | "3_bulan";

export type TimelineStatus = "done" | "next" | "overdue";

export interface GrowthPoint {
  label: string;
  x: number;
  p3: number;
  p50: number;
  p97: number;
  anak?: number;
  zscore?: number;
}

export interface MotherProfile {
  id: string;
  nama: string;
  usia: string;
  beratBadan: number;
  tinggiBadan: number;
  nomorWa: string;
  /** Extended fields — null jika belum diisi di Supabase */
  golonganDarah: string | null;
  alamat: string | null;
  namaSuami: string | null;
  tanggalLahir: string | null;
}

export interface ChildProfile {
  id: string;
  nama: string;
  usia: string;
  beratBadan: number;
  tinggiBadan: number;
  /** null jika belum pernah ada data pertumbuhan */
  tanggalPemeriksaan: string | null;
  statusGizi: string | null;
  tanggalLahir: string | null;
  jenisKelamin: "L" | "P";
  golonganDarah: string | null;
  tempatLahir: string,
}

export interface KbRecord {
  id: string;
  jenisKb: KbType;
  tanggalSuntik: string;
  tanggalBerikutnya: string;
  catatan: string;
  status: TimelineStatus;
}

export interface VaccineRecord {
  id: string;
  namaVaksin: string;
  urutan: number;
  tanggalDiberikan?: string | null;
  jadwalIdeal: string;
}

export interface EducationItem {
  title: string;
  subtitle: string;
  category: "Ibu" | "Anak";
}

export interface DashboardData {
  mother: MotherProfile;
  child: ChildProfile[];
  growthBbu: GrowthPoint[];
  growthBbpb: GrowthPoint[];
  kbRecords: KbRecord[];
  /** null jika belum ada catatan KB sama sekali */
  nextKb: KbRecord | null;
  /** null jika semua vaksin sudah diberikan */
  nextVaccine: VaccineRecord | null;
  allVaccines: VaccineRecord[];
  education: EducationItem[];
  bookUrl: string;
}

export interface SmartKiaSession {
  accessToken: string;
  expiresAt: number;
  ibuId: string;
  profileName: string;
  nomorWa: string;
}