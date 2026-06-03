"use client";

import { normalizeIndonesianWa } from "@/lib/phone";
import { saveSession } from "@/lib/session";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase-browser";
import type { SmartKiaSession } from "@/lib/types";

export async function requestOtp(nomorWa: string): Promise<{ debugCode?: string }> {
  const normalized = normalizeIndonesianWa(nomorWa);

  if (!hasSupabaseConfig()) {
    return { debugCode: "123456" };
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase!.functions.invoke("send-otp", {
    body: { nomor_wa: normalized },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return { debugCode: data?.debug_code };
}

export async function verifyOtp(nomorWa: string, kode: string): Promise<SmartKiaSession> {
  const normalized = normalizeIndonesianWa(nomorWa);

  if (!hasSupabaseConfig()) {
    const session: SmartKiaSession = {
      accessToken: "demo-token",
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      ibuId: "demo-ibu",
      profileName: "Sari Dewi",
      nomorWa: normalized,
    };

    if (kode !== "123456") {
      throw new Error("Kode demo adalah 123456.");
    }

    saveSession(session);
    return session;
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase!.functions.invoke("verify-otp", {
    body: { nomor_wa: normalized, kode },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const session: SmartKiaSession = {
    accessToken: data.access_token,
    expiresAt: data.expires_at,
    ibuId: data.ibu_id,
    profileName: data.profile_name,
    nomorWa: normalized,
  };

  saveSession(session);
  return session;
}
