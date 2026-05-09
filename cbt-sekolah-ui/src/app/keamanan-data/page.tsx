import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Keamanan Data — CBT Sekolah",
  description: "Arsitektur keamanan data CBT Sekolah berbasis Google Apps Script yang menjamin kerahasiaan data sekolah Anda.",
};

export default function KeamananDataPage() {
  const securitySections = [
    {
      title: "Arsitektur Zero-Data",
      desc: "CBT Sekolah menggunakan Google Apps Script dan Google Spreadsheet sebagai backend. Ini berarti semua data — soal, nilai, data siswa — tersimpan langsung di Google Drive akun Google sekolah Anda. Kami sebagai vendor tidak memiliki akses ke data tersebut.",
    },
    {
      title: "Enkripsi Google",
      desc: "Data yang tersimpan di Google Sheets dan Google Drive dienkripsi oleh Google menggunakan standar AES-256 at rest dan TLS 1.3 in transit. Standar keamanan kelas militer yang sama digunakan oleh jutaan perusahaan Fortune 500 di seluruh dunia.",
    },
    {
      title: "Akses Terkontrol",
      desc: "Hanya admin sekolah yang memegang password dashboard manajemen ujian. PIN siswa bersifat sementara dan sama sekali tidak terhubung dengan identitas permanen nasional mereka. Bebas dari cookie tracking maupun profiling pengguna.",
    },
    {
      title: "Kepatuhan Regulasi",
      desc: "Aplikasi ini dirancang sesuai dengan prinsip-prinsip perlindungan data pribadi sebagaimana diatur dalam UU PDP No. 27 Tahun 2022. Seluruh data anak didik dijamin kerahasiaannya dan tidak pernah digunakan untuk keperluan komersial atau pihak ketiga.",
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
      <div className="space-y-12">
        {/* Verified Green Alert Box */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm">
          <span className="material-symbols-outlined text-emerald-600 text-4xl shrink-0 select-none">
            verified_user
          </span>
          <div className="text-center sm:text-left space-y-1">
            <h4 className="font-extrabold text-emerald-950 text-sm uppercase tracking-wide">
              Komitmen Keamanan Data 100%
            </h4>
            <p className="text-emerald-800 text-xs md:text-sm leading-relaxed font-bold">
              Data Anda 100% tersimpan di Google Workspace sekolah Anda sendiri. Kami tidak mengumpulkan, mentransfer, ataupun menyimpan data siswa di server manapun milik vendor.
            </p>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {securitySections.map((sec, i) => (
            <div key={i} className="space-y-2 border-l-4 border-blue-600 pl-4 py-1">
              <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wide">
                {sec.title}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                {sec.desc}
              </p>
            </div>
          ))}
        </section>

        {/* FAQs Accordions */}
        <section className="space-y-6">
          <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase text-center">
            Pertanyaan Umum Keamanan Data
          </h3>
          <div className="bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8 divide-y divide-slate-150 space-y-1">
            {faqs.map((faq, idx) => (
              <details key={idx} className="group py-4 first:pt-0 last:pb-0 outline-none">
                <summary className="font-extrabold text-slate-900 text-sm cursor-pointer list-none flex justify-between items-center select-none uppercase tracking-wide group-open:text-blue-600 transition-colors">
                  <span>{faq.q}</span>
                  <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform select-none">
                    keyboard_arrow_down
                  </span>
                </summary>
                <div className="pt-3 text-slate-600 text-xs md:text-sm leading-relaxed font-semibold">
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
