import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Syarat & Ketentuan — CBT Sekolah",
  description: "Syarat dan ketentuan resmi penggunaan platform SaaS ujian online CBT Sekolah.",
};

export default function SyaratKetentuanPage() {
  const sections = [
    {
      num: "1",
      title: "Penerimaan Syarat",
      content: "Dengan mengakses, mengunduh template, atau menggunakan platform CBT Sekolah, sekolah Anda menyatakan setuju untuk mematuhi dan terikat secara hukum oleh seluruh syarat dan ketentuan penggunaan yang tercantum di halaman ini.",
    },
    {
      num: "2",
      title: "Deskripsi Layanan",
      content: "CBT Sekolah menyediakan perangkat lunak berbasis Software as a Service (SaaS) yang terintegrasi langsung dengan ekosistem Google Workspace milik masing-masing sekolah. Layanan kami mencakup portal pengerjaan soal siswa, panel manajemen ujian admin, serta integrasi AI.",
    },
    {
      num: "3",
      title: "Penggunaan yang Diizinkan",
      content: "Layanan ini disediakan murni dan eksklusif untuk kepentingan kegiatan asesmen akademis formal di lingkungan sekolah yang terdaftar secara sah. Segala bentuk pemanfaatan di luar kegiatan pendidikan formal harus mendapatkan persetujuan tertulis terlebih dahulu.",
    },
    {
      num: "4",
      title: "Batasan & Larangan",
      content: "Pengguna dilarang keras menjual kembali lisensi aplikasi, mendekompilasi kode sumber, mencoba memanipulasi log aktivitas sistem, menyalahgunakan API proxy, atau mempergunakan platform untuk menyimpan konten berbau SARA maupun konten ilegal lainnya.",
    },
    {
      num: "5",
      title: "Pembayaran & Lisensi",
      content: "Aplikasi kami menggunakan skema pembelian lisensi satu kali bayar (one-time payment) per sekolah tanpa adanya sistem perpanjangan otomatis (auto-renewal) yang membebani keuangan sekolah di masa depan.",
    },
    {
      num: "6",
      title: "Penghentian Layanan",
      content: "Kami memiliki hak prerogatif penuh untuk membatasi akses ke API proxy atau menonaktifkan akun sekolah yang terbukti secara sah melakukan pelanggaran terhadap syarat penggunaan yang telah disepakati bersama ini.",
    },
    {
      num: "7",
      title: "Batasan Tanggung Jawab",
      content: "Kami selaku vendor penyedia perangkat lunak sama sekali tidak bertanggung jawab atas konten butir soal yang ditulis, kebenaran kunci jawaban, kebocoran fisik soal oleh oknum internal, maupun kehilangan data akibat kesalahan pengelolaan spreadsheet mandiri oleh admin sekolah.",
    },
  ];

  return (
    <PublicPageLayout
      title="Syarat & Ketentuan"
      subtitle="Aturan resmi penggunaan aplikasi dan hak kewajiban lisensi sekolah Anda"
      icon="gavel"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
          <span className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Dokumen Ketentuan Penggunaan
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
            Terima kasih atas kerja sama Anda dalam menjaga kenyamanan dan kejujuran berjalannya ujian sekolah digital bersama CBT Sekolah.
          </p>
          <a
            href="https://wa.me/6285189536359"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-sm"
          >
            Konsultasi Lisensi Penggunaan
          </a>
        </div>
      </div>
    </PublicPageLayout>
  );
}
