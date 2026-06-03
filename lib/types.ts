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
}

export interface ChildProfile {
  id: string;
  nama: string;
  usia: string;
  beratBadan: number;
  tinggiBadan: number;
  tanggalPemeriksaan: string;
  statusGizi: string;
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
  child: ChildProfile;
  growthBbu: GrowthPoint[];
  growthBbpb: GrowthPoint[];
  kbRecords: KbRecord[];
  nextKb: KbRecord;
  nextVaccine: VaccineRecord;
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
