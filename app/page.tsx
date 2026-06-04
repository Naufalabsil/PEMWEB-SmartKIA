"use client";
import { getSession } from "@/lib/session";


import { AlertTriangle, HeartPulse, Send, ShieldCheck, Smartphone, TimerReset } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import { requestOtp, verifyOtp } from "@/lib/auth-client";
import { normalizeIndonesianWa } from "@/lib/phone";
import { MobileShell } from "@/components/mobile-shell";

const OTP_LENGTH = 6;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const normalizedPhone = useMemo(() => normalizeIndonesianWa(phone), [phone]);
  const otpCode = otp.join("");
  const canSubmitPhone = normalizedPhone.length >= 10;
  const canSubmitOtp = otpCode.length === OTP_LENGTH;
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (step !== "otp") return;
    const timer = window.setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step]);

    useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    if (
      params.get("error") ===
      "nomor-tidak-terdaftar"
    ) {
      setShowModal(true);

      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, []);

  async function handleSendOtp() {
    if (!canSubmitPhone) {
      setError("Masukkan nomor WhatsApp yang valid.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestOtp(normalizedPhone);
      setStep("otp");
      setCountdown(300);
      setOtp(Array(OTP_LENGTH).fill(""));
      window.setTimeout(() => inputRefs.current[0]?.focus(), 80);
      } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Kode OTP gagal dikirim.";

      if (
        message.includes("belum terdaftar") ||
        message.includes("tidak terdaftar")
      ) {
        setShowModal(true);
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }
  

  async function handleVerifyOtp() {
    if (!canSubmitOtp) {
      setError("Lengkapi 6 digit kode OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyOtp(normalizedPhone, otpCode);
      router.push("/beranda");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kode OTP tidak valid.");
    } finally {
      setLoading(false);
    }
    
  }

  function handleOtpChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKey(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  if (step === "otp") {
    const minutes = String(Math.floor(countdown / 60)).padStart(2, "0");
    const seconds = String(countdown % 60).padStart(2, "0");

    return (
      <MobileShell>
        <section className="otp-screen">
          <div className="otp-logo" />
          <div className="otp-panel">
            <h2>Masukkan Kode OTP</h2>
            <p>
              Kode 6 digit dikirim ke WhatsApp{" "}
              <strong>+{normalizedPhone}</strong>
            </p>

            <div className="otp-grid" aria-label="Kode OTP">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => { inputRefs.current[index] = node; }}
                  aria-label={`Digit OTP ${index + 1}`}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e)}
                  onKeyDown={(e) => handleOtpKey(index, e)}
                />
              ))}
            </div>

            <div className="otp-meta">
              <span>
                Kirim ulang dalam <b>{minutes}:{seconds}</b>
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleSendOtp}
              >
                Kirim ulang OTP
              </button>
            </div>

            <button
              className="primary-button"
              type="button"
              disabled={!canSubmitOtp || loading || countdown === 0}
              onClick={handleVerifyOtp}
            >
              <ShieldCheck size={20} />
              {loading ? "Memverifikasi..." : "Verifikasi & Masuk"}
            </button>

            <div className="warning-note">
              <AlertTriangle size={16} />
              <span>Jangan bagikan kode OTP kepada siapapun</span>
            </div>

            {error ? <div className="error-note">{error}</div> : null}
          </div>
        </section>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <section className="login-screen">
        <div className="brand-lockup">
          <div className="brand-mark">
            <HeartPulse size={38} strokeWidth={1.9} />
          </div>
          <div>
            <h1>SmartKIA</h1>
            <p>Pantau kesehatan ibu &amp; anak dengan mudah dan terpadu</p>
          </div>
        </div>

        <div className="login-card">
          <h2>Masuk ke Akun Anda</h2>
          <p>Masukkan nomor WhatsApp yang terdaftar di Posyandu</p>

          <label className="input-label" htmlFor="nomor-wa">
            Nomor WhatsApp
          </label>
          <div className="phone-input">
            <div className="country-code" aria-hidden="true">
              <span>ID</span>
              +62
            </div>
            <input
              id="nomor-wa"
              inputMode="tel"
              placeholder="812-3456-7890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSendOtp(); }}
            />
          </div>
          <div className="helper-text">Kode OTP akan dikirim via WhatsApp</div>

          <button
            className="primary-button"
            type="button"
            disabled={!canSubmitPhone || loading}
            onClick={handleSendOtp}
          >
            {loading ? <TimerReset size={20} /> : <Send size={20} />}
            {loading ? "Mengirim OTP..." : "Kirim Kode OTP"}
          </button>

          {error ? (
            <div className="error-note">
              <Smartphone size={16} /> {error}
            </div>
          ) : null}
        </div>
      </section>
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-icon">
              <AlertTriangle size={34} />
            </div>

            <h3 className="modal-title">
              Nomor Tidak Terdaftar
            </h3>

            <p className="modal-description">
              Maaf, nomor WhatsApp Anda belum
              terdaftar dalam sistem.
              Silakan menghubungi bidan untuk
              proses pendaftaran akun.
            </p>

            <div className="modal-actions">
              <button
                className="modal-button"
                onClick={() => setShowModal(false)}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
    )}
    </MobileShell>
  );
}
console.log("SESSION:", getSession());