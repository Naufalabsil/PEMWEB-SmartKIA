"use client";
import { useRouter } from "next/navigation";

import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { loadDashboardData, DashboardLoadError } from "@/lib/dashboard-data";
import { clearSession, getSession } from "@/lib/session";
import type { DashboardData, GrowthMode } from "@/lib/types";
import { formatDate } from "@/utils/formatdate";

export default function ProfilPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

    const formatPhone = (phone?: string) => {
      if (!phone) return "-";
    
      const local = phone.replace(/^62/, "0");
    
      return `${local.slice(0, 4)}-${local.slice(4, 8)}-${local.slice(8)}`;
    };
    

  useEffect(() => {
    loadDashboardData(getSession())
      .then(setData)
      .catch((err) => {
        if (
          err instanceof DashboardLoadError &&
          (err.code === "NO_PROFILE" ||
            err.code === "NO_SESSION")
        ) {
          clearSession();

          router.replace(
            "/?error=nomor-tidak-terdaftar"
          );

          return;
        }

        setError(
          err instanceof DashboardLoadError
            ? err.message
            : "Gagal memuat data. Coba lagi.",
        );
      });
  }, [router]);
  return (
    <MobileShell nav>
      <section className="page">
        <div className="profile-card">
          <div className="profile-card-header">
            <div className="profile-card-profile">
              <div>
                <h2 className="profile-card-name">{data?.mother.nama}</h2>
                <span className="profile-card-badge">Ibu</span>
              </div>
            </div>
          </div>

          <div className="profile-card-infoGrid">
            <div>
              <p className="profile-card-label">TGL LAHIR</p>
              <p className="profile-card-value">{formatDate(data?.mother.tanggalLahir)}</p>
            </div>

            <div>
              <p className="profile-card-label">UMUR</p>
              <p className="profile-card-value">{data?.mother.usia}</p>
            </div>

            <div>
              <p className="profile-card-label">NOMOR WA</p>
              <p className="profile-card-value">{formatPhone(data?.mother.nomorWa)}</p>
            </div>

            <div>
              <p className="profile-card-label">GOL. DARAH</p>
              <p className="profile-card-value">{data?.mother.golonganDarah}</p>
            </div>

            <div>
              <p className="profile-card-label">ALAMAT</p>
              <p className="profile-card-value">{data?.mother.alamat}</p>
            </div>

            <div>
              <p className="profile-card-label">NAMA SUAMI</p>
              <p className="profile-card-value">{data?.mother.namaSuami}</p>
            </div>
          </div>
        </div>

        {data?.children?.map((anak) => (
          <div className="profile-card matop" key={anak.id}>
          <div className="profile-card-header-anak">
            <div className="profile-card-profile">
              <div>
                <h2 className="profile-card-name">{anak.nama}</h2>
                <span className="profile-card-badge-anak">Anak</span>
              </div>
            </div>
          </div>

          <div className="profile-card-infoGrid">
            <div>
              <p className="profile-card-label">TGL LAHIR</p>
              <p className="profile-card-value">{formatDate(anak.tanggalLahir)}</p>
            </div>

            <div>
              <p className="profile-card-label">UMUR</p>
              <p className="profile-card-value">{anak.usia}</p>
            </div>

            <div>
              <p className="profile-card-label">Jenis Kelamin</p>
              <p className="profile-card-value">{anak.jenisKelamin}</p>
            </div>


            <div>
              <p className="profile-card-label">BERAT BADAN</p>
              <p className="profile-card-value">{anak.beratBadan}kg</p>
            </div>

            <div>
              <p className="profile-card-label">TINGGI BADAN</p>
              <p className="profile-card-value">{anak.tinggiBadan}cm</p>
            </div>

            <div>
              <p className="profile-card-label">GOL. DARAH</p>
              <p className="profile-card-value">{anak.golonganDarah}</p>
            </div>

            <div>
              <p className="profile-card-label">TEMPAT LAHIR</p>
              <p className="profile-card-value">{anak.tempatLahir}</p>
            </div>
          </div>
        </div>
        ))}
      </section>
    </MobileShell>
  );
}