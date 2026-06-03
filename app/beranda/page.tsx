"use client";
import { useRouter } from "next/navigation";

import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GrowthChart } from "@/components/growth-chart";
import { MobileShell } from "@/components/mobile-shell";
import { formatLongDate, formatWeekdayDate, kbTypeLabel, relativeDayLabel } from "@/lib/date";
import { loadDashboardData, DashboardLoadError } from "@/lib/dashboard-data";
import { clearSession, getSession } from "@/lib/session";
import type { DashboardData, GrowthMode } from "@/lib/types";



export default function BerandaPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<GrowthMode>("bbu");
  const router = useRouter();

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

  if (error) {
    return (
      <MobileShell nav>
        <div className="empty-screen">
          <AlertTriangle size={44} color="#e95473" />
          <h1>Tidak dapat memuat data</h1>
          <p>{error}</p>
        </div>
      </MobileShell>
    );
  }

  if (!data) {
    return (
      <MobileShell nav>
        <div className="loading-card">Memuat data KIA...</div>
      </MobileShell>
    );
  }

  const chartData = mode === "bbu" ? data.growthBbu : data.growthBbpb;
  const hasGrowthData = chartData.length > 0;

  return (
    <MobileShell nav>
      <section className="page">
        <div className="top-row">
          <div>
            <div className="date-label">{formatWeekdayDate(new Date())}</div>
            <h1 className="greeting">
              Halo, Bunda {data.mother.nama.split(" ")[0]}
            </h1>
          </div>
          <div className="avatar-glow" />
        </div>

        {/* Kartu Profil */}
        <article className="card summary-card">
          <div className="summary-grid">
            <div className="profile-mini">
              <div className="swatch pink" />
              <div>
                <span className="eyebrow">Ibu</span>
                <strong>{data.mother.nama}</strong>
                <span>
                  {data.mother.usia}
                  {data.mother.beratBadan > 0
                    ? ` · ${data.mother.beratBadan} kg`
                    : ""}
                  {data.mother.tinggiBadan > 0
                    ? ` · ${data.mother.tinggiBadan} cm`
                    : ""}
                </span>
              </div>
            </div>
            <div className="divider" />
            <div className="profile-mini">
              <div className="swatch blue" />
              <div>
                <span className="eyebrow">Anak</span>
                <strong>{data.child.nama}</strong>
                <span>
                  {data.child.usia}
                  {data.child.beratBadan > 0
                    ? ` · ${data.child.beratBadan} kg`
                    : ""}
                  {data.child.tinggiBadan > 0
                    ? ` · ${data.child.tinggiBadan} cm`
                    : ""}
                </span>
              </div>
            </div>
          </div>
          <div className="summary-footer">
            {data.child.tanggalPemeriksaan ? (
              <span>
                Periksa terakhir:{" "}
                <b>{formatLongDate(data.child.tanggalPemeriksaan)}</b>
              </span>
            ) : (
              <span style={{ color: "var(--muted)" }}>
                Belum ada data pemeriksaan
              </span>
            )}
            <span className="status-pill">
              <CheckCircle2 size={14} />
              Aktif
            </span>
          </div>
        </article>

        {/* Grafik Pertumbuhan */}
        <article className="card section-card">
          <div className="section-header">
            <h2>Grafik Pertumbuhan</h2>
            <div className="segmented" aria-label="Jenis grafik">
              <button
                className={mode === "bbu" ? "active" : ""}
                type="button"
                onClick={() => setMode("bbu")}
              >
                BB/U
              </button>
              <button
                className={mode === "bbpb" ? "active" : ""}
                type="button"
                onClick={() => setMode("bbpb")}
              >
                BB/PB
              </button>
            </div>
          </div>

          {hasGrowthData ? (
            <>
              <GrowthChart data={chartData} mode={mode} />
              {data.child.statusGizi ? (
                <div className="growth-status">
                  <CheckCircle2 size={17} />
                  {data.child.statusGizi}
                </div>
              ) : null}
            </>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                color: "var(--muted)",
                fontSize: 14,
              }}
            >
              <Info size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p style={{ margin: 0 }}>
                Belum ada data pertumbuhan. Data akan muncul setelah pemeriksaan
                pertama di Posyandu.
              </p>
            </div>
          )}
        </article>

        {/* Alert KB & Vaksin */}
        <div className="alert-grid">
          {data.nextKb ? (
            <Link className="alert-card kb card" href="/kb">
              <h3>Suntik KB</h3>
              <strong>{relativeDayLabel(data.nextKb.tanggalSuntik)}</strong>
              <span>{formatLongDate(data.nextKb.tanggalSuntik)}</span>
              <span className="mini-badge">
                <AlertTriangle size={13} />
                {data.nextKb.status === "overdue" ? "TERLAMBAT" : "SEGERA"}
              </span>
            </Link>
          ) : (
            <article className="alert-card kb card">
              <h3>Suntik KB</h3>
              <strong style={{ fontSize: 15 }}>Belum ada jadwal</strong>
              <span>Hubungi bidan untuk mendaftarkan jadwal KB</span>
            </article>
          )}

          {data.nextVaccine ? (
            <Link className="alert-card vaccine card" href="/vaksin">
              <h3>Vaksinasi</h3>
              <strong>{data.nextVaccine.namaVaksin}</strong>
              <span>{formatLongDate(data.nextVaccine.jadwalIdeal)}</span>
              <span className="mini-badge">
                {relativeDayLabel(data.nextVaccine.jadwalIdeal)}
              </span>
            </Link>
          ) : (
            <article className="alert-card vaccine card">
              <h3>Vaksinasi</h3>
              <strong style={{ fontSize: 15 }}>
                {data.allVaccines.length > 0
                  ? "Semua vaksin selesai"
                  : "Belum ada jadwal"}
              </strong>
              <span>
                {data.allVaccines.length > 0
                  ? `${data.allVaccines.length} vaksin tercatat`
                  : "Hubungi bidan untuk mendaftarkan jadwal vaksinasi"}
              </span>
            </article>
          )}
        </div>

        {/* Edukasi */}
        <article className="card section-card">
          <div className="section-header">
            <h2>Edukasi Kesehatan KIA</h2>
            <a
              href={data.bookUrl}
              target="_blank"
              rel="noreferrer"
              className="ghost-button"
            >
              Lihat semua <ArrowRight size={15} />
            </a>
          </div>

          <div className="education-list">
            {data.education.map((item, index) => (
              <article className="education-item" key={item.title}>
                <div className={`education-thumb${index === 1 ? " blue" : ""}`} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
                <span className={`tag ${item.category === "Ibu" ? "pink" : "blue"}`}>
                  {item.category}
                </span>
              </article>
            ))}
          </div>

          <a
            href={data.bookUrl}
            target="_blank"
            rel="noreferrer"
            className="book-button"
          >
            <BookOpen size={17} />
            Buka Buku KIA Digital (PDF)
          </a>
        </article>
      </section>
    </MobileShell>
  );
}