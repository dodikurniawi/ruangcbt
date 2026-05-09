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
                  "Tambah data siswa di menu Manajemen → Data Siswa",
                  "Buat soal di menu Bank Soal sesuai mata pelajaran",
                  "Atur konfigurasi ujian (durasi, jumlah soal, jadwal)",
                  "Cetak kartu ujian untuk semua peserta",
                  "Bagikan link ujian ke siswa",
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
                  "Buka dashboard Admin → halaman utama untuk melihat progress real-time pengerjaan siswa.",
                  "Refresh halaman pengawas setiap beberapa menit untuk memperbarui status dan skor sementara.",
                  "Siswa yang belum memasukkan PIN ke portal ujian akan otomatis terdeteksi dengan status 'Belum Mulai'.",
                  "Jika terjadi kendala teknis (perangkat mati/koneksi putus), admin sekolah dapat mereset PIN siswa dari dashboard.",
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
                  "Download rekap nilai akhir siswa dari menu Rekap Hasil di dashboard.",
                  "Export data rekap tersebut ke berkas Excel (XLSX) untuk penginputan nilai raport sekolah.",
                  "Gunakan fitur canggih Analisis Butir Soal bertenaga AI untuk mengevaluasi efektivitas pertanyaan.",
                  "Cetak laporan hasil ujian yang ditandatangani oleh bapak/ibu guru beserta kepala sekolah.",
                  "Arsipkan soal pilihan ganda di Bank Soal agar dapat digunakan kembali untuk ujian berikutnya.",
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
