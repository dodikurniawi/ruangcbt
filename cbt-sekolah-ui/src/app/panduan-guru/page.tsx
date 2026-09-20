"use client";

import PublicPageLayout from "@/components/public/PublicPageLayout";
import React, { useState } from "react";

export default function PanduanGuruPage() {
  const [activeTab, setActiveTab] = useState<"sebelum" | "saat" | "setelah">("sebelum");

  return (
    <PublicPageLayout
      title="Panduan Guru"
      subtitle="Panduan langkah demi langkah menyelenggarakan asesmen digital yang tertib dan lancar"
      icon="school"
    >
      <div className="space-y-10">
        {/* Interactive Tabs */}
        <section className="bg-[#f1f5f9] border border-slate-200/60 p-1.5 rounded-2xl flex justify-between select-none">
          <button
            onClick={() => setActiveTab("sebelum")}
            className={`flex-1 py-3 text-center rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "sebelum"
                ? "bg-white text-[#2563EB] shadow-md"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Sebelum Ujian
          </button>
          <button
            onClick={() => setActiveTab("saat")}
            className={`flex-1 py-3 text-center rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "saat"
                ? "bg-white text-[#2563EB] shadow-md"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Saat Ujian
          </button>
          <button
            onClick={() => setActiveTab("setelah")}
            className={`flex-1 py-3 text-center rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "setelah"
                ? "bg-white text-[#2563EB] shadow-md"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Setelah Ujian
          </button>
        </section>

        {/* Tab Content Display */}
        <section className="bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8 min-h-[250px] flex flex-col justify-center">
          {activeTab === "sebelum" && (
            <div className="space-y-6">
              <h4 className="font-black text-slate-900 text-base uppercase tracking-wide border-b border-slate-100 pb-3">
                📋 Persiapan Sebelum Ujian
              </h4>
              <ul className="space-y-4">
                {[
                  "Tambah data siswa di menu Data Siswa (satu per satu atau impor dari file Excel).",
                  "Buat soal di menu Bank Soal (Pilihan Tunggal atau Pilihan Kompleks, opsi jawaban, gambar, dan bobot nilai).",
                  "Buka menu Dashboard di panel admin, klik tombol Buka Ujian hingga status berubah menjadi Ujian Sedang Berlangsung (hijau).",
                  "Bagikan alamat link login ujian beserta Username (NIS), Password, dan PIN ujian kepada siswa.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-emerald-500 shrink-0 select-none">
                      check_circle
                    </span>
                    <span className="text-slate-700 text-sm md:text-base font-semibold leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "saat" && (
            <div className="space-y-6">
              <h4 className="font-black text-slate-900 text-base uppercase tracking-wide border-b border-slate-100 pb-3">
                ⚡ Pemantauan Selama Ujian Berlangsung
              </h4>
              <ul className="space-y-4">
                {[
                  "Buka menu Dashboard di panel admin untuk melihat tabel Live Student Monitoring secara langsung.",
                  "Pantau status pengerjaan siswa: Sedang Ujian, Selesai, Diskualifikasi, atau Belum Mulai (data diperbarui otomatis setiap beberapa detik).",
                  "Jika siswa terputus atau tidak bisa login ulang, cari nama siswa di tabel dan klik ikon ↺ (panah melingkar) di kolom Aksi untuk mereset status login.",
                  "Pantau jumlah pelanggaran yang tercatat jika siswa mencoba pindah tab, membuka aplikasi lain, atau menekan shortcut terlarang.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-500 shrink-0 select-none">
                      info
                    </span>
                    <span className="text-slate-700 text-sm md:text-base font-semibold leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === "setelah" && (
            <div className="space-y-6">
              <h4 className="font-black text-slate-900 text-base uppercase tracking-wide border-b border-slate-100 pb-3">
                📊 Evaluasi Pasca Ujian
              </h4>
              <ul className="space-y-4">
                {[
                  "Klik tombol Tutup Ujian di halaman Dashboard setelah semua siswa selesai atau waktu habis.",
                  "Buka menu Cetak di sebelah kiri untuk melihat rekapitulasi nilai akhir seluruh siswa.",
                  "Klik tombol EXPORT XLSX untuk mengunduh rekap nilai format Excel (cocok untuk penginputan nilai rapor).",
                  "Klik tombol EXPORT PDF untuk mengunduh rekap dokumen PDF siap cetak.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#2563EB] shrink-0 select-none">
                      stars
                    </span>
                    <span className="text-slate-700 text-sm md:text-base font-semibold leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Video Tutorial Placeholder */}
        <section className="space-y-4">
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-wide text-center">
            Tutorial Video Singkat
          </h3>
          <div className="bg-[#e2e8f0] border border-slate-300 rounded-3xl aspect-video flex flex-col items-center justify-center gap-3 shadow-inner p-6 text-center select-none">
            <span className="material-symbols-outlined text-[#2563EB] text-6xl animate-pulse">
              play_circle
            </span>
            <span className="font-black text-slate-700 text-sm md:text-base uppercase tracking-widest">
              Video Tutorial Segera Hadir
            </span>
            <span className="text-slate-400 text-xs font-semibold max-w-xs leading-relaxed">
              Kami sedang memproduksi panduan interaktif berkualitas tinggi untuk bapak/ibu guru.
            </span>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}
