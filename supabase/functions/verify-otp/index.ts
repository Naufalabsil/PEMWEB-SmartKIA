import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hashOtp, signJwt } from "../_shared/otp.ts";
import { isValidIndonesianWa, normalizeIndonesianWa } from "../_shared/phone.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method tidak didukung." }, 405);
  }

  try {
    const { nomor_wa, kode } = await req.json();
    const nomorWa = normalizeIndonesianWa(String(nomor_wa ?? ""));
    const otpCode = String(kode ?? "").replace(/\D/g, "");

    if (!isValidIndonesianWa(nomorWa) || otpCode.length !== 6) {
      return jsonResponse({ error: "Nomor WhatsApp atau kode OTP tidak valid." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: otp, error: otpError } = await supabase
      .from("wa_otp")
      .select("id,ibu_id,kode_hash,attempts,expires_at")
      .eq("nomor_wa", nomorWa)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      throw otpError;
    }

    if (!otp) {
      return jsonResponse({ error: "Kode OTP sudah kedaluwarsa atau belum diminta." }, 401);
    }

    if (otp.attempts >= 5) {
      return jsonResponse({ error: "Percobaan OTP terlalu banyak. Kirim ulang kode." }, 429);
    }

    const kodeHash = await hashOtp(otpCode, nomorWa);
    if (kodeHash !== otp.kode_hash) {
      await supabase.from("wa_otp").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return jsonResponse({ error: "Kode OTP tidak sesuai." }, 401);
    }

    const { data: ibu, error: ibuError } = await supabase
      .from("ibu")
      .select("id,nama_lengkap,nomor_wa")
      .eq("id", otp.ibu_id)
      .single();

    if (ibuError) {
      throw ibuError;
    }

    await supabase.from("wa_otp").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7 * 24 * 60 * 60;
    const accessToken = await signJwt({
      aud: "authenticated",
      exp: expiresAt,
      iat: now,
      iss: "supabase",
      sub: ibu.id,
      role: "authenticated",
      aal: "aal1",
      session_id: crypto.randomUUID(),
      phone: ibu.nomor_wa,
      app_metadata: {
        provider: "wa_otp",
        providers: ["wa_otp"],
      },
      user_metadata: {
        nama_lengkap: ibu.nama_lengkap,
        nomor_wa: ibu.nomor_wa,
      },
    });

    return jsonResponse({
      access_token: accessToken,
      token_type: "bearer",
      expires_at: expiresAt,
      ibu_id: ibu.id,
      profile_name: ibu.nama_lengkap,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Gagal verifikasi OTP." }, 500);
  }
});
