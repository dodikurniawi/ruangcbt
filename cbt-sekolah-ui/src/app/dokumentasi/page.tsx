import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Dokumentasi Webappscript — CBT Sekolah",
  description: "Panduan teknis, API referensi, dan petunjuk konfigurasi CBT Sekolah berbasis Google Apps Script.",
};

export default function DokumentasiPage() {
  const steps = [
    {
      num: "01",
      title: "Setup Awal",
      desc: "Salin template Google Spreadsheet CBT Sekolah, lalu deploy Google Apps Script (GAS) sebagai Web App dengan hak akses publik.",
    },
    {
      num: "02",
      title: "Konfigurasi Ujian",
      desc: "Masukkan URL Web App GAS ke file konfigurasi admin, lalu input data kelas, daftar mata pelajaran, data siswa, dan bank soal.",
    },
    {
      num: "03",
      title: "Go Live",
      desc: "Aktifkan status pengerjaan paket ujian pada dashboard admin, bagikan tautan kepada siswa, lalu monitor jalannya ujian real-time.",
    },
  ];


  const changelog = [
    {
      version: "v2.1.0",
      date: "12 April 2026",
      points: [
        "Integrasi Groq AI multi-model fallback untuk fitur Analisis Butir Soal dan Hasil Ujian otomatis.",
        "Sistem enkripsi local storage yang diperkuat untuk data offline pratinjau kartu ujian.",
        "Peningkatan performa rendering visual rekap nilai dengan fixed decimal precision.",
      ],
    },
    {
      version: "v2.0.4",
      date: "10 Maret 2026",
      points: [
        "Penambahan field Mata Pelajaran (Subject) yang fleksibel di sistem Bank Soal admin.",
        "Optimasi layout cetak kartu ujian portrait double A4 ramah lingkungan.",
        "Perbaikan minor bug reset sesi pengerjaan siswa.",
      ],
    },
    {
      version: "v2.0.0",
      date: "1 Januari 2026",
      points: [
        "Rilis perdana CBT Sekolah berbasis arsitektur serverless Google Apps Script.",
        "Migrasi total UI dashboard manajemen ujian sekolah menggunakan Material Design 3 Tailwind tokens.",
        "Ekspor laporan rekapitulasi data nilai siswa instan ke format Excel (XLSX) dan PDF.",
      ],
    },
  ];

  return (
    <PublicPageLayout
      title="Dokumentasi Teknis"
      subtitle="Panduan komprehensif mengintegrasikan Google Apps Script dan API proxy sekolah Anda"
      icon="menu_book"
    >
      <div className="space-y-12">
        {/* Blue Notice Box */}
        <section className="bg-blue-50 border border-blue-200 rounded-3xl p-6 flex items-start gap-4 shadow-sm">
          <span className="material-symbols-outlined text-[#2563EB] text-2xl shrink-0 mt-0.5 select-none">
            info
          </span>
          <p className="text-blue-800 text-xs md:text-sm leading-relaxed font-bold">
            Dokumentasi teknis lengkap, library pendukung, dan kode sumber template spreadsheet tersedia di platform eksternal kami. Halaman ini berisi panduan ringkas memulai (Quick Start).
          </p>
        </section>

        {/* Quick Start Steps */}
        <section className="space-y-6">
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-wide">
            Memulai Integrasi (Quick Start)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 space-y-3 relative">
                <span className="font-black text-3xl text-slate-200 absolute top-4 right-6 select-none">
                  {s.num}
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide pt-2">
                  {s.title}
                </h4>
                <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>


        {/* Documentation External Link Button */}
        <section className="text-center pt-2">
          <a
            href="https://webappscript.id/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-md hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Kunjungi Dokumentasi Webappscript
          </a>
        </section>

        {/* Changelog */}
        <section className="space-y-6">
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-wide">
            Changelog Pembaruan
          </h3>
          <div className="space-y-6">
            {changelog.map((c, i) => (
              <div key={i} className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-6 space-y-3 shadow-sm">
                <div className="flex items-baseline justify-between border-b border-slate-150 pb-2 flex-wrap gap-2">
                  <span className="font-extrabold text-[#2563EB] text-sm tracking-wide">
                    {c.version}
                  </span>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    {c.date}
                  </span>
                </div>
                <ul className="list-disc list-inside text-slate-600 text-xs leading-relaxed font-semibold space-y-1.5 pl-1">
                  {c.points.map((pt, j) => (
                    <span key={j} className="block relative pl-4">
                      <span className="absolute left-0 top-1 text-[#2563EB]">•</span>
                      {pt}
                    </span>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}
