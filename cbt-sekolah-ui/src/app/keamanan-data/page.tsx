import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Keamanan Data — CBT Sekolah",
  description: "Arsitektur keamanan data CBT Sekolah berbasis Google Apps Script yang menjamin kerahasiaan data sekolah Anda.",
};

export default function KeamananDataPage() {
  const securitySections = [
    {
      title: "Arsitektur Zero-Data Access",
      desc: "CBT Sekolah menggunakan Google Apps Script dan Google Spreadsheet sebagai backend. Ini berarti semua data — soal, nilai, data siswa — tersimpan langsung di Google Drive akun Google sekolah Anda. Kami sebagai vendor tidak memiliki akses ke data tersebut.",
      icon: "cloud_off",
    },
    {
      title: "Enkripsi Google Enterprise",
      desc: "Data yang tersimpan di Google Sheets dan Google Drive dienkripsi oleh Google menggunakan standar AES-256 at rest dan TLS 1.3 in transit. Standar keamanan kelas militer yang sama digunakan oleh jutaan perusahaan Fortune 500 di seluruh dunia.",
      icon: "enhanced_encryption",
    },
    {
      title: "Akses Terkontrol & Tanpa Cookie",
      desc: "Hanya admin sekolah yang memegang password dashboard manajemen ujian. PIN siswa bersifat sementara dan sama sekali tidak terhubung dengan identitas permanen nasional mereka. Bebas dari cookie tracking maupun profiling pengguna.",
      icon: "admin_panel_settings",
    },
    {
      title: "Kepatuhan Regulasi UU PDP",
      desc: "Aplikasi ini dirancang sesuai dengan prinsip-prinsip perlindungan data pribadi sebagaimana diatur dalam UU PDP No. 27 Tahun 2022. Seluruh data anak didik dijamin kerahasiaannya dan tidak pernah digunakan untuk keperluan komersial atau pihak ketiga.",
      icon: "gavel",
    },
  ];

  const faqs = [
    {
      q: "Apakah vendor CBT Sekolah bisa melihat isi soal ujian kami?",
      a: "Sama sekali tidak. Seluruh berkas bank soal di-host langsung di Google Drive sekolah Anda sendiri. Arsitektur kami berjalan secara client-side dan serverless menggunakan Google Apps Script Anda.",
    },
    {
      q: "Bagaimana jika kuota server Google Sheets penuh?",
      a: "Google Sheets mendukung hingga 10 juta sel data per spreadsheet. Jumlah ini sangat besar dan lebih dari cukup untuk menampung seluruh rekapitulasi ujian tahunan sebuah sekolah.",
    },
    {
      q: "Apakah data siswa kami dapat diekspor oleh pihak luar?",
      a: "Tidak bisa. Hak akses baca-tulis spreadsheet diatur secara penuh melalui kontrol berbagi (sharing settings) Google Workspace sekolah Anda.",
    },
    {
      q: "Bagaimana sistem memitigasi kebocoran database?",
      a: "Karena tidak ada database eksternal terpusat (kami tidak menyimpan data Anda), tidak ada satu target pun bagi peretas untuk mencuri rekam medis atau performa siswa secara massal di server kami.",
    },
  ];

  return (
    <PublicPageLayout
      title="Keamanan Data"
      subtitle="Kedaulatan data penuh berada di tangan institusi sekolah Anda secara absolut"
      icon="shield"
    >
      <div className="space-y-16">
        {/* Verified Green Alert Box */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-5 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-3xl select-none">
              verified_user
            </span>
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h4 className="font-extrabold text-emerald-950 text-base uppercase tracking-wide">
              Komitmen Keamanan Data 100%
            </h4>
            <p className="text-emerald-800 text-xs md:text-sm leading-relaxed font-semibold">
              Data Anda 100% tersimpan di Google Workspace sekolah Anda sendiri. Kami tidak mengumpulkan, mentransfer, ataupun menyimpan data siswa di server manapun milik vendor.
            </p>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {securitySections.map((sec, i) => (
            <div key={i} className="group bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 shadow-sm hover:shadow-xl hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl select-none">
                  {sec.icon}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight group-hover:text-blue-600 transition-colors">
                  {sec.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  {sec.desc}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* FAQs Accordions */}
        <section className="space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h3 className="font-black text-slate-900 text-2xl tracking-tight uppercase">
              Pertanyaan Umum Keamanan Data
            </h3>
            <p className="text-slate-600 text-sm font-medium">
              Penjelasan transparansi privasi dan arsitektur data
            </p>
          </div>
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 divide-y divide-slate-200 space-y-1 shadow-sm">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group py-4 first:pt-0 last:pb-0 outline-none">
                <summary className="font-extrabold text-slate-900 text-base cursor-pointer list-none flex justify-between items-center select-none uppercase tracking-wide group-open:text-blue-600 transition-colors gap-4">
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform select-none">
                    keyboard_arrow_down
                  </span>
                </summary>
                <div className="pt-3 text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}

