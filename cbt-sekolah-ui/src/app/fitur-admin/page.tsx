import PublicPageLayout from "@/components/public/PublicPageLayout";
import React from "react";

export const metadata = {
  title: "Fitur Admin — CBT Sekolah",
  description: "Kelola seluruh aktivitas ujian sekolah dengan dashboard admin yang komprehensif, kuat, dan mudah digunakan.",
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-[#f1f5f9] dark:bg-slate-900 rounded-2xl p-6 flex flex-col gap-3 border border-slate-200/50 hover:shadow-md transition-shadow">
      <span className="material-symbols-outlined text-[#2563EB] text-4xl select-none">
        {icon}
      </span>
      <h3 className="font-extrabold text-slate-900 text-base uppercase tracking-wide">
        {title}
      </h3>
      <p className="text-slate-600 text-sm leading-relaxed font-medium">
        {description}
      </p>
    </div>
  );
}

export default function FiturAdminPage() {
  const features = [
    {
      icon: "quiz",
      title: "Manajemen Bank Soal",
      description: "Buat dan kelola ribuan soal pilihan ganda dengan gambar, rumus matematika, dan kategorisasi mata pelajaran. Soal tersimpan aman di Google Spreadsheet milik sekolah.",
    },
    {
      icon: "groups",
      title: "Manajemen Siswa & Kelas",
      description: "Import data siswa dari Excel, atur kelas dan rombongan belajar. Setiap siswa mendapat PIN unik otomatis.",
    },
    {
      icon: "assignment",
      title: "Konfigurasi Ujian Fleksibel",
      description: "Atur durasi, jumlah soal, acak soal, batas pengerjaan, dan jadwal ujian kapan saja.",
    },
    {
      icon: "leaderboard",
      title: "Rekap Nilai Real-time",
      description: "Pantau hasil ujian siswa secara langsung. Ekspor ke Excel dan PDF dengan satu klik.",
    },
    {
      icon: "print",
      title: "Cetak Kartu & Hasil Ujian",
      description: "Cetak kartu ujian peserta dan laporan hasil ujian dengan kop sekolah, tanda tangan kepala sekolah dan guru.",
    },
    {
      icon: "psychology",
      title: "Analisis Butir Soal AI",
      description: "Groq AI menganalisis tingkat kesukaran dan kualitas setiap soal secara otomatis menggunakan model LLM terbaru.",
    },
    {
      icon: "security",
      title: "Data Milik Sekolah",
      description: "Semua data tersimpan di Google Spreadsheet dan Google Drive milik sekolah sendiri. Tidak ada data yang meninggalkan ekosistem Google.",
    },
    {
      icon: "devices",
      title: "Multi-device",
      description: "Dapat diakses dari laptop, tablet, maupun HP siswa. Tidak perlu install aplikasi apapun.",
    },
  ];

  return (
    <PublicPageLayout
      title="Fitur Admin"
      subtitle="Sistem manajemen ujian terpadu untuk efisiensi institusi pendidikan Anda"
      icon="admin_panel_settings"
    >
      <div className="space-y-12">
        {/* Intro */}
        <section className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Semua Kendali di Tangan Anda
          </h2>
          <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
            Dashboard administrasi kami menyatukan manajemen bank soal, monitoring ujian real-time, cetak dokumen resmi, hingga analisis AI canggih dalam satu ekosistem nirkertas.
          </p>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <FeatureCard
              key={i}
              icon={f.icon}
              title={f.title}
              description={f.description}
            />
          ))}
        </section>

        {/* CTA Block */}
        <section className="bg-[#2563EB] text-white rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl shadow-blue-500/10">
          <div className="space-y-2">
            <h3 className="font-black text-2xl md:text-3xl uppercase tracking-tight">
              Siap Mencoba?
            </h3>
            <p className="font-bold text-xs md:text-sm text-blue-100 max-w-lg mx-auto uppercase tracking-widest leading-relaxed">
              Tingkatkan standar asesmen digital sekolah Anda dengan platform CBT terbaik
            </p>
          </div>
          <div className="pt-2">
            <a
              href="https://wa.me/6285189536359"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-[#2563EB] px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-md hover:shadow-lg hover:scale-105 transform duration-300"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              Hubungi Kami via WhatsApp
            </a>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}
