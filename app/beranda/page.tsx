"use client";

import { AlertTriangle, ArrowRight, Baby, BookOpen, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { GrowthChart } from "@/components/growth-chart";
import { MobileShell } from "@/components/mobile-shell";
import { formatLongDate, formatWeekdayDate, kbTypeLabel, relativeDayLabel } from "@/lib/date";
import { loadDashboardData } from "@/lib/dashboard-data";
import { getSession } from "@/lib/session";
import type { DashboardData, GrowthMode } from "@/lib/types";

export default function BerandaPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [mode, setMode] = useState<GrowthMode>("bbu");

  useEffect(() => {
    void loadDashboardData(getSession()).then(setData);
  }, []);

  if (!data) {
    return (
      <MobileShell nav>
        <div className="loading-card">Memuat data KIA...</div>
      </MobileShell>
    );
  }

  const chartData = mode === "bbu" ? data.growthBbu : data.growthBbpb;

  return (
    <MobileShell nav>
      <section className="page">
        <div className="top-row">
          <div>
            <div className="date-label">{formatWeekdayDate(new Date())}</div>
            <h1 className="greeting">Halo, Bunda {data.mother.nama.split(" ")[0]}</h1>
          </div>
          <div className="avatar-glow" />
        </div>

        <article className="card summary-card">
          <div className="summary-grid">
            <div className="profile-mini">
              <div className="swatch pink" />
              <div>
                <span className="eyebrow">Ibu</span>
                <strong>{data.mother.nama}</strong>
                <span>
                  {data.mother.usia} - {data.mother.beratBadan} kg - {data.mother.tinggiBadan} cm
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
                  {data.child.usia} - {data.child.beratBadan} kg - {data.child.tinggiBadan} cm
                </span>
              </div>
            </div>
          </div>
          <div className="summary-footer">
            <span>
              Periksa terakhir: <b>{formatLongDate(data.child.tanggalPemeriksaan)}</b>
            </span>
            <span className="status-pill">
              <CheckCircle2 size={14} />
              Aktif
            </span>
          </div>
        </article>

        <article className="card section-card">
          <div className="section-header">
            <h2>Grafik Pertumbuhan</h2>
            <div className="segmented" aria-label="Jenis grafik">
              <button className={mode === "bbu" ? "active" : ""} type="button" onClick={() => setMode("bbu")}>
                BB/U
              </button>
              <button className={mode === "bbpb" ? "active" : ""} type="button" onClick={() => setMode("bbpb")}>
                BB/PB
              </button>
            </div>
          </div>
          <GrowthChart data={chartData} mode={mode} />
          <div className="growth-status">
            <CheckCircle2 size={17} />
            {data.child.statusGizi}
          </div>
        </article>

        <div className="alert-grid">
          <Link className="alert-card kb card" href="/kb">
            <h3>Suntik KB</h3>
            <strong>{relativeDayLabel(data.nextKb.tanggalSuntik)}</strong>
            <span>{formatLongDate(data.nextKb.tanggalSuntik)}</span>
            <span className="mini-badge">
              <AlertTriangle size={13} />
              {data.nextKb.status === "overdue" ? "TERLAMBAT" : "SEGERA"}
            </span>
          </Link>

          <article className="alert-card vaccine card">
            <h3>Vaksinasi</h3>
            <strong>{data.nextVaccine.namaVaksin}</strong>
            <span>{formatLongDate(data.nextVaccine.jadwalIdeal)}</span>
            <span className="mini-badge">{relativeDayLabel(data.nextVaccine.jadwalIdeal)}</span>
          </article>
        </div>

        <article className="card section-card">
          <div className="section-header">
            <h2>Edukasi Kesehatan KIA</h2>
            <a href={data.bookUrl} target="_blank" rel="noreferrer" className="ghost-button">
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
                <span className={`tag ${item.category === "Ibu" ? "pink" : "blue"}`}>{item.category}</span>
              </article>
            ))}
          </div>

          <a href={data.bookUrl} target="_blank" rel="noreferrer" className="book-button">
            <BookOpen size={17} />
            Buka Buku KIA Digital (PDF)
          </a>
        </article>
      </section>
    </MobileShell>
  );
}
