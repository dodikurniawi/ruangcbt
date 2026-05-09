"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";
import { validateExamPin } from "@/lib/api";

export default function PinVerification() {
  const router = useTenantRouter();
  const tenantPath = useTenantPath();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (value: string, index: number) => {
    if (/[^0-9]/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value !== "" && index < 3) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && pin[index] === "" && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleSubmit = async () => {
    const pinString = pin.join("");
    if (pinString.length < 4) return;
    setIsLoading(true);
    setError(false);
    try {
      const res = await validateExamPin(pinString);
      if (res.success) {
        sessionStorage.setItem("pin_verified", "true");
        router.push("/exam");
      } else {
        setError(true);
        setPin(["", "", "", ""]);
        setTimeout(() => {
          setError(false);
          document.getElementById("pin-0")?.focus();
        }, 3000);
      }
    } catch {
      setError(true);
      setTimeout(() => setError(false), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-student min-h-screen flex flex-col items-center justify-center p-lg pattern-bg relative overflow-hidden">
      <header className="fixed top-0 left-0 w-full flex justify-between items-center px-lg py-sm bg-white dark:bg-surface border-b border-outline-variant shadow-sm z-50">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-[28px]">school</span>
          <span className="font-headline-student text-headline-student font-extrabold text-primary">CBT Sekolah</span>
        </div>
        <div className="flex items-center gap-md">
          <span className="font-label-bold text-label-bold text-on-surface-variant">Portal Ujian</span>
          <span className="material-symbols-outlined text-on-surface-variant">person</span>
        </div>
      </header>

      <main className="w-full max-w-[440px] bg-white dark:bg-surface/90 border border-outline-variant/30 shadow-2xl rounded-3xl p-xl flex flex-col items-center text-center relative z-10 transition-all hover:shadow-3xl mt-16">
        <div className="mb-lg relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
          <div className="w-14 h-14 bg-primary-container rounded-full flex items-center justify-center relative z-10 shadow-sm">
            <span className="material-symbols-outlined text-on-primary-container text-[28px]">lock</span>
          </div>
        </div>

        <div className="space-y-sm mb-lg">
          <h1 className="font-headline-student text-headline-student font-extrabold text-on-surface">Verifikasi PIN</h1>
          <p className="font-body-student text-[15px] leading-relaxed text-on-surface-variant px-sm max-w-[320px] mx-auto">
            Masukkan PIN ujian yang diberikan oleh pengawas untuk memulai.
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="w-full space-y-lg">
          <div className="flex justify-center gap-sm">
            {pin.map((char, index) => (
              <input
                key={index}
                id={`pin-${index}`}
                className={`w-14 h-18 text-center text-display-exam font-display-exam bg-surface border-2 rounded-2xl focus:border-primary focus:bg-white dark:focus:bg-surface-container-lowest focus:ring-4 focus:ring-primary/15 outline-none transition-all text-on-surface font-bold shadow-sm ${
                  error ? "border-error focus:border-error focus:ring-error/15" : "border-outline-variant"
                }`}
                maxLength={1}
                placeholder="0"
                type="text"
                inputMode="numeric"
                value={char}
                onChange={(e) => handleInputChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              />
            ))}
          </div>

          <button
            className="w-full h-14 bg-primary text-on-primary font-label-bold text-label-bold rounded-xl shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25 hover:bg-primary/95 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            type="submit"
            disabled={isLoading || pin.join("").length < 4}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Memverifikasi...
              </>
            ) : (
              <>
                Masuk Ujian
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-xl border-t border-outline-variant/20 w-full pt-lg flex justify-center">
          <Link
            href={tenantPath("/login")}
            className="flex items-center gap-sm font-label-bold text-label-bold text-on-surface-variant hover:text-error hover:bg-error/5 transition-all px-lg py-sm rounded-xl cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Keluar
          </Link>
        </div>
      </main>

      <footer className="fixed bottom-6 left-0 right-0 text-center">
        <p className="font-caption text-caption text-outline">
          Sistem Ujian Berbasis Komputer © {new Date().getFullYear()}
        </p>
      </footer>

      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-lg py-md rounded-xl shadow-lg border border-outline-variant flex items-center gap-md z-50">
          <span className="material-symbols-outlined text-error">error</span>
          <span className="font-label-bold text-label-bold">PIN salah. Silakan coba lagi.</span>
        </div>
      )}
    </div>
  );
}
