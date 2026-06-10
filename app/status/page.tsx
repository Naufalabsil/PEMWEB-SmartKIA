"use client";

import { Activity, AlertTriangle, CheckCircle2, Info, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { GrowthChart } from "@/components/growth-chart";
import { MobileShell } from "@/components/mobile-shell";
import { DashboardLoadError, loadDashboardData } from "@/lib/dashboard-data";
import { formatLongDate } from "@/lib/date";
import { clearSession, getSession } from "@/lib/session";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ChildProfile, DashboardData, GrowthMode } from "@/lib/types";

type Severity = "normal" | "warning" | "danger" | "muted";

type StatusResult = {
  label: string;
  badge: string;
  severity: Severity;
};

const tabs: Array<{ mode: GrowthMode; label: string; title: string }> = [
  { mode: "bbu", label: "BB/U", title: "Berat Badan per Umur" },
  { mode: "tbu", label: "TB/U", title: "Tinggi Badan per Umur" },
  { mode: "bbpb", label: "BB/PB", title: "Berat Badan per Tinggi" },
];

export default function StatusPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<GrowthMode>("bbu");
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const session = getSession();

    if (!session) {
      clearSession();
      router.replace("/?error=nomor-tidak-terdaftar");
      return;
    }

    let active = true;
    const supabase = createSupabaseBrowserClient(session.accessToken);
    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;

    async function refresh(): Promise<DashboardData | null> {
      try {
        const result = await loadDashboardData(session);
        if (active) {
          setData(result);
          setError(null);
          setSelectedChildIndex((current) =>
            Math.min(current, Math.max(result.children.length - 1, 0)),
          );
        }
        return result;
      } catch (err) {
        if (
          err instanceof DashboardLoadError &&
          (err.code === "NO_PROFILE" || err.code === "NO_SESSION")
        ) {
          clearSession();
          router.replace("/?error=nomor-tidak-terdaftar");
          return null;
        }

        if (active) {
          setError(err instanceof DashboardLoadError ? err.message : "Gagal memuat data status.");
        }
        return null;
      }
    }

    void (async () => {
      const initialData = await refresh();
      if (!supabase || !active || !initialData) return;

      const childIds = initialData.children.map((child) => child.id).filter(Boolean);
      const childFilter = childIds.length ? `anak_id=in.(${childIds.join(",")})` : undefined;
      const statusChannel = supabase
        .channel(`status-anak-${session.ibuId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "anak", filter: `ibu_id=eq.${session.ibuId}` },
          () => {
            void refresh();
          },
        );

      if (childFilter) {
        statusChannel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pertumbuhan_anak", filter: childFilter },
          () => {
            void refresh();
          },
        );
      }

      channel = statusChannel.subscribe();
    })();

    return () => {
      active = false;
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [router]);

  const children = data?.children ?? [];
  const selectedChild = children[selectedChildIndex] ?? data?.child ?? null;
  const currentTab = tabs.find((tab) => tab.mode === mode) ?? tabs[0];
  const chartData = useMemo(() => getChartData(selectedChild, mode), [selectedChild, mode]);

  if (error) {
    return (
      <MobileShell nav>
        <div className="empty-screen">
          <AlertTriangle size={44} color="#e95473" />
          <h1>Tidak dapat memuat status</h1>
          <p>{error}</p>
        </div>
      </MobileShell>
    );
  }

  if (!data) {
    return (
      <MobileShell nav>
        <div className="loading-card">Memuat status gizi...</div>
      </MobileShell>
    );
  }

  if (!selectedChild || selectedChild.id === "") {
    return (
      <MobileShell nav>
        <section className="page with-header">
          <header className="green-header">
            <h1>Status Anak</h1>
          </header>
          <div className="empty-screen" style={{ minHeight: "calc(100dvh - 160px)" }}>
            <Activity size={44} color="#06a66a" />
            <h1>Belum Ada Data Anak</h1>
            <p>Data status gizi akan muncul setelah profil anak dan pemeriksaan pertama tersedia.</p>
          </div>
        </section>
      </MobileShell>
    );
  }

  const bbu = classifyBbu(selectedChild.zscoreBbu);
  const tbu = classifyTbu(selectedChild.zscoreTbu);
  const bbtb = classifyBbtb(selectedChild.zscoreBbtb);
  const imtu = classifyImtu(selectedChild.zscoreImtu);
  const mainStatus = bbtb.severity !== "muted" ? bbtb : bbu;
  const hasGrowthData = chartData.length > 0;
  const hasRisk = [bbu, tbu, bbtb, imtu].some(
    (item) => item.severity === "warning" || item.severity === "danger",
  );
  const gaugePosition = zscoreToGauge(selectedChild.zscoreBbtb ?? selectedChild.zscoreBbu);

  return (
    <MobileShell nav>
      <section className="page with-header status-page">
        <header className="green-header status-header">
          <div>
            <h1>Status Anak</h1>
            <span>Realtime dari data pemeriksaan Posyandu</span>
          </div>
          {children.length > 1 ? (
            <label className="status-child-picker">
              <UserCircle size={15} />
              <select
                value={selectedChildIndex}
                onChange={(event) => {
                  setSelectedChildIndex(Number(event.target.value));
                  setMode("bbu");
                }}
              >
                {children.map((child, index) => (
                  <option key={child.id} value={index}>
                    {child.nama}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </header>

        <div className="status-metrics">
          <MetricCard tone="blue" label="Berat" value={formatNumber(selectedChild.beratBadan)} unit="kg" />
          <MetricCard tone="mint" label="Tinggi" value={formatNumber(selectedChild.tinggiBadan)} unit="cm" />
          <MetricCard tone="yellow" label="Umur" value={selectedChild.usia.replace(" bln", "")} unit="bln" />
        </div>

        <article className="card status-summary">
          <div className="imt-badge">
            <strong>{selectedChild.imt ? formatNumber(selectedChild.imt) : "-"}</strong>
            <span>IMT</span>
          </div>
          <div className="status-summary-body">
            <h2>Status Gizi: {mainStatus.badge}</h2>
            <p>{mainStatus.label}</p>
            <div className="nutrition-gauge" aria-hidden="true">
              <span className="gauge-track" />
              <span className="gauge-thumb" style={{ left: `${gaugePosition}%` }} />
            </div>
            <div className="gauge-labels">
              <span>Kurus</span>
              <span>Normal</span>
              <span>Gemuk</span>
            </div>
          </div>
        </article>

        <div className="status-tabs" aria-label="Jenis grafik status gizi">
          {tabs.map((tab) => (
            <button
              key={tab.mode}
              className={mode === tab.mode ? "active" : ""}
              type="button"
              onClick={() => setMode(tab.mode)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <article className="card section-card">
          <div className="section-header">
            <h2>{currentTab.title}</h2>
          </div>
          {hasGrowthData ? (
            <GrowthChart data={chartData} mode={mode} />
          ) : (
            <div className="status-empty-chart">
              <Info size={32} />
              <p>Belum ada data pertumbuhan untuk grafik ini.</p>
            </div>
          )}
        </article>

        <article className="card status-analysis">
          <div className="section-header">
            <h2>Analisis Status Gizi</h2>
            <span className="live-pill">Live</span>
          </div>
          <AnalysisRow
            title="BB/U (Berat vs Umur)"
            detail={`${formatNumber(selectedChild.beratBadan)} kg - ${formatZscore(selectedChild.zscoreBbu)}`}
            result={bbu}
          />
          <AnalysisRow
            title="TB/U (Tinggi vs Umur)"
            detail={`${formatNumber(selectedChild.tinggiBadan)} cm - ${formatZscore(selectedChild.zscoreTbu)}`}
            result={tbu}
          />
          <AnalysisRow
            title="BB/PB (Berat vs Tinggi)"
            detail={`${bbtb.label} - ${formatZscore(selectedChild.zscoreBbtb)}`}
            result={bbtb}
          />
          <AnalysisRow
            title="IMT/U"
            detail={`${selectedChild.imt ? formatNumber(selectedChild.imt) : "-"} - ${formatZscore(selectedChild.zscoreImtu)}`}
            result={imtu}
          />
          <p className="status-updated">
            Pemeriksaan terakhir:{" "}
            <b>
              {selectedChild.tanggalPemeriksaan
                ? formatLongDate(selectedChild.tanggalPemeriksaan)
                : "belum ada"}
            </b>
          </p>
        </article>

        {hasRisk ? (
          <article className="status-warning">
            <h2>Peringatan Status Gizi</h2>
            <p>
              Ada indikator di luar rentang normal. Sistem akan menampilkan peringatan
              dan data ini sebaiknya ditindaklanjuti bersama tenaga kesehatan.
            </p>
          </article>
        ) : (
          <article className="status-ok-note">
            <CheckCircle2 size={18} />
            <span>Seluruh indikator yang tersedia berada pada rentang normal.</span>
          </article>
        )}
      </section>
    </MobileShell>
  );
}

function MetricCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: "blue" | "mint" | "yellow";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>
        {value} <small>{unit}</small>
      </strong>
    </article>
  );
}

function AnalysisRow({
  title,
  detail,
  result,
}: {
  title: string;
  detail: string;
  result: StatusResult;
}) {
  return (
    <div className="analysis-row">
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <span className={`analysis-badge ${result.severity}`}>{result.badge}</span>
    </div>
  );
}

function getChartData(child: ChildProfile | null, mode: GrowthMode) {
  if (!child) return [];
  if (mode === "bbu") return child.growthBbu;
  if (mode === "tbu") return child.growthTbu;
  return child.growthBbpb;
}

function classifyBbu(zscore: number | null): StatusResult {
  if (zscore === null) return unknownStatus();
  if (zscore < -3) return { label: "Berat badan sangat kurang", badge: "Sangat kurang", severity: "danger" };
  if (zscore < -2) return { label: "Berat badan kurang", badge: "Kurang", severity: "warning" };
  if (zscore <= 1) return { label: "Berat sesuai umur", badge: "Normal", severity: "normal" };
  if (zscore <= 2) return { label: "Risiko berat badan lebih", badge: "Risiko", severity: "warning" };
  return { label: "Berat badan lebih", badge: "Lebih", severity: "danger" };
}

function classifyTbu(zscore: number | null): StatusResult {
  if (zscore === null) return unknownStatus();
  if (zscore < -3) return { label: "Sangat pendek menurut umur", badge: "Sangat pendek", severity: "danger" };
  if (zscore < -2) return { label: "Pendek menurut umur", badge: "Pendek", severity: "warning" };
  if (zscore <= 3) return { label: "Tinggi sesuai umur", badge: "Normal", severity: "normal" };
  return { label: "Tinggi di atas rentang umur", badge: "Tinggi", severity: "warning" };
}

function classifyBbtb(zscore: number | null): StatusResult {
  if (zscore === null) return unknownStatus();
  if (zscore < -3) return { label: "Gizi buruk atau sangat kurus", badge: "Gizi buruk", severity: "danger" };
  if (zscore < -2) return { label: "Gizi kurang atau wasting", badge: "Wasting", severity: "warning" };
  if (zscore <= 1) return { label: "BB/PB sesuai standar WHO", badge: "Normal", severity: "normal" };
  if (zscore <= 2) return { label: "Risiko gizi lebih", badge: "Risiko", severity: "warning" };
  if (zscore <= 3) return { label: "Gizi lebih", badge: "Gizi lebih", severity: "warning" };
  return { label: "Obesitas", badge: "Obesitas", severity: "danger" };
}

function classifyImtu(zscore: number | null): StatusResult {
  if (zscore === null) return unknownStatus();
  if (zscore < -3) return { label: "IMT sangat rendah menurut umur", badge: "Sangat rendah", severity: "danger" };
  if (zscore < -2) return { label: "IMT rendah menurut umur", badge: "Rendah", severity: "warning" };
  if (zscore <= 1) return { label: "IMT dalam rentang normal", badge: "Normal", severity: "normal" };
  if (zscore <= 2) return { label: "Risiko IMT berlebih", badge: "Risiko", severity: "warning" };
  if (zscore <= 3) return { label: "IMT berlebih", badge: "Berlebih", severity: "warning" };
  return { label: "IMT sangat berlebih", badge: "Obesitas", severity: "danger" };
}

function unknownStatus(): StatusResult {
  return { label: "Menunggu perhitungan z-score dari Supabase", badge: "Belum ada", severity: "muted" };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatZscore(value: number | null): string {
  return value === null ? "z-score belum tersedia" : `z-score ${value.toFixed(2)}`;
}

function zscoreToGauge(value: number | null): number {
  if (value === null) return 50;
  const clamped = Math.min(Math.max(value, -3), 3);
  return ((clamped + 3) / 6) * 100;
}
