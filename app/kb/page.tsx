"use client";

import { Bell, Check, Clock3, Syringe, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { daysBetween, formatLongDate, kbTypeLabel, relativeDayLabel } from "@/lib/date";
import { loadDashboardData } from "@/lib/dashboard-data";
import { displayWa } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { DashboardData, KbRecord } from "@/lib/types";

export default function KbPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    void loadDashboardData(getSession()).then(setData);
  }, []);

  const nextKb = data?.nextKb;
  const sortedRecords = useMemo(
    () =>
      [...(data?.kbRecords ?? [])].sort(
        (a, b) => new Date(a.tanggalSuntik).getTime() - new Date(b.tanggalSuntik).getTime(),
      ),
    [data?.kbRecords],
  );

  if (!data || !nextKb) {
    return (
      <MobileShell nav>
        <div className="loading-card">Memuat jadwal KB...</div>
      </MobileShell>
    );
  }

  const diff = daysBetween(new Date(), new Date(nextKb.tanggalSuntik));
  const overdue = diff < 0;

  return (
    <MobileShell nav>
      <section className="page with-header">
        <header className="green-header">
          <h1>KB Suntik</h1>
        </header>

        <article className="kb-hero">
          <span>{overdue ? "Suntik KB Terlewat" : "Suntik KB Berikutnya"}</span>
          <h2>{formatLongDate(nextKb.tanggalSuntik)}</h2>
          <p>{kbTypeLabel(nextKb.jenisKb)} {nextKb.jenisKb === "3_bulan" ? "(Depo Provera)" : ""}</p>
          <span className="mini-badge">
            {overdue ? <TriangleAlert size={13} /> : <Clock3 size={13} />}
            {relativeDayLabel(nextKb.tanggalSuntik)}
          </span>
        </article>

        <article className="notification-card">
          <h3>
            <Bell size={17} />
            Notifikasi WhatsApp Aktif
          </h3>
          <p>Pengingat otomatis dikirim ke {displayWa(data.mother.nomorWa)} pada:</p>
          <div className="pill-row">
            <span className="soft-pill">H-3 - 08:00 WIB</span>
            <span className="soft-pill">H-1 - 08:00 WIB</span>
          </div>
        </article>

        <section className="timeline-section">
          <h2>Riwayat & Jadwal KB</h2>
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
    <article className={`timeline-item${isNext ? " next" : ""}${isOverdue ? " overdue" : ""}`}>
      <div className="timeline-topline">
        <h3>{formatLongDate(record.tanggalSuntik)}</h3>
        <span className={`timeline-status${isNext ? " next" : ""}${isOverdue ? " overdue" : ""}`}>
          {isOverdue ? <TriangleAlert size={14} /> : isNext ? <Syringe size={14} /> : <Check size={14} />}
          {isOverdue ? "Terlambat" : isNext ? "Berikutnya" : "Selesai"}
        </span>
      </div>
      <p>{kbTypeLabel(record.jenisKb)}</p>
      <p>{record.catatan}</p>
      <p>Jadwal berikutnya: {formatLongDate(record.tanggalBerikutnya)}</p>
    </article>
  );
}
