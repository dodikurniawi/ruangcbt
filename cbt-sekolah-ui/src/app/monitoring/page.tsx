"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getLiveScore } from "@/lib/api";
import type { LiveScoreEntry, LiveScoreStats } from "@/types";

const STATUS_CLS: Record<string, { badge: string; icon: string }> = {
  SELESAI: {
    badge: "bg-emerald-50 text-[#16A34A] border-emerald-200/80",
    icon: "check_circle",
  },
  SEDANG: {
    badge: "bg-amber-50 text-[#D97706] border-amber-200/80",
    icon: "hourglass_top",
  },
  DISKUALIFIKASI: {
    badge: "bg-red-50 text-[#DC2626] border-red-200/80",
    icon: "cancel",
  },
  BELUM: {
    badge: "bg-slate-100 text-[#64748B] border-slate-200",
    icon: "schedule",
  },
};

const STATUS_LABEL: Record<string, string> = {
  SELESAI: "Selesai",
  SEDANG: "Sedang Mengerjakan",
  DISKUALIFIKASI: "Diskualifikasi",
  BELUM: "Belum Mulai",
};

// Helper for soft, professional avatar pastel background
const AVATAR_COLORS = [
  "bg-slate-100 text-[#1E3A5F] border-slate-200",
  "bg-teal-50 text-[#0F766E] border-teal-200",
  "bg-blue-50 text-[#1E3A5F] border-blue-200",
  "bg-emerald-50 text-[#16A34A] border-emerald-200",
  "bg-amber-50 text-[#D97706] border-amber-200",
];

function getAvatarStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export default function PublicLiveMonitoring() {
  const tenantPath = useTenantPath();
  // Jam "terakhir diperbarui" ditulis dari callback SWR, bukan dari effect: jamnya
  // milik peristiwa "data baru tiba", dan membacanya saat render akan berbeda
  // antara server dan browser. Nilai awal kosong sampai muatan pertama datang.
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const { data: scoreRes } = useSWR("getLiveScore", getLiveScore, {
    refreshInterval: 5000,
    onSuccess: () => setLastUpdate(
      new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    ),
  });

  const entries: LiveScoreEntry[] = scoreRes?.data ?? [];
  const stats: LiveScoreStats | undefined = scoreRes?.stats;

  const top3 = entries.slice(0, 3);
  const podiumSlots = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;


  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-body-admin pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3.5 flex justify-between items-center">
          <Link href={tenantPath("/")} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-2xl">school</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-student font-extrabold text-[#1E3A5F] text-lg tracking-tight group-hover:text-[#0F766E] transition-colors">
                CBT Sekolah
              </span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F766E] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0F766E]"></span>
                </span>
                <span className="font-label-bold text-[#0F766E] uppercase tracking-widest text-[10px]">
                  Pemantauan Ujian Live
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 px-3.5 py-1.5 rounded-full border border-[#E2E8F0] text-[#64748B] text-xs font-semibold transition-colors">
            <span className="material-symbols-outlined text-base text-[#64748B]">public</span>
            <span>Tampilan Publik</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-12 space-y-8">
        {/* Banner Section - Trust Navy (#1E3A5F) & Calm Teal (#0F766E) */}
        <section className="bg-[#1E3A5F] rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-[#0F766E]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0F766E]/30 border border-[#0F766E]/40 text-teal-100 text-xs font-semibold tracking-wider uppercase">
                <span className="material-symbols-outlined text-sm text-teal-300">insights</span>
                <span>Pemantauan Ujian Live</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Pemantauan Ujian Secara Langsung
              </h1>
              <p className="text-slate-200 text-sm leading-relaxed">
                Pantau aktivitas dan progres siswa secara real-time.
              </p>
            </div>

            {/* Live refresh indicator */}
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-100 shadow-inner self-start md:self-auto">
              <span className="material-symbols-outlined text-[#0F766E] bg-white rounded-full p-0.5 text-base animate-spin" style={{ animationDuration: '6s' }}>sync</span>
              <div>
                <p className="font-semibold text-white">Sistem Aktif</p>
                <p className="text-[11px] text-slate-300">Pembaruan tiap 5 detik</p>
              </div>
            </div>
          </div>

          {/* Semantic Overview Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 pt-6 border-t border-white/15">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">Total Peserta</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold text-white">{stats?.total ?? entries.length}</span>
                <span className="material-symbols-outlined text-slate-300 text-xl">groups</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-amber-200">Sedang Ujian</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold text-amber-300">{stats?.sedang ?? 0}</span>
                <span className="material-symbols-outlined text-amber-300 text-xl">edit_note</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-200">Selesai</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold text-emerald-300">{stats?.selesai ?? 0}</span>
                <span className="material-symbols-outlined text-emerald-300 text-xl">task_alt</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/10">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">Belum Mulai</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-bold text-white/90">{stats?.belum ?? 0}</span>
                <span className="material-symbols-outlined text-slate-300 text-xl">hourglass_empty</span>
              </div>
            </div>
          </div>
        </section>

        {/* Podium Section / Hasil Tertinggi Sementara (If Top 3 present) */}
        {top3.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0F766E]">workspace_premium</span>
                <h2 className="text-base md:text-lg font-bold text-[#0F172A]">Hasil Tertinggi Sementara</h2>
              </div>
              <span className="text-xs text-[#64748B] font-medium">3 Nilai Teratas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 items-end gap-4 md:gap-6 pt-1">
              {podiumSlots.map((entry, i) => {
                const isFirst = (top3.length === 3 && i === 1) || (top3.length < 3 && entry.rank === 1);
                
                return (
                  <div
                    key={entry.rank}
                    className={`relative rounded-2xl p-5 border bg-white border-[#E2E8F0] shadow-xs ${
                      isFirst ? "order-1 md:order-2 ring-2 ring-[#0F766E]/20 md:-translate-y-2 shadow-md" : i === 0 ? "order-2 md:order-1" : "order-3"
                    } transition-transform hover:-translate-y-0.5`}
                  >
                    <div className="text-center space-y-3">
                      <div className="relative inline-block">
                        <div className={`w-16 h-16 ${isFirst ? 'md:w-20 md:h-20' : ''} rounded-2xl ${getAvatarStyle(entry.nama)} flex items-center justify-center shadow-xs mx-auto border-2 border-white`}>
                          <span className="font-bold text-lg md:text-xl">
                            {entry.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </span>
                        </div>
                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          isFirst ? "bg-[#1E3A5F] text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          Rank #{entry.rank}
                        </div>
                      </div>

                      <div className="pt-1">
                        <h3 className={`font-bold text-[#0F172A] line-clamp-1 ${isFirst ? "text-base md:text-lg" : "text-sm"}`}>
                          {entry.nama}
                        </h3>
                        <p className="text-xs text-[#64748B] font-medium mt-0.5">{entry.kelas}</p>
                      </div>

                      <div className="py-2 px-4 rounded-xl bg-slate-50 border border-[#E2E8F0] font-display-exam font-bold text-center">
                        <span className="text-[10px] uppercase tracking-wider block text-[#64748B] font-sans font-medium">Nilai Akhir</span>
                        <span className={`text-[#1E3A5F] ${isFirst ? "text-2xl md:text-3xl" : "text-xl"}`}>{entry.skor}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Progress & Nilai Siswa Table Card */}
        <section className="bg-white rounded-2xl shadow-xs border border-[#E2E8F0] overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/80 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0F766E] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">fact_check</span>
              </div>
              <div>
                <h2 className="font-bold text-[#0F172A] text-base">Live Score Siswa</h2>
                <p className="text-xs text-[#64748B]">Status pengerjaan dan hasil nilai peserta</p>
              </div>
            </div>

            {/* Semantic status key */}
            <div className="flex items-center gap-3 text-xs font-medium">
              <div className="flex items-center gap-1.5 bg-emerald-50 text-[#16A34A] px-2.5 py-1 rounded-full border border-emerald-200/60">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
                <span>Selesai</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 text-[#D97706] px-2.5 py-1 rounded-full border border-amber-200/60">
                <span className="w-2 h-2 rounded-full bg-[#D97706]"></span>
                <span>Sedang Ujian</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 text-[#64748B] px-2.5 py-1 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-[#64748B]"></span>
                <span>Belum</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 text-[#64748B] border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 font-semibold uppercase text-[11px] tracking-wider w-20">No</th>
                  <th className="px-6 py-3 font-semibold uppercase text-[11px] tracking-wider">Nama Siswa</th>
                  <th className="px-6 py-3 font-semibold uppercase text-[11px] tracking-wider">Kelas</th>
                  <th className="px-6 py-3 font-semibold uppercase text-[11px] tracking-wider">Status Ujian</th>
                  <th className="px-6 py-3 font-semibold uppercase text-[11px] tracking-wider text-right">Nilai Live</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0F766E] flex items-center justify-center mx-auto border border-teal-100">
                          <span className="material-symbols-outlined text-3xl">hourglass_empty</span>
                        </div>
                        <h3 className="font-bold text-[#0F172A] text-base">Belum Ada Data Peserta</h3>
                        <p className="text-xs text-[#64748B] leading-relaxed">
                          Ujian belum dimulai atau belum ada siswa yang mengirimkan jawaban. Data status dan nilai akan diperbarui secara otomatis.
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-[#64748B] text-xs font-medium">
                          <span className="w-2 h-2 rounded-full bg-[#0F766E] animate-pulse"></span>
                          <span>Menunggu pengerjaan ujian...</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => {
                    const statusConfig = STATUS_CLS[e.status] ?? STATUS_CLS.BELUM;
                    const avatarStyle = getAvatarStyle(e.nama);

                    return (
                      <tr key={e.rank} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <span className="font-bold text-xs text-[#64748B]">#{e.rank}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${avatarStyle} flex items-center justify-center font-bold text-xs border shadow-2xs`}>
                              {e.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                            </div>
                            <span className="font-semibold text-[#0F172A]">{e.nama}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-[#64748B] font-medium">{e.kelas}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.badge}`}>
                            <span className="material-symbols-outlined text-sm">{statusConfig.icon}</span>
                            <span>{STATUS_LABEL[e.status] ?? e.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-display-exam text-[#1E3A5F] text-lg font-bold">
                          {e.skor}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-slate-50 text-center border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-medium">
              Menampilkan {entries.length} peserta
            </span>
            <span className="text-slate-400 font-medium">
              Pembaruan otomatis
            </span>
          </div>
        </section>
      </main>

      {/* Floating Bottom Status Bar - Clean Status Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#1E3A5F] text-white py-2.5 px-4 md:px-8 flex justify-between items-center z-40 shadow-xl border-t border-slate-700">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
          <span>Live · {lastUpdate ? `Diperbarui ${lastUpdate} WIB` : "Menghubungkan..."}</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <span>{stats?.total ?? entries.length} Peserta</span>
          <span className="text-slate-400">·</span>
          <span className="text-amber-300">{stats?.sedang ?? 0} Sedang</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-300">{stats?.selesai ?? 0} Selesai</span>
        </div>
      </footer>
    </div>
  );
}


