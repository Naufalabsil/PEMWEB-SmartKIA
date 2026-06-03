import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { sendWhatsApp } from "../_shared/fonnte.ts";
import { generateOtp, hashOtp } from "../_shared/otp.ts";
import { isValidIndonesianWa, normalizeIndonesianWa } from "../_shared/phone.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method tidak didukung." }, 405);
  }

  try {
    const { nomor_wa } = await req.json();
    const nomorWa = normalizeIndonesianWa(String(nomor_wa ?? ""));

    if (!isValidIndonesianWa(nomorWa)) {
      return jsonResponse({ error: "Nomor WhatsApp tidak valid." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: ibu, error: ibuError } = await supabase
      .from("ibu")
      .select("id,nama_lengkap,nomor_wa")
      .eq("nomor_wa", nomorWa)
      .maybeSingle();

    if (ibuError) {
      throw ibuError;
    }

    if (!ibu) {
      return jsonResponse({ error: "Nomor WhatsApp belum didaftarkan oleh bidan/admin." }, 404);
    }

    const code = generateOtp();
    const kodeHash = await hashOtp(code, nomorWa);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase
      .from("wa_otp")
      .update({ consumed_at: new Date().toISOString() })
      .eq("nomor_wa", nomorWa)
      .is("consumed_at", null);

    const { error: otpError } = await supabase.from("wa_otp").insert({
      ibu_id: ibu.id,
      nomor_wa: nomorWa,
      kode_hash: kodeHash,
      expires_at: expiresAt,
    });

    if (otpError) {
      throw otpError;
    }

    const message = [
      `Halo Bunda ${ibu.nama_lengkap},`,
      `kode OTP SmartKIA Anda adalah ${code}.`,
      "Kode berlaku 5 menit. Jangan bagikan kode ini kepada siapapun.",
    ].join("\n");

    const fonnte = await sendWhatsApp(nomorWa, message);
    if (!fonnte.ok) {
      return jsonResponse({ error: "OTP gagal dikirim via Fonnte.", detail: fonnte.response }, 502);
    }

    return jsonResponse({
      ok: true,
      expires_in: 300,
      debug_code: Deno.env.get("ALLOW_DEBUG_OTP") === "true" ? code : undefined,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Gagal mengirim OTP." }, 500);
  }
});
