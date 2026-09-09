import Link from "next/link";
import React from "react";

interface PublicPageLayoutProps {
  title: string;
  subtitle: string;
  icon: string;
  children: React.ReactNode;
}

export default function PublicPageLayout({
  title,
  subtitle,
  icon,
  children,
}: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col pattern-bg transition-colors duration-300">
      {/* Sticky Top Nav */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-xs">
        <Link href="/" className="flex items-center gap-2.5 group hover:opacity-95 transition-all">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-2xl select-none">school</span>
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">
            CBT <span className="text-blue-600">Sekolah</span>
          </span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-full border border-slate-200 transition-all shadow-2xs hover:scale-105"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Beranda</span>
        </Link>
      </nav>

      {/* Hero Section - Light Bright Vibrant Blue Banner */}
      <header className="relative bg-gradient-to-br from-blue-700 via-indigo-600 to-blue-800 text-white py-14 md:py-16 px-6 text-center flex flex-col items-center justify-center gap-3 overflow-hidden shadow-lg border-b border-blue-600/30">
        {/* Glow lights in hero background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-xl border border-white/30 animate-float select-none">
          <span className="material-symbols-outlined text-[42px] leading-none">
            {icon}
          </span>
        </div>
        <h1 className="relative z-10 text-3xl md:text-5xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-sm">
          {title}
        </h1>
        <p className="relative z-10 text-blue-100 text-xs md:text-sm font-bold max-w-xl mx-auto leading-relaxed uppercase tracking-widest">
          {subtitle}
        </p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-12">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="py-8 border-t border-slate-200 text-center text-slate-500 text-xs font-bold uppercase tracking-widest mt-12 bg-white">
        <div>© 2026 CBT Sekolah. Semua Hak Dilindungi.</div>
      </footer>
    </div>
  );
}
