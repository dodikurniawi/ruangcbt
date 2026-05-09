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
    <div className="bg-[#f8fafc] dark:bg-slate-900 border border-slate-200/60 rounded-2xl p-5 flex flex-col gap-2.5 hover:shadow-md transition-shadow">
      <span className="material-symbols-outlined text-[#2563EB] text-3xl select-none">
        {icon}
      </span>
      <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">
        {title}
      </h4>
      <p className="text-slate-600 text-xs leading-relaxed font-semibold">
        {description}
      </p>
    </div>
  );
}

export default function PortalSiswaPage() {
  const steps = [
    {
      num: "01",
      title: "Buka link ujian dari guru",
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
      <div className="space-y-12">
        {/* Intro */}
        <section className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 md:p-8 space-y-3 text-center">
          <span className="material-symbols-outlined text-[#2563EB] text-4xl select-none">
            bolt
          </span>
          <p className="text-slate-800 text-sm md:text-base font-bold leading-relaxed max-w-2xl mx-auto">
            Portal siswa CBT Sekolah dirancang sesederhana mungkin — siswa hanya perlu memasukkan PIN untuk langsung mulai ujian. Tidak ada pembuatan akun mandiri, tidak perlu password rumit, dan sama sekali tidak ada instalasi aplikasi tambahan.
          </p>
        </section>

        {/* Steps */}
        <section className="space-y-6">
          <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase text-center">
            Alur Ujian 4 Langkah Mudah
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="bg-white border border-slate-150 rounded-2xl p-6 relative flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                <span className="font-black text-4xl text-blue-500/20 absolute top-4 right-6 select-none">
                  {s.num}
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm leading-snug uppercase tracking-wide pt-4 max-w-[80%]">
                  {s.title}
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Highlights */}
        <section className="space-y-6">
          <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase text-center">
            Keunggulan Aplikasi Siswa
          </h3>
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
