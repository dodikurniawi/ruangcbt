import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Integritas Ujian — CBT Sekolah",
  description: "Fitur proteksi kejujuran CBT Sekolah untuk mencegah segala tindakan kecurangan ujian siswa secara presisi.",
};

export default function IntegritasUjianPage() {
  const stats = [
    { label: "Acak Sempurna", value: "Soal Diacak Otomatis" },
    { label: "Token Keamanan", value: "PIN Sekali Pakai" },
    { label: "Anti-manipulasi", value: "Sesi Terkunci" },
  ];

  const features = [
    {
      icon: "shuffle",
      title: "Randomisasi Soal & Pilihan",
      desc: "Urutan soal dan pilihan jawaban diacak secara acak dan berbeda untuk setiap peserta ujian. Dua siswa yang duduk berdampingan akan melihat urutan soal dan opsi yang berbeda.",
    },
    {
      icon: "key",
      title: "PIN Sekali Pakai",
      desc: "Setiap PIN ujian unik hanya dapat digunakan satu kali oleh siswa yang bersangkutan. Setelah siswa login ke sistem, PIN tersebut terkunci dan tidak bisa digunakan di perangkat lain.",
    },
    {
      icon: "update",
      title: "Timer Server-side",
      desc: "Durasi ujian dikontrol secara ketat di sisi server. Menutup tab, mematikan perangkat, ataupun me-refresh halaman browser tidak akan menghentikan atau memperlama waktu pengerjaan.",
    },
    {
      icon: "history",
      title: "Log Aktivitas Presisi",
      desc: "Setiap klik, perpindahan soal, dan submit jawaban siswa dicatat secara real-time dengan timestamp. Guru pengawas dapat memantau dengan tepat aktivitas siswa di dashboard admin.",
    },
    {
      icon: "extension_off",
      title: "Tanpa Plugin",
      desc: "Ujian berjalan secara murni menggunakan teknologi modern web browser standar tanpa memerlukan instalasi plugin tambahan atau aplikasi manipulatif yang membahayakan perangkat.",
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
            <div key={i} className="bg-blue-50/40 border border-blue-100 rounded-2xl p-6">
              <p className="text-[#2563EB] text-xs font-black uppercase tracking-widest mb-1">
                {s.label}
              </p>
              <h4 className="text-slate-900 font-extrabold text-sm md:text-base uppercase tracking-wide">
                {s.value}
              </h4>
            </div>
          ))}
        </section>

        {/* Alternating Features */}
        <section className="space-y-12">
          {features.map((feat, index) => {
            const isEven = index % 2 === 0;
            return (
              <div
                key={index}
                className={`flex flex-col md:flex-row items-center gap-8 ${
                  isEven ? "" : "md:flex-row-reverse"
                }`}
              >
                {/* Icon Container */}
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-100 rounded-3xl flex items-center justify-center shrink-0 border border-slate-200/50 shadow-sm select-none">
                  <span className="material-symbols-outlined text-[#2563EB] text-4xl">
                    {feat.icon}
                  </span>
                </div>

                {/* Content */}
                <div className="space-y-2 text-center md:text-left flex-1">
                  <h3 className="font-extrabold text-slate-900 text-lg uppercase tracking-wide">
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
