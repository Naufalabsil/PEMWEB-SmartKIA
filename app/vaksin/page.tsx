"use client";

import { AlertTriangle, Bell, Check, CheckCircle2, ChevronDown, Clock3, Syringe, TriangleAlert, UserCircle } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";

import { MobileShell } from "@/components/mobile-shell";
import { daysBetween, formatLongDate, kbTypeLabel, parseISODate, relativeDayLabel } from "@/lib/date";
import { loadDashboardData, DashboardLoadError } from "@/lib/dashboard-data";
import { displayWa } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { ChildProfile, DashboardData, KbRecord } from "@/lib/types";
import VaccinationProgress from "@/components/progres-vaksin/progressbar";
import NextVaccineCard from "@/components/progres-vaksin/nextVaccineCard";
import { formatDate } from "@/utils/formatdate";
import VaccineList from "@/components/progres-vaksin/VaccineList";

export default function KbPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData(getSession())
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof DashboardLoadError ? err.message : "Gagal memuat data.",
        );
      });

    console.log(data?.nextVaccine?.h3);
  }, []);

  const sortedRecords = useMemo(
    () =>
      [...(data?.allVaccines ?? [])].sort(
        (a, b) =>
          new Date(a.tanggalDiberikan ?? 0).getTime() - new Date(b.tanggalDiberikan ?? 0).getTime(),
      ),
    [data?.allVaccines],
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
        <div className="loading-card">Memuat data vaksinasi...</div>
      </MobileShell>
    );
  }


  const children: ChildProfile[] = data.children ?? [data.child];
  const selectedChild = children[selectedChildIndex];
  const hasMultipleChildren = children.length > 1;
  const nextVaccine = selectedChild.nextVaccine;
  const allVaccines = selectedChild.allVaccines;


  if (!nextVaccine && sortedRecords.length === 0) {
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

  const diff = nextVaccine ? daysBetween(new Date(), parseISODate(nextVaccine.jadwalIdeal)) : 0;
  const overdue = nextVaccine ? diff < 0 : false;

  const totalVaccine = selectedChild.allVaccines.length;

  return (
    <MobileShell nav>
      <section className="page with-header">
        <header className="green-header">
          <h1>Vaksinasi Anak</h1>
          {hasMultipleChildren && (
            <div className="child-selector" ref={dropdownRef}>
              <button
                type="button"
                className="child-selector-trigger"
                onClick={() => setDropdownOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
              >
                <UserCircle size={15} />
                <span>Anak ke-{selectedChildIndex + 1}</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: dropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform .2s",
                  }}
                />
              </button>

              {dropdownOpen && (
                <ul className="child-dropdown" role="listbox">
                  {children.map((child: ChildProfile, idx: number) => (
                    <li
                      key={idx}
                      role="option"
                      aria-selected={idx === selectedChildIndex}
                      className={`child-option ${idx === selectedChildIndex ? "active" : ""}`}
                      onClick={() => {
                        setSelectedChildIndex(idx);
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="child-avatar">
                        {child.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="child-option-info">
                        <span className="child-option-name">{child.nama}</span>
                        <span className="child-option-age">
                          {child.usia}
                          {child.beratBadan > 0 ? ` · ${child.beratBadan} kg` : ""}
                        </span>
                      </div>
                      {idx === selectedChildIndex && <CheckCircle2 size={15} className="check-active" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </header>

        <VaccinationProgress
          completed={totalVaccine}
          total={21}
        />

        <NextVaccineCard
          vaccineName={nextVaccine?.namaVaksin}
          scheduleDate={formatDate(nextVaccine?.jadwalIdeal)}
          remainingDays={diff}
          h3={nextVaccine?.h3}
          h1={nextVaccine?.h1}
        />

        <VaccineList
          vaccines={allVaccines.map((v, index) => ({
            id: index,
            nama: v.namaVaksin,
            usia: `${v.urutan} bulan`,
            selesaiPada: v.tanggalDiberikan,
            jadwalIdeal: formatDate(v.jadwalIdeal),
          }))}
        />
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
