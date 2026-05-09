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
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* Sticky Top Nav */}
      <nav className="bg-surface border-b border-outline-variant px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="material-symbols-outlined text-primary text-2xl">school</span>
          <span className="text-xl font-bold text-primary tracking-wide">CBT Sekolah</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface font-black uppercase tracking-wider transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Beranda</span>
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="bg-primary-container/30 py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-primary text-[96px] leading-none mb-2 select-none">
          {icon}
        </span>
        <h1 className="text-3xl md:text-4xl font-black text-on-surface tracking-tight leading-tight uppercase">
          {title}
        </h1>
        <p className="text-on-surface-variant text-xs md:text-sm font-extrabold max-w-xl mx-auto leading-relaxed uppercase tracking-widest opacity-80">
          {subtitle}
        </p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-12">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="py-8 border-t border-outline-variant/30 text-center text-on-surface-variant text-[11px] font-black uppercase tracking-widest mt-12 bg-surface/30">
        <div>© 2026 CBT Sekolah. Semua Hak Dilindungi.</div>
      </footer>
    </div>
  );
}
