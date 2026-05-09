import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Pusat Bantuan — CBT Sekolah",
  description: "Temukan panduan, FAQ, dan bantuan teknis seputar platform ujian online CBT Sekolah.",
};

export default function BantuanPage() {
  const faqs = [
    {
      q: "Bagaimana cara mendaftarkan sekolah saya?",
      a: "Anda dapat menghubungi tim dukungan kami via WhatsApp untuk pendaftaran resmi. Kami akan memandu proses instalasi Google Apps Script dan penyusunan spreadsheet perdana sekolah Anda.",
    },
    {
      q: "Berapa biaya langganan CBT Sekolah?",
      a: "CBT Sekolah ditawarkan dengan sistem pembelian lisensi sekali bayar (one-time fee) per sekolah yang sangat terjangkau tanpa biaya tahunan, langganan bulanan, atau biaya tersembunyi lainnya.",
    },
    {
      q: "Apakah data siswa saya aman?",
      a: "Sangat aman. Seluruh data sekolah tersimpan di server Google Sheets milik sekolah Anda sendiri. Kami tidak menyimpan database, data personal, atau nilai siswa apa pun di server kami.",
    },
    {
      q: "Bagaimana cara import data siswa dari Excel?",
      a: "Anda cukup mengunduh format sheet Excel dari tab Manajemen Siswa di panel admin, mengisi data siswa Anda, kemudian menyalinnya langsung ke spreadsheet Google utama sekolah Anda.",
    },
    {
      q: "Siswa lupa PIN, apa yang harus dilakukan?",
      a: "Admin sekolah dapat melihat daftar PIN aktif di dashboard kapan saja atau mencetak ulang kartu peserta. Jika diperlukan, admin juga dapat mereset sesi PIN siswa secara langsung di dashboard.",
    },
    {
      q: "Bisakah ujian diakses dari HP?",
      a: "Bisa. CBT Sekolah dikembangkan dengan teknologi modern responsif, sehingga siswa dapat mengerjakan soal dengan nyaman menggunakan HP, tablet, Chromebook, maupun laptop.",
    },
    {
      q: "Berapa maksimal jumlah soal per paket ujian?",
      a: "Tidak ada batasan teknis. Anda dapat membuat puluhan hingga ratusan nomor soal per paket ujian, termasuk menyisipkan gambar pendukung dan rumus matematika yang kompleks.",
    },
    {
      q: "Apakah bisa digunakan offline?",
      a: "Tidak bisa. CBT Sekolah memerlukan koneksi internet aktif agar siswa dapat mengunduh soal dan mengirimkan respons jawaban secara real-time ke spreadsheet Google sekolah.",
    },
    {
      q: "Bagaimana cara ekspor nilai ke Excel?",
      a: "Pada tab 'Hasil Ujian' di halaman Cetak Admin, klik tombol 'EXPORT XLSX' untuk mengunduh rekapitulasi data nilai siswa beserta ringkasan ketuntasan dalam format Excel secara instan.",
    },
    {
      q: "Apa itu fitur Analisis Butir Soal AI?",
      a: "Fitur canggih yang memanfaatkan teknologi kecerdasan buatan Groq AI untuk mengevaluasi tingkat kesukaran, distorsi jawaban, kualitas soal, serta memformulasikan rekomendasi pembelajaran siswa secara otomatis.",
    },
    {
      q: "Bagaimana cara mencetak kartu ujian?",
      a: "Buka tab 'Kartu Ujian' pada menu Cetak di panel admin, pilih kelas, lalu klik 'Cetak Semua' untuk membuka pratinjau kartu ujian terstandarisasi yang siap dicetak ke kertas A4.",
    },
    {
      q: "CBT Sekolah support browser apa saja?",
      a: "Sistem kami mendukung penuh browser modern utama seperti Google Chrome, Mozilla Firefox, Safari, Microsoft Edge, dan Opera baik di komputer, tablet, maupun perangkat mobile.",
    },
  ];

  return (
    <PublicPageLayout
      title="Pusat Bantuan"
      subtitle="Temukan jawaban dan panduan teknis atas pertanyaan umum mengenai CBT Sekolah"
      icon="help"
    >
      <div className="space-y-10">
        {/* Visual Search Bar */}
        <section className="flex justify-center w-full">
          <div className="bg-[#f1f5f9] border border-slate-200 rounded-full px-6 py-3 w-full max-w-lg flex items-center gap-3 shadow-inner">
            <span className="material-symbols-outlined text-slate-400 select-none">
              search
            </span>
            <input
              type="text"
              disabled
              placeholder="Cari pertanyaan..."
              className="bg-transparent border-0 outline-none text-slate-800 text-sm font-semibold w-full placeholder-slate-400 cursor-not-allowed"
            />
          </div>
        </section>

        {/* Kategori Tabs */}
        <section className="border-b border-slate-200 flex justify-center gap-6 pb-px select-none">
          <button className="px-4 py-2 border-b-2 border-[#2563EB] text-[#2563EB] font-black text-xs uppercase tracking-widest cursor-pointer">
            Semua
          </button>
          <button className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest cursor-pointer transition-colors">
            Admin
          </button>
          <button className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest cursor-pointer transition-colors">
            Siswa
          </button>
          <button className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest cursor-pointer transition-colors">
            Teknis
          </button>
        </section>

        {/* FAQ list */}
        <section className="bg-white border border-slate-200/60 rounded-3xl p-6 md:p-8 space-y-1">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group border-b border-slate-100 py-4 last:border-0 outline-none">
              <summary className="cursor-pointer font-extrabold text-slate-900 text-sm flex justify-between items-center select-none uppercase tracking-wide group-open:text-[#2563EB] transition-colors">
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
        </section>

        {/* Support Section */}
        <section className="bg-slate-50 border border-slate-200/60 rounded-3xl p-8 text-center space-y-4">
          <div className="space-y-1">
            <h4 className="font-black text-slate-900 text-lg uppercase tracking-wide">
              Tidak menemukan jawaban?
            </h4>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
              Dukungan teknis responsif kami siap membantu menyelesaikan segala kebutuhan sekolah Anda
            </p>
          </div>
          <div className="pt-2">
            <a
              href="https://wa.me/6285189536359"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Hubungi Tim WhatsApp
            </a>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}
