"use client";

import { AlertTriangle, Bell, Check, Clock3, Syringe, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { daysBetween, formatLongDate, kbTypeLabel, parseISODate, relativeDayLabel } from "@/lib/date";
import { loadDashboardData, DashboardLoadError } from "@/lib/dashboard-data";
import { displayWa } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { DashboardData, KbRecord } from "@/lib/types";

export default function KbPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData(getSession())
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof DashboardLoadError ? err.message : "Gagal memuat data.",
        );
      });
  }, []);

  const sortedRecords = useMemo(
    () =>
      [...(data?.kbRecords ?? [])].sort(
        (a, b) =>
          new Date(a.tanggalSuntik).getTime() - new Date(b.tanggalSuntik).getTime(),
      ),
    [data?.kbRecords],
  );

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
        <div className="loading-card">Memuat jadwal KB...</div>
      </MobileShell>
    );
  }

  const nextKb = data.nextKb;

  if (!nextKb && sortedRecords.length === 0) {
    return (
      <MobileShell nav>
        <section className="page with-header">
          <header className="green-header">
            <h1>Suntik Vaksin</h1>
          </header>
          <div className="empty-screen" style={{ minHeight: "calc(100dvh - 160px)" }}>
            <Syringe size={44} color="#06a66a" />
            <h1>Belum Ada Catatan Vaksin</h1>
            <p>
              Data suntik Vaksin belum tersedia. Hubungi bidan
              untuk mendaftarkan jadwal Vaksin Anda.
            </p>
          </div>
        </section>
      </MobileShell>
    );
  }

  const diff = nextKb ? daysBetween(new Date(), parseISODate(nextKb.tanggalBerikutnya)) : 0;
  const overdue = nextKb ? diff < 0 : false;

  return (
    <MobileShell nav>
      <section className="page with-header">
        <header className="green-header">
          <h1>KB Suntik</h1>
        </header>

        {nextKb ? (
          <article className="kb-hero">
            <span>{overdue ? "Suntik KB Terlewat" : "Suntik KB Berikutnya"}</span>
            <h2>{formatLongDate(nextKb.tanggalBerikutnya)}</h2>
            <p>
              {kbTypeLabel(nextKb.jenisKb)}{" "}
              {nextKb.jenisKb === "3_bulan" ? "(Depo Provera)" : ""}
              {" "} - Terakhir suntik {formatLongDate(nextKb.tanggalSuntik)}
            </p>
            <span className="mini-badge">
              {overdue ? <TriangleAlert size={13} /> : <Clock3 size={13} />}
              {relativeDayLabel(nextKb.tanggalBerikutnya)}
            </span>
          </article>
        ) : null}

        <article className="notification-card">
          <h3>
            <Bell size={17} />
            Notifikasi Pengingat WhatsApp
          </h3>
          <p>
            Pengingat otomatis dikirim ke{" "}
            <strong>{displayWa(data.mother.nomorWa)}</strong> pada:
          </p>
          <div className="pill-row">
            <span className="soft-pill">H-3 · 08:00 WIB</span>
            <span className="soft-pill">H-1 · 08:00 WIB</span>
          </div>
        </article>

        <section className="timeline-section">
          <h2>Riwayat &amp; Jadwal KB</h2>
          <div className="timeline">
            {sortedRecords.map((record) => (
              <TimelineItem key={record.id} record={record} />
            ))}
          </div>
        </section>
      </section>
    </MobileShell>
  );
}

function TimelineItem({ record }: { record: KbRecord }) {
  const isNext = record.status === "next";
  const isOverdue = record.status === "overdue";

  return (
    <article
      className={`timeline-item${isNext ? " next" : ""}${isOverdue ? " overdue" : ""}`}
    >
      <div className="timeline-topline">
        <h3>{formatLongDate(record.tanggalSuntik)}</h3>
        <span
          className={`timeline-status${isNext ? " next" : ""}${isOverdue ? " overdue" : ""}`}
        >
          {isOverdue ? (
            <TriangleAlert size={14} />
          ) : isNext ? (
            <Syringe size={14} />
          ) : (
            <Check size={14} />
          )}
          {isOverdue ? "Terlambat" : isNext ? "Berikutnya" : "Selesai"}
        </span>
      </div>
      <p>{kbTypeLabel(record.jenisKb)}</p>
      {record.catatan !== "-" && <p>{record.catatan}</p>}
      <p>Jadwal berikutnya: {formatLongDate(record.tanggalBerikutnya)}</p>
    </article>
  );
}
