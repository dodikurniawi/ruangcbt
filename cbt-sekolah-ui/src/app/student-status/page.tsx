"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenantRouter, useTenantPath } from "@/hooks/useTenantRouter";

type Screen = "thankyou" | "disqualified" | "closed";

function resolveScreen(): Screen {
  if (typeof window === "undefined") return "closed";
  const s = sessionStorage.getItem("exam_status");
  if (s === "SELESAI") return "thankyou";
  if (s === "DISKUALIFIKASI") return "disqualified";
  return "closed";
}

export default function StudentStatus() {
  const router = useTenantRouter();
  const tenantPath = useTenantPath();
  // Lazy initializers read sessionStorage at mount — no useEffect needed
  const [screen] = useState<Screen>(resolveScreen);
  const [score] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("exam_score") : null
  );

  const handleGoHome = () => {
    sessionStorage.removeItem("exam_status");
    sessionStorage.removeItem("exam_score");
    sessionStorage.removeItem("pin_verified");
    router.replace("/login");
  };

  if (screen === "thankyou") {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 flex justify-between items-center px-lg py-sm bg-white border-b border-outline-variant shadow-sm">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary text-2xl">school</span>
            <h1 className="font-headline-student font-extrabold text-primary">CBT Sekolah</h1>
          </div>
          <span className="font-label-bold text-on-surface-variant">Sesi Selesai</span>
        </header>
        <main className="flex-grow flex items-center justify-center p-lg">
          <div className="max-w-[600px] w-full bg-white rounded-xl shadow-lg p-xl text-center border border-outline-variant">
            <div className="mb-xl">
              <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mx-auto mb-lg">
                <span className="material-symbols-outlined text-on-primary-container text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
              </div>
              <h2 className="font-display-exam text-display-exam text-on-surface mb-sm">Ujian Selesai!</h2>
              <p className="font-body-student text-on-surface-variant">Terima kasih telah menyelesaikan ujian dengan jujur.</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-lg mb-xl border border-outline-variant">
              <span className="font-label-bold text-primary uppercase tracking-wider mb-xs block">Skor Akhir</span>
              {score != null ? (
                <div className="font-display-exam text-[64px] leading-none text-primary font-extrabold mb-md">
                  {score}<span className="text-on-surface-variant text-headline-student">/100</span>
                </div>
              ) : (
                <p className="font-body-student text-on-surface-variant py-md">Skor sedang dihitung oleh sistem.</p>
              )}
            </div>
            <div className="flex flex-col gap-sm">
              <button onClick={handleGoHome} className="h-14 bg-primary text-on-primary rounded-lg font-label-bold px-xl hover:opacity-90 transition-all flex items-center justify-center gap-sm cursor-pointer">
                <span className="material-symbols-outlined">logout</span>Selesai
              </button>
              <p className="font-caption text-on-surface-variant italic">Hasil ini akan diverifikasi oleh sistem administrasi.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (screen === "disqualified") {
    return (
      <div className="bg-surface-container-low text-on-background min-h-screen flex flex-col">
        <main className="flex-grow flex items-center justify-center p-lg">
          <div className="max-w-[540px] w-full bg-white rounded-xl shadow-lg border-2 border-error overflow-hidden">
            <div className="bg-error p-lg flex items-center gap-md">
              <span className="material-symbols-outlined text-on-error text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <h2 className="font-headline-student text-on-error">Ujian Dihentikan</h2>
            </div>
            <div className="p-xl text-center">
              <div className="mb-xl">
                <div className="w-24 h-24 bg-error-container rounded-full flex items-center justify-center mx-auto mb-lg">
                  <span className="material-symbols-outlined text-error text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
                </div>
                <p className="font-body-student text-on-surface mb-md">Sesi ujian Anda telah dihentikan oleh sistem keamanan.</p>
                <div className="bg-error-container text-on-error-container p-md rounded-lg text-left border border-error/20">
                  <span className="font-label-bold block mb-xs">Alasan Diskualifikasi:</span>
                  <p className="font-body-admin">Terdeteksi aktivitas mencurigakan melebihi batas pelanggaran yang diizinkan.</p>
                </div>
              </div>
              <p className="font-caption text-on-surface-variant mb-lg">Silakan hubungi pengawas atau admin sekolah untuk bantuan lebih lanjut.</p>
              <button onClick={handleGoHome} className="h-12 border border-outline-variant text-on-surface-variant rounded-lg font-label-bold px-xl hover:bg-surface-container cursor-pointer">
                Kembali ke Login
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-lg relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-tertiary-fixed rounded-full blur-[100px] opacity-20"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-secondary-fixed rounded-full blur-[80px] opacity-20"></div>
      <div className="max-w-[500px] w-full text-center relative z-10">
        <div className="w-32 h-32 mx-auto mb-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-[64px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>lock_clock</span>
        </div>
        <h2 className="font-display-exam text-display-exam text-on-surface mb-md">Ujian Belum Dibuka</h2>
        <div className="bg-white rounded-2xl p-xl border border-tertiary/20 shadow-sm mb-xl">
          <p className="font-body-student text-on-surface-variant mb-lg">
            Akses ujian saat ini sedang ditutup. Tunggu instruksi dari guru atau pengawas ujian.
          </p>
          <div className="flex items-center justify-center gap-md text-tertiary font-label-bold">
            <span className="material-symbols-outlined">info</span>
            Mulai otomatis saat ujian dibuka
          </div>
        </div>
        <Link href={tenantPath("/login")} className="inline-flex items-center gap-sm text-primary font-label-bold hover:underline cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
