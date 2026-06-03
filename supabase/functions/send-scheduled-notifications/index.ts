import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { sendWhatsApp } from "../_shared/fonnte.ts";

type ReminderKind = "kb_h3" | "kb_h1" | "vaksin_h3" | "vaksin_h1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method tidak didukung." }, 405);
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const allowed = [Deno.env.get("CRON_SECRET"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")].filter(Boolean);

  if (!token || !allowed.includes(token)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const summary = {
    kb_h3: 0,
    kb_h1: 0,
    vaksin_h3: 0,
    vaksin_h1: 0,
    failed: 0,
  };

  try {
    await processKbReminders(supabase, 3, "notif_h3_sent", "kb_h3", summary);
    await processKbReminders(supabase, 1, "notif_h1_sent", "kb_h1", summary);
    await processVaccineReminders(supabase, 3, "notif_h3_sent", "vaksin_h3", summary);
    await processVaccineReminders(supabase, 1, "notif_h1_sent", "vaksin_h1", summary);

    return jsonResponse({ ok: true, date_wib: dateInJakarta(0), summary });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Reminder gagal diproses.", summary }, 500);
  }
});

async function processKbReminders(
  supabase: ReturnType<typeof createClient>,
  daysAhead: number,
  flagColumn: "notif_h3_sent" | "notif_h1_sent",
  kind: ReminderKind,
  summary: Record<string, number>,
) {
  const targetDate = dateInJakarta(daysAhead);
  const { data, error } = await supabase
    .from("suntik_kb")
    .select("id,jenis_kb,tanggal_berikutnya,ibu:ibu_id(id,nama_lengkap,nomor_wa)")
    .eq("tanggal_berikutnya", targetDate)
    .eq(flagColumn, false);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const ibu = asObject(row.ibu);
    const nomorWa = String(ibu?.nomor_wa ?? "");
    const nama = String(ibu?.nama_lengkap ?? "Bunda");
    const label = row.jenis_kb === "1_bulan" ? "Suntik KB 1 Bulan" : "Suntik KB 3 Bulan";
    const message = [
      `Halo ${nama},`,
      `pengingat ${label} dijadwalkan pada ${formatIndonesianDate(row.tanggal_berikutnya)}.`,
      "Silakan datang sesuai jadwal atau hubungi bidan/admin bila perlu ubah jadwal.",
    ].join("\n");

    const sent = await sendAndLog(supabase, nomorWa, kind, row.id, message);
    if (sent) {
      await supabase.from("suntik_kb").update({ [flagColumn]: true }).eq("id", row.id);
      summary[kind] += 1;
    } else {
      summary.failed += 1;
    }
  }
}

async function processVaccineReminders(
  supabase: ReturnType<typeof createClient>,
  daysAhead: number,
  flagColumn: "notif_h3_sent" | "notif_h1_sent",
  kind: ReminderKind,
  summary: Record<string, number>,
) {
  const targetDate = dateInJakarta(daysAhead);
  const { data, error } = await supabase
    .from("vaksinasi_anak")
    .select("id,nama_vaksin,urutan,jadwal_ideal,anak:anak_id(id,nama_anak,ibu:ibu_id(id,nama_lengkap,nomor_wa))")
    .eq("jadwal_ideal", targetDate)
    .eq(flagColumn, false)
    .is("tanggal_diberikan", null);

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    const anak = asObject(row.anak);
    const ibu = asObject(anak?.ibu);
    const nomorWa = String(ibu?.nomor_wa ?? "");
    const nama = String(ibu?.nama_lengkap ?? "Bunda");
    const namaAnak = String(anak?.nama_anak ?? "anak");
    const message = [
      `Halo ${nama},`,
      `jadwal vaksin ${row.nama_vaksin} dosis ${row.urutan} untuk ${namaAnak} adalah ${formatIndonesianDate(row.jadwal_ideal)}.`,
      "Silakan datang ke posyandu/fasyankes sesuai jadwal.",
    ].join("\n");

    const sent = await sendAndLog(supabase, nomorWa, kind, row.id, message);
    if (sent) {
      await supabase.from("vaksinasi_anak").update({ [flagColumn]: true }).eq("id", row.id);
      summary[kind] += 1;
    } else {
      summary.failed += 1;
    }
  }
}

async function sendAndLog(
  supabase: ReturnType<typeof createClient>,
  nomorWa: string,
  jenis: ReminderKind,
  referensiId: string,
  message: string,
) {
  try {
    const result = await sendWhatsApp(nomorWa, message);
    await supabase.from("notif_log").insert({
      nomor_wa: nomorWa,
      jenis,
      referensi_id: referensiId,
      status: result.ok ? "sent" : "failed",
      message,
      response: { status: result.status, body: result.response },
    });

    return result.ok;
  } catch (error) {
    await supabase.from("notif_log").insert({
      nomor_wa: nomorWa,
      jenis,
      referensi_id: referensiId,
      status: "failed",
      message,
      response: { error: error instanceof Error ? error.message : String(error) },
    });

    return false;
  }
}

function dateInJakarta(daysAhead: number): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(new Date()).split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + daysAhead));
  return utc.toISOString().slice(0, 10);
}

function formatIndonesianDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return (value[0] as Record<string, unknown> | undefined) ?? null;
  }

  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return null;
}
