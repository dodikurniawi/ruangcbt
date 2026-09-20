import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Pusat Bantuan — RuangCBT",
  description: "Temukan panduan, FAQ, dan bantuan teknis seputar platform ujian online RuangCBT.",
};

export default function BantuanPage() {
  const faqs = [
    {
      q: "Bagaimana cara mendaftarkan sekolah saya?",
      a: "Anda dapat menghubungi tim dukungan kami via WhatsApp untuk pendaftaran resmi. Kami akan memandu proses setup awal dan pengkonfigurasian aplikasi untuk sekolah Anda.",
    },
    {
      q: "Berapa biaya langganan RuangCBT?",
      a: "RuangCBT ditawarkan dengan sistem pembelian lisensi sekali bayar (one-time fee) per sekolah yang sangat terjangkau tanpa biaya tahunan, langganan bulanan, atau biaya tersembunyi lainnya.",
    },
    {
      q: "Apakah data siswa saya aman?",
      a: "Sangat aman. Seluruh data sekolah tersimpan di server Google Workspace/Spreadsheet milik sekolah Anda sendiri. Kami tidak menyimpan database, data personal, atau nilai siswa apa pun di server kami.",
    },
    {
      q: "Bagaimana cara import data siswa dari Excel?",
      a: "Di menu Data Siswa pada panel admin, klik tombol Import, unduh contoh format file yang tersedia, isi data siswa (Nama, Username/NIS, Password, Kelas), lalu unggah file tersebut. Sistem akan otomatis mendaftarkan semua siswa.",
    },
    {
      q: "Bagaimana jika siswa tidak bisa login ulang setelah keluar tidak sengaja?",
      a: "Guru/admin dapat membuka menu Dashboard di panel admin, cari nama siswa pada tabel Live Student Monitoring, lalu klik ikon ↺ (panah melingkar) di kolom Aksi untuk mereset status login siswa.",
    },
    {
      q: "Bisakah ujian diakses dari HP?",
      a: "Bisa. Siswa dapat mengerjakan soal ujian dengan nyaman menggunakan browser HP, tablet, Chromebook, maupun laptop. Namun, Panel Admin khusus dibuka dari komputer atau laptop guru.",
    },
    {
      q: "Berapa maksimal jumlah soal per paket ujian?",
      a: "Tidak ada batasan teknis. Anda dapat membuat puluhan hingga ratusan soal per paket ujian (pilihan tunggal maupun pilihan kompleks), termasuk menyisipkan gambar pendukung pada pertanyaan.",
    },
    {
      q: "Apa yang terjadi jika koneksi internet siswa terputus saat ujian?",
      a: "Jawaban yang sudah diisi tidak akan hilang selama browser tidak ditutup dan masih menggunakan perangkat yang sama. Jawaban tersimpan di perangkat dan akan otomatis dikirim ulang saat koneksi pulih.",
    },
    {
      q: "Bagaimana cara mengunduh rekap nilai ujian?",
      a: "Di panel admin, klik menu Cetak di sebelah kiri. Klik tombol EXPORT XLSX untuk mengunduh rekap nilai dalam format Excel (cocok untuk input nilai rapor) atau EXPORT PDF untuk cetak dokumen.",
    },
    {
      q: "Bagaimana cara membuka dan menutup sesi ujian?",
      a: "Masuk ke panel admin, klik menu Dashboard. Pada bagian Status Ujian, klik tombol 'Buka Ujian' agar status berubah menjadi 'Ujian Sedang Berlangsung' (indikator hijau). Klik 'Tutup Ujian' setelah selesai.",
    },
    {
      q: "Bagaimana jika siswa lupa username atau password?",
      a: "Guru dapat melihat atau memperbarui username/password siswa di menu Data Siswa pada panel admin dengan mengklik tombol edit (ikon pensil), lalu klik Simpan Perubahan.",
    },
    {
      q: "RuangCBT support browser apa saja?",
      a: "Sistem kami mendukung penuh browser modern utama seperti Google Chrome dan Mozilla Firefox, baik di komputer, tablet, maupun perangkat HP siswa.",
    },
  ];

  return (
    <PublicPageLayout
      title="Pusat Bantuan"
      subtitle="Temukan jawaban dan panduan teknis atas pertanyaan umum mengenai RuangCBT"
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
