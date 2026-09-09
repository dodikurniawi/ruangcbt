import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Portal Siswa — CBT Sekolah",
  description: "Antarmuka ujian siswa CBT Sekolah yang bersih, responsif, dan mudah digunakan tanpa login akun rumit.",
};

interface CardProps {
  icon: string;
  title: string;
  description: string;
}

function HighlightCard({ icon, title, description }: CardProps) {
  return (
    <div className="group relative bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col gap-3 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
        <span className="material-symbols-outlined text-2xl select-none">
          {icon}
        </span>
      </div>
      <h4 className="font-extrabold text-slate-900 text-base uppercase tracking-wide group-hover:text-blue-600 transition-colors">
        {title}
      </h4>
      <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}

export default function PortalSiswaPage() {
  const steps = [
    {
      num: "01",
      title: "Buka link ujian",
      desc: "Siswa membuka URL portal sekolah di browser perangkat masing-masing.",
    },
    {
      num: "02",
      title: "Masukkan PIN unik",
      desc: "Siswa memasukkan 6 digit PIN unik yang tercetak di kartu peserta ujian.",
    },
    {
      num: "03",
      title: "Kerjakan soal",
      desc: "Mulai menjawab soal ujian dengan antarmuka yang bersih dan bebas distraksi.",
    },
    {
      num: "04",
      title: "Lihat hasil",
      desc: "Nilai ujian langsung tersimpan dan dapat ditampilkan kepada siswa jika diinginkan.",
    },
  ];

  const highlights = [
    {
      icon: "timer",
      title: "Timer otomatis",
      description: "Ujian otomatis dikumpulkan secara aman ketika durasi waktu habis.",
    },
    {
      icon: "flag",
      title: "Tandai Ragu-ragu",
      description: "Tandai soal yang ragu untuk ditinjau ulang dengan mudah sebelum mengakhiri ujian.",
    },
    {
      icon: "grid_view",
      title: "Navigasi Soal",
      description: "Panel navigasi berbentuk grid yang memudahkan siswa melompat ke nomor soal mana saja.",
    },
    {
      icon: "phone_android",
      title: "Mobile Friendly",
      description: "Tampilan responsif luar biasa yang optimal di HP, tablet, maupun laptop.",
    },
    {
      icon: "lock",
      title: "Sesi Aman",
      description: "Satu PIN unik hanya dapat dipergunakan satu kali per sesi ujian untuk mencegah penyalahgunaan.",
    },
    {
      icon: "visibility_off",
      title: "Anti-cheat",
      description: "Urutan soal dan pilihan ganda diacak secara server-side berbeda untuk setiap siswa.",
    },
  ];

  return (
    <PublicPageLayout
      title="Portal Siswa"
      subtitle="Pengalaman ujian modern yang mulus, ringan, dan fokus 100% pada pengerjaan soal"
      icon="school"
    >
      <div className="space-y-16">
        {/* Intro Banner */}
        <section className="relative bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white border border-blue-600/30 rounded-3xl p-6 md:p-8 space-y-3 text-center shadow-xl overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white mx-auto flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-3xl select-none">
              bolt
            </span>
          </div>
          <p className="text-blue-50 text-sm md:text-base font-semibold leading-relaxed max-w-2xl mx-auto">
            Portal siswa CBT Sekolah dirancang sesederhana mungkin — siswa hanya perlu memasukkan PIN untuk langsung mulai ujian. Tidak ada pembuatan akun mandiri, tidak perlu password rumit, dan sama sekali tidak ada instalasi aplikasi tambahan.
          </p>
        </section>

        {/* Steps */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="font-black text-slate-900 text-2xl tracking-tight uppercase">
              Alur Ujian 4 Langkah Mudah
            </h3>
            <p className="text-slate-600 text-sm font-medium">
              Proses pengerjaan ujian yang intuitif tanpa kerumitan teknis
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="group bg-white border border-slate-200/90 rounded-3xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform select-none">
                    {s.num}
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-500 transition-colors text-xl select-none">
                    arrow_forward
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-slate-900 text-base leading-snug uppercase tracking-wide group-hover:text-blue-600 transition-colors">
                    {s.title}
                  </h4>
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features Highlights */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="font-black text-slate-900 text-2xl tracking-tight uppercase">
              Keunggulan Aplikasi Siswa
            </h3>
            <p className="text-slate-600 text-sm font-medium">
              Dirancang untuk memaksimalkan fokus pengerjaan dan meminimalisir kendala
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((h, i) => (
              <HighlightCard
                key={i}
                icon={h.icon}
                title={h.title}
                description={h.description}
              />
            ))}
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}

