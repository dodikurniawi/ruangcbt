import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Integritas Ujian — RuangCBT",
  description: "Fitur proteksi kejujuran RuangCBT untuk mencegah segala tindakan kecurangan ujian siswa secara presisi.",
};

export default function IntegritasUjianPage() {
  const stats = [
    { label: "Acak Sempurna", value: "Soal Diacak Otomatis", icon: "shuffle" },
    { label: "Token Keamanan", value: "PIN Sekali Pakai", icon: "key" },
    { label: "Anti-manipulasi", value: "Sesi Terkunci", icon: "lock" },
  ];

  const features = [
    {
      icon: "block",
      title: "Deteksi Pelanggaran Ujian",
      desc: "Sistem mencatat setiap bentuk pelanggaran seperti berpindah tab browser, membuka aplikasi lain, menekan tombol Back, klik kanan, tombol pintasan (Ctrl+C/Ctrl+V), maupun membuka DevTools (F12).",
    },
    {
      icon: "gavel",
      title: "Diskualifikasi Otomatis",
      desc: "Jika siswa melanggar terlalu banyak kali, sistem akan mengumpulkan ujian secara otomatis dan menandai siswa berstatus Diskualifikasi pada tabel monitoring guru.",
    },
    {
      icon: "devices",
      title: "Satu Akun Satu Perangkat",
      desc: "Satu akun siswa hanya dapat dipergunakan di satu perangkat pada waktu yang sama untuk mencegah pembagian akun atau pengerjaan ganda.",
    },
    {
      icon: "sync",
      title: "Proteksi Jawaban & Koneksi Terputus",
      desc: "Jawaban yang sudah diisi tidak akan hilang jika koneksi internet terputus atau halaman di-refresh, karena tersimpan aman di perangkat dan akan otomatis dikirim ulang saat koneksi pulih.",
    },
    {
      icon: "monitoring",
      title: "Pemantauan Pelanggaran Real-time",
      desc: "Guru dapat melihat jumlah pelanggaran dan status pengerjaan setiap siswa secara langsung di tabel Live Student Monitoring tanpa perlu refresh manual.",
    },
  ];

  return (
    <PublicPageLayout
      title="Integritas Ujian"
      subtitle="Menjaga kredibilitas dan keadilan hasil ujian dengan sistem proteksi kejujuran canggih"
      icon="verified"
    >
      <div className="space-y-16">
        {/* Stat Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {stats.map((s, i) => (
            <div key={i} className="group bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center group-hover:scale-110 transition-transform mb-1">
                <span className="material-symbols-outlined text-2xl select-none">
                  {s.icon}
                </span>
              </div>
              <p className="text-blue-600 text-xs font-black uppercase tracking-widest">
                {s.label}
              </p>
              <h4 className="text-slate-900 font-extrabold text-base uppercase tracking-wide">
                {s.value}
              </h4>
            </div>
          ))}
        </section>

        {/* Features */}
        <section className="space-y-6">
          <div className="text-center space-y-2 mb-10">
            <h3 className="font-black text-slate-900 text-2xl tracking-tight uppercase">
              Mekanisme Keamanan Berlapis
            </h3>
            <p className="text-slate-600 text-sm font-medium">
              Sistem perlindungan proctoring otomatis untuk menjamin validitas nilai
            </p>
          </div>
          {features.map((feat, index) => {
            return (
              <div
                key={index}
                className="group bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-xl hover:border-blue-500/40 transition-all duration-300 flex flex-col md:flex-row items-center md:items-start gap-6"
              >
                {/* Icon Container */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform select-none">
                  <span className="material-symbols-outlined text-3xl">
                    {feat.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2 text-center md:text-left flex-1">
                  <h3 className="font-extrabold text-slate-900 text-lg tracking-tight group-hover:text-blue-600 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed font-medium">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </PublicPageLayout>
  );
}
