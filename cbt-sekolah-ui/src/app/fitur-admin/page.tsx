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
  tag?: string;
}

function FeatureCard({ icon, title, description, tag }: FeatureCardProps) {
  return (
    <div className="group relative bg-white border border-slate-200/90 rounded-3xl p-6 md:p-7 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-3xl select-none">
            {icon}
          </span>
        </div>
        {tag && (
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            {tag}
          </span>
        )}
      </div>

      <div className="space-y-2 pt-1">
        <h3 className="font-extrabold text-slate-900 text-lg tracking-tight group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed font-medium">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function FiturAdminPage() {
  const features = [
    {
      icon: "quiz",
      title: "Manajemen Bank Soal",
      description: "Buat dan kelola ribuan soal pilihan ganda dengan gambar, rumus matematika, dan kategorisasi mata pelajaran. Soal tersimpan aman di Google Spreadsheet milik sekolah.",
      tag: "Serverless DB",
    },
    {
      icon: "groups",
      title: "Manajemen Siswa & Kelas",
      description: "Import data siswa dari Excel, atur kelas dan rombongan belajar. Setiap siswa mendapat PIN unik otomatis.",
      tag: "Auto PIN",
    },
    {
      icon: "assignment",
      title: "Konfigurasi Ujian Fleksibel",
      description: "Atur durasi, jumlah soal, acak soal, batas pengerjaan, dan jadwal ujian kapan saja.",
      tag: "Fleksibel",
    },
    {
      icon: "leaderboard",
      title: "Rekap Nilai Real-time",
      description: "Pantau hasil ujian siswa secara langsung. Ekspor ke Excel dan PDF dengan satu klik.",
      tag: "Real-time",
    },
    {
      icon: "print",
      title: "Cetak Kartu & Hasil Ujian",
      description: "Cetak kartu ujian peserta dan laporan hasil ujian dengan kop sekolah, tanda tangan kepala sekolah dan guru.",
      tag: "1-Click PDF",
    },
    {
      icon: "psychology",
      title: "Analisis Butir Soal AI",
      description: "Groq AI menganalisis tingkat kesukaran dan kualitas setiap soal secara otomatis menggunakan model LLM terbaru.",
      tag: "AI Powered",
    },
    {
      icon: "security",
      title: "Data Milik Sekolah",
      description: "Semua data tersimpan di Google Spreadsheet dan Google Drive milik sekolah sendiri. Tidak ada data yang meninggalkan ekosistem Google.",
      tag: "Zero Vendor Access",
    },
    {
      icon: "devices",
      title: "Multi-device",
      description: "Dapat diakses dari laptop, tablet, maupun HP siswa. Tidak perlu install aplikasi apapun.",
      tag: "Responsive",
    },
  ];

  return (
    <PublicPageLayout
      title="Fitur Admin"
      subtitle="Sistem manajemen ujian terpadu untuk efisiensi institusi pendidikan Anda"
      icon="admin_panel_settings"
    >
      <div className="space-y-16">
        {/* Intro */}
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black uppercase tracking-widest shadow-2xs">
            <span className="material-symbols-outlined text-sm">tune</span>
            Dashboard Terintegrasi
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight uppercase">
            Semua Kendali di Tangan Anda
          </h2>
          <p className="text-slate-600 text-sm md:text-base font-medium leading-relaxed">
            Dashboard administrasi kami menyatukan manajemen bank soal, monitoring ujian real-time, cetak dokumen resmi, hingga analisis AI canggih dalam satu ekosistem nirkertas.
          </p>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {features.map((f, i) => (
            <FeatureCard
              key={i}
              icon={f.icon}
              title={f.title}
              description={f.description}
              tag={f.tag}
            />
          ))}
        </section>

        {/* CTA Block */}
        <section className="relative bg-gradient-to-br from-blue-700 via-indigo-600 to-blue-800 text-white rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-xl shadow-blue-500/20 overflow-hidden border border-blue-600/30">
          <div className="relative z-10 space-y-3">
            <span className="inline-block px-4 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest border border-white/30 mb-2">
              Siap Digunakan
            </span>
            <h3 className="font-black text-2xl md:text-4xl uppercase tracking-tight text-white drop-shadow-sm">
              Siap Transformasi Ujian Sekolah Anda?
            </h3>
            <p className="font-bold text-xs md:text-sm text-blue-100 max-w-xl mx-auto uppercase tracking-wider leading-relaxed">
              Tingkatkan standar asesmen digital sekolah Anda dengan platform CBT serverless terbaik tanpa biaya server bulanan
            </p>
          </div>
          <div className="relative z-10 pt-2 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://wa.me/6285189536359"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-white text-blue-700 px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 transform duration-300"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              Hubungi Kami via WhatsApp
            </a>
          </div>
        </section>
      </div>
    </PublicPageLayout>
  );
}

