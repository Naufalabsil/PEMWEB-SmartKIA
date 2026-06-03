import { addDays, toISODate } from "@/lib/date";
import type { DashboardData, KbRecord } from "@/lib/types";

export const KIA_BOOK_URL =
  "https://ayosehat.kemkes.go.id/download/grkr/V5%20Buku%20KIA%20Revisi%202024%20Final.pdf";

export function createDemoDashboard(): DashboardData {
  const today = new Date();
  const nextKbDate = addDays(today, 7);
  const lastKbDate = addDays(nextKbDate, -90);
  const secondKbDate = addDays(lastKbDate, -89);
  const firstKbDate = addDays(secondKbDate, -92);

  const kbRecords: KbRecord[] = [
    {
      id: "kb-1",
      jenisKb: "3_bulan",
      tanggalSuntik: toISODate(firstKbDate),
      tanggalBerikutnya: toISODate(addDays(firstKbDate, 90)),
      catatan: "Bidan Ani - Puskesmas Cimahi",
      status: "done",
    },
    {
      id: "kb-2",
      jenisKb: "3_bulan",
      tanggalSuntik: toISODate(secondKbDate),
      tanggalBerikutnya: toISODate(addDays(secondKbDate, 90)),
      catatan: "Bidan Susi - Posyandu Mawar",
      status: "done",
    },
    {
      id: "kb-3",
      jenisKb: "3_bulan",
      tanggalSuntik: toISODate(lastKbDate),
      tanggalBerikutnya: toISODate(addDays(lastKbDate, 90)),
      catatan: "Bidan Ani - Puskesmas Cimahi",
      status: "done",
    },
    {
      id: "kb-next",
      jenisKb: "3_bulan",
      tanggalSuntik: toISODate(nextKbDate),
      tanggalBerikutnya: toISODate(addDays(nextKbDate, 90)),
      catatan: "Jadwal berikutnya",
      status: "next",
    },
  ];

  return {
    mother: {
      id: "demo-ibu",
      nama: "Sari Dewi",
      usia: "28 tahun",
      beratBadan: 58,
      tinggiBadan: 162,
      nomorWa: "6281234567890",
    },
    child: {
      id: "demo-anak",
      nama: "Budi Kecil",
      usia: "12 bln",
      beratBadan: 9.1,
      tinggiBadan: 74,
      tanggalPemeriksaan: toISODate(addDays(today, -16)),
      statusGizi: "Status Gizi Normal - Berat sesuai umur",
    },
    growthBbu: [
      { label: "0", x: 0, p3: 2.5, p50: 3.3, p97: 4.4, anak: 3.2, zscore: -0.2 },
      { label: "3", x: 3, p3: 4.4, p50: 5.8, p97: 7.2, anak: 5.6, zscore: -0.3 },
      { label: "6", x: 6, p3: 5.7, p50: 7.6, p97: 9.3, anak: 7.1, zscore: -0.5 },
      { label: "9", x: 9, p3: 6.6, p50: 8.9, p97: 10.9, anak: 8.2, zscore: -0.6 },
      { label: "12", x: 12, p3: 7.2, p50: 9.6, p97: 12.0, anak: 9.1, zscore: -0.4 },
      { label: "24", x: 24, p3: 9.0, p50: 12.2, p97: 15.3 },
    ],
    growthBbpb: [
      { label: "50", x: 50, p3: 2.6, p50: 3.4, p97: 4.4, anak: 3.2, zscore: -0.2 },
      { label: "58", x: 58, p3: 4.2, p50: 5.4, p97: 6.8, anak: 5.2, zscore: -0.2 },
      { label: "66", x: 66, p3: 5.7, p50: 7.3, p97: 9.1, anak: 6.9, zscore: -0.4 },
      { label: "70", x: 70, p3: 6.4, p50: 8.2, p97: 10.1, anak: 7.8, zscore: -0.3 },
      { label: "74", x: 74, p3: 7.0, p50: 9.0, p97: 11.1, anak: 9.1, zscore: 0.1 },
      { label: "82", x: 82, p3: 8.4, p50: 10.8, p97: 13.4 },
    ],
    kbRecords,
    nextKb: kbRecords[3],
    nextVaccine: {
      id: "vaksin-1",
      namaVaksin: "Campak (MR)",
      urutan: 1,
      jadwalIdeal: toISODate(addDays(today, 22)),
      tanggalDiberikan: null,
    },
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
    bookUrl: KIA_BOOK_URL,
  };
}
