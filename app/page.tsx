"use client";

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
  const [debugCode, setDebugCode] = useState<string | undefined>();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const normalizedPhone = useMemo(() => normalizeIndonesianWa(phone), [phone]);
  const otpCode = otp.join("");
  const canSubmitPhone = normalizedPhone.length >= 10;
  const canSubmitOtp = otpCode.length === OTP_LENGTH;

  useEffect(() => {
    if (step !== "otp") {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  async function handleSendOtp() {
    if (!canSubmitPhone) {
      setError("Masukkan nomor WhatsApp yang valid.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await requestOtp(normalizedPhone);
      setDebugCode(result.debugCode);
      setStep("otp");
      setCountdown(300);
      setOtp(Array(OTP_LENGTH).fill(""));
      window.setTimeout(() => inputRefs.current[0]?.focus(), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kode OTP gagal dikirim.");
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
            <p>Kode 6 digit dikirim ke WhatsApp</p>

            <div className="otp-grid" aria-label="Kode OTP">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    inputRefs.current[index] = node;
                  }}
                  aria-label={`Digit OTP ${index + 1}`}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleOtpChange(index, event)}
                  onKeyDown={(event) => handleOtpKey(index, event)}
                />
              ))}
            </div>

            <div className="otp-meta">
              <span>
                Kirim ulang kode dalam <b>{minutes}:{seconds}</b>
              </span>
              <button
                className="ghost-button"
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleSendOtp}
              >
                Kirim ulang OTP
              </button>
              {debugCode ? <span>Kode demo: <b>{debugCode}</b></span> : null}
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
              <span>Jangan bagikan kode OTP kepada siapapun, termasuk petugas Posyandu.</span>
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
            <h1>Posyandu Digital</h1>
            <p>Pantau kesehatan ibu & anak dengan mudah dan terpadu</p>
          </div>
        </div>

        <div className="login-card">
          <h2>Masuk ke Akun Anda</h2>
          <p>Masukkan nomor WhatsApp yang terdaftar</p>

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
              onChange={(event) => setPhone(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSendOtp();
                }
              }}
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
    </MobileShell>
  );
}
