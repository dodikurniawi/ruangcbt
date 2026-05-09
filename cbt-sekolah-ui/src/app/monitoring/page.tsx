"use client";

import Link from "next/link";
import { useTenantPath } from "@/hooks/useTenantRouter";
import useSWR from "swr";
import { getLiveScore } from "@/lib/api";
import type { LiveScoreEntry, LiveScoreStats } from "@/types";

const STATUS_CLS: Record<string, string> = {
  SELESAI: "bg-emerald-100 text-emerald-800 border-emerald-200",
  SEDANG: "bg-amber-100 text-amber-800 border-amber-200",
  DISKUALIFIKASI: "bg-error-container text-on-error-container border-error/20",
  BELUM: "bg-surface-container text-on-surface-variant border-outline-variant",
};

const STATUS_LABEL: Record<string, string> = {
  SELESAI: "Selesai",
  SEDANG: "Sedang Mengerjakan",
  DISKUALIFIKASI: "Diskualifikasi",
  BELUM: "Belum Mulai",
};

export default function PublicLiveMonitoring() {
  const tenantPath = useTenantPath();
  const { data: scoreRes } = useSWR("getLiveScore", getLiveScore, { refreshInterval: 5000 });

  const entries: LiveScoreEntry[] = scoreRes?.data ?? [];
  const stats: LiveScoreStats | undefined = scoreRes?.stats;

  const top3 = entries.slice(0, 3);

  const lastUpdate = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const podiumSlots = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumBorderColors = ["border-secondary", "border-primary-container", "border-tertiary"];
  const podiumScoreBg = ["bg-secondary-container text-white", "bg-primary text-white", "bg-tertiary text-white"];
  const podiumOrder = ["order-2 md:order-1", "order-1 md:order-2", "order-3"];

  return (
    <div className="bg-background text-on-background font-body-admin min-h-screen pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 flex justify-between items-center w-full px-lg py-md bg-white border-b border-outline-variant shadow-sm">
        <Link href={tenantPath("/")} className="flex items-center gap-sm cursor-pointer">
          <span className="material-symbols-outlined text-primary text-3xl">school</span>
          <div className="flex flex-col">
            <h1 className="font-headline-student font-extrabold text-primary">CBT Sekolah</h1>
            <div className="flex items-center gap-sm">
              <span className="flex h-2 w-2 rounded-full bg-error animate-ping"></span>
              <span className="font-label-bold text-error uppercase tracking-wider text-[10px]">Live Monitoring</span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-sm bg-surface-container-high px-md py-sm rounded-xl">
          <span className="material-symbols-outlined text-on-surface-variant">public</span>
          <span className="font-label-bold text-on-surface">Public View</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-lg py-12 space-y-2xl">
        {/* Podium */}
        {top3.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 items-end gap-lg pt-12">
            {podiumSlots.map((entry, i) => {
              const isFirst = (top3.length === 3 && i === 1) || (top3.length < 3 && entry.rank === 1);
              return (
                <div key={entry.rank} className={`bg-white border-t-4 ${podiumBorderColors[i]} p-lg rounded-xl shadow-sm text-center ${podiumOrder[i]} ${isFirst ? "md:-translate-y-8 ring-4 ring-primary-container/10 rounded-2xl p-xl shadow-lg" : ""} transition-transform hover:scale-105`}>
                  <div className="relative inline-block mb-md">
                    <div className={`w-${isFirst ? "32" : "24"} h-${isFirst ? "32" : "24"} rounded-full bg-surface-container flex items-center justify-center border-4 border-white shadow-md mx-auto`}>
                      <span className="material-symbols-outlined text-on-surface-variant text-4xl">person</span>
                    </div>
                    {isFirst && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                        <span className="material-symbols-outlined text-yellow-500 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                      </div>
                    )}
                    <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xl border-4 border-white ${podiumScoreBg[i]}`}>
                      {entry.rank}
                    </div>
                  </div>
                  <h3 className={`font-extrabold text-on-surface mb-xs ${isFirst ? "text-2xl" : "font-headline-admin"}`}>{entry.nama}</h3>
                  <p className="font-label-sm text-on-surface-variant mb-md">{entry.kelas}</p>
                  <div className={`py-xs px-md rounded-full font-display-exam font-bold ${isFirst ? "text-4xl shadow-md py-sm px-lg" : "text-2xl"} ${podiumScoreBg[i]}`}>
                    {entry.skor}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Rankings Table */}
        <section className="bg-white rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
          <div className="px-xl py-lg bg-surface-container-lowest border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-admin text-primary flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">leaderboard</span>
              Live Participant Rankings
            </h2>
            <div className="flex items-center gap-lg text-sm">
              <div className="flex items-center gap-xs"><span className="w-3 h-3 rounded-full bg-emerald-500"></span><span className="text-on-surface-variant">Selesai</span></div>
              <div className="flex items-center gap-xs"><span className="w-3 h-3 rounded-full bg-amber-500"></span><span className="text-on-surface-variant">Sedang</span></div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant">
                  {["Rank", "Nama", "Kelas", "Status", "Live Score"].map((h, i) => (
                    <th key={h} className={`px-xl py-md font-label-bold uppercase text-[11px] tracking-widest ${i === 4 ? "text-right" : ""} ${i === 0 ? "w-20" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="px-xl py-8 text-center text-on-surface-variant">Belum ada data peserta.</td></tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.rank} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-xl py-md"><span className="font-bold text-on-surface text-lg">{e.rank}</span></td>
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-md">
                          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary">
                            {e.nama.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </div>
                          <span className="font-semibold text-on-surface">{e.nama}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md text-on-surface-variant">{e.kelas}</td>
                      <td className="px-lg py-md">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${STATUS_CLS[e.status] ?? ""}`}>{STATUS_LABEL[e.status]}</span>
                      </td>
                      <td className="px-xl py-md text-right font-display-exam text-primary text-xl font-bold">{e.skor}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-xl py-md bg-surface-container-low text-center border-t border-outline-variant">
            <p className="font-label-sm text-on-surface-variant">
              Menampilkan {entries.length} peserta • Auto-refresh setiap 5 detik
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-inverse-surface text-white py-sm px-lg flex justify-between items-center z-40 shadow-lg">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined text-sm">update</span>
          <span className="font-label-sm">Update: {lastUpdate} WIB</span>
        </div>
        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-xs">
            <span className="font-label-sm opacity-70">Selesai:</span>
            <span className="font-label-bold">{stats?.selesai ?? 0}</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="font-label-sm opacity-70">Aktif:</span>
            <span className="font-label-bold text-emerald-400">{stats?.sedang ?? 0}</span>
          </div>
          <div className="flex items-center gap-xs">
            <span className="font-label-sm opacity-70">Total:</span>
            <span className="font-label-bold">{stats?.total ?? 0}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
