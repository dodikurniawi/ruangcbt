import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Kebijakan Privasi — CBT Sekolah",
  description: "Kebijakan privasi CBT Sekolah yang transparan, aman, dan mematuhi regulasi UU PDP No. 27 Tahun 2022.",
};

export default function KebijakanPrivasiPage() {
  const sections = [
    {
      num: "1",
      title: "Pengantar",
      content: "CBT Sekolah adalah platform inovatif berbasis SaaS untuk penyelenggaraan ujian digital sekolah. Kami sangat menghargai privasi Anda dan berkomitmen penuh untuk melindungi data pribadi seluruh ekosistem pendidikan sekolah Anda.",
    },
    {
      num: "2",
      title: "Data yang Kami Kumpulkan",
      content: "Kami hanya mengumpulkan data operasional yang sangat minimal demi jalannya proses sinkronisasi, seperti ID Sekolah (school_id) dan catatan waktu (timestamp) aktivitas. Kami sama sekali tidak mengumpulkan, menyalin, atau melihat data identitas pribadi murid ataupun rekam akademis permanen.",
    },
    {
      num: "3",
      title: "Cara Penggunaan Data",
      content: "Segala bentuk informasi operasional yang dikirimkan murni dipergunakan untuk menjembatani koordinasi antara halaman browser siswa dengan Google Apps Script (GAS) Web App independen milik sekolah Anda sendiri.",
    },
    {
      num: "4",
      title: "Penyimpanan Data",
      content: "Seluruh basis data penting (bank soal, kunci jawaban, biodata siswa, dan nilai ujian) secara utuh disimpan di Google Drive and Google Sheets sekolah Anda sendiri. Kami tidak memiliki server penyimpanan eksternal yang menampung database tersebut.",
    },
    {
      num: "5",
      title: "Kebijakan Cookies",
      content: "Kami tidak menggunakan tracking cookies, pelacakan iklan (profiling), ataupun integrasi pihak ketiga yang mencurigakan. Kami hanya menggunakan penyimpanan lokal browser (Session Storage) sementara untuk menjaga otentikasi login admin tetap aman.",
    },
    {
      num: "6",
      title: "Hak Pengguna",
      content: "Sebagai pemilik data berdaulat penuh, pihak sekolah berhak menghapus berkas spreadsheet, me-reset seluruh konfigurasi, mengunduh salinan cadangan, serta bermigrasi kapan saja tanpa ada intervensi dari pihak kami.",
    },
    {
      num: "7",
      title: "Keamanan Sistem",
      content: "Semua pengiriman data menggunakan protokol aman terenkripsi HTTPS (TLS 1.3). Google Drive sekolah Anda juga dijamin keamanannya oleh infrastruktur tangguh kelas dunia bersertifikasi ISO 27001 milik Google.",
    },
    {
      num: "8",
      title: "Kontak Layanan",
      content: "Apabila bapak/ibu memiliki pertanyaan atau membutuhkan konsultasi lebih lanjut terkait dengan kebijakan perlindungan data pribadi ini, Anda dapat menghubungi tim kami secara langsung via WhatsApp resmi.",
    },
  ];

  return (
    <PublicPageLayout
      title="Kebijakan Privasi"
      subtitle="Komitmen penuh kami dalam mematuhi regulasi UU PDP No. 27 Tahun 2022 demi kenyamanan Anda"
      icon="policy"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Dokumen Kebijakan Resmi
          </span>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            Diperbarui: 1 Jan 2026
          </span>
        </div>

        {/* Sections loop */}
        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-black text-xs shadow-inner">
                  {s.num}
                </span>
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
                  {s.title}
                </h3>
              </div>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-semibold pl-10">
                {s.content}
              </p>
            </section>
          ))}
        </div>

        {/* Footnote */}
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-center space-y-4">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            Dengan menggunakan platform CBT Sekolah, Anda menyetujui seluruh ketentuan privasi yang telah disepakati bersama ini.
          </p>
          <a
            href="https://wa.me/6285189536359"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-sm"
          >
            Hubungi Konsultan Privasi
          </a>
        </div>
      </div>
    </PublicPageLayout>
  );
}
