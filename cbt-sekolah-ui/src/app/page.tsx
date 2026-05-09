"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    // Show promotional popup after 1.5 seconds
    const timer = setTimeout(() => {
      setShowPromo(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-md border-b border-outline-variant px-lg py-sm">
        <nav className="max-w-container-max-width mx-auto flex justify-between items-center">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary text-3xl" data-icon="school">
              school
            </span>
            <span className="font-headline-student text-headline-student font-extrabold text-primary tracking-tight">
              CBT Sekolah
            </span>
          </div>
          <div className="hidden md:flex items-center gap-xl">
            <a className="text-on-surface-variant font-medium hover:text-primary transition-all" href="#fitur">
              Fitur Utama
            </a>
            <a
              className="text-on-surface-variant font-medium hover:text-primary transition-all"
              href="https://wa.me/6285189536359"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bantuan
            </a>
            <Link
              href="/login"
              className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-bold hover:bg-primary-container transition-colors shadow-sm"
            >
              Mulai Ujian
            </Link>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-on-surface-variant p-1 cursor-pointer focus:outline-none"
          >
            <span className="material-symbols-outlined text-2xl">
              {isMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </nav>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden mt-sm py-md border-t border-outline-variant flex flex-col gap-md bg-surface">
            <a
              onClick={() => setIsMenuOpen(false)}
              className="text-on-surface-variant font-medium hover:text-primary transition-all py-1"
              href="#fitur"
            >
              Fitur Utama
            </a>
            <a
              onClick={() => setIsMenuOpen(false)}
              className="text-on-surface-variant font-medium hover:text-primary transition-all py-1"
              href="https://wa.me/6285189536359"
              target="_blank"
              rel="noopener noreferrer"
            >
              Bantuan
            </a>
            <Link
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-bold hover:bg-primary-container transition-colors shadow-sm text-center"
            >
              Mulai Ujian
            </Link>
          </div>
        )}
      </header>

      {/* Promotional Popup Dialog */}
      {showPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative bg-white dark:bg-surface rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-outline-variant transform scale-100 transition-all">
            {/* Header Close Button */}
            <button
              onClick={() => setShowPromo(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Banner Background */}
            <div className="bg-gradient-to-r from-primary to-secondary p-xl text-white text-center flex flex-col items-center gap-sm">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-primary-fixed/20 p-2">
                <span className="material-symbols-outlined text-primary text-4xl" data-icon="shield">
                  shield
                </span>
              </div>
              <h3 className="font-display-exam text-2xl font-bold mt-sm">SiUjian Mobile App</h3>
              <p className="font-caption text-sm opacity-90">Secure Exam Browser by BiraaStudio</p>
            </div>

            {/* Content Details */}
            <div className="p-xl space-y-md text-center">
              <h4 className="font-headline-admin text-headline-admin text-on-surface font-extrabold">
                Ujian Lebih Aman & Tertib!
              </h4>
              <p className="font-body-admin text-on-surface-variant leading-relaxed">
                Cegah kecurangan dengan mode browser terkunci, pemblokiran tangkapan layar, dan deteksi pergantian aplikasi selama ujian berlangsung.
              </p>
              <div className="pt-sm">
                <a
                  href="https://play.google.com/store/apps/details?id=com.eduguard.eduguard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-sm bg-[#000000] text-white px-xl py-3 rounded-xl hover:bg-neutral-800 transition-all font-label-bold shadow-md w-full"
                >
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                    alt="Get it on Google Play"
                    className="h-8"
                  />
                </a>
              </div>
              <button
                onClick={() => setShowPromo(false)}
                className="text-primary font-label-bold text-sm block mx-auto hover:underline cursor-pointer pt-sm"
              >
                Gunakan Versi Web Saja
              </button>
            </div>
          </div>
        </div>
      )}

      <main>
        <section className="relative overflow-hidden pt-2xl pb-32 pattern-bg">
          <div className="max-w-container-max-width mx-auto px-lg flex flex-col md:flex-row items-center gap-2xl">
            <div className="flex-1 space-y-lg text-center md:text-left">
              <div className="inline-flex items-center gap-xs bg-primary-fixed text-on-primary-fixed px-md py-xs rounded-full">
                <span
                  className="material-symbols-outlined text-sm"
                  data-icon="verified_user"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
                <span className="font-label-sm uppercase tracking-wider">
                  Terpercaya oleh 500+ Sekolah
                </span>
              </div>
              <h1 className="font-display-exam text-[40px] md:text-[64px] leading-[1.1] text-on-surface font-extrabold">
                Masa Depan <br />
                <span className="text-primary">Asesmen Digital</span> Indonesia.
              </h1>
              <p className="font-body-student text-on-surface-variant max-w-2xl">
                Platform Computer Based Test (CBT) yang dirancang khusus untuk
                kurikulum K-12. Menghadirkan integritas ujian tinggi dengan
                antarmuka yang tenang dan bebas gangguan bagi siswa.
              </p>
              <div className="flex flex-col sm:flex-row gap-md justify-center md:justify-start pt-md">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-sm bg-primary text-on-primary px-xl py-4 rounded-xl font-headline-admin hover:scale-[1.02] hover:bg-primary-container transition-all shadow-lg"
                >
                  Mulai Ujian
                  <span className="material-symbols-outlined" data-icon="arrow_forward">
                    arrow_forward
                  </span>
                </Link>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center gap-sm bg-transparent border-2 border-outline-variant text-on-surface px-xl py-4 rounded-xl font-headline-admin hover:bg-surface-container-low transition-colors"
                >
                  Admin / Pengawas
                  <span className="material-symbols-outlined" data-icon="admin_panel_settings">
                    admin_panel_settings
                  </span>
                </Link>
              </div>
            </div>
            <div className="flex-1 relative w-full">
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-outline-variant">
                <img
                  alt="Student Interface Dashboard"
                  className="w-full h-auto object-cover aspect-[4/3]"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsA-tzvzK1mELa_MjCLUc1q9uoKSX4GbomYOHJLYiH71Wy3R2KEczHQbp4KERnygMEnNW_e-EWRk9GVt8_Ai1U-rZE-LXdQ7UMDoLu1uyGsMrzmcJpIFd8GeG1LIz8MniQT1mPO776HLpmt9UGHCvWvaLRgUeBIa-iT2MPRI72snslIsld84H8R0_2a_9fsbQSf-Ljb-cOViYSBQD1II2757YQ0fRNrGw7c9RBqgAGjtwI9ovGNAGakQv5mObTyqPitxwZ_mFoVSwS"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 z-20 bg-white p-md rounded-xl shadow-xl border border-outline-variant hidden lg:block">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center">
                    <span
                      className="material-symbols-outlined"
                      data-icon="check_circle"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <div>
                    <p className="font-label-bold text-on-surface">99.9% Uptime</p>
                    <p className="font-caption text-on-surface-variant text-xs">
                      Sistem stabil saat ujian serentak
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-2xl bg-white" id="fitur">
          <div className="max-w-container-max-width mx-auto px-lg">
            <div className="text-center max-w-2xl mx-auto mb-2xl">
              <h2 className="font-headline-student text-headline-student text-primary mb-sm">
                Fitur Utama
              </h2>
              <p className="font-body-student text-on-surface-variant">
                Keunggulan teknologi yang kami rancang untuk mendukung transparansi
                dan efisiensi pendidikan di Indonesia.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <div className="group p-lg bg-surface-container-low rounded-2xl border border-transparent hover:border-primary-container hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center mb-lg group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl" data-icon="monitoring">
                    monitoring
                  </span>
                </div>
                <h3 className="font-headline-admin text-headline-admin text-on-surface mb-md">
                  Real-time Monitoring
                </h3>
                <p className="font-body-admin text-on-surface-variant">
                  Pantau progres siswa secara langsung dari dashboard pengawas. Deteksi
                  aktivitas mencurigakan dengan sistem proctoring cerdas.
                </p>
              </div>
              <div className="group p-lg bg-surface-container-low rounded-2xl border border-transparent hover:border-primary-container hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-secondary-container text-on-secondary-container rounded-xl flex items-center justify-center mb-lg group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl" data-icon="security">
                    security
                  </span>
                </div>
                <h3 className="font-headline-admin text-headline-admin text-on-surface mb-md">
                  Secure Architecture
                </h3>
                <p className="font-body-admin text-on-surface-variant">
                  Enkripsi data tingkat tinggi dan mode browser terkunci untuk mencegah
                  kecurangan dan kebocoran soal ujian.
                </p>
              </div>
              <div className="group p-lg bg-surface-container-low rounded-2xl border border-transparent hover:border-primary-container hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-14 h-14 bg-tertiary-container text-on-tertiary-container rounded-xl flex items-center justify-center mb-lg group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl" data-icon="touch_app">
                    touch_app
                  </span>
                </div>
                <h3 className="font-headline-admin text-headline-admin text-on-surface mb-md">
                  Easy to Use
                </h3>
                <p className="font-body-admin text-on-surface-variant">
                  Antarmuka intuitif yang meminimalisir 'test anxiety'. Setup ujian hanya
                  dalam hitungan menit untuk administrator.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="py-2xl pattern-bg">
          <div className="max-w-container-max-width mx-auto px-lg">
            <div className="bg-primary rounded-[32px] p-xl md:p-2xl flex flex-col md:flex-row items-center justify-between gap-xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              <div className="relative z-10 text-center md:text-left space-y-md">
                <h2 className="font-display-exam text-display-exam text-on-primary">
                  Siap mendigitalisasi sekolah Kamu?
                </h2>
                <p className="font-body-student text-on-primary-container opacity-90 max-w-xl">
                  Bergabunglah dengan ratusan institusi pendidikan lainnya untuk
                  menciptakan ekosistem ujian yang adil, modern, dan efisien.
                </p>
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row gap-md w-full md:w-auto">
                <a
                  href="https://wa.me/6285189536359"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-on-primary text-primary px-xl py-4 rounded-xl font-headline-admin text-center hover:bg-primary-fixed hover:text-on-primary-fixed transition-colors"
                >
                  Hubungi WhatsApp
                </a>
                <a
                  href="https://lynk.id/oghiezr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary-container text-on-primary-container border border-white/20 px-xl py-4 rounded-xl font-headline-admin text-center hover:bg-primary/50 transition-colors"
                >
                  Beli via Lynk.id
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-inverse-surface text-on-primary-fixed-variant pt-2xl pb-xl">
        <div className="max-w-container-max-width mx-auto px-lg grid grid-cols-1 md:grid-cols-4 gap-2xl border-b border-outline/30 pb-2xl mb-xl">
          <div className="space-y-md">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-inverse-primary text-2xl" data-icon="school">
                school
              </span>
              <span className="font-headline-admin text-headline-admin font-bold text-on-primary-fixed-variant">
                CBT Sekolah
              </span>
            </div>
            <p className="font-caption text-outline-variant leading-relaxed">
              Solusi Asesmen Digital Terpadu untuk Sekolah Dasar hingga Menengah Atas di seluruh Nusantara.
            </p>
          </div>
          <div>
            <h4 className="font-label-bold text-white mb-lg">Produk</h4>
            <ul className="space-y-sm font-body-admin text-outline-variant">
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/fitur-admin">
                  Fitur Admin
                </Link>
              </li>
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/portal-siswa">
                  Portal Siswa
                </Link>
              </li>
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/keamanan-data">
                  Keamanan Data
                </Link>
              </li>
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/integritas-ujian">
                  Integritas Ujian
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-bold text-white mb-lg">Dukungan</h4>
            <ul className="space-y-sm font-body-admin text-outline-variant">
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/bantuan">
                  Pusat Bantuan
                </Link>
              </li>
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/dokumentasi">
                  Dokumentasi Webappscript
                </Link>
              </li>
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/panduan-guru">
                  Panduan Guru
                </Link>
              </li>
              <li>
                <Link className="hover:text-inverse-primary transition-colors" href="/status">
                  Status Server
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-label-bold text-white mb-md">Hubungi Kami</h4>
            <div className="flex flex-col gap-sm">
              <a
                className="inline-flex items-center gap-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-white text-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 transition-all group"
                href="https://wa.me/6285189536359"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.706 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <span className="font-label-sm text-sm text-outline-variant group-hover:text-white transition-colors">WhatsApp</span>
              </a>
              <a
                className="inline-flex items-center gap-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-neutral-800 hover:text-white text-slate-300 hover:shadow-lg hover:shadow-black/10 transition-all group"
                href="https://lynk.id/oghiezr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12zm-7-8c-1.66 0-3-1.34-3-3H7c0 2.76 2.24 5 5 5s5-2.24 5-5h-2c0 1.66-1.34 3-3 3z" />
                  </svg>
                </div>
                <span className="font-label-sm text-sm text-outline-variant group-hover:text-white transition-colors">Lynk.id Market</span>
              </a>
              <a
                className="inline-flex items-center gap-sm px-4 py-2 rounded-xl bg-white/5 hover:bg-neutral-900 hover:text-white text-slate-300 hover:shadow-lg hover:shadow-black/20 transition-all group"
                href="https://tiktok.com/@scenecrafter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.05 1.62 4.2 1.22 1.34 2.96 2.13 4.77 2.23v3.88c-1.8-.02-3.56-.63-4.99-1.72-.12-.09-.23-.19-.36-.29v6.51c0 2.21-.77 4.38-2.18 5.94-1.67 1.83-4.13 2.79-6.62 2.53-2.61-.26-4.99-1.89-6.19-4.25-1.39-2.73-.89-6.27 1.19-8.48 1.63-1.72 4.04-2.5 6.36-2.02v3.91c-1.22-.26-2.54.12-3.37 1.05-.88.98-.95 2.5-.16 3.56.78 1.05 2.24 1.45 3.44.97.74-.29 1.22-.99 1.22-1.79V0h.18z" />
                  </svg>
                </div>
                <span className="font-label-sm text-sm text-outline-variant group-hover:text-white transition-colors">TikTok</span>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-container-max-width mx-auto px-lg flex flex-col md:flex-row justify-between items-center gap-md font-caption text-outline-variant">
          <p>© 2026 CBT Sekolah. Hak Cipta Dilindungi Undang-Undang.</p>
          <div className="flex gap-xl">
            <Link className="hover:text-white" href="/kebijakan-privasi">
              Kebijakan Privasi
            </Link>
            <Link className="hover:text-white" href="/syarat-ketentuan">
              Syarat &amp; Ketentuan
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
