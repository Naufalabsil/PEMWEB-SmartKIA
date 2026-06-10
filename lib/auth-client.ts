"use client";

import { normalizeIndonesianWa } from "@/lib/phone";
import { saveSession } from "@/lib/session";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { SmartKiaSession } from "@/lib/types";

export async function requestOtp(nomorWa: string): Promise<void> {
  const normalized = normalizeIndonesianWa(nomorWa);
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Konfigurasi Supabase tidak ditemukan. Hubungi administrator.");
  }

  const { data, error } = await supabase.functions.invoke("send-otp", {
    body: { nomor_wa: normalized },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

export async function verifyOtp(
  nomorWa: string,
  kode: string,
): Promise<SmartKiaSession> {
  const normalized = normalizeIndonesianWa(nomorWa);
  const supabase = createSupabaseBrowserClient();
  console.log(supabase);

  if (!supabase) {
    throw new Error("Konfigurasi Supabase tidak ditemukan. Hubungi administrator.");
  }

  const { data, error } = await supabase.functions.invoke("verify-otp", {
    body: { nomor_wa: normalized, kode },
  });
  console.log("VERIFY RESPONSE:", data);
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  const session: SmartKiaSession = {
    accessToken: data.access_token,
    expiresAt: data.expires_at,
    ibuId: data.ibu_id,
    profileName: data.profile_name,
    nomorWa: normalized,
  };

  saveSession(session);
  console.log("SETELAH SAVE");
  console.log(localStorage.getItem("smartkia_session"));
  return session;
}